import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { TodayPage } from './pages/TodayPage'
import { KanbanPage } from './pages/KanbanPage'
import { ChatPage } from './pages/ChatPage'
import { PanoramaPage } from './pages/PanoramaPage'
import { CalendarPage } from './pages/CalendarPage'
import { MemoryPage } from './pages/MemoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { extractMemories, initAI, isAIReady } from './lib/ai'
import type { Memory } from './types'
import {
  getApiKey, getChatMessages, getEvals, getMemories, getMemoryStore,
  addMemories, updateMemory, permanentlyDeleteMemory, initStorage, generateId,
} from './lib/storage'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initStorage().then(() => {
      const key = getApiKey()
      if (key) initAI(key)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready || !window.storage) return

    const unsubExtract = window.storage.onMemoryExtractRequest(async () => {
      if (!isAIReady()) return
      const messages = getChatMessages()
      if (messages.length < 3) return
      try {
        const result = await extractMemories(messages, getEvals().slice(-10), getMemories(), [])
        if (result.new.length > 0) {
          const now = new Date().toISOString()
          addMemories(result.new.map(m => ({
            ...m,
            id: generateId(),
            confidence: (m.confidence ?? 3) as Memory['confidence'],
            lastReferencedAt: now,
            referencedCount: 0,
            userEdited: false,
          })))
        }
        for (const u of result.update) {
          const patch: Partial<Memory> = {}
          if (u.title) patch.title = u.title
          if (u.content) patch.content = u.content
          if (u.confidence) patch.confidence = u.confidence as Memory['confidence']
          updateMemory(u.id, patch)
        }
      } catch { /* silent */ }
    })

    const unsubForget = window.storage.onMemoryForgetScan(() => {
      const store = getMemoryStore()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      for (const m of store.trash) {
        if (!m.source?.extractedAt || m.source.extractedAt < thirtyDaysAgo) {
          permanentlyDeleteMemory(m.id)
        }
      }
    })

    return () => { unsubExtract(); unsubForget() }
  }, [ready])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="font-serif italic text-warm-gray text-sm">取舍 · 正在启动</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/panorama" element={<PanoramaPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/memory" element={<MemoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <NavBar />
    </HashRouter>
  )
}
