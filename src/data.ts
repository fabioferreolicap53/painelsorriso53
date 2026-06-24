/**
 * Helpers de UI — cores, labels, metas.
 * Dados mockados removidos; agora viram do PocketBase via pocketbase.ts
 */

import type { CategoriaPaciente, CardCategoria } from "./types";

export function getCoresCategoria(categoria: CategoriaPaciente): string {
  const cores: Record<CategoriaPaciente, string> = {
    gestante: "bg-blue-50 text-blue-800 border border-blue-100",
    crianca: "bg-blue-100 text-blue-900 border border-blue-200",
    tabagista: "bg-blue-50 text-blue-700 border border-blue-100",
    tuberculose: "bg-blue-100 text-blue-950 border border-blue-200",
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
  { categoria: "gestante", titulo: "Gestantes identificadas e em acompanhamento", meta: "diminuir", corBorda: "border-l-blue-500", corBadge: "bg-blue-500", corBarra: "bg-blue-500" },
  { categoria: "tabagista", titulo: "Tabagistas em programa de cessação", meta: "monitorar", corBorda: "border-l-blue-600", corBadge: "bg-blue-600", corBarra: "bg-blue-600" },
  { categoria: "tuberculose", titulo: "Tuberculose com tratamento supervisionado", meta: "aumentar", corBorda: "border-l-blue-700", corBadge: "bg-blue-700", corBarra: "bg-blue-700" },
  { categoria: "crianca", titulo: "Crianças com cadastro ativo no sistema", meta: "zerar", corBorda: "border-l-blue-400", corBadge: "bg-blue-400", corBarra: "bg-blue-400" },
];
