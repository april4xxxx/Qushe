import { useState } from 'react'
import type { Memory, MemoryType } from '../types'
import { MEMORY_TYPE_CONFIG } from '../types'
import {
  getMemories,
  getMemoryTrash,
  updateMemory,
  deleteMemory,
  restoreMemory,
  permanentlyDeleteMemory,
  generateId,
  addMemory,
} from '../lib/storage'

type FilterType = 'all' | MemoryType
type ViewMode = 'active' | 'trash'

export function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>(() => getMemories())
  const [trash, setTrash] = useState<Memory[]>(() => getMemoryTrash())
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState<MemoryType>('trait')

  const filtered = viewMode === 'active'
    ? (filter === 'all' ? memories : memories.filter(m => m.type === filter))
    : trash

  function refresh() {
    setMemories(getMemories())
    setTrash(getMemoryTrash())
  }

  function startEdit(memory: Memory) {
    setEditingId(memory.id)
    setEditTitle(memory.title)
    setEditContent(memory.content)
  }

  function saveEdit() {
    if (!editingId) return
    updateMemory(editingId, {
      title: editTitle,
      content: editContent,
      userEdited: true,
      confidence: 5,
    })
    setEditingId(null)
    refresh()
  }

  function handleDelete(id: string) {
    deleteMemory(id)
    refresh()
  }

  function handleRestore(id: string) {
    restoreMemory(id)
    refresh()
  }

  function handlePermanentDelete(id: string) {
    permanentlyDeleteMemory(id)
    refresh()
  }

  function handleAdd() {
    if (!newTitle.trim() || !newContent.trim()) return
    const now = new Date().toISOString()
    const memory: Memory = {
      id: generateId(),
      type: newType,
      title: newTitle.trim(),
      content: newContent.trim(),
      confidence: 5,
      source: { kind: 'manual', extractedAt: now },
      lastReferencedAt: now,
      referencedCount: 0,
      expiresAt: null,
      userEdited: true,
    }
    addMemory(memory)
    setNewTitle('')
    setNewContent('')
    setShowAddForm(false)
    refresh()
  }

  function formatDate(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const typeFilters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    ...Object.entries(MEMORY_TYPE_CONFIG).map(([key, cfg]) => ({
      key: key as FilterType,
      label: `${cfg.icon} ${cfg.label}`,
    })),
  ]

  return (
    <div className="min-h-screen bg-cream pb-32 page-enter">
      <header className="px-8 pt-14 pb-6">
        <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-warm-gray-light mb-3">记忆</p>
        <h1 className="font-serif text-[2.5rem] leading-[1.1] text-espresso tracking-tight">
          AI 的认知
        </h1>
        <div className="mt-4 h-[1px] bg-espresso/10" />
        <p className="mt-3 font-sans text-[13px] text-warm-gray">
          AI 通过对话和任务行为了解你。这里是它记住的一切——你可以随时查看、编辑或删除。
        </p>
      </header>

      <main className="max-w-lg mx-auto px-6">
        {/* View mode toggle */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setViewMode('active')}
            className={`font-sans text-[13px] transition-colors ${
              viewMode === 'active' ? 'text-espresso font-medium' : 'text-warm-gray-light hover:text-warm-gray'
            }`}
          >
            记忆 · {memories.length}
          </button>
          <button
            onClick={() => setViewMode('trash')}
            className={`font-sans text-[13px] transition-colors ${
              viewMode === 'trash' ? 'text-espresso font-medium' : 'text-warm-gray-light hover:text-warm-gray'
            }`}
          >
            回收站 · {trash.length}
          </button>
        </div>

        {/* Type filters (active view only) */}
        {viewMode === 'active' && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {typeFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1.5 font-sans text-[11px] transition-all duration-300 ${
                  filter === f.key
                    ? 'bg-espresso text-cream'
                    : 'bg-white ring-1 ring-espresso/[0.08] text-warm-gray hover:ring-espresso/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Memory cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="font-serif text-5xl text-parchment mb-4">◈</p>
              <p className="font-serif text-lg text-warm-gray">
                {viewMode === 'trash' ? '回收站为空' : '尚无记忆'}
              </p>
              <p className="font-sans text-[13px] text-warm-gray-light mt-2">
                {viewMode === 'trash'
                  ? '删除的记忆会保留 30 天'
                  : '对话或评估任务时，AI 会自动提取值得记住的洞察'}
              </p>
            </div>
          )}

          {filtered.map(memory => (
            <article
              key={memory.id}
              className="group rounded-[1.25rem] bg-white ring-1 ring-espresso/[0.06] p-5 transition-all duration-300 hover:ring-espresso/[0.12]"
            >
              {editingId === memory.id ? (
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full font-serif text-[15px] text-espresso bg-transparent border-b border-parchment pb-1 outline-none focus:border-espresso/30"
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full font-sans text-[13px] text-espresso-light bg-cream rounded-lg p-3 outline-none resize-none focus:ring-1 focus:ring-espresso/20"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="font-sans text-[12px] text-warm-gray-light hover:text-warm-gray px-3 py-1.5"
                    >
                      取消
                    </button>
                    <button
                      onClick={saveEdit}
                      className="font-sans text-[12px] text-cream bg-espresso rounded-full px-4 py-1.5 hover:bg-espresso-light"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-accent">
                        {MEMORY_TYPE_CONFIG[memory.type].icon}
                      </span>
                      <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-warm-gray-light">
                        {MEMORY_TYPE_CONFIG[memory.type].label}
                      </span>
                      {memory.userEdited && (
                        <span className="font-sans text-[9px] text-accent bg-accent-light rounded-full px-2 py-0.5">
                          已编辑
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {viewMode === 'active' ? (
                        <>
                          <button
                            onClick={() => startEdit(memory)}
                            className="font-sans text-[11px] text-warm-gray-light hover:text-espresso px-2 py-1"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(memory.id)}
                            className="font-sans text-[11px] text-warm-gray-light hover:text-lion px-2 py-1"
                          >
                            删除
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestore(memory.id)}
                            className="font-sans text-[11px] text-warm-gray-light hover:text-accent px-2 py-1"
                          >
                            恢复
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(memory.id)}
                            className="font-sans text-[11px] text-warm-gray-light hover:text-lion px-2 py-1"
                          >
                            彻底删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="font-serif text-[15px] text-espresso leading-snug mb-1.5">
                    {memory.title}
                  </h3>
                  <p className="font-sans text-[13px] text-espresso-light leading-relaxed mb-3">
                    {memory.content}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] font-sans text-warm-gray-lighter">
                    <span>置信度 {memory.confidence}/5</span>
                    <span>·</span>
                    <span>引用 {memory.referencedCount} 次</span>
                    <span>·</span>
                    <span>来源：{memory.source.kind === 'chat' ? '对话' : memory.source.kind === 'task' ? '任务' : '手动'}</span>
                    <span>·</span>
                    <span>{formatDate(memory.source.extractedAt)}</span>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>

        {/* Add memory form */}
        {viewMode === 'active' && (
          <>
            {showAddForm ? (
              <div className="mt-6 rounded-[1.5rem] bg-white ring-1 ring-espresso/[0.08] p-6">
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-warm-gray-light mb-4">
                  手动添加记忆
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Object.entries(MEMORY_TYPE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setNewType(key as MemoryType)}
                      className={`rounded-full px-3 py-1.5 font-sans text-[11px] transition-all ${
                        newType === key
                          ? 'bg-espresso text-cream'
                          : 'bg-cream text-warm-gray hover:text-espresso'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="标题（如：早晨精力最好）"
                  className="w-full mb-3 font-sans text-[14px] text-espresso bg-cream rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-espresso/20 placeholder:text-warm-gray-lighter"
                />
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="内容（如：用户多次提到早上9-11点是最高效的时间段，适合安排需要深度思考的任务）"
                  rows={3}
                  className="w-full mb-4 font-sans text-[13px] text-espresso bg-cream rounded-lg px-4 py-3 outline-none resize-none focus:ring-1 focus:ring-espresso/20 placeholder:text-warm-gray-lighter"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowAddForm(false); setNewTitle(''); setNewContent('') }}
                    className="font-sans text-[12px] text-warm-gray-light hover:text-warm-gray px-4 py-2"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newTitle.trim() || !newContent.trim()}
                    className="font-sans text-[12px] text-cream bg-espresso rounded-full px-5 py-2 hover:bg-espresso-light disabled:opacity-30"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-6 w-full rounded-[1.25rem] border border-dashed border-espresso/15 py-4 font-sans text-[13px] text-warm-gray-light hover:text-espresso hover:border-espresso/30 transition-all"
              >
                + 手动添加记忆
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
