import { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

// ── Instruções por plataforma ─────────────────────────────────────────

const PLATFORM_INSTRUCTIONS: Record<string, { title: string; steps: string[]; icon: string }> = {
  android: {
    title: "Android",
    steps: [
      "Toque no ícone ⋮ (três pontos) no canto superior direito",
      'Selecione "Adicionar à tela inicial" ou "Instalar aplicativo"',
      'Confirme tocando em "Adicionar" ou "Instalar"',
    ],
    icon: "android",
  },
  ios: {
    title: "iPhone / iPad",
    steps: [
      'Toque no ícone de compartilhar 📤 na barra inferior',
      'Role para baixo e toque em "Adicionar à Tela de Início"',
      'Toque em "Adicionar" no canto superior direito',
    ],
    icon: "phone_iphone",
  },
  windows: {
    title: "Windows",
    steps: [
      'Clique no ícone de instalar (📥) na barra de endereços',
      'Ou acesse o menu ⋯ → "Aplicativos" → "Instalar este site"',
      "Confirme a instalação",
    ],
    icon: "desktop_windows",
  },
  other: {
    title: "Navegador",
    steps: [
      "Acesse o menu do navegador",
      'Procure por "Instalar aplicativo" ou "Adicionar aos atalhos"',
      "Confirme a instalação",
    ],
    icon: "language",
  },
};

// ── Componente ────────────────────────────────────────────────────────

export default function InstallBanner() {
  const { shouldShow, platform, canNativeInstall, install, dismiss } = useInstallPrompt();
  const [expanded, setExpanded] = useState(false);

  if (!shouldShow) return null;

  const instructions = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.other;

  return (
    <div className="pointer-events-auto animate-slide-down fixed inset-x-0 bottom-4 z-[200] mx-auto w-full max-w-[1380px] px-4 sm:px-6">
      <div className="group relative overflow-hidden rounded-2xl border border-cyan-200/40 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 shadow-2xl shadow-slate-900/40 sm:rounded-3xl">
        {/* Glow effects */}
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-400/15 blur-3xl transition-all duration-700 group-hover:scale-125" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        <div className="relative p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Ícone */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30 ring-1 ring-white/10 sm:h-12 sm:w-12">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
              </svg>
              <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 ring-2 ring-slate-900" />
            </div>

            {/* Texto */}
            <div className="min-w-0 flex-1">
              {canNativeInstall ? (
                <>
                  <h3 className="text-sm font-black text-white sm:text-base">
                    Instale o <span className="text-cyan-400">Painel Sorriso</span>
                  </h3>
                  <p className="mt-0.5 text-[10px] font-semibold text-white/50 sm:text-xs">
                    Acesse com um toque direto da sua tela inicial. Rápido, offline e sempre disponível.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-black text-white sm:text-base">
                    Instale no <span className="text-cyan-400">{instructions.title}</span>
                  </h3>
                  <p className="mt-0.5 text-[10px] font-semibold text-white/50 sm:text-xs">
                    {platform === "ios"
                      ? "Compartilhe esta página e adicione à tela inicial para acesso rápido."
                      : "Siga os passos abaixo para instalar este aplicativo."}
                  </p>
                </>
              )}
            </div>

            {/* Botão dispensar */}
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/10 hover:text-white/70"
              title="Dispensar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Botão principal */}
          <div className="mt-3">
            {canNativeInstall ? (
              <button
                onClick={install}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:from-cyan-300 hover:to-blue-400 hover:shadow-xl hover:shadow-cyan-500/30 active:scale-[0.98] sm:w-auto sm:px-6"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Instalar agora
              </button>
            ) : (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white/80 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-white/15 hover:text-white hover:ring-white/20 active:scale-[0.98] sm:w-auto sm:px-6"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                Como instalar
                <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* Instruções expandidas (manual) */}
          {expanded && !canNativeInstall && (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-sm sm:p-4">
              <div className="space-y-2.5">
                {instructions.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[9px] font-black text-white shadow-sm shadow-cyan-500/30">
                      {i + 1}
                    </div>
                    <p className="text-[11px] font-semibold leading-relaxed text-white/70 sm:text-xs">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 ring-1 ring-cyan-400/20">
                <svg className="h-3.5 w-3.5 shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-[9px] font-bold text-cyan-300/80 sm:text-[10px]">
                  Após instalar, acesse direto pela tela inicial — sem abrir o navegador!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
