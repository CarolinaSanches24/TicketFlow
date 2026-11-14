export type UserRole = 'ADMIN' | 'ANALYST'

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
}

export type TicketStatus = 'Pendente' | 'Aberto' | 'Em Espera' | 'Finalizado'

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  analystId: string
  analystName: string
  createdAt: string
  updatedAt: string
}

export type ImprovementStatus = 'Aberta' | 'Em Desenvolvimento' | 'Em Teste' | 'Finalizada' | 'Convertida em Débito Técnico'

export interface Improvement {
  id: string
  title: string
  description: string
  status: ImprovementStatus
  analystId: string
  analystName: string
  module?: string
  submodule?: string
  createdAt: string
}

export type DebtStatus = 'Aberto' | 'Em Correção' | 'Resolvido'

export interface TechnicalDebt {
  id: string
  origin: string // Ticket ou Melhoria ID
  originType: 'Ticket' | 'Melhoria'
  description: string
  status: DebtStatus
  analystId: string
  analystName: string
  createdAt: string
}

export interface Sector {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  name: string;
  sector_id?: string | null;
  sector?: Sector | null;
  role: string; // cargo
  status: string;
  created_at?: string;
  updated_at?: string;
}

export type ApprovalType = 'MATRICULA' | 'DISCIPLINA'
export type FrequencyType = 'HORA_AULA' | 'DIA_LETIVO'
export type EvaluationPeriod = 'BIMESTRE' | 'TRIMESTRE' | 'SEMESTRE' | 'MODULO_UNICO' | 'UNIDADE'
export type EvaluationType = 'NOTA' | 'CONCEITO' | 'HABILIDADES_E_COMPETENCIAS' | 'PERSONALIZADO' | 'AVALIACAO_CONTINUA' | 'AVALIACAO_DIAGNOSTICA'

export interface EvaluationConcept {
  id?: string;
  acronym: string;
  description: string;
  period: string;
  min_value: number;
  max_value: number;
}

export interface EvaluationCriteriaConfig {
  id: string
  name: string
  approval_type: ApprovalType
  frequency_type: FrequencyType
  evaluation_period: EvaluationPeriod
  period_quantity: number
  evaluation_type: EvaluationType
  // ONLY for NOTA
  annual_calc_type?: string
  final_calc_type?: string
  decimal_places?: number
  final_decimal_places?: number
  final_rounding_type?: string
  period_rounding_type?: string

  // Concept configs
  concept_annual_calc?: string;
  concept_final_calc?: string;
  concept_is_final?: boolean;
  concept_decimal_places?: number; // 0, 1, 2
  concept_final_decimal_places?: number;
  concept_final_rounding_type?: string;
  concept_period_rounding_type?: string;
  concept_has_final_recovery?: boolean;
  concepts?: EvaluationConcept[];
  
  created_at: string
}
