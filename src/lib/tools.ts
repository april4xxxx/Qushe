/**
 * V3 Tool Use — Tool definitions and handlers for Qushe Agent.
 *
 * Architecture:
 *   ToolRegistry (definitions + handlers)  <-->  ai.ts (tool-use loop)
 *                                           <-->  storage.ts (data)
 *
 * Each tool is self-contained: a JSON schema the LLM sees, and a handler
 * function that reads from storage and returns structured data.
 */

import type {
  CompletionRecord,
  MemorySearchEntry,
  ScheduleEntry,
  TaskStats,
  ToolDefinition,
  ToolResult,
} from '../types'
import { getEvals, getMemories, getTasks, getBlocks } from './storage'

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-calling format)
// ---------------------------------------------------------------------------

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_recent_completions',
      description:
        '查询最近 N 天内完成的任务列表。用于了解用户的完成情况和工作节奏。',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: '往前查多少天，默认 7',
            default: 7,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_memories',
      description:
        '按关键词搜索用户的历史行为记忆（覆盖率修改、完成模式、心血来潮记录、结构化记忆等）。用于在做评估时检索相关历史上下文。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，如任务类别、主线名称、行为模式等',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description:
        '获取某一天的任务日程安排和日历时段块。',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'ISO 日期字符串（YYYY-MM-DD），默认今天',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task_stats',
      description:
        '获取任务统计数据：各篮子数量、完成率、平均预估时间、今日/本周完成数等。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function handleGetRecentCompletions(args: { days?: number }): ToolResult {
  const days = args.days ?? 7
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffISO = cutoff.toISOString()

  const tasks = getTasks()
  const completions: CompletionRecord[] = tasks
    .filter(t => t.status === 'completed' && t.completedAt && t.completedAt >= cutoffISO)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .map(t => ({
      id: t.id,
      title: t.title,
      basket: t.basket,
      estimatedMinutes: t.estimatedMinutes,
      completedAt: t.completedAt!,
      mainlineAlignment: t.mainlineAlignment,
    }))

  return {
    success: true,
    data: { days, count: completions.length, completions },
  }
}

function handleSearchMemories(args: { query: string }): ToolResult {
  const query = (args.query ?? '').toLowerCase()
  if (!query) {
    return { success: false, data: null, error: '搜索关键词不能为空' }
  }

  const results: MemorySearchEntry[] = []
  const evals = getEvals()
  const tasks = getTasks()

  // 1. Search V2 structured memories
  const memories = getMemories()
  for (const m of memories) {
    const text = `${m.title} ${m.content} ${m.type}`
    if (text.toLowerCase().includes(query)) {
      results.push({
        type: 'eval_override', // closest match
        content: `[${m.type}] ${m.title}：${m.content}（置信度${m.confidence}/5）`,
        timestamp: m.source.extractedAt,
      })
    }
  }

  // 2. Search eval overrides — user disagreed with AI
  for (const ev of evals) {
    if (!ev.userAccepted && ev.userOverride) {
      const text = `用户将「${ev.taskTitle}」从 ${ev.aiSuggested.basket} 改为 ${ev.userOverride.basket}${ev.userOverride.reason ? `，理由：${ev.userOverride.reason}` : ''}`
      if (text.toLowerCase().includes(query) || ev.taskTitle.toLowerCase().includes(query)) {
        results.push({ type: 'eval_override', content: text, timestamp: ev.timestamp })
      }
    }
  }

  // 3. Search completion patterns
  for (const t of tasks.filter(t => t.status === 'completed')) {
    const text = `完成任务「${t.title}」(${t.basket}, ${t.estimatedMinutes}分钟)`
    if (text.toLowerCase().includes(query) || t.title.toLowerCase().includes(query)) {
      results.push({ type: 'completion_pattern', content: text, timestamp: t.completedAt ?? t.createdAt })
    }
  }

  // 4. Search impulse history
  for (const t of tasks.filter(t => t.isImpulse)) {
    const text = `心血来潮任务「${t.title}」状态=${t.status}`
    if (text.toLowerCase().includes(query) || t.title.toLowerCase().includes(query)) {
      results.push({ type: 'impulse_history', content: text, timestamp: t.createdAt })
    }
  }

  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return {
    success: true,
    data: { query, count: results.length, memories: results.slice(0, 20) },
  }
}

function handleGetSchedule(args: { date?: string }): ToolResult {
  const targetDate = args.date ?? new Date().toISOString().slice(0, 10)
  const tasks = getTasks()

  // Active tasks for target date
  const schedule: ScheduleEntry[] = tasks
    .filter(t => {
      if (t.status === 'completed' || t.status === 'cancelled') return false
      const createdDate = t.createdAt.slice(0, 10)
      return createdDate <= targetDate
    })
    .sort((a, b) => {
      const order = { lion: 0, ox: 1, ostrich: 2 }
      return order[a.basket] - order[b.basket]
    })
    .map(t => ({
      id: t.id,
      title: t.title,
      basket: t.basket,
      status: t.status,
      estimatedMinutes: t.estimatedMinutes,
      suggestedTimeSlot: t.suggestedTimeSlot,
      deadline: t.deadline,
    }))

  // Calendar time blocks for that date
  const blocks = getBlocks()
    .filter(b => b.date === targetDate)
    .map(b => ({
      taskId: b.taskId,
      start: `${String(b.startHour).padStart(2, '0')}:${String(b.startMinute).padStart(2, '0')}`,
      durationMinutes: b.durationMinutes,
      aiGenerated: b.aiGenerated,
    }))

  const totalMinutes = schedule.reduce((sum, s) => sum + s.estimatedMinutes, 0)

  return {
    success: true,
    data: { date: targetDate, taskCount: schedule.length, totalEstimatedMinutes: totalMinutes, schedule, calendarBlocks: blocks },
  }
}

function handleGetTaskStats(): ToolResult {
  const tasks = getTasks()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  const stats: TaskStats = {
    total: tasks.length,
    byBasket: { lion: 0, ox: 0, ostrich: 0 },
    byStatus: { pending: 0, in_progress: 0, completed: 0, cancelled: 0 },
    completionRate: 0,
    avgEstimatedMinutes: 0,
    completedToday: 0,
    completedThisWeek: 0,
  }

  let totalMinutes = 0
  for (const t of tasks) {
    stats.byBasket[t.basket]++
    stats.byStatus[t.status]++
    totalMinutes += t.estimatedMinutes
    if (t.status === 'completed' && t.completedAt) {
      const d = t.completedAt.slice(0, 10)
      if (d === todayStr) stats.completedToday++
      if (d >= weekStartStr) stats.completedThisWeek++
    }
  }

  const meaningful = tasks.filter(t => t.status !== 'cancelled').length
  stats.completionRate = meaningful > 0 ? Math.round((stats.byStatus.completed / meaningful) * 100) : 0
  stats.avgEstimatedMinutes = tasks.length > 0 ? Math.round(totalMinutes / tasks.length) : 0

  return { success: true, data: stats }
}

// ---------------------------------------------------------------------------
// Tool dispatcher
// ---------------------------------------------------------------------------

type ToolHandler = (args: Record<string, unknown>) => ToolResult

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  get_recent_completions: (args) => handleGetRecentCompletions(args as { days?: number }),
  search_memories: (args) => handleSearchMemories(args as { query: string }),
  get_schedule: (args) => handleGetSchedule(args as { date?: string }),
  get_task_stats: () => handleGetTaskStats(),
}

/**
 * Execute a tool by name with parsed arguments.
 * Returns a ToolResult; never throws.
 */
export function executeTool(name: string, args: Record<string, unknown>): ToolResult {
  const handler = TOOL_HANDLERS[name]
  if (!handler) {
    return { success: false, data: null, error: `Unknown tool: ${name}` }
  }
  try {
    return handler(args)
  } catch (err) {
    return { success: false, data: null, error: err instanceof Error ? err.message : String(err) }
  }
}
