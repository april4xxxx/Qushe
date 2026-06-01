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

export type MemoryType = 'trait' | 'pattern' | 'decision' | 'event' | 'preference'

export interface Memory {
  id: string
  type: MemoryType
  title: string
  content: string
  confidence: 1 | 2 | 3 | 4 | 5
  source: {
    kind: 'chat' | 'task' | 'manual'
    conversationId?: string
    extractedAt: string
  }
  lastReferencedAt: string
  referencedCount: number
  expiresAt: string | null
  userEdited: boolean
}

export interface MemoryStore {
  version: number
  extractedAt: string
  memories: Memory[]
  trash: Memory[]
}

export const MEMORY_TYPE_CONFIG = {
  trait: { label: '特质', description: '个人习惯与特征', icon: '◈' },
  pattern: { label: '模式', description: '行为规律与趋势', icon: '◇' },
  decision: { label: '决策', description: '历史判断与修正', icon: '◆' },
  event: { label: '事件', description: '具体日期与里程碑', icon: '◎' },
  preference: { label: '偏好', description: '执行习惯与倾向', icon: '◉' },
} as const

export interface TimeBlock {
  id: string
  taskId: string
  date: string
  startHour: number
  startMinute: number
  durationMinutes: number
  aiGenerated: boolean
}

export interface WeekSchedule {
  version: number
  blocks: TimeBlock[]
}

export const BASKET_CONFIG = {
  lion: { label: '🦁 狮子', description: '今天必须办的重要+紧急任务', color: 'lion' },
  ox: { label: '🐂 牛马', description: '这周需要做的事务性任务', color: 'ox' },
  ostrich: { label: '🐦 鸵鸟', description: '延迟处理/主动拖延的任务', color: 'ostrich' },
} as const
