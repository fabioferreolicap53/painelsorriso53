/**
 * Helpers de UI — cores, labels, metas.
 * Dados mockados removidos; agora viram do PocketBase via pocketbase.ts
 */

import type { CategoriaPaciente, CardCategoria } from "./types";

export function getCoresCategoria(categoria: CategoriaPaciente): string {
  const cores: Record<CategoriaPaciente, string> = {
    gestante: "bg-rose-50 text-rose-700 border border-rose-100",
    crianca: "bg-violet-50 text-violet-700 border border-violet-100",
    tabagista: "bg-amber-50 text-amber-700 border border-amber-100",
    tuberculose: "bg-orange-50 text-orange-700 border border-orange-100",
  };
  return cores[categoria];
}

export function getLabelCategoria(c: CategoriaPaciente): string {
  return { gestante: "Gestante", crianca: "Criança", tabagista: "Tabagista", tuberculose: "Tuberculose" }[c];
}

export function getIconeCategoria(c: CategoriaPaciente): string {
  return { gestante: "\uD83D\uDC70", crianca: "\uD83D\uDC76", tabagista: "\uD83D\uDEAC", tuberculose: "\uD83E\uDEC1" }[c];
}

// ── Config dos cards de resumo (layout fixo) ─────────────────────────────

export const configCardsCategoria: Omit<CardCategoria, "valor" | "percentual" | "comBusca" | "semBusca">[] = [
  { categoria: "gestante", titulo: "Gestantes identificadas e em acompanhamento", meta: "diminuir", corBorda: "border-l-blue-600", corBadge: "bg-blue-600", corBarra: "bg-blue-600" },
  { categoria: "tabagista", titulo: "Tabagistas em programa de cessação", meta: "monitorar", corBorda: "border-l-cyan-600", corBadge: "bg-cyan-600", corBarra: "bg-cyan-600" },
  { categoria: "tuberculose", titulo: "Tuberculose com tratamento supervisionado", meta: "aumentar", corBorda: "border-l-indigo-600", corBadge: "bg-indigo-600", corBarra: "bg-indigo-600" },
  { categoria: "crianca", titulo: "Crianças com cadastro ativo no sistema", meta: "zerar", corBorda: "border-l-sky-600", corBadge: "bg-sky-600", corBarra: "bg-sky-600" },
];
