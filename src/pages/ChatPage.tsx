import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, Mainline } from '../types'
import { chat, isAIReady } from '../lib/ai'
import { getProfile, saveProfile, generateId, getChatMessages, saveChatMessages } from '../lib/storage'
import { MarkdownMessage } from '../components/MarkdownMessage'

export function ChatPage() {
  const profile = getProfile()
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = getChatMessages()
    if (saved.length > 0) return saved
    return []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length > 0) return

    const welcome: ChatMessage = profile?.mainlines?.length
      ? {
          id: generateId(),
          role: 'assistant',
          content: `你好。你的主线目标已经就位。\n\n你可以在这里和我聊任务安排、主线调整，或任何关于取舍的困惑。\n\n当前主线：\n${profile.mainlines.map(m => `· ${m.name} — ${m.description}`).join('\n')}`,
          timestamp: new Date().toISOString(),
        }
      : {
          id: generateId(),
          role: 'assistant',
          content: '你好，我是你的取舍顾问。\n\n在开始之前，我需要了解你的人生主线——这样我才能帮你判断每件事的轻重缓急。\n\n先聊聊：你目前的工作是什么？职业上最想达成什么目标？',
          timestamp: new Date().toISOString(),
        }

    const initial = [welcome]
    setMessages(initial)
    saveChatMessages(initial)
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    if (!isAIReady()) { setError('请先在设置页面配置 DeepSeek API Key'); return }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    saveChatMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError('')

    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }))
      const response = await chat('', profile?.mainlines ?? [], history)

      let panoramaUnlocked = false
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          const mainlines: Mainline[] = JSON.parse(jsonMatch[1]).map((m: Mainline, i: number) => ({
            ...m,
            id: generateId(),
            priority: m.priority ?? i + 1,
            goals: m.goals ?? [],
            currentPhase: m.currentPhase ?? '',
          }))
          saveProfile({
            mainlines,
            onboardingCompleted: true,
            createdAt: profile?.createdAt ?? new Date().toISOString(),
          })
          panoramaUnlocked = !profile?.mainlines?.length
        } catch { /* JSON parse failed, just show message */ }
      }

      // Strip the raw JSON code block from displayed message - it's noise to the user
      const displayContent = response.replace(/```json[\s\S]*?```/g, '').trim()

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: displayContent || response,
        timestamp: new Date().toISOString(),
      }
      const withReply = [...newMessages, assistantMsg]

      // Inject panorama unlock notice
      if (panoramaUnlocked) {
        const unlockMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `🌅 **你的人生全景图已经生成。**\n\n点击底部「全景 ✦」查看，或随时回到这里继续调整主线。`,
          timestamp: new Date().toISOString(),
        }
        withReply.push(unlockMsg)
      }

      setMessages(withReply)
      saveChatMessages(withReply)
    } catch (err) {
      setError(err instanceof Error ? err.message : '对话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream pb-16">
      <header className="px-8 pt-14 pb-6">
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mb-3">对话</p>
        <h1 className="font-serif text-[2.5rem] leading-[1.1] text-espresso tracking-tight">
          {profile?.mainlines?.length ? '顾问' : '初次见面'}
        </h1>
        <div className="mt-4 h-[1px] bg-espresso/10" />
        <p className="mt-3 font-sans text-[13px] text-warm-gray">
          {profile?.mainlines?.length ? '聊聊你的任务安排与主线调整' : '通过对话梳理你的人生主线'}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 max-w-lg mx-auto w-full space-y-5">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] ${
              msg.role === 'user'
                ? 'rounded-[1.25rem] rounded-br-md bg-espresso px-5 py-4'
                : 'rounded-[1.25rem] rounded-bl-md bg-white ring-1 ring-espresso/[0.06] px-5 py-4 shadow-[0_2px_12px_rgba(26,22,20,0.04)]'
            }`}>
              <MarkdownMessage content={msg.content} variant={msg.role} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-[1.25rem] rounded-bl-md bg-white ring-1 ring-espresso/[0.06] px-5 py-4 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warm-gray-light animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-warm-gray-light animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-warm-gray-light animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-lion-bg border border-lion-border p-4">
            <p className="font-sans text-[13px] text-lion">{error}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="border-t border-parchment bg-cream px-6 py-4">
        <form onSubmit={handleSend} className="max-w-lg mx-auto">
          <div className="rounded-full bg-white p-[3px] ring-1 ring-espresso/[0.08] shadow-[0_2px_12px_rgba(26,22,20,0.06)]">
            <div className="flex items-center gap-2 rounded-full px-5 py-1">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="说点什么..."
                className="flex-1 bg-transparent font-sans text-[14px] text-espresso placeholder:text-warm-gray-lighter py-3 outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-9 h-9 rounded-full bg-espresso text-cream flex items-center justify-center text-sm transition-all duration-300 active:scale-95 disabled:opacity-30"
              >
                ↑
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
