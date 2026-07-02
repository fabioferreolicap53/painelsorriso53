import { useState } from "react";
import PaginaImportacao from "./PaginaImportacao";
import PaginaExclusao from "./PaginaExclusao";

interface UserConfig {
  nome: string;
  email: string;
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
          notificacoes: true,
          modoEscuro: false,
          idioma: "pt-BR",
        };
      }
    } catch { /* ignore */ }
    return { nome: "", email: "", notificacoes: true, modoEscuro: false, idioma: "pt-BR" };
  });

  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleSalvar() {
    try {
      const stored = localStorage.getItem("pb_user");
      if (stored) {
        const u = JSON.parse(stored);
        u.name = user.nome;
        localStorage.setItem("pb_user", JSON.stringify(u));
      }
    } catch { /* ignore */ }
    localStorage.setItem("user_preferences", JSON.stringify({
      notificacoes: user.notificacoes,
      modoEscuro: user.modoEscuro,
      idioma: user.idioma,
    }));
    setMensagem("Configurações salvas com sucesso!");
    setTimeout(() => setMensagem(null), 3000);
  }

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#162544] via-[#1a3055] to-[#0d2247] px-8 py-6 sm:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/8 blur-2xl" />
        <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-cyan-400/5 blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

        <div className="relative mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-400/10 px-3 py-1 ring-1 ring-blue-400/15">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-medium uppercase tracking-wide text-blue-300">Sistema</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              CONFIGURAÇÕES <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">do Sistema</span>
            </h1>
            <p className="mt-2 text-lg text-blue-200/60">
              Gerencie as preferências e configurações do Painel Sorriso 5.3.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1380px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Mensagem de sucesso */}
        {mensagem && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
            {mensagem}
          </div>
        )}

        {/* ═══ PERFIL DO USUÁRIO ═══════════════════════════════════════ */}
        <section className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Perfil do Usuário</h2>
              <p className="text-xs text-slate-400">Informações básicas da conta</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium uppercase tracking-wide text-slate-400">Nome</label>
              <input
                type="text"
                value={user.nome}
                onChange={(e) => setUser({ ...user, nome: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
              />
              <p className="text-sm text-slate-400">Email definido no cadastro</p>
            </div>
          </div>
        </section>

        {/* ═══ SEGURANÇA ═══════════════════════════════════════════════ */}
        <section className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Segurança</h2>
              <p className="text-xs text-slate-400">Gerencie sua sessão</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Sessão Ativa</p>
              <p className="text-sm text-slate-400">Você está logado no sistema</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("pb_auth_token");
                localStorage.removeItem("pb_user");
                window.location.reload();
              }}
              className="inline-flex items-center gap-2.5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sair
            </button>
          </div>
        </section>

        {/* ═══ BOTÃO SALVAR ═════════════════════════════════════════════ */}
        <div className="flex justify-end">
          <button
            onClick={handleSalvar}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-base font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-xl"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Salvar Alterações
          </button>
        </div>

        {/* ═══ IMPORTAÇÃO ═══════════════════════════════════════════════ */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Importação de Dados</h2>
          <PaginaImportacao />
        </section>

        {/* ═══ EXCLUSÃO ═══════════════════════════════════════════════ */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Gestão de Dados</h2>
          <PaginaExclusao />
        </section>
      </div>
    </>
  );
}
