import { useState, useEffect } from "react";
import { configCardsCategoria } from "./data";
import { buscarPacientes } from "./pocketbase";
import PaginaPacientes from "./PaginaPacientes";
import PaginaFavoritos from "./PaginaFavoritos";
import PaginaAcompanhamentos from "./PaginaAcompanhamentos";
import PaginaConfiguracoes from "./PaginaConfiguracoes";
import PaginaLogin from "./PaginaLogin";

// ── Tipos ───────────────────────────────────────────────────────────────

type Pagina = "resumo" | "pacientes" | "favoritos" | "acompanhamentos" | "configuracoes";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ── Header Premium ───────────────────────────────────────────────────────

interface HeaderProps {
  pagina: Pagina;
  onNavigate: (p: Pagina) => void;
  onLogout: () => void;
  user: AuthUser;
}

function Header({ pagina, onNavigate, onLogout, user }: HeaderProps) {
  const navItems: { key: Pagina; label: string; icon: string }[] = [
    { key: "resumo", label: "Resumo", icon: "📊" },
    { key: "pacientes", label: "Pacientes", icon: "👥" },
    { key: "favoritos", label: "Favoritos", icon: "⭐" },
    { key: "acompanhamentos", label: "Acompanhamentos", icon: "📋" },
  ];

  const userInitials = (user.name || user.email || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a1628]/95 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-blue-400/20">
            <div className="absolute inset-0 rounded-xl bg-blue-500/10 blur-md" />
            <svg viewBox="0 0 32 32" fill="none" className="relative h-6 w-6">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M16 3C11.5 3 8 5 8 9c0 2 .8 3.5 1.5 5.5C10.5 16.5 11 19 11 22c0 3 2 7 5 7s5-4 5-7c0-3 .5-5.5 1.5-7.5C23.2 12.5 24 11 24 9c0-4-3.5-6-8-6z" fill="url(#logoGrad)" />
              <path d="M14 10c-1 0-2 .5-2 1.5s1 2 2 2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold tracking-wide text-white">PAINEL</span>
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-[15px] font-bold tracking-wide text-transparent">SORRISO</span>
              <span className="ml-1 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">5.3</span>
            </div>
            <p className="mt-px text-[10px] font-medium tracking-wider text-blue-300/50">MONITORAMENTO DOS GRUPOS PRIORITÁRIOS</p>
          </div>
        </div>

        {/* Nav Pill Tabs — funcional */}
        <nav className="hidden items-center gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/[0.06] md:flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                pagina === item.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-blue-300/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User + Notificacoes */}
        <div className="flex items-center gap-3">
          {/* Engrenagem — configurações */}
          <button
            onClick={() => onNavigate("configuracoes")}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
              pagina === "configuracoes"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "bg-white/[0.04] text-blue-300/60 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] py-1.5 pl-1.5 pr-3 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.08]">
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-600/20">{userInitials}</div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a1628] bg-emerald-400" />
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-white">{user.name || user.email}</p>
              <p className="text-[10px] text-blue-400/50">{user.role === "admin" ? "Administrador" : "Usuário"}</p>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-blue-300/60 ring-1 ring-white/[0.06] transition-all duration-200 hover:bg-red-500/15 hover:text-red-400 hover:ring-red-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Hero Banner ─────────────────────────────────────────────────────────

/*
 * Hero com gradiente diferenciado do header.
 * Header = navy escuro #0a1628 (flat).
 * Hero = gradiente dinâmico + orbs decorativos.
 */

function HeroBanner({ totalPacientes }: { totalPacientes: number }) {
  return (
    <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#162544] via-[#1a3055] to-[#0d2247] px-8 py-6 sm:px-10">
      {/* Orbs decorativos — profundidade visual */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/8 blur-2xl" />
      <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-cyan-400/5 blur-2xl" />

      {/* Linha decorativa topo */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

      <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-400/10 px-3 py-1 ring-1 ring-blue-400/15">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Painel Geral</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            RESUMO <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">GERAL</span>
          </h1>
          <p className="mt-2 text-sm text-blue-200/60">
            Olá, Profissional! Acompanhe o panorama atualizado do seu território.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/[0.06] px-5 py-3 ring-1 ring-white/[0.08] backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
              Total de Pacientes
            </p>
            <p className="text-3xl font-bold text-white">
              {totalPacientes.toLocaleString("pt-BR")}
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-5 py-3 text-sm font-medium text-white ring-1 ring-white/[0.1] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.14] hover:ring-white/[0.18] hover:shadow-lg hover:shadow-blue-500/10">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filtros
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de Categoria ───────────────────────────────────────────────────

interface CardCategoriaProps {
  titulo: string;
  valor: number;
  percentual: number;
  corBorda: string;
  corBarra: string;
  comBusca?: number;
  semBusca?: number;
}

function CardCategoriaResumo({ titulo, valor, percentual, corBorda, corBarra, comBusca, semBusca }: CardCategoriaProps) {
  const total = (comBusca ?? 0) + (semBusca ?? 0);

  return (
    <div className={`rounded-xl border border-blue-100 border-l-4 ${corBorda} bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md`}>
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-wide leading-tight text-slate-500">{titulo}</p>
      </div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Absoluto</p>
          <p className="text-4xl font-bold tracking-tight text-slate-800">{valor.toLocaleString("pt-BR")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Percentual</p>
          <p className="text-4xl font-bold tracking-tight text-slate-800">{percentual}%</p>
        </div>
      </div>
      <div className="mb-4 h-3.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${corBarra} transition-all duration-500`} style={{ width: `${percentual}%` }} />
      </div>
      {total > 0 && (
        <div className="flex items-center gap-5 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </span>
            <div>
              <p className="text-sm text-slate-400">Com Busca</p>
              <p className="text-base font-bold text-slate-700">{comBusca ?? 0}<span className="ml-1 text-sm font-normal text-slate-400">{total > 0 ? Math.round(((comBusca ?? 0) / total) * 100) : 0}%</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </span>
            <div>
              <p className="text-sm text-slate-400">Sem Busca</p>
              <p className="text-base font-bold text-slate-700">{semBusca ?? 0}<span className="ml-1 text-sm font-normal text-slate-400">{total > 0 ? Math.round(((semBusca ?? 0) / total) * 100) : 0}%</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pagina Resumo ───────────────────────────────────────────────────────

function PaginaResumo() {
  const [totalPacientes, setTotalPacientes] = useState(0);
  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const { totalItems } = await buscarPacientes({ perPage: 1 });
        if (!cancelado) setTotalPacientes(totalItems);
      } catch {
        if (!cancelado) setTotalPacientes(0);
      }
    }
    carregar();
    return () => { cancelado = true; };
  }, []);

  return (
    <>
      <HeroBanner totalPacientes={totalPacientes} />
      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="-mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {configCardsCategoria.map((card) => (
            <CardCategoriaResumo key={card.categoria} titulo={card.titulo} valor={0} percentual={0} corBorda={card.corBorda} corBarra={card.corBarra} />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Componente Principal ─────────────────────────────────────────────────

export default function PainelSorriso53() {
  const [pagina, setPagina] = useState<Pagina>("resumo");
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("pb_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  function handleLogin(_token: string, record: AuthUser) {
    try { localStorage.setItem("pb_user", JSON.stringify(record)); } catch { /* ignore */ }
    setUser(record);
  }

  function handleLogout() {
    try {
      localStorage.removeItem("pb_auth_token");
      localStorage.removeItem("pb_user");
    } catch { /* ignore */ }
    setUser(null);
    setPagina("resumo");
  }

  if (!user) {
    return <PaginaLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header pagina={pagina} onNavigate={setPagina} onLogout={handleLogout} user={user} />

      {pagina === "resumo" && <PaginaResumo />}
      {pagina === "pacientes" && <PaginaPacientes />}
      {pagina === "favoritos" && <PaginaFavoritos />}
      {pagina === "acompanhamentos" && <PaginaAcompanhamentos />}
      {pagina === "configuracoes" && <PaginaConfiguracoes />}

      <footer className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        Painel Sorriso 5.3 &mdash; Sistema de Monitoramento dos Grupos Prioritários
      </footer>
    </div>
  );
}
