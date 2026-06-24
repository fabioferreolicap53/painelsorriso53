/**
 * Tipos para o sistema Painel Sorriso 5.3.
 * Inspirado no design do sistema AMAR.
 * Pronto para receber dados do PocketBase no futuro.
 */

export type CategoriaPaciente =
  | "gestante"
  | "crianca"
  | "tabagista"
  | "tuberculose";

export type StatusPaciente =
  | "ativo"
  | "em_monitoramento"
  | "concluido"
  | "alerta";

/** Direcao da meta: afeta cor do badge e da progress bar */
export type MetaDirection = "diminuir" | "zerar" | "monitorar" | "aumentar";

/** Card de resumo por categoria — espelha layout da imagem */
export interface CardCategoria {
  categoria: CategoriaPaciente;
  titulo: string;
  meta: MetaDirection;
  valor: number;
  percentual: number;
  corBorda: string;   // tailwind border-left color
  corBadge: string;   // tailwind badge bg/text
  corBarra: string;   // tailwind progress bar bg
  comBusca?: number;
  semBusca?: number;
}

export interface Paciente {
  id: string;
  nome: string;
  idade: number;
  categoria: CategoriaPaciente;
  status: StatusPaciente;
  ultimaConsulta: string;
  responsavel?: string;
}
