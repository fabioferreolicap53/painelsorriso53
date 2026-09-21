import { useState, useRef, useEffect, useCallback } from "react";
import Papa from "papaparse";
import { relinkarPorCNS, invalidatePacientesCache } from "./pocketbase";

/**
 * Pagina de importacao CSV → PocketBase.
 * Executa 100% no frontend, sem server-side hooks.
 *
 * Colecao alvo: VITE_POCKETBASE_COLLECTION (painelsorriso53_pacientes)
 * Lotes de 500 via fetch REST direto ao PocketBase API.
 */

const PB_URL = import.meta.env.VITE_POCKETBASE_URL as string;
const PB_COLLECTION = import.meta.env.VITE_POCKETBASE_COLLECTION as string;
const PB_USERS_COLLECTION = "painelsorriso53_users";

function pbApiBase(): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_COLLECTION}/records`;
}

function usersAuthUrl(): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_USERS_COLLECTION}/auth-with-password`;
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("pb_auth_token");
    if (stored) return stored;
  } catch { /* ignore */ }
  const envToken = import.meta.env.VITE_POCKETBASE_TOKEN as string | undefined;
  if (envToken) return envToken;
  return null;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getAuthToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

// ── Mapeamento CSV → campos da collection ──────────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
  unidade: ["UNIDADE", "UNIDADE DE SAUDE", "UBS", "ESTABELECIMENTO"],
  equipe: ["EQUIPE", "EQ", "EQUIPE DE SAUDE"],
  microarea: ["MICROAREA", "MICRO AREA", "MICRO"],
  paciente: ["PACIENTE", "NOME", "NOME PACIENTE", "NOME DO PACIENTE", "NOME COMPLETO"],
  n_pront: ["N PRONT", "N_PRONT", "PRONTUARIO", "NUMERO PRONTUARIO", "PRONT"],
  gestante: ["GESTANTE"],
  tb: ["TB", "TUBERCULOSE"],
  tabagista: ["TABAGISTA", "TABAGISMO"],
  menor_de_2_anos: ["MENOR DE 2 ANOS", "MENOR_DE_2_ANOS", "MENOR_2_ANOS", "MENOR 2 ANOS", "MENOR DE2 ANOS", "MENOR_DE2_ANOS"],
  data_de_nascimento: ["DATA_DE_NASCIMENTO", "DATA NASCIMENTO", "DATA DE NASCIMENTO", "NASCIMENTO", "DT_NASCIMENTO"],
  n_cns_da_pessoa_cadastrada: ["N_CNS_DA_PESSOA_CADASTRADA", "CNS", "NUMERO CNS", "NÚMERO CNS", "CNS DA PESSOA", "CNS PESSOA CADASTRADA"],
  idade: ["IDADE"],
};

function normalize(h: string): string {
  return h.trim().toUpperCase().replace(/_/g, " ").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findField(csvHeader: string): string | null {
  const norm = normalize(csvHeader);
  // Match exato
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => normalize(a) === norm)) return field;
  }
  // Match parcial
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => norm.includes(normalize(a)) || normalize(a).includes(norm))) return field;
  }
  return null;
}

function convertBoolean(val: string): boolean {
  const v = val.trim().toUpperCase();
  return v === "SIM" || v === "TRUE" || v === "1" || v === "S";
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Tipos de estado ────────────────────────────────────────────────────

type Stage = "idle" | "reading" | "importing" | "completed" | "error";
type Control = "idle" | "running" | "paused";

interface UploadStatus {
  stage: Stage;
  message: string;
  current: number;
  total: number;
  fileName?: string;
}

interface ImportProgress {
  imported: number;
  total: number;
  errors: number;
}

interface ImportSummary {
  elapsedSec: number;
  errors: number;
  total: number;
  cancelled: boolean;
}

// ── Componente ─────────────────────────────────────────────────────────

export default function PaginaImportacao() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ stage: "idle", message: "", current: 0, total: 0 });
  const [importControl, setImportControl] = useState<Control>("idle");
  const [importProgress, setImportProgress] = useState<ImportProgress>({ imported: 0, total: 0, errors: 0 });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const importFlagsRef = useRef({ paused: false, cancelled: false });
  const importStartTimeRef = useRef(0);
  const importProgressRef = useRef({ imported: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal senha — validação de role "cap" antes de importar
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (importControl === "running" || importControl === "paused") {
        importFlagsRef.current.cancelled = true;
      }
    };
  }, [importControl]);

  // ── Validar senha — apenas role "cap" pode importar ────────────────

  function getLoggedEmail(): string {
    try {
      const stored = localStorage.getItem("pb_user");
      if (stored) {
        const user = JSON.parse(stored);
        return user.email ?? "";
      }
    } catch { /* ignore */ }
    return "";
  }

  async function validatePassword(): Promise<boolean> {
    if (!passwordInput.trim()) {
      setPasswordError("Digite sua senha");
      return false;
    }

    const email = getLoggedEmail();
    if (!email) {
      setPasswordError("Sessão expirada. Faça login novamente");
      return false;
    }

    try {
      const resp = await fetch(usersAuthUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: email, password: passwordInput }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.token) {
        setPasswordError("Senha incorreta");
        return false;
      }

      if (data.record?.role !== "cap") {
        setPasswordError("Apenas o perfil CAP pode importar dados");
        return false;
      }

      return true;
    } catch {
      setPasswordError("Erro ao validar senha");
      return false;
    }
  }

  function handleOpenPasswordModal(file: File) {
    pendingFileRef.current = file;
    setPasswordInput("");
    setPasswordError("");
    setShowPassword(false);
    setShowPasswordModal(true);
  }

  function handleClosePasswordModal() {
    setShowPasswordModal(false);
    setPasswordInput("");
    setPasswordError("");
    pendingFileRef.current = null;
  }

  async function handleConfirmImport() {
    const ok = await validatePassword();
    if (!ok) return;

    const file = pendingFileRef.current;
    setShowPasswordModal(false);
    setPasswordInput("");
    setPasswordError("");
    pendingFileRef.current = null;

    if (file) handleFileUpload(file);
  }

  // ── Handlers de controle ────────────────────────────────────────────

  const handlePauseResume = useCallback(() => {
    if (importFlagsRef.current.paused) {
      importFlagsRef.current.paused = false;
      setImportControl("running");
    } else {
      importFlagsRef.current.paused = true;
      setImportControl("paused");
    }
  }, []);

  const handleCancel = useCallback(() => {
    importFlagsRef.current.cancelled = true;
    importFlagsRef.current.paused = false;
    setImportControl("idle");
  }, []);

  const handleReset = useCallback(() => {
    setUploadStatus({ stage: "idle", message: "", current: 0, total: 0 });
    setImportControl("idle");
    setImportProgress({ imported: 0, total: 0, errors: 0 });
    setImportSummary(null);
  }, []);

  // ── Upload + parse + import ─────────────────────────────────────────

  const handleFileUpload = useCallback(async (file: File) => {
    // Validacao
    if (!file.name.endsWith(".csv")) {
      setUploadStatus({ stage: "error", message: "Envie apenas arquivos .csv", current: 0, total: 0 });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({ stage: "error", message: "Arquivo muito grande (max. 50MB).", current: 0, total: 0 });
      return;
    }

    setImportSummary(null);
    setUploadStatus({ stage: "reading", message: "Lendo arquivo...", current: 0, total: 0, fileName: file.name });
    setImportControl("running");
    importFlagsRef.current = { paused: false, cancelled: false };
    importStartTimeRef.current = Date.now();
    importProgressRef.current = { imported: 0, total: 0 };

    try {
      // Parse CSV
      const csvText = await file.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        console.warn("Avisos do PapaParse:", parsed.errors);
      }

      const headers = parsed.meta.fields ?? [];
      const fieldMap: Record<string, string> = {};
      const mappedFields: string[] = [];

      for (const h of headers) {
        const field = findField(h);
        if (field) {
          fieldMap[h] = field;
          mappedFields.push(field);
        }
      }

      // Validar campos obrigatorios
      if (!mappedFields.includes("paciente")) {
        setUploadStatus({ stage: "error", message: `CSV sem coluna "paciente". Colunas encontradas: ${headers.join(", ")}`, current: 0, total: 0 });
        setImportControl("idle");
        return;
      }

      // Transformar registros
      const records: Record<string, unknown>[] = [];
      for (const row of parsed.data as Record<string, string>[]) {
        const rec: Record<string, unknown> = {};
        for (const [csvHeader, field] of Object.entries(fieldMap)) {
          const val = (row[csvHeader] ?? "").toString().trim();
          if (val === "" || val === "--") continue;

          // Booleanos
          if (["gestante", "tb", "tabagista", "menor_de_2_anos"].includes(field)) {
            rec[field] = convertBoolean(val);
          }
          // Texto puro
          else {
            rec[field] = val;
          }
        }
        // Só incluir se tiver paciente
        if (rec.paciente) records.push(rec);
      }

      if (records.length === 0) {
        setUploadStatus({ stage: "error", message: "Nenhum registro valido encontrado no CSV.", current: 0, total: 0 });
        setImportControl("idle");
        return;
      }

      // Mostrar total de registros encontrados
      setUploadStatus({ stage: "reading", message: `Encontrados ${records.length.toLocaleString("pt-BR")} registros no CSV`, current: 0, total: records.length, fileName: file.name });
      await new Promise(r => setTimeout(r, 500)); // Pausa breve para mostrar o total

      // Insercao em lotes
      const BATCH = 500;
      let imported = 0;
      let errors = 0;
      let wasCancelled = false;

      setUploadStatus({ stage: "importing", message: `Importando ${records.length} registros...`, current: 0, total: records.length });
      setImportProgress({ imported: 0, total: records.length, errors: 0 });

      for (let i = 0; i < records.length; i += BATCH) {
        // Verificar cancelamento
        if (importFlagsRef.current.cancelled) {
          wasCancelled = true;
          break;
        }
        // Esperar se pausado
        while (importFlagsRef.current.paused && !importFlagsRef.current.cancelled) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (importFlagsRef.current.cancelled) {
          wasCancelled = true;
          break;
        }

        // Lote
        const batch = records.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((rec) =>
            fetch(pbApiBase(), {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify(rec),
            }).then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
          )
        );

        results.forEach((r) => (r.status === "fulfilled" ? imported++ : errors++));

        importProgressRef.current = { imported, total: records.length };
        setImportProgress({ imported, total: records.length, errors });
        setUploadStatus({ stage: "importing", message: `${imported} registros importados...`, current: imported, total: records.length });
      }

      // Finalizar
      const elapsed = Math.round((Date.now() - importStartTimeRef.current) / 1000);
      setImportSummary({ elapsedSec: elapsed, errors, total: records.length, cancelled: wasCancelled });
      setImportControl("idle");

      if (!wasCancelled) {
        // Invalidar cache de pacientes
        invalidatePacientesCache();

        // Re-vincular acompanhamentos por CNS
        setUploadStatus({ stage: "importing", message: "Re-vinculando acompanhamentos por CNS...", current: records.length, total: records.length + 1 });
        try {
          const relinkResult = await relinkarPorCNS();
          const relinkMsg = relinkResult.vinculados.length > 0
            ? ` | ${relinkResult.vinculados.length} vínculos restaurados`
            : " | todos os vínculos já estavam corretos";
          setUploadStatus({ stage: "completed", message: `Importacao concluida!${relinkMsg}`, current: imported, total: records.length });
        } catch {
          setUploadStatus({ stage: "completed", message: "Importacao concluida! (re-vinculação falhou — use Configurações)", current: imported, total: records.length });
        }
      } else {
        setImportControl("idle");
      }
    } catch (err: unknown) {
      const elapsed = Math.round((Date.now() - importStartTimeRef.current) / 1000);
      setImportSummary({ elapsedSec: elapsed, errors: 0, total: 0, cancelled: false });
      setUploadStatus({ stage: "error", message: `Erro: ${err instanceof Error ? err.message : "Falha na comunicacao"}`, current: 0, total: 0 });
      setImportControl("idle");
    }
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────

  const progressPct = importProgress.total > 0 ? Math.round((importProgress.imported / importProgress.total) * 100) : 0;

  // ── RENDER ──────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══ MODAL DE SENHA ═══════════════════════════════════════════ */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleClosePasswordModal}
        >
          <div
            className="relative w-full max-w-md rounded-[2.5rem] border border-blue-100 bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl" />

            <div className="relative mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-200">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-black uppercase tracking-tight text-slate-800">Autorização Necessária</p>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Apenas perfil CAP</p>
              </div>
            </div>

            <div className="relative mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Somente usuários com perfil <strong>CAP</strong> podem importar dados na coleção <strong>{PB_COLLECTION}</strong>. Digite sua senha para confirmar.
              </p>
            </div>

            <div className="relative mb-5">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Digite sua senha para confirmar
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleConfirmImport(); }}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-11 pr-12 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-xs text-rose-600">{passwordError}</p>
              )}
            </div>

            <div className="relative flex gap-3">
              <button onClick={handleClosePasswordModal} className="flex-1 rounded-2xl bg-slate-100 px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleConfirmImport} className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition-all hover:from-blue-700 hover:to-blue-800">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div>

        {/* ── Estado IDLE: Drop Zone ──────────────────────────────────── */}
        {uploadStatus.stage === "idle" && (
          <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white p-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleOpenPasswordModal(file);
              }}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-200/80 bg-blue-50/30 py-8 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/60 hover:shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/60 transition-all group-hover:bg-blue-500">
                <svg className="h-5 w-5 text-blue-500 transition-all group-hover:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <p className="mb-0.5 text-xs font-bold text-slate-600">Solte o CSV aqui</p>
              <p className="text-[10px] text-slate-400">ou clique para navegar</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleOpenPasswordModal(file);
                e.target.value = "";
              }}
            />
            <p className="mt-2.5 text-center text-[10px] text-slate-400">
              Formato: .csv &bull; Max: 50MB &bull; Colecao: {PB_COLLECTION}
            </p>
          </div>
        )}

        {/* ── Estado IMPORTING ───────────────────────────────────────── */}
        {uploadStatus.stage === "importing" && (
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/30 to-white p-4">
            <div className="flex items-center gap-3 rounded-xl border border-blue-100/80 bg-white p-3.5">
              {importControl === "running" && (
                <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              )}
              {importControl === "paused" && (
                <div className="h-3 w-3 flex-shrink-0 rounded-full bg-amber-400 animate-pulse" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700">{uploadStatus.fileName}</p>
                <p className="text-[10px] text-slate-400">{importProgress.imported} / {importProgress.total} registros</p>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600">{progressPct}%</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handlePauseResume}
                className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white transition-all hover:bg-amber-600"
              >
                {importControl === "paused" ? "▶ Continuar" : "⏸ Pausar"}
              </button>
              <button
                onClick={handleCancel}
                className="rounded-lg bg-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-300"
              >
                ⏹ Interromper
              </button>
            </div>
          </div>
        )}

        {/* ── Estado COMPLETED ────────────────────────────────────────── */}
        {uploadStatus.stage === "completed" && importSummary && (
          <div className={`rounded-2xl border p-4 ${importSummary.cancelled ? "border-amber-200 bg-gradient-to-br from-amber-50/50 to-white" : "border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white"}`}>
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3.5">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${importSummary.cancelled ? "bg-amber-500" : "bg-emerald-500"}`}>
                {importSummary.cancelled ? (
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" /></svg>
                ) : (
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700">
                  {importSummary.cancelled ? "Importacao Interrompida" : "Importacao Concluida!"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {importSummary.total.toLocaleString("pt-BR")} registros &bull; {formatTime(importSummary.elapsedSec)} &bull; {importSummary.errors} falhas
                </p>
              </div>
              <button onClick={handleReset} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-200">
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* ── Estado ERROR ────────────────────────────────────────────── */}
        {uploadStatus.stage === "error" && (
          <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/50 to-white p-4">
            <div className="flex items-center gap-3 rounded-xl border border-red-100/80 bg-white p-3.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-red-700">Erro na Importacao</p>
                <p className="text-[10px] truncate text-red-500">{uploadStatus.message}</p>
              </div>
              <button onClick={handleReset} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-200">
                Voltar
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
