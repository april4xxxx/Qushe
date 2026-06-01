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

// ---------------------------------------------------------------------------
// V3 Tool Use types
// ---------------------------------------------------------------------------

export interface ToolParameterProperty {
  type: string
  description: string
  enum?: string[]
  default?: unknown
}

export interface ToolParameters {
  type: 'object'
  properties: Record<string, ToolParameterProperty>
  required?: string[]
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolParameters
  }
}

export interface ToolResult {
  success: boolean
  data: unknown
  error?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface TaskStats {
  total: number
  byBasket: Record<Basket, number>
  byStatus: Record<TaskStatus, number>
  completionRate: number
  avgEstimatedMinutes: number
  completedToday: number
  completedThisWeek: number
}

export interface CompletionRecord {
  id: string
  title: string
  basket: Basket
  estimatedMinutes: number
  completedAt: string
  mainlineAlignment: MainlineAlignment
}

export interface MemorySearchEntry {
  type: 'eval_override' | 'completion_pattern' | 'impulse_history'
  content: string
  timestamp: string
}

export interface ScheduleEntry {
  id: string
  title: string
  basket: Basket
  status: TaskStatus
  estimatedMinutes: number
  suggestedTimeSlot?: string
  deadline?: string
}

export const BASKET_CONFIG = {
  lion: { label: '🦁 狮子', description: '今天必须办的重要+紧急任务', color: 'lion' },
  ox: { label: '🐂 牛马', description: '这周需要做的事务性任务', color: 'ox' },
  ostrich: { label: '🐦 鸵鸟', description: '延迟处理/主动拖延的任务', color: 'ostrich' },
} as const
