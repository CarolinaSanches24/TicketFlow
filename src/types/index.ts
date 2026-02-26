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
