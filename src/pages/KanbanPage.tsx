import { useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskEditor } from '../components/TaskEditor'
import type { Basket, EvalRecord, Task } from '../types'
import { BASKET_CONFIG } from '../types'
import { generateId, getTasks, recordEval, saveTasks, updateTask } from '../lib/storage'

const basketOrder: Basket[] = ['lion', 'ox', 'ostrich']

const columnAccents = {
  lion: 'border-t-lion',
  ox: 'border-t-ox',
  ostrich: 'border-t-ostrich',
}

export function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>(() => getTasks())
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const filteredTasks = filter === 'active'
    ? tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
    : tasks

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

  return (
    <div className="min-h-screen bg-cream pb-32 page-enter">
      <header className="px-8 pt-14 pb-8">
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mb-3">概览</p>
        <h1 className="font-serif text-[2.5rem] leading-[1.1] text-espresso tracking-tight">三篮看板</h1>
        <div className="mt-4 h-[1px] bg-espresso/10" />

        <div className="mt-5 flex gap-2">
          {(['active', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-sans text-[11px] uppercase tracking-[0.15em] rounded-full px-4 py-2 transition-all duration-300 ${
                filter === f
                  ? 'bg-espresso text-cream'
                  : 'bg-parchment/50 text-warm-gray hover:bg-parchment'
              }`}
            >
              {f === 'active' ? '进行中' : '全部'}
            </button>
          ))}
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 max-w-6xl mx-auto">
        {basketOrder.map(basket => {
          const config = BASKET_CONFIG[basket]
          const basketTasks = filteredTasks.filter(t => t.basket === basket)
          const totalMinutes = basketTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)

          return (
            <div key={basket}>
              <div className={`rounded-[1.25rem] bg-white border-t-[3px] ${columnAccents[basket]} p-6 mb-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.label.split(' ')[0]}</span>
                    <div>
                      <h2 className="font-serif text-[15px] text-espresso">{config.label.split(' ')[1]}</h2>
                      <p className="font-sans text-[11px] text-warm-gray-light">{config.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-xl text-espresso">{basketTasks.length}</p>
                    <p className="font-sans text-[10px] text-warm-gray-light tracking-wide">{totalMinutes} min</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {basketTasks.map(t => (
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
                {basketTasks.length === 0 && (
                  <div className="rounded-[1.25rem] border border-dashed border-parchment p-8 text-center">
                    <p className="font-serif text-[14px] italic text-warm-gray-light">空</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </main>

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
