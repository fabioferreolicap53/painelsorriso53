import type {
  Paciente,
  CategoriaPaciente,
  StatusPaciente,
  CardCategoria,
  MetaDirection,
} from "./types";

// ── Helpers de cor ───────────────────────────────────────────────────────

export function getCorMeta(meta: MetaDirection): string {
  const cores: Record<MetaDirection, string> = {
    diminuir: "bg-red-50 text-red-600",
    zerar: "bg-orange-50 text-orange-600",
    monitorar: "bg-emerald-50 text-emerald-600",
    aumentar: "bg-blue-50 text-blue-700",
  };
  return cores[meta];
}

export function getLabelMeta(meta: MetaDirection): string {
  const labels: Record<MetaDirection, string> = {
    diminuir: "META: DIMINUIR",
    zerar: "META: ZERAR",
    monitorar: "META: MONITORAR",
    aumentar: "META: AUMENTAR",
  };
  return labels[meta];
}

export function getCoresCategoria(categoria: CategoriaPaciente): string {
  const cores: Record<CategoriaPaciente, string> = {
    gestante: "bg-blue-50 text-blue-800 border border-blue-100",
    crianca: "bg-blue-100 text-blue-900 border border-blue-200",
    tabagista: "bg-blue-50 text-blue-700 border border-blue-100",
    tuberculose: "bg-blue-100 text-blue-950 border border-blue-200",
  };
  return cores[categoria];
}

export function getCoresStatus(status: StatusPaciente): string {
  const cores: Record<StatusPaciente, string> = {
    ativo: "bg-blue-50 text-blue-800 border border-blue-200",
    em_monitoramento: "bg-blue-50 text-blue-700 border border-blue-100",
    concluido: "bg-slate-50 text-slate-400 border border-slate-200",
    alerta: "bg-blue-100 text-blue-950 border border-blue-300",
  };
  return cores[status];
}

export function getLabelCategoria(c: CategoriaPaciente): string {
  return { gestante: "Gestante", crianca: "Crian\u00E7a", tabagista: "Tabagista", tuberculose: "Tuberculose" }[c];
}

export function getLabelStatus(s: StatusPaciente): string {
  return { ativo: "Ativo", em_monitoramento: "Em Monitoramento", concluido: "Conclu\u00EDdo", alerta: "Alerta" }[s];
}

export function getIconeCategoria(c: CategoriaPaciente): string {
  return { gestante: "\uD83D\uDC70", crianca: "\uD83D\uDC76", tabagista: "\uD83D\uDEAC", tuberculose: "\uD83E\uDEC1" }[c];
}

// ── Cards de categoria — design inspirado AMAR ──────────────────────────

export const cardsCategoria: CardCategoria[] = [
  {
    categoria: "gestante",
    titulo: "Gestantes identificadas e em acompanhamento",
    meta: "diminuir",
    valor: 42,
    percentual: 54,
    corBorda: "border-l-blue-500",
    corBadge: "bg-blue-500",
    corBarra: "bg-blue-500",
    comBusca: 2,
    semBusca: 40,
  },
  {
    categoria: "crianca",
    titulo: "Crian\u00E7as com cadastro ativo no sistema",
    meta: "zerar",
    valor: 8,
    percentual: 20,
    corBorda: "border-l-blue-400",
    corBadge: "bg-blue-400",
    corBarra: "bg-blue-400",
    comBusca: 1,
    semBusca: 7,
  },
  {
    categoria: "tabagista",
    titulo: "Tabagistas em programa de cess\u00E3o",
    meta: "monitorar",
    valor: 18,
    percentual: 42,
    corBorda: "border-l-blue-600",
    corBadge: "bg-blue-600",
    corBarra: "bg-blue-600",
    comBusca: 5,
    semBusca: 13,
  },
  {
    categoria: "tuberculose",
    titulo: "Tuberculose com tratamento supervisionado",
    meta: "aumentar",
    valor: 31,
    percentual: 78,
    corBorda: "border-l-blue-700",
    corBadge: "bg-blue-700",
    corBarra: "bg-blue-700",
    comBusca: 31,
    semBusca: 0,
  },
];

// ── Pacientes mock ──────────────────────────────────────────────────────

export const pacientesMock: Paciente[] = [
  { id: "1", nome: "Maria Silva", idade: 28, categoria: "gestante", status: "em_monitoramento", ultimaConsulta: "2026-06-15", responsavel: "Dr. Jo\u00E3o Santos" },
  { id: "2", nome: "Ana Beatriz", idade: 4, categoria: "crianca", status: "ativo", ultimaConsulta: "2026-06-18", responsavel: "Dra. Carla Lima" },
  { id: "3", nome: "Carlos Eduardo", idade: 52, categoria: "tabagista", status: "alerta", ultimaConsulta: "2026-06-10", responsavel: "Dr. Paulo Mendes" },
  { id: "4", nome: "Jos\u00E9 da Silva", idade: 45, categoria: "tuberculose", status: "em_monitoramento", ultimaConsulta: "2026-06-20", responsavel: "Dra. Fernanda Costa" },
  { id: "5", nome: "Luciana Santos", idade: 32, categoria: "gestante", status: "ativo", ultimaConsulta: "2026-06-19", responsavel: "Dr. Jo\u00E3o Santos" },
  { id: "6", nome: "Pedro Henrique", idade: 2, categoria: "crianca", status: "concluido", ultimaConsulta: "2026-05-30", responsavel: "Dra. Carla Lima" },
  { id: "7", nome: "Roberto Alves", idade: 61, categoria: "tabagista", status: "em_monitoramento", ultimaConsulta: "2026-06-22", responsavel: "Dr. Paulo Mendes" },
  { id: "8", nome: "Mariana Ferreira", idade: 38, categoria: "tuberculose", status: "ativo", ultimaConsulta: "2026-06-21", responsavel: "Dra. Fernanda Costa" },
  { id: "9", nome: "Juliana Oliveira", idade: 25, categoria: "gestante", status: "alerta", ultimaConsulta: "2026-06-12", responsavel: "Dr. Jo\u00E3o Santos" },
  { id: "10", nome: "Lucas Gabriel", idade: 6, categoria: "crianca", status: "em_monitoramento", ultimaConsulta: "2026-06-17", responsavel: "Dra. Carla Lima" },
];
