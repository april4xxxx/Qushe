export type Basket = 'lion' | 'ox' | 'ostrich'
export type MainlineAlignment = 'high' | 'medium' | 'low' | 'none'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface Mainline {
  id: string
  name: string
  description: string
  priority: number
  goals: string[]
  currentPhase: string
}

export interface Task {
  id: string
  title: string
  description: string
  basket: Basket
  mainlineAlignment: MainlineAlignment
  alignedMainlineId?: string
  estimatedMinutes: number
  suggestedTimeSlot?: string
  deadline?: string
  status: TaskStatus
  isImpulse: boolean
  cooldownUntil?: string
  aiReason: string
  createdAt: string
  completedAt?: string
}

export interface AIAssessment {
  basket: Basket
  reason: string
  mainlineAlignment: MainlineAlignment
  alignedMainlineId?: string
  estimatedMinutes: number
  suggestedTimeSlot: string
  deadline?: string
  deadlineQuestion?: string
  isImpulse: boolean
  impulseNote?: string
}

export interface EvalRecord {
  id: string
  taskId: string
  taskTitle: string
  timestamp: string
  aiSuggested: {
    basket: Basket
    reason: string
    mainlineAlignment: MainlineAlignment
    estimatedMinutes: number
  }
  userAccepted: boolean
  userOverride?: {
    basket?: Basket
    reason?: string
  }
}

export interface UserProfile {
  mainlines: Mainline[]
  onboardingCompleted: boolean
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const BASKET_CONFIG = {
  lion: { label: '🦁 狮子', description: '今天必须办的重要+紧急任务', color: 'lion' },
  ox: { label: '🐂 牛马', description: '这周需要做的事务性任务', color: 'ox' },
  ostrich: { label: '🐦 鸵鸟', description: '延迟处理/主动拖延的任务', color: 'ostrich' },
} as const
