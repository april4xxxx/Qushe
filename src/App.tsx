import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { TodayPage } from './pages/TodayPage'
import { KanbanPage } from './pages/KanbanPage'
import { ChatPage } from './pages/ChatPage'
import { PanoramaPage } from './pages/PanoramaPage'
import { SettingsPage } from './pages/SettingsPage'
import { initAI } from './lib/ai'
import { getApiKey, initStorage } from './lib/storage'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initStorage().then(() => {
      const key = getApiKey()
      if (key) initAI(key)
      setReady(true)
    })
  }, [])

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
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <NavBar />
    </HashRouter>
  )
}
