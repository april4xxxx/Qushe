import type { Task } from '../types'
import { BASKET_CONFIG } from '../types'

interface Props {
  task: Task
  onComplete: (id: string) => void
  onUncomplete: (id: string) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}

const alignmentLabels: Record<string, string> = {
  high: '强关联',
  medium: '中关联',
  low: '弱关联',
  none: '无关联',
}

function formatDeadline(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  if (diffDays > 0 && diffDays < 7) return `${diffDays}天后`
  if (diffDays < 0) return `逾期 ${-diffDays}天`
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export function TaskCard({ task, onComplete, onUncomplete, onCancel, onDelete, onEdit }: Props) {
  const basket = BASKET_CONFIG[task.basket]
  const isCompleted = task.status === 'completed'
  const isCancelled = task.status === 'cancelled'
  const isDone = isCompleted || isCancelled

  return (
    <div className={`group relative transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isDone ? 'opacity-50' : ''}`}>
      <div className="rounded-[1.25rem] bg-espresso/[0.03] p-[3px] ring-1 ring-espresso/[0.06]">
        <div className="rounded-[calc(1.25rem-3px)] bg-white p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className={`font-serif text-[1.05rem] leading-snug text-espresso ${isDone ? 'line-through decoration-warm-gray-light' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-warm-gray line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <span className="text-xl shrink-0 opacity-70">{basket.label.split(' ')[0]}</span>
          </div>

          {/* Metadata row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray bg-parchment/60 rounded-full px-2.5 py-1">
              {alignmentLabels[task.mainlineAlignment]}
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray bg-parchment/60 rounded-full px-2.5 py-1">
              {task.estimatedMinutes} min
            </span>
            {task.deadline && (
              <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-espresso bg-lion-bg rounded-full px-2.5 py-1">
                {formatDeadline(task.deadline)}
              </span>
            )}
            {task.isImpulse && (
              <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-ox bg-ox-bg rounded-full px-2.5 py-1">
                心血来潮
              </span>
            )}
          </div>

          {/* AI reason */}
          {task.aiReason && (
            <p className="mt-3 font-serif text-[13px] italic text-warm-gray leading-relaxed border-l-2 border-parchment pl-3">
              {task.aiReason}
            </p>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3 pt-3 border-t border-parchment/50 flex-wrap">
            {!isDone && (
              <>
                <button
                  onClick={() => onComplete(task.id)}
                  className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent hover:text-espresso transition-colors duration-300"
                >
                  完成 ✓
                </button>
                <span className="text-parchment">|</span>
                <button
                  onClick={() => onEdit(task)}
                  className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-warm-gray hover:text-espresso transition-colors duration-300"
                >
                  编辑
                </button>
                <span className="text-parchment">|</span>
                <button
                  onClick={() => onCancel(task.id)}
                  className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-warm-gray-light hover:text-warm-gray transition-colors duration-300"
                >
                  取消
                </button>
              </>
            )}
            {isCompleted && (
              <button
                onClick={() => onUncomplete(task.id)}
                className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent hover:text-espresso transition-colors duration-300"
              >
                ↩ 回到进行中
              </button>
            )}
            {isCancelled && (
              <button
                onClick={() => onUncomplete(task.id)}
                className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent hover:text-espresso transition-colors duration-300"
              >
                ↩ 恢复任务
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="ml-auto font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-warm-gray-lighter hover:text-lion transition-colors duration-300"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
