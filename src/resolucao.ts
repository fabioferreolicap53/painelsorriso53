/**
 * Sistema de classificação de resolução de acompanhamentos.
 *
 * Classificação baseada no campo `resolucao` do backend:
 *  - "RESOLVIDO"     → resolvido
 *  - "NÃO RESOLVIDO" → não resolvido
 *  - outro/undefined → pendente
 */

export type StatusResolucao = "resolvido" | "pendente" | "nao_resolvido";

/** Classifica o status de resolução de um paciente. */
export function classificarResolucao(
  _situacaoPosBusca: string | null | undefined,
  resolucao?: string | null
): StatusResolucao {
  if (resolucao === "RESOLVIDO") return "resolvido";
  if (resolucao === "NÃO RESOLVIDO") return "nao_resolvido";
  return "pendente";
}

/** Dados de resolução para uma lista de pacientes */
export interface DadosResolucao {
  total: number;
  resolvidos: number;
  pendentes: number;
  naoResolvidos: number;
  percentual: number;
}

/** Calcula métricas de resolução a partir de um map de desfechos */
export function calcularResolucao(
  desfechoMap: Record<string, { desfecho: string; resolucao?: string | null } | undefined>,
  pacienteIds: string[]
): DadosResolucao {
  let resolvidos = 0;
  let pendentes = 0;
  let naoResolvidos = 0;

  for (const id of pacienteIds) {
    const entry = desfechoMap[id];
    const status = classificarResolucao(entry?.desfecho, entry?.resolucao);
    switch (status) {
      case "resolvido": resolvidos++; break;
      case "pendente": pendentes++; break;
      case "nao_resolvido": naoResolvidos++; break;
    }
  }

  const total = pacienteIds.length;
  const percentual = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

  return { total, resolvidos, pendentes, naoResolvidos, percentual };
}
