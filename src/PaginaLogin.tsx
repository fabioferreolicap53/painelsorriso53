import { useState } from "react";

/**
 * Tela de autenticação — login via PocketBase REST API.
 * Valida contra collection painelsorriso53_users.
 * NÃO usa authWithPassword do SDK (modifica authStore).
 */

const PB_URL = import.meta.env.VITE_POCKETBASE_URL as string;
const PB_USERS_COLLECTION = "painelsorriso53_users";

function authUrl(): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_USERS_COLLECTION}/auth-with-password`;
}

interface LoginProps {
  onLogin: (token: string, record: { id: string; email: string; name: string; role: string }) => void;
}

export default function PaginaLogin({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(authUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: email.trim(), password }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.token) {
        setError("Email ou senha incorretos");
        return;
      }

      const { token, record } = data;

      // Salvar token no localStorage
      try {
        localStorage.setItem("pb_auth_token", token);
      } catch { /* ignore */ }

      onLogin(token, {
        id: record.id,
        email: record.email ?? email,
        name: record.name ?? "",
        role: record.role ?? "user",
      });
    } catch {
      setError("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0f2140] to-[#0a1628] px-4">
      {/* Orbs decorativos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-400/5 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-400/4 blur-[80px]" />
      </div>

      {/* Linha decorativa topo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {/* Card login */}
      <div className="relative w-full max-w-md">
        {/* Glow atrás do card */}
        <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-b from-blue-500/15 to-blue-600/5 blur-xl" />

        <div className="relative rounded-[2.5rem] border border-white/[0.08] bg-[#0f1d35]/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-blue-400/20">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-lg" />
              <svg viewBox="0 0 32 32" fill="none" className="relative h-9 w-9">
                <defs>
                  <linearGradient id="loginLogoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <path d="M16 3C11.5 3 8 5 8 9c0 2 .8 3.5 1.5 5.5C10.5 16.5 11 19 11 22c0 3 2 7 5 7s5-4 5-7c0-3 .5-5.5 1.5-7.5C23.2 12.5 24 11 24 9c0-4-3.5-6-8-6z" fill="url(#loginLogoGrad)" />
                <path d="M14 10c-1 0-2 .5-2 1.5s1 2 2 2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-wide text-white">PAINEL</span>
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-xl font-bold tracking-wide text-transparent">SORRISO</span>
              <span className="ml-1 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">5.3</span>
            </div>
            <p className="mt-1 text-[10px] font-medium tracking-wider text-blue-300/40">MONITORAMENTO COMUNITÁRIO</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/50">
                Email
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full rounded-2xl border-2 border-white/[0.08] bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white placeholder-blue-300/30 outline-none transition-colors focus:border-blue-500/40 focus:bg-white/[0.06]"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/50">
                Senha
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(e); }}
                  className="w-full rounded-2xl border-2 border-white/[0.08] bg-white/[0.04] py-3.5 pl-11 pr-12 text-sm text-white placeholder-blue-300/30 outline-none transition-colors focus:border-blue-500/40 focus:bg-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-400/40 transition-colors hover:text-blue-300/60"
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
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:from-blue-500 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Autenticando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px] text-blue-300/30">
            Acesso restrito a profissionais autorizados
          </p>
        </div>
      </div>
    </div>
  );
}
