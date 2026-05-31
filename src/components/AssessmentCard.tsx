import { useState } from 'react'
import type { Basket, Memory } from '../types'
import { BASKET_CONFIG } from '../types'
import type { AIAssessmentWithMemory } from '../lib/ai'

interface Props {
  assessment: AIAssessmentWithMemory
  taskTitle: string
  onConfirm: (overrides?: { basket?: Basket; deadline?: string; reason?: string }) => void
  referencedMemories?: Memory[]
}

const basketAccents = {
  lion: { border: 'ring-lion/30', bg: 'bg-lion-bg', text: 'text-lion' },
  ox: { border: 'ring-ox/30', bg: 'bg-ox-bg', text: 'text-ox' },
  ostrich: { border: 'ring-ostrich/30', bg: 'bg-ostrich-bg', text: 'text-ostrich' },
}

export function AssessmentCard({ assessment, taskTitle, onConfirm, referencedMemories }: Props) {
  const [selectedBasket, setSelectedBasket] = useState<Basket>(assessment.basket)
  const [deadlineAnswer, setDeadlineAnswer] = useState(assessment.deadline ?? '')
  const [changeReason, setChangeReason] = useState('')

  const basket = BASKET_CONFIG[selectedBasket]
  const accent = basketAccents[selectedBasket]
  const basketChanged = selectedBasket !== assessment.basket
  const needsDeadline = !!assessment.deadlineQuestion && !deadlineAnswer

  function handleConfirm() {
    onConfirm({
      basket: basketChanged ? selectedBasket : undefined,
      deadline: deadlineAnswer || undefined,
      reason: basketChanged ? changeReason.trim() || undefined : undefined,
    })
  }

  return (
    <div className="animate-[fadeUp_0.6s_cubic-bezier(0.32,0.72,0,1)_both]">
      <div className={`rounded-[2rem] ${accent.bg} p-[4px] ring-2 ${accent.border} transition-all duration-500`}>
        <div className="rounded-[calc(2rem-4px)] bg-white p-8 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]">
          {/* Eyebrow */}
          <div className="flex justify-center mb-6">
            <span className={`font-sans text-[10px] uppercase tracking-[0.2em] font-medium ${accent.text} ${accent.bg} rounded-full px-4 py-1.5`}>
              AI 评估结果
            </span>
          </div>

          {/* Main display */}
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4">{basket.label.split(' ')[0]}</span>
            <h3 className="font-serif text-xl text-espresso leading-snug">{taskTitle}</h3>
            <p className="font-sans text-[13px] text-warm-gray mt-2">
              建议放入 <strong className="text-espresso">{basket.label}</strong>
            </p>
          </div>

          {/* AI reason */}
          <blockquote className="border-l-2 border-espresso/20 pl-4 mb-6">
            <p className="font-serif text-[14px] italic text-warm-gray leading-relaxed">
              "{assessment.reason}"
            </p>
          </blockquote>

          {/* Memory references */}
          {referencedMemories && referencedMemories.length > 0 && (
            <div className="rounded-xl bg-accent-light border border-accent/15 p-4 mb-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-accent font-medium mb-2">
                基于记忆
              </p>
              <div className="space-y-1.5">
                {referencedMemories.map(m => (
                  <p key={m.id} className="font-sans text-[12px] text-espresso-light leading-relaxed">
                    <span className="text-accent mr-1.5">◈</span>
                    {m.title}
                  </p>
                ))}
              </div>
              {assessment.memoryInsight && (
                <p className="font-serif text-[13px] italic text-accent mt-2 pt-2 border-t border-accent/10">
                  {assessment.memoryInsight}
                </p>
              )}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-cream p-4">
              <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mb-1">主线关联</p>
              <p className="font-serif text-[15px] text-espresso">
                {assessment.mainlineAlignment === 'high' && '强关联'}
                {assessment.mainlineAlignment === 'medium' && '中等关联'}
                {assessment.mainlineAlignment === 'low' && '弱关联'}
                {assessment.mainlineAlignment === 'none' && '无关联'}
              </p>
            </div>
            <div className="rounded-xl bg-cream p-4">
              <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mb-1">预估时间</p>
              <p className="font-serif text-[15px] text-espresso">{assessment.estimatedMinutes} 分钟</p>
            </div>
          </div>

          {assessment.suggestedTimeSlot && (
            <div className="rounded-xl bg-cream p-4 mb-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mb-1">建议时段</p>
              <p className="font-serif text-[15px] text-espresso">{assessment.suggestedTimeSlot}</p>
            </div>
          )}

          {/* AI asks for deadline */}
          {assessment.deadlineQuestion && (
            <div className="rounded-xl bg-accent-light border border-accent/20 p-4 mb-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-medium mb-2">
                AI 想问你
              </p>
              <p className="font-serif text-[14px] italic text-espresso mb-3">
                "{assessment.deadlineQuestion}"
              </p>
              <input
                type="date"
                value={deadlineAnswer}
                onChange={e => setDeadlineAnswer(e.target.value)}
                className="w-full rounded-lg bg-white border border-parchment px-3 py-2 font-sans text-[13px] text-espresso outline-none focus:border-espresso/30"
              />
            </div>
          )}

          {/* Impulse warning */}
          {assessment.isImpulse && assessment.impulseNote && (
            <div className="rounded-xl bg-ox-bg border border-ox-border p-4 mb-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-ox mb-1.5 font-medium">冷静提醒</p>
              <p className="font-sans text-[13px] text-espresso-light leading-relaxed">{assessment.impulseNote}</p>
            </div>
          )}

          {/* Basket selector */}
          <div className="mb-6">
            <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mb-2.5 text-center">
              如果想改变分类
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['lion', 'ox', 'ostrich'] as Basket[]).map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBasket(b)}
                  className={`rounded-xl py-2.5 text-center transition-all duration-300 ${
                    selectedBasket === b
                      ? 'bg-espresso text-cream'
                      : 'bg-white border border-parchment text-warm-gray hover:border-warm-gray-light'
                  }`}
                >
                  <div className="text-base">{BASKET_CONFIG[b].label.split(' ')[0]}</div>
                  <div className="font-sans text-[10px] mt-0.5">{BASKET_CONFIG[b].label.split(' ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Inline reason for basket change */}
          {basketChanged && (
            <div className="mb-6 rounded-xl bg-ox-bg border border-ox-border p-4 animate-[fadeUp_0.4s_ease-out]">
              <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-ox font-medium mb-2">
                为什么改？ AI 会从中学习（可跳过）
              </label>
              <input
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                placeholder="例：AI 不知道我这周很忙"
                className="w-full rounded-lg bg-white border border-parchment px-3 py-2 font-sans text-[13px] text-espresso outline-none focus:border-espresso/30"
              />
            </div>
          )}

          {/* Action */}
          <button
            onClick={handleConfirm}
            disabled={needsDeadline}
            className="group w-full flex items-center justify-center gap-3 rounded-full bg-espresso py-4 font-sans text-[13px] font-medium tracking-wide text-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-espresso-light active:scale-[0.98] disabled:opacity-40"
          >
            {needsDeadline ? '请先回答 AI 的问题' : `${basketChanged ? '保存到' : '确认放入'}${basket.label}`}
            {!needsDeadline && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream/10 text-[11px] transition-transform duration-500 group-hover:translate-x-0.5">→</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
