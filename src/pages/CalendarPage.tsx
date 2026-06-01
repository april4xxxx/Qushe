import { useState, useRef, useCallback, useEffect } from 'react'
import type { Task, TimeBlock, Basket } from '../types'
import { BASKET_CONFIG } from '../types'
import { planDay, isAIReady } from '../lib/ai'
import {
  getTasks,
  getBlocks,
  getBlocksForDate,
  addBlocks,
  updateBlock,
  deleteBlock,
  clearBlocksForDate,
  generateId,
  getMemories,
  getProfile,
} from '../lib/storage'

const HOUR_START = 8
const HOUR_END = 22
const SLOT_COUNT = (HOUR_END - HOUR_START) * 2
const SLOT_HEIGHT = 48

const basketColors: Record<Basket, { bg: string; border: string; text: string }> = {
  lion: { bg: 'bg-lion-bg', border: 'border-lion/30', text: 'text-lion' },
  ox: { bg: 'bg-ox-bg', border: 'border-ox/30', text: 'text-ox' },
  ostrich: { bg: 'bg-ostrich-bg', border: 'border-ostrich/30', text: 'text-ostrich' },
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tasks, setTasks] = useState<Task[]>(() => getTasks())
  const [blocks, setBlocks] = useState<TimeBlock[]>(() => getBlocks())
  const [isPlanning, setIsPlanning] = useState(false)
  const [error, setError] = useState('')
  const [dragState, setDragState] = useState<{
    blockId: string
    startY: number
    startCol: number
    originalBlock: TimeBlock
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ date: string; startHour: number; startMinute: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const weekDates = getWeekDates(weekOffset)
  const todayKey = formatDateKey(new Date())

  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const scheduledTaskIds = new Set(blocks.map(b => b.taskId))
  const unscheduledTasks = activeTasks.filter(t => !scheduledTaskIds.has(t.id))

  function refresh() {
    setTasks(getTasks())
    setBlocks(getBlocks())
  }

  async function handlePlanToday() {
    if (isPlanning) return
    if (!isAIReady()) { setError('请先在设置页面配置 DeepSeek API Key'); return }
    const profile = getProfile()
    if (!profile?.mainlines?.length) { setError('请先在对话页面完成主线目标设置'); return }
    if (activeTasks.length === 0) { setError('没有待办任务可以规划'); return }

    setIsPlanning(true)
    setError('')

    try {
      const memories = getMemories()
      const existingBlocks = getBlocksForDate(todayKey)
      const result = await planDay(todayKey, tasks, memories, existingBlocks)

      if (result.length === 0) {
        setError('AI 未生成任何时段安排')
        return
      }

      clearBlocksForDate(todayKey)
      const newBlocks: TimeBlock[] = result
        .filter(r => activeTasks.some(t => t.id === r.taskId))
        .map(r => ({
          id: generateId(),
          taskId: r.taskId,
          date: todayKey,
          startHour: r.startHour,
          startMinute: r.startMinute,
          durationMinutes: Math.max(30, Math.ceil(r.durationMinutes / 30) * 30),
          aiGenerated: true,
        }))
      addBlocks(newBlocks)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 规划失败')
    } finally {
      setIsPlanning(false)
    }
  }

  function handleDeleteBlock(id: string) {
    deleteBlock(id)
    refresh()
  }

  function slotToTime(slotIndex: number): { hour: number; minute: number } {
    const totalMinutes = (HOUR_START * 60) + slotIndex * 30
    return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 }
  }

  function positionToSlot(y: number, colEl: HTMLElement): number {
    const rect = colEl.getBoundingClientRect()
    const relativeY = y - rect.top
    return Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor(relativeY / SLOT_HEIGHT)))
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, block: TimeBlock, colIndex: number) => {
    e.preventDefault()
    setDragState({
      blockId: block.id,
      startY: e.clientY,
      startCol: colIndex,
      originalBlock: block,
    })
  }, [])

  useEffect(() => {
    if (!dragState) return

    function handleMouseMove(e: MouseEvent) {
      if (!gridRef.current || !dragState) return
      const cols = gridRef.current.querySelectorAll('[data-col]')
      let targetCol = dragState.startCol
      let targetSlot = 0

      for (let i = 0; i < cols.length; i++) {
        const rect = cols[i].getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          targetCol = i
          targetSlot = positionToSlot(e.clientY, cols[i] as HTMLElement)
          break
        }
      }

      const { hour, minute } = slotToTime(targetSlot)
      const dateKey = formatDateKey(weekDates[targetCol])
      setDragPreview({ date: dateKey, startHour: hour, startMinute: minute })
    }

    function handleMouseUp() {
      if (dragState && dragPreview) {
        updateBlock(dragState.blockId, {
          date: dragPreview.date,
          startHour: dragPreview.startHour,
          startMinute: dragPreview.startMinute,
        })
        refresh()
      }
      setDragState(null)
      setDragPreview(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, dragPreview, weekDates])

  const [placingTaskId, setPlacingTaskId] = useState<string | null>(null)

  function handleSlotClick(dateKey: string, slotIndex: number) {
    if (!placingTaskId) return
    const task = activeTasks.find(t => t.id === placingTaskId)
    if (!task) return

    const { hour, minute } = slotToTime(slotIndex)
    const durationMinutes = Math.max(30, Math.ceil(task.estimatedMinutes / 30) * 30)

    addBlocks([{
      id: generateId(),
      taskId: task.id,
      date: dateKey,
      startHour: hour,
      startMinute: minute,
      durationMinutes,
      aiGenerated: false,
    }])
    setPlacingTaskId(null)
    refresh()
  }

  function getBlockStyle(block: TimeBlock): React.CSSProperties {
    const topSlots = (block.startHour - HOUR_START) * 2 + (block.startMinute / 30)
    const heightSlots = block.durationMinutes / 30
    return {
      position: 'absolute',
      top: `${topSlots * SLOT_HEIGHT}px`,
      height: `${heightSlots * SLOT_HEIGHT - 2}px`,
      left: '2px',
      right: '2px',
    }
  }

  const weekRangeLabel = (() => {
    const start = weekDates[0]
    const end = weekDates[6]
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
    return `${fmt(start)} — ${fmt(end)}`
  })()

  return (
    <div className="min-h-screen bg-cream pb-32 page-enter">
      <header className="px-8 pt-14 pb-6">
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mb-3">规划</p>
        <h1 className="font-serif text-[2.5rem] leading-[1.1] text-espresso tracking-tight">日历</h1>
        <div className="mt-4 h-[1px] bg-espresso/10" />
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {/* Week navigation + AI plan button */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-full bg-white ring-1 ring-espresso/[0.08] flex items-center justify-center text-espresso hover:ring-espresso/20 transition-all"
            >
              ←
            </button>
            <div className="text-center min-w-[140px]">
              <p className="font-serif text-[15px] text-espresso">{weekRangeLabel}</p>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="font-sans text-[10px] text-accent hover:text-espresso transition-colors"
                >
                  回到本周
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-full bg-white ring-1 ring-espresso/[0.08] flex items-center justify-center text-espresso hover:ring-espresso/20 transition-all"
            >
              →
            </button>
          </div>

          <button
            onClick={handlePlanToday}
            disabled={isPlanning || activeTasks.length === 0}
            className="group flex items-center gap-2 rounded-full bg-espresso px-4 py-2.5 text-cream transition-all duration-500 hover:bg-espresso-light active:scale-[0.97] disabled:opacity-40"
          >
            {isPlanning ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-cream/30 border-t-cream animate-spin" />
                <span className="font-sans text-[12px] font-medium tracking-wide">规划中...</span>
              </>
            ) : (
              <>
                <span className="font-sans text-[12px] font-medium tracking-wide">AI 规划今日</span>
                <span className="w-5 h-5 rounded-full bg-cream/15 flex items-center justify-center text-[10px]">✦</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-lion-bg border border-lion-border p-4 mb-5">
            <p className="font-sans text-[13px] text-lion">{error}</p>
          </div>
        )}

        {/* Placing mode indicator */}
        {placingTaskId && (
          <div className="rounded-xl bg-accent-light border border-accent/20 p-3 mb-5 flex items-center justify-between">
            <p className="font-sans text-[12px] text-accent">
              点击日历格子放置任务：<strong>{activeTasks.find(t => t.id === placingTaskId)?.title}</strong>
            </p>
            <button
              onClick={() => setPlacingTaskId(null)}
              className="font-sans text-[11px] text-warm-gray-light hover:text-espresso px-2"
            >
              取消
            </button>
          </div>
        )}

        {/* Calendar grid */}
        <div className="rounded-[1.25rem] bg-white ring-1 ring-espresso/[0.06] overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-parchment">
            <div className="p-2" />
            {weekDates.map((d, i) => {
              const today = isToday(d)
              return (
                <div
                  key={i}
                  className={`p-3 text-center border-l border-parchment ${today ? 'bg-accent-light' : ''}`}
                >
                  <p className={`font-sans text-[10px] uppercase tracking-[0.15em] ${today ? 'text-accent font-medium' : 'text-warm-gray-light'}`}>
                    {WEEKDAY_LABELS[i]}
                  </p>
                  <p className={`font-serif text-[18px] mt-0.5 ${today ? 'text-accent' : 'text-espresso'}`}>
                    {d.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] overflow-y-auto max-h-[calc(100vh-320px)]" ref={gridRef}>
            {/* Time labels column */}
            <div className="relative">
              {Array.from({ length: SLOT_COUNT }, (_, i) => {
                const { hour, minute } = slotToTime(i)
                return (
                  <div
                    key={i}
                    className="border-b border-parchment/50 flex items-start justify-end pr-2 pt-0.5"
                    style={{ height: `${SLOT_HEIGHT}px` }}
                  >
                    {minute === 0 && (
                      <span className="font-sans text-[10px] text-warm-gray-lighter tabular-nums">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Day columns */}
            {weekDates.map((d, colIndex) => {
              const dateKey = formatDateKey(d)
              const dayBlocks = blocks.filter(b => b.date === dateKey)
              const today = isToday(d)

              return (
                <div
                  key={colIndex}
                  data-col={colIndex}
                  className={`relative border-l border-parchment ${today ? 'bg-accent-light/30' : ''} ${placingTaskId ? 'cursor-crosshair' : ''}`}
                >
                  {/* Slot grid lines */}
                  {Array.from({ length: SLOT_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className={`border-b border-parchment/50 ${placingTaskId ? 'hover:bg-accent-light/50' : ''}`}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                      onClick={() => handleSlotClick(dateKey, i)}
                    />
                  ))}

                  {/* Time blocks */}
                  {dayBlocks.map(block => {
                    const task = tasks.find(t => t.id === block.taskId)
                    if (!task) return null
                    const colors = basketColors[task.basket]
                    const isDragging = dragState?.blockId === block.id

                    return (
                      <div
                        key={block.id}
                        style={getBlockStyle(block)}
                        className={`rounded-lg ${colors.bg} border ${colors.border} px-2 py-1.5 cursor-grab overflow-hidden transition-shadow ${
                          isDragging ? 'opacity-40 shadow-none' : 'shadow-sm hover:shadow-md'
                        }`}
                        onMouseDown={(e) => handleMouseDown(e, block, colIndex)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className={`font-sans text-[11px] font-medium ${colors.text} leading-tight truncate`}>
                            {task.title}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id) }}
                            className="shrink-0 text-warm-gray-lighter hover:text-lion text-[10px] mt-0.5"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            ×
                          </button>
                        </div>
                        <p className="font-sans text-[9px] text-warm-gray-light mt-0.5">
                          {String(block.startHour).padStart(2, '0')}:{String(block.startMinute).padStart(2, '0')} · {block.durationMinutes}min
                        </p>
                        {block.aiGenerated && (
                          <span className="font-sans text-[8px] text-accent">AI</span>
                        )}
                      </div>
                    )
                  })}

                  {/* Drag preview ghost */}
                  {dragPreview && dragState && dragPreview.date === dateKey && (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${((dragPreview.startHour - HOUR_START) * 2 + dragPreview.startMinute / 30) * SLOT_HEIGHT}px`,
                        height: `${(dragState.originalBlock.durationMinutes / 30) * SLOT_HEIGHT - 2}px`,
                        left: '2px',
                        right: '2px',
                      }}
                      className="rounded-lg bg-espresso/10 border-2 border-dashed border-espresso/30 pointer-events-none"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Unscheduled tasks */}
        {unscheduledTasks.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-[15px] text-espresso">未排入日历</h2>
              <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light">
                {unscheduledTasks.length} 个任务
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {unscheduledTasks.map(task => {
                const colors = basketColors[task.basket]
                const isPlacing = placingTaskId === task.id
                return (
                  <button
                    key={task.id}
                    onClick={() => setPlacingTaskId(isPlacing ? null : task.id)}
                    className={`rounded-xl ${colors.bg} border ${colors.border} p-3 text-left transition-all duration-300 ${
                      isPlacing ? 'ring-2 ring-accent scale-[0.97]' : 'hover:shadow-sm'
                    }`}
                  >
                    <p className={`font-sans text-[12px] font-medium ${colors.text} leading-tight truncate`}>
                      {BASKET_CONFIG[task.basket].label.split(' ')[0]} {task.title}
                    </p>
                    <p className="font-sans text-[10px] text-warm-gray-light mt-1">
                      {task.estimatedMinutes} 分钟
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {activeTasks.length === 0 && blocks.length === 0 && (
          <div className="text-center py-20">
            <p className="font-serif text-5xl text-parchment mb-4">▤</p>
            <p className="font-serif text-lg text-warm-gray">尚无任务可规划</p>
            <p className="font-sans text-[13px] text-warm-gray-light mt-2">
              先在今日页录入任务，再回来让 AI 规划时间表
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
