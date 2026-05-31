import { useState } from 'react'
import { getProfile, getApiKey, saveApiKey, clearAllData } from '../lib/storage'
import { initAI } from '../lib/ai'

export function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => getApiKey())
  const [saved, setSaved] = useState(false)
  const profile = getProfile()

  function handleSaveKey() {
    saveApiKey(apiKey)
    if (apiKey) initAI(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearData() {
    if (confirm('确定要清除所有数据吗？这将删除所有任务、主线设置和对话记录。')) {
      clearAllData()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      <header className="px-8 pt-14 pb-8">
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mb-3">配置</p>
        <h1 className="font-serif text-[2.5rem] leading-[1.1] text-espresso tracking-tight">设置</h1>
        <div className="mt-4 h-[1px] bg-espresso/10" />
      </header>

      <main className="max-w-lg mx-auto px-6 space-y-6">
        {/* API Key */}
        <section>
          <div className="rounded-[1.5rem] bg-espresso/[0.02] p-[3px] ring-1 ring-espresso/[0.06]">
            <div className="rounded-[calc(1.5rem-3px)] bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-parchment flex items-center justify-center font-serif text-sm text-espresso">K</span>
                <div>
                  <h2 className="font-serif text-[15px] text-espresso">DeepSeek API Key</h2>
                  <p className="font-sans text-[11px] text-warm-gray-light">密钥仅存储在本地浏览器中</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 rounded-full bg-cream border border-parchment px-4 py-3 font-sans text-[13px] text-espresso placeholder:text-warm-gray-lighter outline-none focus:ring-2 focus:ring-espresso/10 focus:border-espresso/20 transition-all duration-300"
                />
                <button
                  onClick={handleSaveKey}
                  className="group rounded-full bg-espresso px-5 py-3 font-sans text-[12px] font-medium tracking-wide text-cream transition-all duration-300 hover:bg-espresso-light active:scale-[0.97]"
                >
                  {saved ? '已保存 ✓' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Mainlines */}
        {profile?.mainlines && profile.mainlines.length > 0 && (
          <section>
            <div className="rounded-[1.5rem] bg-espresso/[0.02] p-[3px] ring-1 ring-espresso/[0.06]">
              <div className="rounded-[calc(1.5rem-3px)] bg-white p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center font-serif text-sm text-accent">M</span>
                  <div>
                    <h2 className="font-serif text-[15px] text-espresso">主线目标</h2>
                    <p className="font-sans text-[11px] text-warm-gray-light">你的人生三条主线</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {profile.mainlines.map((m, i) => (
                    <div key={m.id ?? i} className="rounded-xl bg-cream p-5">
                      <div className="flex items-baseline justify-between mb-2">
                        <h3 className="font-serif text-[15px] text-espresso">{m.name}</h3>
                        <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light bg-white rounded-full px-2.5 py-1">
                          P{m.priority}
                        </span>
                      </div>
                      <p className="font-sans text-[13px] text-warm-gray leading-relaxed">{m.description}</p>
                      {m.currentPhase && (
                        <p className="mt-2 font-sans text-[12px] text-accent">
                          当前 · {m.currentPhase}
                        </p>
                      )}
                      {m.goals?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {m.goals.map((g, j) => (
                            <span key={j} className="font-sans text-[11px] text-accent bg-accent-light rounded-full px-3 py-1">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="mt-4 font-sans text-[12px] text-warm-gray-light italic">
                  前往「对话」页面与 AI 讨论调整主线
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section>
          <div className="rounded-[1.5rem] bg-lion/[0.02] p-[3px] ring-1 ring-lion/[0.08]">
            <div className="rounded-[calc(1.5rem-3px)] bg-white p-6">
              <h2 className="font-serif text-[15px] text-lion mb-3">危险操作</h2>
              <p className="font-sans text-[12px] text-warm-gray mb-4">清除所有本地数据，包括任务、主线设置、AI 记忆和 API Key。</p>
              <button
                onClick={handleClearData}
                className="rounded-full border border-lion/20 px-5 py-2.5 font-sans text-[12px] font-medium text-lion hover:bg-lion-bg transition-all duration-300"
              >
                清除所有数据
              </button>
            </div>
          </div>
        </section>

        {/* App info */}
        <footer className="text-center pt-8 pb-6">
          <p className="font-serif text-2xl text-parchment mb-1">取舍</p>
          <p className="font-sans text-[11px] text-warm-gray-lighter tracking-wide">AI Task Curator · v0.2.0</p>
        </footer>
      </main>
    </div>
  )
}
