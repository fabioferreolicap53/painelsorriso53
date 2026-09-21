import { useState } from "react";
import PaginaImportacao from "./PaginaImportacao";
import PaginaExclusao from "./PaginaExclusao";
import { relinkarPorCNS } from "./pocketbase";

interface UserConfig {
  nome: string;
  email: string;
  role: string;
  notificacoes: boolean;
  modoEscuro: boolean;
  idioma: string;
}

export default function PaginaConfiguracoes() {
  const [user, setUser] = useState<UserConfig>(() => {
    try {
      const stored = localStorage.getItem("pb_user");
      if (stored) {
        const u = JSON.parse(stored);
        return {
          nome: u.name ?? "",
          email: u.email ?? "",
          role: u.role ?? "",
          notificacoes: true,
          modoEscuro: false,
          idioma: "pt-BR",
        };
      }
    } catch { /* ignore */ }
    return { nome: "", email: "", role: "", notificacoes: true, modoEscuro: false, idioma: "pt-BR" };
  });

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [novoEmail, setNovoEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [relinkLoading, setRelinkLoading] = useState(false);
  const [relinkProgress, setRelinkProgress] = useState<{ fase: string; atual: number; total: number } | null>(null);
  const [relinkResult, setRelinkResult] = useState<{ vinculados: number; ignorados: number } | null>(null);

  // Competência do banco de dados
  function getCompetenciaAtual(): string {
    const now = new Date();
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    return `${ano}-${mes}`;
  }
  const [competencia, setCompetencia] = useState(() => {
    try {
      const stored = localStorage.getItem("pb_competencia");
      if (stored) return stored;
    } catch { /* ignore */ }
    return getCompetenciaAtual();
  });

  function handleSalvar() {
    try {
      const stored = localStorage.getItem("pb_user");
      if (stored) {
        const u = JSON.parse(stored);
        u.name = user.nome;
        localStorage.setItem("pb_user", JSON.stringify(u));
      }
    } catch { /* ignore */ }
    localStorage.setItem("pb_competencia", competencia);
    localStorage.setItem("user_preferences", JSON.stringify({
      notificacoes: user.notificacoes,
      modoEscuro: user.modoEscuro,
      idioma: user.idioma,
    }));
    setMensagem("Configurações salvas com sucesso!");
    setTimeout(() => setMensagem(null), 3000);
  }

  const PB_URL = (import.meta.env.VITE_POCKETBASE_URL as string).replace(/\/+$/, "");
  const PB_COLLECTION = "painelsorriso53_users";

  async function handleRelink() {
    if (!window.confirm("Re-vincular acompanhamentos por CNS?\n\nEsta operação vai cruzar o campo CNS entre pacientes e acompanhamentos, corrigindo vínculos quebrados após reimportação.")) return;

    setRelinkLoading(true);
    setRelinkResult(null);
    try {
      const result = await relinkarPorCNS((fase, atual, total) => {
        setRelinkProgress({ fase, atual, total });
      });
      setRelinkResult({ vinculados: result.vinculados.length, ignorados: result.ignorados });
    } catch {
      setRelinkResult(null);
      alert("Erro ao re-vincular registros.");
    } finally {
      setRelinkLoading(false);
      setRelinkProgress(null);
    }
  }

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    if (!novoEmail.trim() || novoEmail.trim() === user.email) {
      setEmailMsg({ tipo: "erro", texto: "Digite um e-mail diferente do atual." });
      return;
    }
    setEmailLoading(true);
    try {
      const authToken = localStorage.getItem("pb_auth_token") || "";
      const resp = await fetch(`${PB_URL}/api/collections/${PB_COLLECTION}/request-email-change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(authToken ? { "Authorization": authToken } : {}),
        },
        body: JSON.stringify({ newEmail: novoEmail.trim() }),
      });
      if (resp.ok) {
        setEmailMsg({ tipo: "ok", texto: "E-mail de confirmação enviado. Verifique sua caixa de entrada." });
        setNovoEmail("");
      } else {
        const data = await resp.json();
        setEmailMsg({ tipo: "erro", texto: data.message || "Erro ao solicitar troca de e-mail." });
      }
    } catch {
      setEmailMsg({ tipo: "erro", texto: "Erro ao conectar ao servidor." });
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <>
      {/* Hero — dark premium */}
      <div className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 px-5 py-5 sm:px-6 shadow-xl shadow-slate-900/30">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-cyan-500/15 blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        <div className="relative mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600" />
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              CONFIGURAÇÕES <span className="text-cyan-300 font-bold">do Sistema</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">

        {/* Mensagem de sucesso */}
        {mensagem && (
          <div className="mb-6 flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3.5 text-sm font-semibold text-emerald-700 shadow-sm shadow-emerald-100/50">
            <svg className="h-4.5 w-4.5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            {mensagem}
          </div>
        )}

        {/* ═══ GRID — 2 colunas × 2 linhas ══════════════════════════ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ═══ CARD: PERFIL ══════════════════════════════════════ */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-slate-200/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 ring-1 ring-blue-200/40 transition-colors group-hover:ring-blue-200/70">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-700">Perfil do Usuário</h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Informações básicas da conta</p>
                </div>
              </div>
              <div className="mb-6 h-px bg-gradient-to-r from-slate-100 via-slate-100/60 to-transparent" />
              {/* Info badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/50">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  {user.nome || "Usuário"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/60">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                  {user.email || "sem email"}
                </span>
              </div>
              {/* Content */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Nome</label>
                  <input
                    type="text"
                    value={user.nome}
                    onChange={(e) => setUser({ ...user, nome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[15px] text-slate-700 outline-none transition-all duration-200 placeholder-slate-400/60 focus:border-blue-400/60 focus:bg-white focus:ring-2 focus:ring-blue-400/10"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Email Atual</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full rounded-xl border border-slate-200/60 bg-slate-100/80 px-4 py-3 text-[15px] text-slate-500"
                  />
                </div>
              </div>
              {/* Trocar Email */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/80 to-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Alterar E-mail</h3>
                </div>
                <p className="mb-4 text-sm text-slate-500">O novo endereço receberá um link de confirmação. Somente após validação o e-mail será atualizado na conta.</p>
                <form onSubmit={handleRequestEmailChange} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Novo e-mail</label>
                    <input
                      type="email"
                      value={novoEmail}
                      onChange={(e) => { setNovoEmail(e.target.value); setEmailMsg(null); }}
                      placeholder="novo@email.com"
                      className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[15px] text-slate-700 outline-none transition-all duration-200 placeholder-slate-400/60 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={emailLoading || !novoEmail.trim()}
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-md shadow-blue-200/50 transition-all duration-200 hover:from-blue-500 hover:to-blue-600 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {emailLoading ? (
                      <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Enviando...</span>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                        Solicitar Troca
                      </>
                    )}
                  </button>
                </form>
                {emailMsg && (
                  <div className={`mt-3 flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-xs font-bold ${emailMsg.tipo === "ok" ? "border border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border border-rose-200/60 bg-rose-50 text-rose-700"}`}>
                    {emailMsg.tipo === "ok" ? (
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                    )}
                    {emailMsg.texto}
                  </div>
                )}
              </div>
              {/* Competência do Banco de Dados — apenas CAP */}
              {user.role === "cap" && (
                <div className="mt-5 rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-white p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <svg className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-600">Competência do Banco</h3>
                  </div>
                  <p className="mb-3 text-sm text-slate-500">Define o mês/ano de referência dos dados importados. Exibido na página Resumo.</p>
                  <input
                    type="month"
                    value={competencia}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full rounded-xl border border-cyan-200/80 bg-white px-4 py-3 text-[15px] font-bold text-slate-700 outline-none transition-all duration-200 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                <p className="text-xs text-slate-400">Alterações são salvas localmente no navegador.</p>
                <button
                  onClick={handleSalvar}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-md shadow-blue-200/50 transition-all duration-200 hover:from-blue-500 hover:to-blue-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>

          {/* ═══ CARD: SEGURANÇA ═══════════════════════════════════ */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-slate-200/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex flex-col p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/60 ring-1 ring-rose-200/40 transition-colors group-hover:ring-rose-200/70">
                  <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-700">Segurança</h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Gerencie sua sessão</p>
                </div>
              </div>
              <div className="mb-6 h-px bg-gradient-to-r from-slate-100 via-slate-100/60 to-transparent" />
              {/* Session info */}
              <div className="mb-4 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/50 to-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-200/50">
                      <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50" />
                      <div className="absolute inset-0 rounded-xl animate-ping bg-emerald-400/20" style={{ animationDuration: "3s" }} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-700">Sessão Ativa</p>
                      <p className="text-xs font-semibold text-slate-400">Autenticado via PocketBase</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("pb_auth_token");
                      localStorage.removeItem("pb_user");
                      window.location.reload();
                    }}
                    className="inline-flex items-center gap-2.5 rounded-xl border border-rose-200/60 bg-rose-50 px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-rose-600 transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 hover:shadow-sm active:scale-[0.97]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
              {/* Security details */}
              <div className="mb-4 space-y-2.5">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600">Token de autenticação</p>
                    <p className="text-[11px] text-slate-400">Armazenado em localStorage — expira conforme política do servidor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600">Regras de acesso</p>
                    <p className="text-[11px] text-slate-400">Permissões controladas no PocketBase por role (admin / cap / user)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600">Sessão persistente</p>
                    <p className="text-[11px] text-slate-400">Mantida entre abas — encerrar sessão remove todos os dados locais</p>
                  </div>
                </div>
              </div>
              {/* Danger zone */}
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  <div>
                    <p className="text-xs font-bold text-amber-700">Encerrar sessão remove todos os dados salvos localmente</p>
                    <p className="text-[11px] text-amber-600/70">Token, preferências e favoritos serão apagados do navegador.</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-center text-xs font-semibold text-slate-300 uppercase tracking-widest">PocketBase v0.39.4</p>
              </div>
            </div>
          </div>

          {/* ═══ CARD: IMPORTAÇÃO ══════════════════════════════════ */}
          {user.role === "cap" && (
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-slate-200/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 ring-1 ring-blue-200/40 transition-colors group-hover:ring-blue-200/70">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-700">Importação de Dados</h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Importar registros via CSV</p>
                </div>
              </div>
              <div className="mb-6 h-px bg-gradient-to-r from-slate-100 via-slate-100/60 to-transparent" />
              {/* Info badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/50">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  Lotes de 500 registros
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/60">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Máx. 50MB
                </span>
              </div>
              {/* Dica */}
              <div className="mb-5 rounded-xl border border-blue-100/60 bg-blue-50/30 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-4 w-4 flex-shrink-0 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                  <div>
                    <p className="text-xs font-bold text-blue-700">Colunas aceitas</p>
                    <p className="text-[11px] text-blue-600/70">unidade, equipe, microárea, paciente, n_pront, gestante, tb, tabagista, menor_de_2_anos, data_de_nascimento, n_cns_da_pessoa_cadastrada, idade</p>
                  </div>
                </div>
              </div>
              {/* Content — reset sub-component styles */}
              <div className="[&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-transparent [&>div]:!p-0 [&>div]:!max-w-none [&>div]:!mx-0 [&>div]:!rounded-none [&>div>div]:!rounded-2xl [&>div>div]:!border [&>div>div]:!border-slate-200/60 [&>div>div]:!shadow-sm">
                <PaginaImportacao />
              </div>
            </div>
          </div>
          )}

          {/* ═══ CARD: EXCLUSÃO ═══════════════════════════════════ */}
          {user.role === "cap" && (
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-slate-200/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/60 ring-1 ring-rose-200/40 transition-colors group-hover:ring-rose-200/70">
                  <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-700">Exclusão de Dados</h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Excluir todos os registros</p>
                </div>
              </div>
              <div className="mb-6 h-px bg-gradient-to-r from-slate-100 via-slate-100/60 to-transparent" />
              {/* Warning */}
              <div className="mb-5 rounded-xl border border-rose-100/60 bg-rose-50/30 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-4 w-4 flex-shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  <div>
                    <p className="text-xs font-bold text-rose-700">Ação permanente e irreversível</p>
                    <p className="text-[11px] text-rose-600/70">Todos os registros da coleção serão removidos. Será necessário reimportar via CSV após a exclusão.</p>
                  </div>
                </div>
              </div>
              {/* Info badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/50">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Requer senha de admin
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/60">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                  Lotes de 100 exclusões
                </span>
              </div>
              {/* Content — reset sub-component styles */}
              <div className="[&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-transparent [&>div]:!p-0 [&>div]:!max-w-none [&>div]:!mx-0 [&>div]:!rounded-none [&>div>div]:!rounded-2xl [&>div>div]:!border [&>div>div]:!border-slate-200/60 [&>div>div]:!shadow-sm">
                <PaginaExclusao />
              </div>
            </div>
          </div>
          )}

          {/* ═══ CARD: RE-VINCULAÇÃO POR CNS ═══════════════════════════ */}
          {user.role === "cap" && (
          <div className="group col-span-1 lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-slate-200/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 ring-1 ring-emerald-200/40 transition-colors group-hover:ring-emerald-200/70">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-700">Re-vinculação por CNS</h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Restaurar vínculos de acompanhamentos</p>
                </div>
              </div>
              <div className="mb-6 h-px bg-gradient-to-r from-slate-100 via-slate-100/60 to-transparent" />
              <div className="mb-5 rounded-xl border border-emerald-100/60 bg-emerald-50/30 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                  <div>
                    <p className="text-xs font-bold text-emerald-700">Cruza CNS entre pacientes e acompanhamentos</p>
                    <p className="text-[11px] text-emerald-600/70">Útil após excluir e reimportar pacientes — IDs mudam mas o CNS permanece. Esta operação restaura os vínculos.</p>
                  </div>
                </div>
              </div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/50">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                  Via API REST — seguro
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/60">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
                  1 a 1 via PATCH
                </span>
              </div>
              {relinkLoading && relinkProgress && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-700">{relinkProgress.fase}</p>
                  {relinkProgress.total > 0 && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-emerald-600">
                        <span>{relinkProgress.atual.toLocaleString("pt-BR")} / {relinkProgress.total.toLocaleString("pt-BR")}</span>
                        <span>{Math.round((relinkProgress.atual / relinkProgress.total) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300" style={{ width: `${(relinkProgress.atual / relinkProgress.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {relinkResult && (
                <div className={`mb-5 rounded-xl border p-4 ${relinkResult.vinculados > 0 ? "border-emerald-200/60 bg-emerald-50" : "border-slate-200/60 bg-slate-50"}`}>
                  <div className="flex items-center gap-2.5">
                    {relinkResult.vinculados > 0 ? (
                      <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                    )}
                    <p className={`text-xs font-bold ${relinkResult.vinculados > 0 ? "text-emerald-700" : "text-slate-600"}`}>
                      {relinkResult.vinculados > 0
                        ? `${relinkResult.vinculados.toLocaleString("pt-BR")} registros re-vinculados com sucesso!`
                        : "Todos os acompanhamentos já estão vinculados corretamente."}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end">
                <button
                  onClick={handleRelink}
                  disabled={relinkLoading}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-md shadow-emerald-200/50 transition-all duration-200 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {relinkLoading ? (
                    <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Processando...</span>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                      Re-vincular por CNS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
