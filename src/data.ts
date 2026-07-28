/**
 * Helpers de UI — cores, labels, metas.
 * Dados mockados removidos; agora viram do PocketBase via pocketbase.ts
 */

import type { CategoriaPaciente } from "./types";

export function getCoresCategoria(categoria: CategoriaPaciente): string {
  const cores: Record<CategoriaPaciente, string> = {
    gestante: "bg-rose-50 text-rose-700 border border-rose-100",
    crianca: "bg-violet-50 text-violet-700 border border-violet-100",
    tabagista: "bg-amber-50 text-amber-700 border border-amber-100",
    tuberculose: "bg-orange-50 text-orange-700 border border-orange-100",
  };
  return cores[categoria];
}
