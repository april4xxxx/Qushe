import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Basket, Mainline, Task } from '../types'
import { BASKET_CONFIG } from '../types'
import { getProfile, getTasks } from '../lib/storage'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

interface MainlineStats {
  mainline: Mainline
  activeCount: number
  completedCount: number
  totalMinutes: number
  basketBreakdown: Record<Basket, number>
}

function computeStats(mainline: Mainline, tasks: Task[]): MainlineStats {
  const matched = tasks.filter(t => t.alignedMainlineId === mainline.id)
  const active = matched.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const completed = matched.filter(t => t.status === 'completed')
  const basketBreakdown: Record<Basket, number> = { lion: 0, ox: 0, ostrich: 0 }
  active.forEach(t => { basketBreakdown[t.basket]++ })
  return {
    mainline,
    activeCount: active.length,
    completedCount: completed.length,
    totalMinutes: active.reduce((s, t) => s + t.estimatedMinutes, 0),
    basketBreakdown,
  }
}

function computeAISummary(_profile: { mainlines: Mainline[] }, tasks: Task[]): string {
  if (tasks.length === 0) {
    return `三条主线已经就位。接下来每个新任务进来，我都会基于这张全景图为你判断。`
  }
  const active = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const completed = tasks.filter(t => t.status === 'completed')
  const lion = active.filter(t => t.basket === 'lion').length
  const ostrich = active.filter(t => t.basket === 'ostrich').length
  const impulses = tasks.filter(t => t.isImpulse).length
  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0

  const lines: string[] = []
  if (lion > 0) lines.push(`眼前有 ${lion} 件狮子任务等着你下手。`)
  if (ostrich > 0) lines.push(`${ostrich} 件事被你主动放进了鸵鸟篮——这本身就是一种取舍。`)
  if (impulses > 0) lines.push(`其中 ${impulses} 件被识别为心血来潮，时间会替你筛选。`)
  if (completionRate > 0) lines.push(`已完成 ${completionRate}% 的录入任务。`)
  if (lines.length === 0) lines.push(`三条主线已经就位。等待你的第一个真实任务。`)
  return lines.join(' ')
}

export function PanoramaPage() {
  const navigate = useNavigate()
  const profile = getProfile()
  const tasks = getTasks()

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  const stats = useMemo(() => {
    if (!profile?.mainlines) return []
    return profile.mainlines.map(m => computeStats(m, tasks))
  }, [profile, tasks])

  const aiSummary = useMemo(() => {
    if (!profile?.mainlines?.length) return ''
    return computeAISummary({ mainlines: profile.mainlines }, tasks)
  }, [profile, tasks])

  const totalActive = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
  const totalMinutes = tasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .reduce((s, t) => s + t.estimatedMinutes, 0)

  // 时间流向 - 各篮子占比
  const basketTotals: Record<Basket, number> = { lion: 0, ox: 0, ostrich: 0 }
  tasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .forEach(t => { basketTotals[t.basket]++ })

  if (!profile?.mainlines?.length) {
    return (
      <div className="min-h-screen bg-cream pb-32 flex flex-col items-center justify-center px-8 text-center">
        <p className="font-serif text-7xl text-parchment mb-6">全</p>
        <h2 className="font-serif text-2xl text-espresso mb-3">人生全景尚未就位</h2>
        <p className="font-sans text-[14px] text-warm-gray leading-relaxed max-w-xs mb-8">
          先去「对话」页面与 AI 梳理你的三条主线，全景图会自动生成
        </p>
        <button
          onClick={() => navigate('/chat')}
          className="group flex items-center gap-3 rounded-full bg-espresso px-6 py-3 text-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-espresso-light active:scale-[0.97]"
        >
          <span className="font-sans text-[13px] font-medium tracking-wide">开启对话</span>
          <span className="w-7 h-7 rounded-full bg-cream/15 flex items-center justify-center text-sm transition-transform duration-500 group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      {/* Editorial masthead */}
      <header className="px-8 pt-14 pb-8 text-center">
        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-warm-gray-light mb-4">
          {today} · 第 01 期
        </p>
        <h1 className="font-serif text-[2.75rem] leading-[1.05] text-espresso tracking-tight">
          人生全景
        </h1>
        <p className="font-serif italic text-warm-gray text-[14px] mt-3">
          A panorama of what truly matters
        </p>
        <div className="mt-6 mx-auto w-16 h-[1px] bg-espresso/30" />
      </header>

      {/* AI Pull Quote */}
      {aiSummary && (
        <section className="px-8 mb-12 max-w-xl mx-auto">
          <div className="text-center">
            <span className="font-serif text-4xl text-espresso/20 leading-none">"</span>
            <p className="font-serif text-[18px] leading-[1.7] text-espresso-light italic -mt-3">
              {aiSummary}
            </p>
            <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mt-4">
              — AI 顾问 · 此刻的观察
            </p>
          </div>
        </section>
      )}

      <main className="max-w-2xl mx-auto px-6">
        {/* Stat strip */}
        <section className="grid grid-cols-3 gap-3 mb-12">
          {[
            { label: '主线', value: profile.mainlines.length },
            { label: '在行', value: totalActive },
            { label: '分钟', value: totalMinutes },
          ].map(s => (
            <div key={s.label} className="rounded-[1.25rem] bg-white ring-1 ring-espresso/[0.06] py-5 text-center">
              <p className="font-serif text-[28px] text-espresso leading-none">{s.value}</p>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mt-2">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Mainline cards - editorial features */}
        <section className="space-y-8 mb-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-espresso">三条主线</h2>
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light">
              The Three Mainlines
            </span>
          </div>

          {stats.map((s, i) => (
            <article key={s.mainline.id} className="group">
              <div className="rounded-[1.5rem] bg-espresso/[0.02] p-[3px] ring-1 ring-espresso/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:ring-espresso/[0.15]">
                <div className="rounded-[calc(1.5rem-3px)] bg-white p-7 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]">
                  {/* Roman numeral header */}
                  <div className="flex items-baseline justify-between mb-5">
                    <div className="flex items-baseline gap-4">
                      <span className="font-serif text-[42px] leading-none text-espresso/15">
                        {ROMAN[i] ?? i + 1}
                      </span>
                      <div>
                        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light">
                          Mainline · P{s.mainline.priority}
                        </p>
                        <h3 className="font-serif text-[22px] text-espresso leading-tight mt-1">
                          {s.mainline.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Description as pull text */}
                  <p className="font-serif text-[15px] leading-[1.75] text-espresso-light mb-5">
                    {s.mainline.description}
                  </p>

                  {/* Current phase */}
                  {s.mainline.currentPhase && (
                    <div className="mb-5 pb-5 border-b border-parchment">
                      <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-1.5">
                        当前阶段
                      </p>
                      <p className="font-serif text-[15px] italic text-espresso">
                        {s.mainline.currentPhase}
                      </p>
                    </div>
                  )}

                  {/* Goals */}
                  {s.mainline.goals?.length > 0 && (
                    <div className="mb-5">
                      <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-2.5">
                        目标
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.mainline.goals.map((g, j) => (
                          <span key={j} className="font-sans text-[11px] text-accent bg-accent-light rounded-full px-3 py-1">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats footer - editorial sidebar style */}
                  <div className="grid grid-cols-4 gap-2 pt-5 border-t border-parchment">
                    <div>
                      <p className="font-serif text-xl text-espresso">{s.activeCount}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mt-1">在行</p>
                    </div>
                    <div>
                      <p className="font-serif text-xl text-lion">{s.basketBreakdown.lion}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mt-1">狮子</p>
                    </div>
                    <div>
                      <p className="font-serif text-xl text-ox">{s.basketBreakdown.ox}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mt-1">牛马</p>
                    </div>
                    <div>
                      <p className="font-serif text-xl text-ostrich">{s.basketBreakdown.ostrich}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light mt-1">鸵鸟</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Time allocation visualization */}
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif text-xl text-espresso">时间流向</h2>
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light">
              Where time goes
            </span>
          </div>

          <div className="rounded-[1.5rem] bg-white ring-1 ring-espresso/[0.06] p-7">
            {totalActive === 0 ? (
              <p className="font-serif italic text-warm-gray text-center py-8">
                尚无任务记录。开始录入第一个任务后，这里会显示你的时间分布。
              </p>
            ) : (
              <div className="space-y-4">
                {(['lion', 'ox', 'ostrich'] as Basket[]).map(b => {
                  const config = BASKET_CONFIG[b]
                  const count = basketTotals[b]
                  const pct = totalActive > 0 ? (count / totalActive) * 100 : 0
                  return (
                    <div key={b}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-sans text-[13px] text-espresso">
                          {config.label}
                        </span>
                        <span className="font-sans text-[11px] text-warm-gray tabular-nums">
                          {count} 件 · {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-parchment/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            b === 'lion' ? 'bg-lion' : b === 'ox' ? 'bg-ox' : 'bg-ostrich'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pb-8 space-y-3">
          <p className="font-serif italic text-warm-gray text-[14px] mb-5">
            主线随你成长而变化。
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => navigate('/memory')}
              className="group inline-flex items-center gap-3 rounded-full border border-accent/20 bg-accent-light px-5 py-2.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent/40 active:scale-[0.97]"
            >
              <span className="font-sans text-[12px] tracking-wide text-accent">查看记忆</span>
              <span className="text-accent text-sm transition-transform duration-500 group-hover:translate-x-0.5">→</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="group inline-flex items-center gap-3 rounded-full border border-espresso/15 bg-white px-5 py-2.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-espresso/40 active:scale-[0.97]"
            >
              <span className="font-sans text-[12px] tracking-wide text-espresso">和 AI 调整主线</span>
              <span className="text-warm-gray text-sm transition-transform duration-500 group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
