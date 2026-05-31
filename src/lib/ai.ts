import OpenAI from 'openai'
import type { AIAssessment, Mainline, Task } from '../types'

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

export async function assessTask(
  taskDescription: string,
  mainlines: Mainline[],
  existingTasks: Task[]
): Promise<AIAssessment> {
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(mainlines, existingTasks) },
      { role: 'user', content: `请评估这个新任务：${taskDescription}` },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常，请重试')

  return JSON.parse(jsonMatch[0]) as AIAssessment
}

export async function chat(
  message: string,
  mainlines: Mainline[],
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!client) throw new Error('请先在设置页面配置 API Key')

  const mainlineContext = mainlines.length > 0
    ? mainlines.map(m => `- ${m.name}：${m.description}`).join('\n')
    : '用户尚未设置主线目标'

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `你是一个温暖但直接的个人顾问，正在帮助用户梳理人生主线目标。

用户当前的主线设置：
${mainlineContext}

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
