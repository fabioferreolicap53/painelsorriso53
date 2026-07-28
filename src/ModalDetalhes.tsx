import { useState, useEffect } from "react";
import type { Paciente, Acompanhamento } from "./types";
import { atualizarPaciente, buscarAcompanhamentos } from "./pocketbase";
import { calcularIdade } from "./PaginaPacientes";

// ── Helpers ────────────────────────────────────────────────────────────

function formatarData(dateStr: string): string {
  if (!dateStr) return "\u2014";
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "\u2014";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// ── Ícones ─────────────────────────────────────────────────────────────

const I = {
  x: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  check: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>,
  edit: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>,
  user: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>,
  alerta: <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>,
  calendario: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>,
  prontuario: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m4.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>,
  gestante: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M12 11v6m-3-3h6"/></svg>,
  tb: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>,
  tabagista: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6z"/><path d="M10 12h4m-2-2v4"/></svg>,
  seta: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>,
  checkCircle: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>,
  sincronizar: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"/></svg>,
};

// ── Toggle premium ─────────────────────────────────────────────────────

function TogglePremium({
  label,
  valor,
  onChange,
  cor = "cyan",
  icone,
}: {
  label: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  cor?: string;
  icone?: React.ReactNode;
}) {
  const cores: Record<string, { on: string; ring: string; dot: string }> = {
    cyan: { on: "from-cyan-500 to-blue-500", ring: "ring-cyan-400/30", dot: "bg-white shadow-cyan-500/30" },
    rose: { on: "from-rose-500 to-pink-500", ring: "ring-rose-400/30", dot: "bg-white shadow-rose-500/30" },
    amber: { on: "from-amber-500 to-orange-500", ring: "ring-amber-400/30", dot: "bg-white shadow-amber-500/30" },
    red: { on: "from-red-500 to-rose-500", ring: "ring-red-400/30", dot: "bg-white shadow-red-500/30" },
    violet: { on: "from-violet-500 to-purple-500", ring: "ring-violet-400/30", dot: "bg-white shadow-violet-500/30" },
    emerald: { on: "from-emerald-500 to-green-500", ring: "ring-emerald-400/30", dot: "bg-white shadow-emerald-500/30" },
    blue: { on: "from-blue-500 to-indigo-500", ring: "ring-blue-400/30", dot: "bg-white shadow-blue-500/30" },
  };
  const c = cores[cor] || cores.cyan;

  return (
    <button
      type="button"
      onClick={() => onChange(!valor)}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all duration-200 hover:border-slate-300 hover:shadow-sm group"
    >
      <div className="flex items-center gap-3">
        {icone && <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${valor ? `bg-gradient-to-br ${c.on} text-white shadow-md ${c.ring}` : "bg-slate-100 text-slate-400"}`}>{icone}</span>}
        <span className={`text-sm font-semibold transition-colors duration-200 ${valor ? "text-slate-800" : "text-slate-500"}`}>{label}</span>
      </div>
      <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-all duration-300 ${valor ? `bg-gradient-to-r ${c.on} shadow-md ${c.ring}` : "bg-slate-200"}`}>
        <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-all duration-300 ${valor ? "translate-x-5 shadow-lg" : "translate-x-0"} ${c.dot}`} />
      </div>
    </button>
  );
}

// ── Componente Principal ───────────────────────────────────────────────

interface Props {
  paciente: Paciente;
  usuarioId: string;
  onFechar: () => void;
  onAtualizar?: (p: Paciente) => void;
  onAbrirAcomp?: (p: Paciente) => void;
}

export default function ModalDetalhes({ paciente, onFechar, onAtualizar, onAbrirAcomp }: Props) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  // Campos editáveis
  const [gestante, setGestante] = useState(paciente.gestante);
  const [has, setHas] = useState(paciente.has);
  const [dm, setDm] = useState(paciente.dm);
  const [hiv, setHiv] = useState(paciente.hiv);
  const [tb, setTb] = useState(paciente.tb);
  const [tabagista, setTabagista] = useState(paciente.tabagista);
  const [familiaBF, setFamiliaBF] = useState(paciente.familia_recebe_bf);
  const [microarea, setMicroarea] = useState(paciente.microarea || "");

  const [ultimosAcomps, setUltimosAcomps] = useState<Acompanhamento[]>([]);
  const [carregandoAcomps, setCarregandoAcomps] = useState(true);

  const idade = calcularIdade(paciente.data_de_nascimento);

  // Carregar últimos acompanhamentos
  useEffect(() => {
    let cancel = false;
    setCarregandoAcomps(true);
    buscarAcompanhamentos(paciente.id)
      .then((items) => { if (!cancel) setUltimosAcomps(items.slice(0, 5)); })
      .catch(() => { if (!cancel) setUltimosAcomps([]); })
      .finally(() => { if (!cancel) setCarregandoAcomps(false); });
    return () => { cancel = true; };
  }, [paciente.id]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function temAlteracoes() {
    return (
      gestante !== paciente.gestante ||
      has !== paciente.has ||
      dm !== paciente.dm ||
      hiv !== paciente.hiv ||
      tb !== paciente.tb ||
      tabagista !== paciente.tabagista ||
      familiaBF !== paciente.familia_recebe_bf ||
      microarea !== (paciente.microarea || "")
    );
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const atualizado = await atualizarPaciente(paciente.id, {
        gestante, has, dm, hiv, tb, tabagista,
        familia_recebe_bf: familiaBF,
        microarea,
      });
      setToast({ tipo: "ok", msg: "Dados do paciente atualizados com sucesso!" });
      setEditando(false);
      onAtualizar?.(atualizado);
    } catch {
      setToast({ tipo: "erro", msg: "Erro ao salvar. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }

  function handleCancelar() {
    setGestante(paciente.gestante);
    setHas(paciente.has);
    setDm(paciente.dm);
    setHiv(paciente.hiv);
    setTb(paciente.tb);
    setTabagista(paciente.tabagista);
    setFamiliaBF(paciente.familia_recebe_bf);
    setMicroarea(paciente.microarea || "");
    setEditando(false);
  }

  // Indicadores de saúde ativos
  const indicadores: { label: string; ativo: boolean; cor: string }[] = [
    { label: "Gestante", ativo: gestante, cor: "bg-gradient-to-r from-rose-500 to-pink-500" },
    { label: "Tabagista", ativo: tabagista, cor: "bg-gradient-to-r from-amber-500 to-orange-500" },
    { label: "HAS", ativo: has, cor: "bg-gradient-to-r from-red-500 to-rose-500" },
    { label: "DM", ativo: dm, cor: "bg-gradient-to-r from-violet-500 to-purple-500" },
    { label: "HIV", ativo: hiv, cor: "bg-gradient-to-r from-blue-500 to-indigo-500" },
    { label: "TB", ativo: tb, cor: "bg-gradient-to-r from-orange-500 to-red-500" },
    { label: "Bolsa Família", ativo: familiaBF, cor: "bg-gradient-to-r from-emerald-500 to-green-500" },
    ...(idade !== null && idade <= 2 ? [{ label: "Criança ≤ 2a", ativo: true, cor: "bg-gradient-to-r from-cyan-500 to-blue-500" }] : []),
  ];
  const indicadoresAtivos = indicadores.filter((i) => i.ativo);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

      <div
        className="relative mt-4 sm:mt-8 mb-8 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ Header ══════════════════════════════════════════════════ */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-black text-white shadow-lg shadow-cyan-500/30 ring-2 ring-white/20">
                {paciente.paciente?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200/70 mb-0.5">
                  {I.user}
                  DETALHES DO PACIENTE
                </div>
                <h2 className="truncate text-lg font-black text-white leading-tight">{paciente.paciente}</h2>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs font-bold text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/15 hover:text-white"
              >
                {I.edit}
                <span className="hidden sm:inline">Editar</span>
              </button>
            ) : (
              <button
                onClick={handleCancelar}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs font-bold text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/15 hover:text-white"
              >
                {I.x}
                <span className="hidden sm:inline">Cancelar</span>
              </button>
            )}
            <button onClick={onFechar} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/15 hover:text-white">
              {I.x}
            </button>
          </div>
        </div>

        {/* ── Toast ──────────────────────────────────────────────────── */}
        {toast && (
          <div className={`mx-5 mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm ${
            toast.tipo === "ok"
              ? "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-200/50"
              : "bg-gradient-to-r from-red-600 to-red-500 shadow-red-200/50"
          }`}>
            {toast.tipo === "ok" ? I.checkCircle : I.alerta}
            {toast.msg}
          </div>
        )}

        {/* ═══ Corpo ═════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Identificação (somente leitura) ─────────────────────── */}
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10">
                {I.user}
              </div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-700">Identificação</p>
            </div>
            <div className="rounded-xl border-l-4 border-cyan-500 bg-gradient-to-r from-cyan-50/80 to-white p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <InfoCampo label="Nome Completo" valor={paciente.paciente} />
                <InfoCampo label="CNS" valor={paciente.n_cns_da_pessoa_cadastrada} mono />
                <InfoCampo label="Prontuário" valor={paciente.n_pront} mono />
                <InfoCampo label="Nascimento" valor={`${formatarData(paciente.data_de_nascimento)}${idade !== null ? ` (${idade} ${idade === 1 ? "ano" : "anos"})` : ""}`} />
                <InfoCampo label="Unidade" valor={paciente.unidade} />
                <InfoCampo label="Equipe" valor={paciente.equipe} />
              </div>
            </div>
          </div>

          {/* ── Microárea (editável) ────────────────────────────────── */}
          {editando && (
            <div>
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z"/></svg>
                </div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700">Localização</p>
              </div>
              <div className="rounded-xl border-l-4 border-blue-500 bg-gradient-to-r from-blue-50/80 to-white p-3.5">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">Microárea</label>
                <input
                  type="text"
                  value={microarea}
                  onChange={(e) => setMicroarea(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 placeholder-slate-400/70 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15"
                  placeholder="Número ou identificação da microárea"
                />
              </div>
            </div>
          )}

          {/* ── Indicadores de Saúde ────────────────────────────────── */}
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
                <svg className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>
              </div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-violet-700">Indicadores de Saúde</p>
            </div>

            {editando ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <TogglePremium label="Gestante" valor={gestante} onChange={setGestante} cor="rose" icone={I.gestante} />
                <TogglePremium label="Tabagista" valor={tabagista} onChange={setTabagista} cor="amber" icone={I.tabagista} />
                <TogglePremium label="HAS" valor={has} onChange={setHas} cor="red" />
                <TogglePremium label="DM" valor={dm} onChange={setDm} cor="violet" />
                <TogglePremium label="HIV" valor={hiv} onChange={setHiv} cor="blue" />
                <TogglePremium label="TB" valor={tb} onChange={setTb} cor="red" icone={I.tb} />
                <TogglePremium label="Bolsa Família" valor={familiaBF} onChange={setFamiliaBF} cor="emerald" />
              </div>
            ) : (
              <div className="rounded-xl border-l-4 border-violet-500 bg-gradient-to-r from-violet-50/80 to-white p-3.5">
                {indicadoresAtivos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {indicadoresAtivos.map((ind) => (
                      <span key={ind.label} className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-md ${ind.cor}`}>
                        {ind.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-400 italic">Nenhum indicador de saúde ativo</p>
                )}
              </div>
            )}
          </div>

          {/* ── Últimos Acompanhamentos ─────────────────────────────── */}
          <div>
            <div className="mb-2.5 flex items-center gap-2 px-4 pt-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                {I.prontuario}
              </div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">Últimos Acompanhamentos</p>
            </div>

            <div className="rounded-xl border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50/80 to-white overflow-hidden">
              {carregandoAcomps ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
                  <span className="text-xs font-bold text-slate-400">Carregando...</span>
                </div>
              ) : ultimosAcomps.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                    {I.prontuario}
                  </div>
                  <p className="text-xs font-bold text-slate-400">Nenhum acompanhamento registrado</p>
                  {onAbrirAcomp && (
                    <button onClick={() => onAbrirAcomp(paciente)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-1.5 text-[10px] font-bold text-cyan-600 transition-colors hover:bg-cyan-100">
                      Registrar Primeiro
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ultimosAcomps.map((a) => (
                    <div key={a.id} className="px-4 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-500">
                          {I.calendario}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-700">{formatarData(a.data_da_busca)}</span>
                            <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-600 ring-1 ring-cyan-200/50">
                              {a.tipo_busca?.length > 35 ? a.tipo_busca.slice(0, 35) + "..." : a.tipo_busca || "\u2014"}
                            </span>
                          </div>
                          {a.situacao_pos_busca && (
                            <p className="mt-0.5 text-[10px] font-semibold text-slate-400 truncate">{a.situacao_pos_busca}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Botões de ação (modo edição) ────────────────────────── */}
          {editando && (
            <div className="flex items-center justify-between rounded-xl border border-cyan-200/60 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 p-4">
              <p className="text-[11px] font-semibold text-slate-500">
                {temAlteracoes() ? "Você tem alterações não salvas" : "Sem alterações"}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancelar}
                  className="text-xs font-bold text-slate-400 transition-colors hover:text-slate-600 px-5 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando || !temAlteracoes()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {salvando ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Salvando...</>
                  ) : (
                    <>{I.check} Salvar Alterações</>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Subcomponente InfoCampo ────────────────────────────────────────────

function InfoCampo({ label, valor, mono }: { label: string; valor?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-slate-700 truncate ${mono ? "font-mono text-xs" : ""}`}>{valor || "\u2014"}</p>
    </div>
  );
}
