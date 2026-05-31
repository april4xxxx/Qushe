import OpenAI from 'openai'
import type { AIAssessment, ChatMessage, EvalRecord, Mainline, Memory, MemoryType, Task } from '../types'

let client: OpenAI | null = null

export function initAI(apiKey: string): void {
  client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

export function isAIReady(): boolean {
  return client !== null
}

function buildSystemPrompt(mainlines: Mainline[], existingTasks: Task[]): string {
  const mainlineContext = mainlines
    .map(m => `- ${m.name}（优先级${m.priority}）：${m.description}\n  当前阶段：${m.currentPhase}\n  目标：${m.goals.join('、')}`)
    .join('\n')

  const pendingTasks = existingTasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .map(t => `- [${t.basket}] ${t.title}（预估${t.estimatedMinutes}分钟）`)
    .join('\n')

  return `你是一个智能任务优先级顾问。你了解用户的人生主线目标，并基于此帮助用户评估每个新任务的优先级。

用户的人生主线：
${mainlineContext}

当前待办任务：
${pendingTasks || '暂无待办任务'}

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
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const memoryContext = buildMemoryContext(memories)
  const systemPrompt = buildSystemPrompt(mainlines, existingTasks) + memoryContext

  const jsonSchema = memories.length > 0
    ? `\n  "referencedMemoryIds": ["用到的记忆id数组"],\n  "memoryInsight": "基于记忆的额外洞察（1句话）或null"`
    : ''

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt.replace(
        '"impulseNote": "如果是心血来潮，给出温和的提醒，否则 null"\n}',
        `"impulseNote": "如果是心血来潮，给出温和的提醒，否则 null",${jsonSchema}\n}`
      )},
      { role: 'user', content: `请评估这个新任务：${taskDescription}` },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
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
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const mainlineContext = mainlines.length > 0
    ? mainlines.map(m => `- ${m.name}：${m.description}`).join('\n')
    : '用户尚未设置主线目标'

  const memoryContext = buildMemoryContext(memories)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `你是一个温暖但直接的个人顾问，正在帮助用户梳理人生主线目标。

用户当前的主线设置：
${mainlineContext}
${memoryContext}

如果用户还没设置主线，通过对话引导他们思考：
1. 工作主线：你的职业和职业目标是什么？
2. 副业/个人项目主线：你在做什么副业或个人项目？
3. 生活主线：生活中你最看重什么？（健康、学习、关系等）

每条主线需要：名称、简短描述、当前阶段、1-3个具体目标。

用对话的方式引导，不要一次问太多问题。每次只聚焦一个方面。当所有主线都梳理清楚后，用 JSON 格式总结（用 \`\`\`json 包裹），格式如下：
[{"name":"主线名","description":"描述","priority":1,"goals":["目标1"],"currentPhase":"当前阶段"}]`,
    },
    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: message },
  ]

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 2048,
    messages,
  })

  return response.choices[0]?.message?.content ?? ''
}

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
