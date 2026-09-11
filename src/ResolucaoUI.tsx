import { classificarResolucao, type StatusResolucao, type DadosResolucao } from "./resolucao";

/* ── Cores por status ── */
const CORES: Record<StatusResolucao, { bg: string; text: string; ring: string; label: string; dot: string }> = {
  resolvido:    { bg: "bg-emerald-500/20", text: "text-emerald-800", ring: "ring-emerald-400/40", label: "Resolvido", dot: "bg-emerald-400" },
  pendente:     { bg: "bg-amber-400/10",   text: "text-amber-800",  ring: "ring-amber-400/20",  label: "Pendente",  dot: "bg-amber-400" },
  nao_resolvido:{ bg: "bg-red-400/10",     text: "text-red-800",    ring: "ring-red-400/20",    label: "Não Resolvido", dot: "bg-red-400" },
};

/* ── Badge de status por paciente ── */
export function BadgeResolucao({ situacao, resolucao }: { situacao?: string; resolucao?: string | null }) {
  const status = classificarResolucao(situacao, resolucao);
  const c = CORES[status];
  const icon = status === "resolvido" ? "✓" : status === "pendente" ? "◔" : "✗";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[7px] font-black uppercase tracking-wider ring-1 shadow-sm sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[10px] ${c.bg} ${c.text} ${c.ring}`}>
      <span className={`flex h-3 w-3 items-center justify-center rounded text-[6px] font-black sm:h-4 sm:w-4 sm:rounded-md sm:text-[9px] ${c.dot} text-white`}>
        {icon}
      </span>
      <span className="hidden sm:inline">{c.label}</span>
      <span className="sm:hidden">{status === "resolvido" ? "Res." : status === "pendente" ? "Pend." : "Não Res."}</span>
    </span>
  );
}

/* ── Ring de progresso SVG ── */
function ProgressRing({ percent, size = 80, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const cor = percent >= 70 ? "#34d399" : percent >= 40 ? "#fbbf24" : "#f87171";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={cor} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="fill-white text-[16px] font-black" style={{ fontSize: size > 60 ? 16 : 12 }}>
        {percent}%
      </text>
    </svg>
  );
}

/* ── Card de resumo de resolução (para PaginaResumo) ── */
export function CardResolucao({ dados }: { dados: DadosResolucao }) {
  const frase = dados.percentual >= 70
    ? "Excelente"
    : dados.percentual >= 40 ? "Moderado" : "Atenção";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-4 ring-1 ring-white/[0.12] shadow-lg shadow-black/20 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 ring-1 ring-cyan-400/20">
            <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Taxa de Resolução</span>
            <span className="text-[9px] text-white/30">{dados.total} paciente{dados.total !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ring-1 ${
          dados.percentual >= 70 ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20"
          : dados.percentual >= 40 ? "bg-amber-400/10 text-amber-300 ring-amber-400/20"
          : "bg-red-400/10 text-red-300 ring-red-400/20"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dados.percentual >= 70 ? "bg-emerald-400" : dados.percentual >= 40 ? "bg-amber-400" : "bg-red-400"}`} />
          {frase}
        </div>
      </div>

      {/* Corpo: ring + mini cards + barra empilhada */}
      <div className="flex items-start gap-5">
        {/* Ring + label */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <ProgressRing percent={dados.percentual} size={72} stroke={5} />
          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30">resolvidos</span>
        </div>

        {/* Direita: mini cards + stacked bar */}
        <div className="flex-1 space-y-3">
          {/* Mini stat cards */}
          <div className="grid grid-cols-2 gap-2">
            <MiniStat icon="✓" label="Resolvidos" value={dados.resolvidos} pct={dados.percentual} cor="emerald" />
            <MiniStat icon="⋯" label="Pendentes" value={dados.pendentes} pct={dados.total > 0 ? Math.round((dados.pendentes / dados.total) * 100) : 0} cor="amber" />
            <MiniStat icon="✗" label="Não Resolvidos" value={dados.naoResolvidos} pct={dados.total > 0 ? Math.round((dados.naoResolvidos / dados.total) * 100) : 0} cor="red" />
          </div>

          {/* Barra empilhada de distribuição */}
          <div className="space-y-1.5">
            <span className="text-[8px] font-bold uppercase tracking-wider text-white/25">Distribuição</span>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              {dados.resolvidos > 0 && <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${(dados.resolvidos / dados.total) * 100}%` }} />}
              {dados.pendentes > 0 && <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${(dados.pendentes / dados.total) * 100}%` }} />}
              {dados.naoResolvidos > 0 && <div className="h-full bg-red-400 transition-all duration-700" style={{ width: `${(dados.naoResolvidos / dados.total) * 100}%` }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Paleta de cores para mini cards */
const MINI_COR: Record<string, { bg: string; ring: string; text: string; pct: string }> = {
  emerald: { bg: "bg-emerald-400/10", ring: "ring-emerald-400/20", text: "text-emerald-400", pct: "text-emerald-400/70" },
  amber:   { bg: "bg-amber-400/10",   ring: "ring-amber-400/20",   text: "text-amber-400",   pct: "text-amber-400/70" },
  red:     { bg: "bg-red-400/10",     ring: "ring-red-400/20",     text: "text-red-400",     pct: "text-red-400/70" },
};

/** Mini card de estatística */
function MiniStat({ icon, label, value, pct, cor }: { icon: string; label: string; value: number; pct: number; cor: string }) {
  const c = MINI_COR[cor] || MINI_COR.slate;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.bg} ring-1 ${c.ring}`}>
        <span className={`text-[10px] font-black ${c.text}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[9px] font-semibold text-white/40">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-[14px] font-black tabular-nums text-white/80">{value}</span>
          <span className={`text-[9px] font-bold tabular-nums ${c.pct}`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mini barra de progresso horizontal ── */
export function BarraResolucao({ percent, className }: { percent: number; className?: string }) {
  const cor = percent >= 70 ? "bg-emerald-400" : percent >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] ${className ?? ""}`}>
      <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
