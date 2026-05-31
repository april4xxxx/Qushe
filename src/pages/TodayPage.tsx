import { useState } from 'react'
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
  getMemories,
  getProfile,
  getTasks,
  recordEval,
  saveTasks,
  updateTask,
} from '../lib/storage'

export function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>(() => getTasks())
  const [inputValue, setInputValue] = useState('')
  const [isAssessing, setIsAssessing] = useState(false)
  const [assessment, setAssessment] = useState<AIAssessmentWithMemory | null>(null)
  const [assessingTitle, setAssessingTitle] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const profile = getProfile()
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  const weekday = new Date().toLocaleDateString('zh-CN', { weekday: 'long' })

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

    // Record eval
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
    saveTasks(tasks.filter(t => t.id !== id))
    setTasks(getTasks())
  }
  function handleEdit(task: Task) {
    setEditingTask(task)
  }
  function handleSaveEdit(updates: Partial<Task>, reasonForBasketChange?: string) {
    if (!editingTask) return
    const originalBasket = editingTask.basket
    updateTask(editingTask.id, updates)

    // Record eval if basket changed via edit
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
    <div className="min-h-screen bg-cream pb-32">
      <header className="px-8 pt-14 pb-10">
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
        {error && (
          <div className="rounded-xl bg-lion-bg border border-lion-border p-4 mb-6">
            <p className="font-sans text-[13px] text-lion">{error}</p>
          </div>
        )}

        {assessment && (
          <div className="mb-10">
            <AssessmentCard
              assessment={assessment}
              taskTitle={assessingTitle}
              onConfirm={confirmTask}
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
            <p className="font-serif text-[15px] italic text-warm-gray">AI 正在思考...</p>
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

        {activeTasks.length === 0 && !assessment && !isAssessing && (
          <div className="text-center py-24">
            <p className="font-serif text-6xl text-parchment mb-6">取</p>
            <p className="font-serif text-lg text-warm-gray">今日尚无任务</p>
            <p className="font-sans text-[13px] text-warm-gray-light mt-2">点击下方按钮，告诉 AI 你的新任务</p>
          </div>
        )}
      </main>

      {showInput ? (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-6">
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
          className="fixed bottom-24 right-6 z-30 group flex items-center gap-3 rounded-full bg-espresso pl-5 pr-2 py-2 text-cream shadow-[0_8px_32px_rgba(26,22,20,0.2)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_12px_48px_rgba(26,22,20,0.3)] active:scale-[0.97]"
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
    </div>
  )
}
