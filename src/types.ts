/**
 * Tipos para o sistema Painel Sorriso 5.3.
 * Espelha schema da collection painelsorriso53_pacientes no PocketBase.
 */

/** Campos booleanos — indicadores de condição do paciente */
export interface IndicadoresPaciente {
  gestante: boolean;
  tb: boolean;        // tuberculose
  tabagista: boolean;
  menor_de_2_anos: boolean;
}

/** Registro completo da collection painelsorriso53_pacientes */
export interface Paciente {
  id: string;
  unidade: string;
  equipe: string;
  microarea: string;
  paciente: string;          // nome do paciente
  n_pront: string;           // numero do prontuario
  gestante: boolean;
  tb: boolean;
  tabagista: boolean;
  menor_de_2_anos: boolean;
  data_de_nascimento: string; // data de nascimento (DD/MM/YYYY)
  n_cns_da_pessoa_cadastrada: string; // CNS da pessoa
  idade: string;              // idade do paciente
  collectionId?: string;
  collectionName?: string;
  created?: string;
  updated?: string;
}

/** Tipo auxiliar para pagina de resumo */
export type CategoriaPaciente = "gestante" | "crianca" | "tabagista" | "tuberculose";

/** Registro de acompanhamento (follow-up) do paciente */
export interface Acompanhamento {
  id: string;
  paciente_id: string;
  usuario_id: string;
  cns?: string;
  data_da_busca: string;
  tipo_busca: string;
  tipo_contato: string;
  entrave_informado_por: string;
  situacao_pos_busca: string;
  entraves_identificados: string;
  observacoes: string;
  data_agendamento_apos_contato_direto?: string; // data do agendamento (quando situacao = "AGENDAMENTO APÓS CONTATO DIRETO")
  data_consulta_odonto?: string; // data da consulta odonto (quando situacao = "CONSULTA NA ODONTO REALIZADA")
  resolucao?: string; // "RESOLVIDO" | "NÃO RESOLVIDO" | "PENDENTE"
  created?: string;
  updated?: string;
}
