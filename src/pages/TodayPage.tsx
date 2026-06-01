import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TaskCard } from '../components/TaskCard'
import { AssessmentCard } from '../components/AssessmentCard'
import { TaskEditor } from '../components/TaskEditor'
import type { Basket, EvalRecord, Task } from '../types'
import { assessTask, isAIReady } from '../lib/ai'
import type { AIAssessmentWithMemory } from '../lib/ai'
import {
  addTask,
  bumpMemoryReference,
  generateId,
  getApiKey,
  getMemories,
  getProfile,
  getTasks,
  recordEval,
  saveTasks,
  updateTask,
} from '../lib/storage'

export function TodayPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>(() => getTasks())
  const [inputValue, setInputValue] = useState('')
  const [isAssessing, setIsAssessing] = useState(false)
  const [assessment, setAssessment] = useState<AIAssessmentWithMemory | null>(null)
  const [assessingTitle, setAssessingTitle] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const profile = getProfile()
  const hasApiKey = !!getApiKey()
  const hasMainlines = !!profile?.mainlines?.length
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  const weekday = new Date().toLocaleDateString('zh-CN', { weekday: 'long' })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // Keyboard shortcuts: N to open input, Esc to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && !showInput && !assessment && !editingTask &&
          !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setShowInput(true)
      }
      if (e.key === 'Escape') {
        if (showInput) setShowInput(false)
        if (assessment) { setAssessment(null); setInputValue(''); setAssessingTitle('') }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showInput, assessment, editingTask])

  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const lionTasks = activeTasks.filter(t => t.basket === 'lion')
  const oxTasks = activeTasks.filter(t => t.basket === 'ox')
  const ostrichTasks = activeTasks.filter(t => t.basket === 'ostrich')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim()) return
    if (!isAIReady()) { setError('请先在设置页面配置 DeepSeek API Key'); return }
    if (!profile?.mainlines?.length) { setError('请先在对话页面完成主线目标设置'); return }

    setError('')
    setIsAssessing(true)
    setAssessingTitle(inputValue.trim())

    try {
      const memories = getMemories()
      const result = await assessTask(inputValue.trim(), profile.mainlines, tasks, memories)
      if (result.referencedMemoryIds?.length) {
        bumpMemoryReference(result.referencedMemoryIds)
      }
      setAssessment(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 评估失败，请重试')
    } finally {
      setIsAssessing(false)
    }
  }

  function dismissAssessment() {
    setAssessment(null)
    setInputValue('')
    setAssessingTitle('')
  }

  function confirmTask(overrides?: { basket?: Basket; deadline?: string; reason?: string }) {
    if (!assessment) return
    const basket = overrides?.basket ?? assessment.basket
    const taskId = generateId()
    const task: Task = {
      id: taskId,
      title: assessingTitle,
      description: '',
      basket,
      mainlineAlignment: assessment.mainlineAlignment,
      alignedMainlineId: assessment.alignedMainlineId,
      estimatedMinutes: assessment.estimatedMinutes,
      suggestedTimeSlot: assessment.suggestedTimeSlot,
      deadline: overrides?.deadline ?? assessment.deadline,
      status: 'pending',
      isImpulse: assessment.isImpulse,
      aiReason: assessment.reason,
      createdAt: new Date().toISOString(),
    }
    addTask(task)

    const evalRecord: EvalRecord = {
      id: generateId(),
      taskId,
      taskTitle: assessingTitle,
      timestamp: new Date().toISOString(),
      aiSuggested: {
        basket: assessment.basket,
        reason: assessment.reason,
        mainlineAlignment: assessment.mainlineAlignment,
        estimatedMinutes: assessment.estimatedMinutes,
      },
      userAccepted: !overrides?.basket,
      userOverride: overrides?.basket ? { basket: overrides.basket, reason: overrides.reason } : undefined,
    }
    recordEval(evalRecord)

    setTasks(getTasks())
    setAssessment(null)
    setInputValue('')
    setShowInput(false)
    const basketLabel = basket === 'lion' ? '狮子' : basket === 'ox' ? '牛马' : '鸵鸟'
    showToast(`已添加到${basketLabel}篮`)
  }

  function handleComplete(id: string) {
    updateTask(id, { status: 'completed', completedAt: new Date().toISOString() })
    setTasks(getTasks())
  }
  function handleUncomplete(id: string) {
    updateTask(id, { status: 'pending', completedAt: undefined })
    setTasks(getTasks())
  }
  function handleCancel(id: string) {
    updateTask(id, { status: 'cancelled' })
    setTasks(getTasks())
  }
  function handleDelete(id: string) {
    setPendingDelete(id)
  }
  function confirmDelete() {
    if (!pendingDelete) return
    saveTasks(tasks.filter(t => t.id !== pendingDelete))
    setTasks(getTasks())
    setPendingDelete(null)
    showToast('任务已删除')
  }
  function handleEdit(task: Task) {
    setEditingTask(task)
  }
  function handleSaveEdit(updates: Partial<Task>, reasonForBasketChange?: string) {
    if (!editingTask) return
    const originalBasket = editingTask.basket
    updateTask(editingTask.id, updates)

    if (updates.basket && updates.basket !== originalBasket) {
      const evalRecord: EvalRecord = {
        id: generateId(),
        taskId: editingTask.id,
        taskTitle: updates.title ?? editingTask.title,
        timestamp: new Date().toISOString(),
        aiSuggested: {
          basket: originalBasket,
          reason: editingTask.aiReason,
          mainlineAlignment: editingTask.mainlineAlignment,
          estimatedMinutes: editingTask.estimatedMinutes,
        },
        userAccepted: false,
        userOverride: { basket: updates.basket, reason: reasonForBasketChange },
      }
      recordEval(evalRecord)
    }

    setTasks(getTasks())
    setEditingTask(null)
  }

  const renderSection = (title: string, emoji: string, sectionTasks: Task[], subtitle: string) => {
    if (sectionTasks.length === 0) return null
    return (
      <section className="mb-10">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-2xl">{emoji}</span>
          <h2 className="font-serif text-lg text-espresso">{title}</h2>
          <span className="font-sans text-[11px] text-warm-gray-light tracking-wide">{subtitle}</span>
        </div>
        <div className="space-y-4">
          {sectionTasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-32 page-enter">
      <header className="px-8 pt-14 pb-8">
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mb-3">{weekday}</p>
        <h1 className="font-serif text-[2.5rem] leading-[1.1] text-espresso tracking-tight">{today}</h1>
        <div className="mt-4 h-[1px] bg-espresso/10" />
        {lionTasks.length > 0 && (
          <p className="mt-4 font-sans text-[13px] text-lion">
            {lionTasks.length} 个狮子任务需要你的关注
          </p>
        )}
      </header>

      <main className="max-w-lg mx-auto px-6">
        {/* First-run onboarding */}
        {(!hasApiKey || !hasMainlines) && activeTasks.length === 0 && !assessment && !isAssessing && (
          <div className="mb-10 rounded-[1.5rem] bg-white ring-1 ring-espresso/[0.06] p-7 shadow-[0_2px_12px_rgba(26,22,20,0.04)]">
            <h2 className="font-serif text-xl text-espresso mb-2">开始使用取舍</h2>
            <p className="font-sans text-[13px] text-warm-gray leading-relaxed mb-5">
              完成以下两步，AI 就能帮你判断每件事的轻重缓急。
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-300 ${
                  hasApiKey
                    ? 'bg-accent-light ring-1 ring-accent/20'
                    : 'bg-cream ring-1 ring-espresso/10 hover:ring-espresso/20'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0 ${
                  hasApiKey ? 'bg-accent text-cream' : 'bg-parchment text-warm-gray'
                }`}>
                  {hasApiKey ? '✓' : '1'}
                </span>
                <div>
                  <p className={`font-sans text-[13px] font-medium ${hasApiKey ? 'text-accent' : 'text-espresso'}`}>
                    {hasApiKey ? '已配置 API Key' : '配置 DeepSeek API Key'}
                  </p>
                  <p className="font-sans text-[11px] text-warm-gray-light mt-0.5">
                    {hasApiKey ? '连接已就绪' : '前往设置页面填入你的密钥'}
                  </p>
                </div>
              </button>
              <button
                onClick={() => navigate('/chat')}
                className={`w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-300 ${
                  hasMainlines
                    ? 'bg-accent-light ring-1 ring-accent/20'
                    : hasApiKey
                      ? 'bg-cream ring-1 ring-espresso/10 hover:ring-espresso/20'
                      : 'bg-cream/50 ring-1 ring-parchment opacity-60'
                }`}
                disabled={!hasApiKey}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0 ${
                  hasMainlines ? 'bg-accent text-cream' : 'bg-parchment text-warm-gray'
                }`}>
                  {hasMainlines ? '✓' : '2'}
                </span>
                <div>
                  <p className={`font-sans text-[13px] font-medium ${hasMainlines ? 'text-accent' : 'text-espresso'}`}>
                    {hasMainlines ? '主线目标已设定' : '和 AI 梳理人生主线'}
                  </p>
                  <p className="font-sans text-[11px] text-warm-gray-light mt-0.5">
                    {hasMainlines ? `${profile!.mainlines.length} 条主线就位` : '通过对话告诉 AI 你的目标'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Error with dismiss */}
        {error && (
          <div className="rounded-xl bg-lion-bg border border-lion-border p-4 mb-6 flex items-start justify-between gap-3">
            <p className="font-sans text-[13px] text-lion">{error}</p>
            <button
              onClick={() => setError('')}
              className="shrink-0 font-sans text-[11px] text-lion/60 hover:text-lion transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {assessment && (
          <div className="mb-10">
            <AssessmentCard
              assessment={assessment}
              taskTitle={assessingTitle}
              onConfirm={confirmTask}
              onDismiss={dismissAssessment}
              referencedMemories={
                assessment.referencedMemoryIds?.length
                  ? getMemories().filter(m => assessment.referencedMemoryIds!.includes(m.id))
                  : undefined
              }
            />
          </div>
        )}

        {isAssessing && (
          <div className="flex flex-col items-center py-16 mb-10">
            <div className="w-8 h-8 rounded-full border-2 border-espresso/10 border-t-espresso/60 animate-spin mb-4" />
            <p className="font-serif text-[15px] italic text-warm-gray">
              正在评估「{assessingTitle}」...
            </p>
            <p className="font-sans text-[11px] text-warm-gray-light mt-2">
              AI 正在分析任务与你的主线目标的关联
            </p>
          </div>
        )}

        {renderSection('狮子', '🦁', lionTasks, '今日必须完成')}
        {renderSection('牛马', '🐂', oxTasks, '本周事务')}
        {renderSection('鸵鸟', '🐦', ostrichTasks, '可以延后')}

        {completedTasks.length > 0 && (
          <section className="mb-10 pt-6 border-t border-parchment">
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-4">
              已完成 · {completedTasks.length}
            </p>
            <div className="space-y-3">
              {completedTasks.slice(0, 5).map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state — only when setup is done */}
        {activeTasks.length === 0 && !assessment && !isAssessing && hasApiKey && hasMainlines && (
          <div className="text-center py-24">
            <p className="font-serif text-6xl text-parchment mb-6">取</p>
            <p className="font-serif text-lg text-warm-gray">今日尚无任务</p>
            <p className="font-sans text-[13px] text-warm-gray-light mt-2">
              按 <kbd className="inline-block px-1.5 py-0.5 rounded bg-parchment/80 text-[11px] font-mono">N</kbd> 或点击下方按钮录入新任务
            </p>
          </div>
        )}
      </main>

      {showInput ? (
        <div className="fixed bottom-[5.5rem] left-0 right-0 z-30 px-6">
          <div className="max-w-lg mx-auto">
            <div className="rounded-[1.5rem] bg-white p-[3px] ring-1 ring-espresso/10 shadow-[0_8px_40px_rgba(26,22,20,0.12)]">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-[calc(1.5rem-3px)] bg-white px-5 py-1">
                <input
                  autoFocus
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="描述你的新任务..."
                  className="flex-1 bg-transparent font-sans text-[14px] text-espresso placeholder:text-warm-gray-lighter py-4 outline-none"
                  disabled={isAssessing}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isAssessing}
                  className="shrink-0 w-10 h-10 rounded-full bg-espresso text-cream flex items-center justify-center text-sm transition-all duration-300 hover:bg-espresso-light active:scale-95 disabled:opacity-30"
                >
                  →
                </button>
              </form>
            </div>
            <button
              onClick={() => setShowInput(false)}
              className="mt-3 w-full font-sans text-[12px] text-warm-gray-light hover:text-warm-gray transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="fixed bottom-[5.5rem] right-6 z-30 group flex items-center gap-3 rounded-full bg-espresso pl-5 pr-2 py-2 text-cream shadow-[0_8px_32px_rgba(26,22,20,0.2)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_12px_48px_rgba(26,22,20,0.3)] active:scale-[0.97]"
        >
          <span className="font-sans text-[13px] font-medium tracking-wide">新任务</span>
          <span className="w-8 h-8 rounded-full bg-cream/15 flex items-center justify-center text-sm transition-transform duration-500 group-hover:rotate-90">
            +
          </span>
        </button>
      )}

      {editingTask && (
        <TaskEditor
          task={editingTask}
          onSave={handleSaveEdit}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-[fadeUp_0.2s_ease-out]">
          <div className="absolute inset-0 bg-espresso/30 backdrop-blur-sm" onClick={() => setPendingDelete(null)} />
          <div className="relative rounded-[1.5rem] bg-white p-7 max-w-sm w-full shadow-[0_20px_60px_rgba(26,22,20,0.2)]">
            <h3 className="font-serif text-lg text-espresso mb-2">确认删除</h3>
            <p className="font-sans text-[13px] text-warm-gray mb-6">
              删除后无法恢复。如果只是暂时不做，建议使用「不做了」。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-full border border-parchment py-3 font-sans text-[12px] font-medium text-warm-gray hover:border-warm-gray-light transition-colors"
              >
                返回
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-full bg-lion py-3 font-sans text-[12px] font-medium text-cream hover:bg-lion/90 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-[fadeUp_0.3s_ease-out]">
          <div className="rounded-full bg-espresso px-5 py-2.5 shadow-[0_8px_32px_rgba(26,22,20,0.2)]">
            <p className="font-sans text-[13px] text-cream whitespace-nowrap">{toast}</p>
          </div>
        </div>
      )}
    </div>
  )
}
