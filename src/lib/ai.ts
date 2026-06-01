/**
 * AI module — LLM integration with V3 Tool Use support.
 *
 * Uses OpenAI SDK targeting DeepSeek Chat API.
 * V3: function-calling loop (LLM → tool_calls → execute → feed back → final answer).
 * Graceful degradation: if model doesn't support function calling, falls back to V2 full-injection.
 */

import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import type { AIAssessment, ChatMessage, EvalRecord, Mainline, Memory, MemoryType, Task, TimeBlock } from '../types'
import { TOOL_DEFINITIONS, executeTool } from './tools'

// ---------------------------------------------------------------------------
// Client management
// ---------------------------------------------------------------------------

let client: OpenAI | null = null

/** Whether the current model supports function calling. Starts optimistic. */
let toolUseSupported = true

export function initAI(apiKey: string): void {
  client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  })
  toolUseSupported = true
}

export function isAIReady(): boolean {
  return client !== null
}

// ---------------------------------------------------------------------------
// Tool-use loop (V3 core)
// ---------------------------------------------------------------------------

const MAX_TOOL_ROUNDS = 5

function getToolsParam(): ChatCompletionTool[] {
  return TOOL_DEFINITIONS as unknown as ChatCompletionTool[]
}

/**
 * Core tool-use loop. Sends messages to LLM, processes tool_calls,
 * feeds results back, repeats until final text response.
 * Falls back to plain call if function calling not supported.
 */
async function chatWithTools(
  messages: ChatCompletionMessageParam[],
  opts: { maxTokens?: number; tools?: boolean } = {},
): Promise<string> {
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const maxTokens = opts.maxTokens ?? 2048
  const useTools = (opts.tools ?? true) && toolUseSupported
  const conversation: ChatCompletionMessageParam[] = [...messages]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response: OpenAI.ChatCompletion

    try {
      response = await client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: maxTokens,
        messages: conversation,
        ...(useTools ? { tools: getToolsParam() } : {}),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (useTools && (msg.includes('tools') || msg.includes('function') || msg.includes('not supported'))) {
        console.warn('[ai] Tool use not supported, falling back to plain mode')
        toolUseSupported = false
        response = await client.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: maxTokens,
          messages: conversation,
        })
      } else {
        throw err
      }
    }

    const choice = response.choices[0]
    if (!choice) throw new Error('AI 未返回有效响应')

    const message = choice.message

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? ''
    }

    // Append assistant message with tool_calls
    conversation.push({
      role: 'assistant',
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    } as ChatCompletionMessageParam)

    // Execute tools and append results
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue
      const fn = toolCall.function
      let args: Record<string, unknown> = {}
      try { args = JSON.parse(fn.arguments || '{}') } catch { /* bad JSON */ }

      const result = executeTool(fn.name, args)

      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result.data),
      } as ChatCompletionMessageParam)
    }

    if (choice.finish_reason === 'stop') {
      return message.content ?? ''
    }
  }

  throw new Error('AI 工具调用轮次耗尽，请重试')
}

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

function buildSystemPrompt(mainlines: Mainline[], existingTasks: Task[]): string {
  const mainlineContext = mainlines
    .map(m => `- ${m.name}（优先级${m.priority}）：${m.description}\n  当前阶段：${m.currentPhase}\n  目标：${m.goals.join('、')}`)
    .join('\n')

  const pendingTasks = existingTasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .map(t => `- [${t.basket}] ${t.title}（预估${t.estimatedMinutes}分钟）`)
    .join('\n')

  const toolHint = toolUseSupported
    ? `\n\n你可以使用以下工具来获取更多上下文：
- get_recent_completions：查看用户最近完成的任务（了解工作节奏）
- search_memories：搜索历史行为记忆（了解用户偏好和历史决策）
- get_task_stats：查看任务统计数据（了解整体负荷）
- get_schedule：查看某天的日程安排

在评估任务时，如果你认为需要历史数据来做更好的判断，请主动调用工具。不需要每次都调用——只在有助于判断时使用。`
    : ''

  return `你是一个智能任务优先级顾问。你了解用户的人生主线目标，并基于此帮助用户评估每个新任务的优先级。

用户的人生主线：
${mainlineContext}

当前待办任务：
${pendingTasks || '暂无待办任务'}${toolHint}

你的职责：
1. 评估新任务应该放入哪个篮子：
   - lion（狮子）：今天必须完成的重要且紧急的任务
   - ox（牛马）：这周需要做的事务性任务
   - ostrich（鸵鸟）：可以延迟处理或主动拖延的任务
2. 解释排序理由（1-2句话，简洁有力，要有洞察力而非泛泛而谈）
3. 评估与主线目标的关联度（high/medium/low/none）
4. 估算完成时间（分钟）
5. 建议执行时段
6. 提取或追问 deadline：
   - 如果任务描述明确提到时间（"周五前"、"明天"、"下周"），转成 ISO 日期写入 deadline
   - 如果没提到但任务明显时间敏感（比如汇报、面试），把 deadlineQuestion 设为追问句，例如"这件事的截止时间是？"
   - 如果不需要追问（如学习类无明确截止），deadline 和 deadlineQuestion 都留空
7. 判断是否是"心血来潮"——如果任务与所有主线关联度都很低，或听起来像突发奇想

你应该像一个了解用户的顾问一样说话，直接、有洞察力，必要时会挑战用户的决策。理由不要写空话，要说出具体判断依据。

你必须严格以 JSON 格式回复，不要包含任何其他文字：
{
  "basket": "lion" | "ox" | "ostrich",
  "reason": "排序理由（具体、有洞察）",
  "mainlineAlignment": "high" | "medium" | "low" | "none",
  "alignedMainlineId": "关联的主线ID或null",
  "estimatedMinutes": 数字,
  "suggestedTimeSlot": "建议时段",
  "deadline": "YYYY-MM-DD 或 null",
  "deadlineQuestion": "如果需要追问 deadline 的问题，否则 null",
  "isImpulse": true/false,
  "impulseNote": "如果是心血来潮，给出温和的提醒，否则 null"
}`
}

function buildMemoryContext(memories: Memory[]): string {
  if (memories.length === 0) return ''

  const grouped: Record<string, Memory[]> = {}
  for (const m of memories) {
    if (!grouped[m.type]) grouped[m.type] = []
    grouped[m.type].push(m)
  }

  const typeLabels: Record<MemoryType, string> = {
    trait: '用户特质', pattern: '行为模式', decision: '历史决策',
    event: '关键事件', preference: '执行偏好',
  }

  const sections = Object.entries(grouped).map(([type, items]) =>
    `【${typeLabels[type as MemoryType]}】\n${items.map(m => `- [${m.id}] ${m.title}：${m.content}（置信度${m.confidence}/5）`).join('\n')}`
  )

  return `\n\n你对这位用户的记忆：\n${sections.join('\n')}\n\n请在评估时引用相关记忆（在 referencedMemoryIds 中列出你用到的记忆 id）。`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AIAssessmentWithMemory extends AIAssessment {
  referencedMemoryIds?: string[]
  memoryInsight?: string
}

export async function assessTask(
  taskDescription: string,
  mainlines: Mainline[],
  existingTasks: Task[],
  memories: Memory[] = []
): Promise<AIAssessmentWithMemory> {
  const memoryContext = buildMemoryContext(memories)
  let systemPrompt = buildSystemPrompt(mainlines, existingTasks) + memoryContext

  if (memories.length > 0) {
    systemPrompt = systemPrompt.replace(
      '"impulseNote": "如果是心血来潮，给出温和的提醒，否则 null"\n}',
      `"impulseNote": "如果是心血来潮，给出温和的提醒，否则 null",\n  "referencedMemoryIds": ["用到的记忆id数组"],\n  "memoryInsight": "基于记忆的额外洞察（1句话）或null"\n}`
    )
  }

  const text = await chatWithTools(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请评估这个新任务：${taskDescription}` },
    ],
    { maxTokens: 1024, tools: true },
  )

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常，请重试')

  return JSON.parse(jsonMatch[0]) as AIAssessmentWithMemory
}

export async function chat(
  message: string,
  mainlines: Mainline[],
  history: { role: 'user' | 'assistant'; content: string }[],
  memories: Memory[] = []
): Promise<string> {
  const mainlineContext = mainlines.length > 0
    ? mainlines.map(m => `- ${m.name}：${m.description}`).join('\n')
    : '用户尚未设置主线目标'

  const memoryContext = buildMemoryContext(memories)

  const toolHint = toolUseSupported
    ? `\n\n你可以使用工具来查询数据：
- get_recent_completions：查最近完成的任务
- search_memories：搜索用户的历史行为记忆
- get_task_stats：获取任务统计
- get_schedule：查看某天的日程

当用户问到任务数据、完成情况、统计等问题时，请调用对应工具获取准确数据，而不是凭记忆回答。`
    : ''

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `你是一个温暖但直接的个人顾问，正在帮助用户梳理人生主线目标。

用户当前的主线设置：
${mainlineContext}
${memoryContext}${toolHint}

如果用户还没设置主线，通过对话引导他们思考：
1. 工作主线：你的职业和职业目标是什么？
2. 副业/个人项目主线：你在做什么副业或个人项目？
3. 生活主线：生活中你最看重什么？（健康、学习、关系等）

每条主线需要：名称、简短描述、当前阶段、1-3个具体目标。

用对话的方式引导，不要一次问太多问题。每次只聚焦一个方面。当所有主线都梳理清楚后，用 JSON 格式总结（用 \`\`\`json 包裹），格式如下：
[{"name":"主线名","description":"描述","priority":1,"goals":["目标1"],"currentPhase":"当前阶段"}]`,
    },
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    ...(message ? [{ role: 'user' as const, content: message }] : []),
  ]

  return chatWithTools(messages, { maxTokens: 2048, tools: true })
}

// ---------------------------------------------------------------------------
// Memory extraction (V2 — unchanged, no tool use needed)
// ---------------------------------------------------------------------------

export interface ExtractedMemories {
  new: Omit<Memory, 'id' | 'lastReferencedAt' | 'referencedCount' | 'userEdited'>[]
  update: { id: string; title?: string; content?: string; confidence?: 1 | 2 | 3 | 4 | 5 }[]
  conflict: { existingId: string; newContent: string; reason: string }[]
}

export async function extractMemories(
  recentChat: ChatMessage[],
  recentEvals: EvalRecord[],
  existingMemories: Memory[],
  mainlines: Mainline[]
): Promise<ExtractedMemories> {
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const chatContext = recentChat
    .map(m => `[${m.role}] ${m.content}`)
    .join('\n')

  const evalContext = recentEvals.length > 0
    ? recentEvals.map(e => {
        const override = e.userOverride
          ? `用户改为 ${e.userOverride.basket}${e.userOverride.reason ? `（原因：${e.userOverride.reason}）` : ''}`
          : '用户接受'
        return `- 任务「${e.taskTitle}」：AI 建议 ${e.aiSuggested.basket}，${override}`
      }).join('\n')
    : '无'

  const existingContext = existingMemories.length > 0
    ? existingMemories.map(m => `- [${m.id}] [${m.type}] ${m.title}：${m.content}`).join('\n')
    : '无'

  const mainlineContext = mainlines.map(m => `- ${m.name}：${m.description}`).join('\n')

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: `你是一个记忆提取引擎。分析用户的对话和任务行为，提取值得长期记忆的洞察。

用户主线：
${mainlineContext}

已有记忆：
${existingContext}

最近任务评估记录：
${evalContext}

你需要从以下对话中提取 5 种类型的记忆：
- trait（特质）：用户的个人习惯、精力规律、工作风格
- pattern（模式）：行为规律和趋势（如"学新课通常2周后停"）
- decision（决策）：用户修改 AI 判断的记录和原因
- event（事件）：用户提到的具体日期事件（入职、会议等）
- preference（偏好）：用户反复表达的执行习惯（如"会议尽量下午"）

规则：
1. 只提取有长期价值的信息，不记录临时状态
2. 如果和已有记忆冲突，放入 conflict 而不是 new
3. 如果是对已有记忆的补充，放入 update
4. confidence：1=猜测 2=有点把握 3=确定 4=强烈 5=确凿
5. 宁缺毋滥——不确定的就不要提取

严格以 JSON 格式回复：
{
  "new": [{"type":"trait|pattern|decision|event|preference","title":"短标题","content":"完整内容","confidence":3,"source":{"kind":"chat|task","extractedAt":"${new Date().toISOString()}"},"expiresAt":null}],
  "update": [{"id":"已有记忆id","title":"更新标题(可选)","content":"更新内容(可选)","confidence":4}],
  "conflict": [{"existingId":"已有记忆id","newContent":"新发现的内容","reason":"为什么冲突"}]
}

如果没有值得提取的内容，返回 {"new":[],"update":[],"conflict":[]}`,
      },
      {
        role: 'user',
        content: `请分析以下对话并提取记忆：\n\n${chatContext}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { new: [], update: [], conflict: [] }

  try {
    return JSON.parse(jsonMatch[0]) as ExtractedMemories
  } catch {
    return { new: [], update: [], conflict: [] }
  }
}

// ---------------------------------------------------------------------------
// Day planning (V2.5 — unchanged)
// ---------------------------------------------------------------------------

export interface PlanDayResult {
  taskId: string
  startHour: number
  startMinute: number
  durationMinutes: number
}

export async function planDay(
  date: string,
  tasks: Task[],
  memories: Memory[],
  existingBlocks: TimeBlock[]
): Promise<PlanDayResult[]> {
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const pendingTasks = tasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .map(t => `- [${t.id}] ${t.title}（篮子：${t.basket}，预估${t.estimatedMinutes}分钟${t.deadline ? `，截止：${t.deadline}` : ''}${t.suggestedTimeSlot ? `，建议时段：${t.suggestedTimeSlot}` : ''}）`)
    .join('\n')

  if (!pendingTasks) throw new Error('没有待办任务可以规划')

  const occupiedSlots = existingBlocks
    .filter(b => b.date === date)
    .map(b => `- ${String(b.startHour).padStart(2, '0')}:${String(b.startMinute).padStart(2, '0')} ~ ${b.durationMinutes}分钟（已占用）`)
    .join('\n')

  const memoryContext = memories.length > 0
    ? memories.map(m => `- [${m.type}] ${m.title}：${m.content}`).join('\n')
    : '无'

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: `你是一个日程规划引擎。根据用户的待办任务、个人记忆和已占用时段，为指定日期生成最优时间安排。

日期：${date}
可用时段：8:00 - 22:00（每个时段必须是 30 分钟的整数倍，起始时间只能是整点或半点）

用户记忆（精力规律、偏好等）：
${memoryContext}

已占用时段：
${occupiedSlots || '无'}

待安排任务：
${pendingTasks}

规划原则：
1. 狮子任务优先排在上午精力最好的时段
2. 牛马任务排在下午或精力较低的时段
3. 鸵鸟任务排在最后或不排
4. 相邻任务之间不需要间隔
5. 不要和已占用时段冲突
6. 任务时长按 estimatedMinutes 来，向上取整到 30 分钟的倍数
7. 如果任务太多排不下，优先排狮子和牛马，鸵鸟可以不排
8. 参考用户记忆中的精力规律和偏好来优化安排

严格以 JSON 数组格式回复，不要包含其他文字：
[
  {"taskId":"任务id","startHour":9,"startMinute":0,"durationMinutes":60},
  {"taskId":"任务id","startHour":10,"startMinute":0,"durationMinutes":30}
]

如果没有可以安排的任务，返回空数组 []`,
      },
      {
        role: 'user',
        content: `请为 ${date} 安排今日时间表`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    return JSON.parse(jsonMatch[0]) as PlanDayResult[]
  } catch {
    return []
  }
}
