/**
 * Tipos para o sistema Painel Sorriso 5.3.
 * Espelha schema da collection painelsorriso53_pacientes no PocketBase.
 */

/** Campos booleanos — indicadores de condição do paciente */
export interface IndicadoresPaciente {
  gestante: boolean;
  has: boolean;       // hipertensao arterial sistemica
  dm: boolean;        // diabetes mellitus
  hiv: boolean;
  tb: boolean;        // tuberculose
  tabagista: boolean;
  familia_recebe_bf: boolean; // bolsa familia
}

/** Registro completo da collection painelsorriso53_pacientes */
export interface Paciente {
  id: string;
  unidade: string;
  equipe: string;
  microarea: string;
  paciente: string;          // nome do paciente
  n_pront: string;           // numero do prontuario
  data_de_nascimento: string; // data de nascimento (YYYY-MM-DD)
  n_cns_da_pessoa_cadastrada: string; // CNS da pessoa
  gestante: boolean;
  has: boolean;
  dm: boolean;
  hiv: boolean;
  tb: boolean;
  tabagista: boolean;
  familia_recebe_bf: boolean;
  data_ultima_cons_oriclista: string; // data ultima consulta oriclista
  data_ultima_cons_dentista: string;  // data ultima consulta dentista
  collectionId?: string;
  collectionName?: string;
  created?: string;
  updated?: string;
}

/** Tipo auxiliar para pagina de resumo */
export type CategoriaPaciente = "gestante" | "crianca" | "tabagista" | "tuberculose";

export type MetaDirection = "diminuir" | "zerar" | "monitorar" | "aumentar";

export interface CardCategoria {
  categoria: CategoriaPaciente;
  titulo: string;
  meta: MetaDirection;
  valor: number;
  percentual: number;
  corBorda: string;
  corBadge: string;
  corBarra: string;
  comBusca?: number;
  semBusca?: number;
}

/** Registro de acompanhamento (follow-up) do paciente */
export interface Acompanhamento {
  id: string;
  paciente_id: string;
  usuario_id: string;
  data_da_busca: string;
  tipo_busca: string;
  tipo_contato: string;
  entrave_informado_por: string;
  situacao_pos_busca: string;
  entraves_identificados: string;
  observacoes: string;
  created?: string;
  updated?: string;
}
