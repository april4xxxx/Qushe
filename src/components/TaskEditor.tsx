import { useState } from 'react'
import type { Basket, Task } from '../types'
import { BASKET_CONFIG } from '../types'

interface Props {
  task: Task
  onSave: (updates: Partial<Task>, reasonForBasketChange?: string) => void
  onClose: () => void
}

export function TaskEditor({ task, onSave, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [basket, setBasket] = useState<Basket>(task.basket)
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes)
  const [deadline, setDeadline] = useState(task.deadline ?? '')
  const [reasonForChange, setReasonForChange] = useState('')

  const basketChanged = basket !== task.basket

  function handleSave() {
    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim(),
      basket,
      estimatedMinutes,
      deadline: deadline || undefined,
    }
    onSave(updates, basketChanged ? reasonForChange.trim() || undefined : undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6 animate-[fadeUp_0.3s_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-espresso/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Editor card */}
      <div className="relative w-full max-w-lg rounded-[1.75rem] bg-cream/[0.05] p-[3px] ring-1 ring-espresso/10 shadow-[0_20px_60px_rgba(26,22,20,0.25)]">
        <div className="rounded-[calc(1.75rem-3px)] bg-cream p-7 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light">编辑</p>
              <h2 className="font-serif text-2xl text-espresso mt-1">任务详情</h2>
            </div>
            <button
              onClick={onClose}
              className="font-sans text-[12px] text-warm-gray hover:text-espresso transition-colors"
            >
              取消
            </button>
          </div>

          {/* Title */}
          <div className="mb-5">
            <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-2">标题</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl bg-white border border-parchment px-4 py-3 font-serif text-[15px] text-espresso outline-none focus:border-espresso/30 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-2">备注</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl bg-white border border-parchment px-4 py-3 font-sans text-[14px] text-espresso outline-none focus:border-espresso/30 transition-colors resize-none"
              placeholder="（可选）补充背景..."
            />
          </div>

          {/* Basket */}
          <div className="mb-5">
            <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-2">篮子</label>
            <div className="grid grid-cols-3 gap-2">
              {(['lion', 'ox', 'ostrich'] as Basket[]).map(b => (
                <button
                  key={b}
                  onClick={() => setBasket(b)}
                  className={`rounded-xl py-3 text-center transition-all duration-300 ${
                    basket === b
                      ? 'bg-espresso text-cream'
                      : 'bg-white border border-parchment text-warm-gray hover:border-warm-gray-light'
                  }`}
                >
                  <div className="text-lg">{BASKET_CONFIG[b].label.split(' ')[0]}</div>
                  <div className="font-sans text-[11px] mt-0.5">{BASKET_CONFIG[b].label.split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* If basket changed, ask why */}
          {basketChanged && (
            <div className="mb-5 rounded-xl bg-ox-bg border border-ox-border p-4 animate-[fadeUp_0.4s_ease-out]">
              <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-ox font-medium mb-2">
                为什么改？（可选 · AI 会从中学习）
              </label>
              <input
                value={reasonForChange}
                onChange={e => setReasonForChange(e.target.value)}
                placeholder="例：AI 不知道我这周很忙"
                className="w-full rounded-lg bg-white border border-parchment px-3 py-2 font-sans text-[13px] text-espresso outline-none focus:border-espresso/30"
              />
            </div>
          )}

          {/* Time & deadline row */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            <div>
              <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-2">预估时间</label>
              <div className="flex items-center gap-2 rounded-xl bg-white border border-parchment px-3 py-3">
                <input
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={e => setEstimatedMinutes(parseInt(e.target.value) || 0)}
                  className="flex-1 font-serif text-[15px] text-espresso outline-none min-w-0"
                />
                <span className="font-sans text-[11px] text-warm-gray-light">分钟</span>
              </div>
            </div>
            <div>
              <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-2">截止</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full rounded-xl bg-white border border-parchment px-3 py-3 font-sans text-[13px] text-espresso outline-none focus:border-espresso/30"
              />
            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="group w-full flex items-center justify-center gap-3 rounded-full bg-espresso py-4 font-sans text-[13px] font-medium tracking-wide text-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-espresso-light active:scale-[0.98] disabled:opacity-40"
          >
            保存修改
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream/10 text-[11px]">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
