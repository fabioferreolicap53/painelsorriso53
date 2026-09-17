import { useState, useEffect, useMemo } from "react";
import SmileIcon from "./SmileIcon";

const PB_URL = import.meta.env.VITE_POCKETBASE_URL as string;
const PB_USERS = "painelsorriso53_users";

function pb(endpoint: string): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_USERS}/${endpoint}`;
}

// ── Dados: Unidades + Equipes ──────────────────────────────────────────

const UNIDADES_EQUIPES: Record<string, string[]> = {
  "SMS CF VALERIA GOMES ESTEVES AP 53": ["BARREIRA", "PIAI", "PEDRO LEITAO", "BALNEARIO GLOBO", "EUCALIPAL"],
  "SMS CF LOURENCO DE MELLO AP 53": ["BAIRRO FARIAS", "ALZIRA MARTINHO", "ALZIRA GENI"],
  "SMS CF DEOLINDO COUTO AP 53": ["DR. CONTINENTINO", "JAQUEIRA", "PEDRINHAS", "BONS AMIGOS", "MARQUES DE ERVAL"],
  "SMS CF EDSON ABDALLA SAAD AP 53": ["PRACA DO MAIA", "MARCOLINA", "ESPERANCA", "PALESTINA", "VETERANO", "CENTRO CULTURAL"],
  "SMS CF HELANDE DE MELLO GONCALVES AP 53": ["SAO PAULO", "VIEIRAS", "JULIA MIGUEL"],
  "SMS CF ILZO MOTTA DE MELLO AP 53": ["TRES PONTES", "MARIA APARECIDA", "ROBERTO MORENA"],
  "SMS CF JAMIL HADDAD AP 53": ["ANDORINHAS", "AUSTIN", "COLINA", "IPEG", "AGAI"],
  "SMS CF JOSE ANTONIO CIRAUDO AP 53": ["SAO BENEDITO", "SAO DOMINGOS SAVIO", "AREIA BRANCA", "COQUEIRAL (C)", "VITOR DUMAS", "AURORA", "MANOEL JULIO"],
  "SMS CF LENICE MARIA MONTEIRO COELHO AP 53": ["LOTE 14", "BOA ESPERANCA", "SAQUASSU", "PARQUE DAS PEDRAS"],
  "SMS CF SERGIO AROUCA AP 53": ["JARDIM ITA", "IMPERIO", "CAMPEIRO MOR", "GENERAL OLIMPIO", "BODEGAO", "BOA VISTA"],
  "SMS CMS EMYDIO CABRAL AP 53": ["1º DE ABRIL", "GOUVEIA", "DR. HELIO RIBEIRO", "MONTE SINAI", "MONTE DAS OLIVEIRA"],
  "SMS CMS SAVIO ANTUNES ANTARES AP 53": ["CAMPO DOS BANDEIRANTES", "SEMPRE VIDA", "PONTE AMARELA"],
  "SMS CF SAMUEL PENHA VALLE AP 53": ["ALTA", "TORRE", "VAGAO"],
  "SMS CMS DECIO AMARAL FILHO AP 53": ["MAESTRO OLIMPIO", "VALE DOS PALMARES", "URUCANIA", "BARRO VERMELHO", "BAMBUZAL", "53 EAP 01"],
  "SMS CMS CYRO DE MELLO MANGUARIBA AP 53": ["JOAO DE BARRO", "PARAISO", "NOVA INDIA"],
  "SMS CMS ADELINO SIMOES NOVA SEPETIBA AP 53": ["RUBI", "SAFIRA", "ESMERALDA", "TOPAZIO", "DIAMANTE"],
  "SMS CF WALDEMAR BERARDINELLI AP 53": ["TRES PODERES", "AMAZONAS", "AREAL", "TRIUNFO", "IPIRANGA", "MIRANTE", "COQUEIRAL (W)", "ILHA DO TATU"],
  "SMS CMS CATTAPRETA AP 53": ["ALVORADA", "CONJUNTO 61", "CHATUBA"],
  "SMS CF ERNANI DE PAIVA FERREIRA BRAGA AP 53": ["SERAFIM VIEGAS", "GUANDU I E LIBERDADE", "MIECIMO", "PADRE GUILHERME DECAMINADA", "HORTO FLORESTAL", "VILLAGE ATLANTA", "GUANDU E GUANDU VELHO", "JOAO XXIII"],
  "SMS CMS CESARIO DE MELLO AP 53": ["FELIPE CARDOSO", "CURRAL FALSO", "BLASO", "VERIDIANA", "MARQUES", "CARVALHAU", "TASSO"],
  "SMS CF JOAO BATISTA CHAGAS AP 53": ["AGUAS DA PRATA", "DO FUTURO", "NOVA ESPERANCA", "VENDA DE VARANDA", "OLINDINA", "APURUNA", "JARDINS"],
  "SMS CMS ALOYSIO AMANCIO DA SILVA AP 53": ["MORRO DO AR"],
  "SMS CMS FLORIPES GALDINO PEREIRA AP 53": ["SAGRADO CORACAO", "NOVO HORIZONTE"],
  "SMS CF ALICE DE JESUS REGO AP 53": ["JESUITAS", "BAIXADINHA", "MERCADANTE", "NOVO CONDOMINIO"],
  "SMS CMS MARIA APARECIDA DE ALMEIDA AP 53": ["CESARINHO"],
};

const UNIDADES = Object.keys(UNIDADES_EQUIPES).sort();

// ── Shared UI ──────────────────────────────────────────────────────────

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-cyan-400/5 blur-[100px]" />
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-b from-blue-500/10 to-transparent blur-xl" />
        <div className="relative rounded-[3rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/60 p-8 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-b from-cyan-400 to-blue-400 shadow-xl shadow-cyan-500/20 ring-1 ring-white/20">
        <SmileIcon className="h-10 w-10" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-black tracking-tight text-slate-900">PAINEL</span>
        <span className="text-xl font-black tracking-tight text-blue-600">SORRISO</span>
        <span className="ml-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-600 ring-1 ring-blue-100">5.3</span>
      </div>
    </div>
  );
}

function InputField({ label, icon, ...props }: { label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{icon}</span>
        <input {...props} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-300 outline-none transition-all focus:border-blue-400/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5" />
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-xs font-bold text-rose-600">{msg}</div>;
}

function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-xs font-bold text-emerald-600">{msg}</div>;
}

// ── Login ──────────────────────────────────────────────────────────────

interface LoginProps {
  onLogin: (token: string, record: { id: string; email: string; name: string; role: string; unidade?: string; equipe?: string; favoritos?: string[] }) => void;
  onNavigate: (view: string) => void;
}


export function TelaLogin({ onLogin, onNavigate }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Preencha email e senha"); return; }
    setLoading(true);
    try {
      const resp = await fetch(pb("auth-with-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: email.trim(), password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.token) { setError("Email ou senha incorretos"); return; }
      if (data.record && (data.record.verified === false || data.record.verified === 0)) {
        setError("Email não confirmado. Verifique sua caixa de entrada.");
        return;
      }
      try { localStorage.setItem("pb_auth_token", data.token); } catch { /* */ }
      onLogin(data.token, {
        id: data.record.id,
        email: data.record.email ?? email,
        name: data.record.name ?? "",
        role: data.record.role ?? "unidade",
        unidade: data.record.unidade ?? "",
        equipe: data.record.equipe ?? "",
      });
    } catch {
      setError("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <Logo />
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Email"
          type="email"
          placeholder="exemplo@email.com"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
        />
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Senha</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg></span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(e); }}
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-12 pr-12 text-sm font-medium text-slate-900 placeholder-slate-300 outline-none transition-all focus:border-blue-400/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors hover:text-slate-500">
              {showPassword
                ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              }
            </button>
          </div>
        </div>
        <ErrorMsg msg={error} />
        <button type="submit" disabled={loading} className="relative w-full overflow-hidden rounded-2xl bg-blue-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Autenticando...</span> : "Entrar no Painel"}
        </button>
      </form>
      <div className="mt-6 flex flex-col items-center gap-3">
        <button onClick={() => onNavigate("register")} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
          Criar conta
        </button>
        <button onClick={() => onNavigate("forgot")} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
          Esqueceu a senha?
        </button>
      </div>
      <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
        Acesso Restrito &bull; Versão 5.3
      </p>
    </AuthCard>
  );
}

// ── Registro ───────────────────────────────────────────────────────────

interface RegisterProps {
  onNavigate: (view: string) => void;
}

export function TelaRegister({ onNavigate }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"unidade" | "odonto" | "cap">("unidade");
  const [unidade, setUnidade] = useState("");
  const [equipes, setEquipes] = useState<string[]>([]);
  const [showEquipes, setShowEquipes] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Dados de usuários existentes ────────────────────────────────────
  const [usuariosExistentes, setUsuariosExistentes] = useState<{ role: string; unidade: string; equipe: string }[]>([]);
  const [carregandoVagas, setCarregandoVagas] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const url = `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_USERS}/records?perPage=500&fields=role,unidade,equipe`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.items) setUsuariosExistentes(data.items);
      } catch { /* ignora — sem dados = tudo liberado */ }
      setCarregandoVagas(false);
    })();
  }, []);

  // ── Análise de vagas ────────────────────────────────────────────────
  const unidadesOcupadas = useMemo(() => {
    const map: Record<string, number> = {};
    usuariosExistentes.forEach((u) => {
      if ((u.role === "unidade" || u.role === "cap") && u.unidade) {
        map[u.unidade] = (map[u.unidade] || 0) + 1;
      }
    });
    return map;
  }, [usuariosExistentes]);

  const capExiste = useMemo(() => usuariosExistentes.some((u) => u.role === "cap"), [usuariosExistentes]);

  const equipesVinculadasPorUnidade = useMemo(() => {
    const map: Record<string, string[]> = {};
    usuariosExistentes.forEach((u) => {
      if (u.role === "odonto" && u.unidade && u.equipe) {
        const eqs = u.equipe.split(",").map((s) => s.trim()).filter(Boolean);
        if (!map[u.unidade]) map[u.unidade] = [];
        map[u.unidade].push(...eqs);
      }
    });
    return map;
  }, [usuariosExistentes]);

  // ── Listas filtradas ────────────────────────────────────────────────
  const unidadesDisponiveis = useMemo(() => {
    return UNIDADES.map((u) => ({
      nome: u,
      vagas: role === "cap" ? (capExiste ? 0 : 1) : (unidadesOcupadas[u] ?? 0),
      disponivel: role === "cap" ? !capExiste : !(unidadesOcupadas[u] > 0),
    }));
  }, [role, capExiste, unidadesOcupadas]);

  const equipesDisponiveis = useMemo(() => {
    if (!unidade) return [];
    const todas = UNIDADES_EQUIPES[unidade] || [];
    const vinculadas = equipesVinculadasPorUnidade[unidade] || [];
    return todas.map((eq) => ({
      nome: eq,
      vinculada: vinculadas.includes(eq),
    }));
  }, [unidade, equipesVinculadasPorUnidade]);

  const equipesFiltradas = unidade ? (UNIDADES_EQUIPES[unidade] || []) : [];
  const equipesNaoVinculadas = unidade ? equipesDisponiveis.filter((e) => !e.vinculada).map((e) => e.nome) : [];

  // ── Reset ao trocar unidade ─────────────────────────────────────────
  useEffect(() => {
    setEquipes([]);
  }, [unidade]);

  function toggleEquipe(eq: string) {
    setEquipes((prev) => prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password.trim()) { setError("Preencha todos os campos obrigatórios"); return; }
    if (password.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return; }
    if (password !== confirmPassword) { setError("As senhas não conferem"); return; }
    if (role === "unidade" && !unidade) { setError("Selecione a unidade"); return; }
    if (role === "odonto" && !unidade) { setError("Selecione a unidade"); return; }
    if (role === "unidade" && unidadesOcupadas[unidade] > 0) { setError("Esta unidade já possui cadastro ativo"); return; }
    if (role === "cap" && capExiste) { setError("Já existe um cadastro CAP ativo"); return; }
    if (role === "odonto" && equipes.length === 0) { setError("Selecione pelo menos uma equipe"); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        email: email.trim(),
        password,
        passwordConfirm: confirmPassword,
        role,
        unidade: (role === "unidade" || role === "odonto") ? unidade : "",
        equipe: role === "odonto" ? equipes.join(", ") : "",
      };

      const resp = await fetch(pb("records"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.message || data.data?.email?.message || "Erro ao criar conta");
        return;
      }

      // Enviar email de verificação
      try {
        await fetch(pb("confirm-verification"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
      } catch { /* ignora erro de envio de email */ }

      setSuccess("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      setTimeout(() => onNavigate("login"), 3000);
    } catch {
      setError("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  const iconMail = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>;
  const iconLock = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
  const iconBuilding = <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>;

  return (
    <AuthCard>
      <Logo />
      <h2 className="mb-6 text-center text-sm font-black uppercase tracking-[0.15em] text-slate-700">Criar Conta</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Email" type="email" placeholder="exemplo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} icon={iconMail} />
        <InputField label="Senha (mín. 8 caracteres)" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} icon={iconLock} />
        <InputField label="Confirmar senha" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={iconLock} />

        {/* Role */}
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Perfil de acesso</label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {([
              { value: "unidade" as const, label: "Unidade", desc: "Acomp. da unidade", badge: capExiste ? null : "1 vaga" },
              { value: "odonto" as const, label: "Odonto", desc: "Equipes vinculadas", badge: null },
              { value: "cap" as const, label: "CAP", desc: "Todos os registros", badge: capExiste ? "Ocupado" : "1 vaga" },
            ]).map((r) => {
              const bloqueado = (r.value === "cap" && capExiste) || carregandoVagas;
              return (
                <button key={r.value} type="button"
                  disabled={bloqueado}
                  onClick={() => { setRole(r.value); setUnidade(""); setEquipes([]); setShowEquipes(r.value === "odonto"); }}
                  className={`relative rounded-xl border-2 px-2.5 py-3 sm:px-3 text-center transition-all duration-200 ${
                    bloqueado
                      ? "cursor-not-allowed border-slate-100 bg-slate-50/50 opacity-50"
                      : role === r.value
                        ? "border-blue-400 bg-blue-50 ring-4 ring-blue-500/5"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                  }`}>
                  <span className={`block text-[11px] sm:text-xs font-black uppercase leading-tight ${role === r.value ? "text-blue-600" : bloqueado ? "text-slate-300" : "text-slate-500"}`}>{r.label}</span>
                  <span className={`mt-1 block text-[8px] sm:text-[9px] font-semibold leading-tight ${bloqueado ? "text-slate-300" : "text-slate-400"}`}>{r.desc}</span>
                  {r.badge && (
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-wider ${
                      r.badge === "Ocupado" ? "bg-rose-100 text-rose-500" : "bg-emerald-100 text-emerald-600"
                    }`}>{r.badge}</span>
                  )}
                  {bloqueado && r.value === "cap" && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 shadow-sm">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {carregandoVagas && (
            <p className="mt-2 text-center text-[9px] font-bold text-slate-300 uppercase tracking-wider">Verificando vagas disponíveis...</p>
          )}
        </div>

        {/* Unidade - aparece para unidade e odonto */}
        {(role === "unidade" || role === "odonto") && (
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Unidade de Saúde</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{iconBuilding}</span>
              <select value={unidade} onChange={(e) => { setUnidade(e.target.value); setEquipes([]); }}
                className="w-full appearance-none rounded-2xl border-2 border-slate-100 bg-slate-50 py-3.5 pl-12 pr-10 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-400/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5">
                <option value="">Selecione a unidade...</option>
                {unidadesDisponiveis.map((u) => (
                  <option key={u.nome} value={u.nome} disabled={!u.disponivel}>
                    {u.nome} {u.disponivel ? "" : "— indisponível"}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </div>
            {unidade && role === "unidade" && unidadesOcupadas[unidade] > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-rose-500">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                Esta unidade já possui um cadastro ativo. Não é possível criar outro.
              </p>
            )}
            {unidade && role === "odonto" && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50/80 px-3 py-2 ring-1 ring-blue-100">
                <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                <span className="text-[10px] font-bold text-blue-600">
                  {equipesVinculadasPorUnidade[unidade]?.length || 0} equipe(s) já vinculada(s) — apenas equipes restantes disponíveis
                </span>
              </div>
            )}
          </div>
        )}

        {/* Equipes vinculadas - aparece para odonto com unidade selecionada */}
        {role === "odonto" && unidade && equipesFiltradas.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowEquipes(!showEquipes)}
              className="mb-2 flex w-full items-center justify-between rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 transition-all hover:border-slate-200">
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Equipes Vinculadas</span>
                <span className="block text-xs font-bold text-slate-600">
                  {equipes.length > 0 ? `${equipes.length} selecionada(s)` : "Nenhuma selecionada"}
                  <span className="ml-1 text-[9px] font-semibold text-slate-400">
                    · {equipesNaoVinculadas.length} disponível(is)
                  </span>
                </span>
              </div>
              <svg className={`h-4 w-4 text-slate-400 transition-transform ${showEquipes ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {showEquipes && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2 space-y-1">
                {equipesDisponiveis.map((eq) => {
                  const indisponivel = eq.vinculada;
                  const selecionada = equipes.includes(eq.nome);
                  return (
                    <button key={eq.nome} type="button"
                      disabled={indisponivel}
                      onClick={() => { if (!indisponivel) toggleEquipe(eq.nome); }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                        indisponivel
                          ? "cursor-not-allowed bg-slate-50/60 opacity-40"
                          : selecionada
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                        selecionada ? "border-blue-500 bg-blue-500" : indisponivel ? "border-slate-200 bg-slate-100" : "border-slate-200"
                      }`}>
                        {selecionada && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                        {indisponivel && <svg className="h-2.5 w-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>}
                      </span>
                      <span className="flex-1">
                        {eq.nome}
                        {indisponivel && <span className="ml-1.5 text-[8px] font-bold uppercase text-rose-400">vinculada</span>}
                      </span>
                      {indisponivel && (
                        <svg className="h-3.5 w-3.5 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ErrorMsg msg={error} />
        <SuccessMsg msg={success} />

        <button type="submit" disabled={loading || !!success} className="w-full rounded-2xl bg-blue-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Criando conta...</span> : "Criar Conta"}
        </button>
      </form>
      <div className="mt-6 text-center">
        <button onClick={() => onNavigate("login")} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
          Já tem conta? <span className="text-blue-600">Entrar</span>
        </button>
      </div>
    </AuthCard>
  );
}

// ── Verificação de Email ───────────────────────────────────────────────

export function TelaVerify({ onNavigate }: { onNavigate: (v: string) => void }) {
  return (
    <AuthCard>
      <Logo />
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
        </div>
        <h2 className="text-lg font-black text-slate-900">Verifique seu e-mail</h2>
        <p className="mt-3 text-sm text-slate-500">Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua conta.</p>
        <button onClick={() => onNavigate("login")} className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 active:scale-[0.98]">
          Voltar ao Login
        </button>
      </div>
    </AuthCard>
  );
}

// ── Esqueci a Senha ────────────────────────────────────────────────────

export function TelaForgot({ onNavigate }: { onNavigate: (v: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Digite seu e-mail"); return; }
    setLoading(true);
    try {
      const resp = await fetch(pb("request-password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (resp.ok) {
        setSuccess("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      } else {
        setSuccess("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      }
    } catch {
      setSuccess("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <Logo />
      <h2 className="mb-2 text-center text-lg font-black text-slate-900">Esqueceu a senha?</h2>
      <p className="mb-6 text-center text-sm text-slate-500">Digite seu e-mail para receber o link de redefinição.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField label="Email" type="email" placeholder="exemplo@email.com" autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
        />
        <ErrorMsg msg={error} />
        <SuccessMsg msg={success} />
        <button type="submit" disabled={loading || !!success} className="w-full rounded-2xl bg-blue-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50">
          {loading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Enviando...</span> : "Enviar Link de Redefinição"}
        </button>
      </form>
      <div className="mt-6 text-center">
        <button onClick={() => onNavigate("login")} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
          Voltar ao <span className="text-blue-600">Login</span>
        </button>
      </div>
    </AuthCard>
  );
}

// ── Página de Ação de E-mail (Reset + Troca) ──────────────────────────

export type EmailAction = "reset_password" | "confirm_email_change";

interface EmailActionPageProps {
  token: string;
  action: EmailAction;
  onNavigate: (v: string) => void;
}

export function EmailActionPage({ token, action, onNavigate }: EmailActionPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isReset = action === "reset_password";
  const title = isReset ? "Redefinir Senha" : "Confirmar Troca de E-mail";
  const description = isReset
    ? "Crie uma nova senha para sua conta."
    : "Digite sua senha atual para confirmar a alteração do e-mail.";
  const submitLabel = isReset ? "Redefinir Senha" : "Confirmar Troca";
  const successMsg = isReset ? "Senha redefinida com sucesso!" : "E-mail alterado com sucesso!";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isReset) {
      if (password.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return; }
      if (password !== confirmPassword) { setError("As senhas não conferem"); return; }
    } else {
      if (!password.trim()) { setError("Digite sua senha atual"); return; }
    }

    setLoading(true);
    try {
      const endpoint = isReset ? "confirm-password-reset" : "confirm-email-change";
      const body = isReset
        ? { token, password, passwordConfirm: confirmPassword }
        : { token, password };

      const resp = await fetch(pb(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (!resp.ok) {
        const msg = (data.message || "").toLowerCase();
        if (msg.includes("expired") || msg.includes("expirado")) {
          setError("Link expirado. Solicite um novo link.");
        } else if (msg.includes("invalid") || msg.includes("inválido") || msg.includes("invalido")) {
          setError(isReset ? "Token inválido. Solicite um novo link." : "Senha incorreta.");
        } else {
          setError(data.message || "Erro ao processar solicitação");
        }
        return;
      }
      setSuccess(true);
    } catch {
      setError("Erro ao conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <Logo />
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isReset ? "bg-amber-100" : "bg-blue-100"}`}>
          {isReset
            ? <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            : <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
          }
        </div>
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-3 text-sm text-slate-500">{description}</p>
      </div>

      {!success ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <InputField
            label={isReset ? "Nova senha (mín. 8 caracteres)" : "Senha atual"}
            type="password"
            placeholder="••••••••"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
          />
          {isReset && (
            <InputField
              label="Confirmar nova senha"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
            />
          )}
          <ErrorMsg msg={error} />
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Processando...</span> : submitLabel}
          </button>
        </form>
      ) : (
        <div className="mt-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          </div>
          <SuccessMsg msg={successMsg} />
          <button onClick={() => onNavigate("login")} className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 active:scale-[0.98]">
            Voltar ao Login
          </button>
        </div>
      )}
    </AuthCard>
  );
}

// ── Resultado da Verificação de Email ─────────────────────────────────

export function TelaVerificacaoResultado({ tipo, onNavigate }: { tipo: "sucesso" | "erro"; onNavigate: (v: string) => void }) {
  return (
    <AuthCard>
      <Logo />
      <div className="text-center">
        {tipo === "sucesso" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            </div>
            <h2 className="text-lg font-black text-slate-900">E-mail Confirmado!</h2>
            <p className="mt-3 text-sm text-slate-500">Sua conta foi verificada com sucesso. Agora você pode acessar o sistema.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            </div>
            <h2 className="text-lg font-black text-slate-900">Erro na Confirmação</h2>
            <p className="mt-3 text-sm text-slate-500">
              {tipo === "erro" ? "Não foi possível confirmar seu e-mail. O link pode ter expirado ou ser inválido." : "Link inválido ou expirado."}
            </p>
          </>
        )}
        <button onClick={() => onNavigate("login")} className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 active:scale-[0.98]">
          Voltar ao Login
        </button>
      </div>
    </AuthCard>
  );
}

// ── Export all views ───────────────────────────────────────────────────

export type AuthView = "login" | "register" | "verify" | "forgot" | "confirm-email" | "verified" | "verify_error";
