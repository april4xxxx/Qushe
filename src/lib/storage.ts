import type { ChatMessage, EvalRecord, Task, UserProfile } from '../types'

const FILES = {
  profile: 'profile.json',
  tasks: 'tasks.json',
  chatMessages: 'chat.json',
  apiKey: 'apikey.json',
  evals: 'evals.json',
} as const

interface CacheShape {
  profile: UserProfile | null
  tasks: Task[]
  chatMessages: ChatMessage[]
  apiKey: string
  evals: EvalRecord[]
  loaded: boolean
}

const cache: CacheShape = {
  profile: null,
  tasks: [],
  chatMessages: [],
  apiKey: '',
  evals: [],
  loaded: false,
}

function hasElectron(): boolean {
  return typeof window !== 'undefined' && !!window.storage
}

async function loadFromDisk<T>(filename: string, fallback: T): Promise<T> {
  if (hasElectron()) {
    return window.storage!.read<T>(filename, fallback)
  }
  const raw = localStorage.getItem(filename)
  return raw ? (JSON.parse(raw) as T) : fallback
}

async function saveToDisk(filename: string, data: unknown): Promise<void> {
  if (hasElectron()) {
    await window.storage!.write(filename, data)
    return
  }
  localStorage.setItem(filename, JSON.stringify(data))
}

async function removeFromDisk(filename: string): Promise<void> {
  if (hasElectron()) {
    await window.storage!.remove(filename)
    return
  }
  localStorage.removeItem(filename)
}

export async function initStorage(): Promise<void> {
  if (cache.loaded) return
  const [profile, tasks, chatMessages, apiKeyData, evals] = await Promise.all([
    loadFromDisk<UserProfile | null>(FILES.profile, null),
    loadFromDisk<Task[]>(FILES.tasks, []),
    loadFromDisk<ChatMessage[]>(FILES.chatMessages, []),
    loadFromDisk<{ value: string }>(FILES.apiKey, { value: '' }),
    loadFromDisk<EvalRecord[]>(FILES.evals, []),
  ])
  cache.profile = profile
  cache.tasks = tasks
  cache.chatMessages = chatMessages
  cache.apiKey = apiKeyData.value ?? ''
  cache.evals = evals
  cache.loaded = true
}

export function getProfile(): UserProfile | null {
  return cache.profile
}

export function saveProfile(profile: UserProfile): void {
  cache.profile = profile
  void saveToDisk(FILES.profile, profile)
}

export function getTasks(): Task[] {
  return cache.tasks
}

export function saveTasks(tasks: Task[]): void {
  cache.tasks = tasks
  void saveToDisk(FILES.tasks, tasks)
}

export function addTask(task: Task): void {
  cache.tasks = [...cache.tasks, task]
  void saveToDisk(FILES.tasks, cache.tasks)
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const idx = cache.tasks.findIndex(t => t.id === id)
  if (idx === -1) return
  cache.tasks = [
    ...cache.tasks.slice(0, idx),
    { ...cache.tasks[idx], ...updates },
    ...cache.tasks.slice(idx + 1),
  ]
  void saveToDisk(FILES.tasks, cache.tasks)
}

export function deleteTask(id: string): void {
  cache.tasks = cache.tasks.filter(t => t.id !== id)
  void saveToDisk(FILES.tasks, cache.tasks)
}

export function getChatMessages(): ChatMessage[] {
  return cache.chatMessages
}

export function saveChatMessages(messages: ChatMessage[]): void {
  cache.chatMessages = messages
  void saveToDisk(FILES.chatMessages, messages)
}

export function getApiKey(): string {
  return cache.apiKey
}

export function saveApiKey(key: string): void {
  cache.apiKey = key
  void saveToDisk(FILES.apiKey, { value: key })
}

export function getEvals(): EvalRecord[] {
  return cache.evals
}

export function recordEval(record: EvalRecord): void {
  cache.evals = [...cache.evals, record]
  void saveToDisk(FILES.evals, cache.evals)
}

export function clearAllData(): void {
  cache.profile = null
  cache.tasks = []
  cache.chatMessages = []
  cache.apiKey = ''
  cache.evals = []
  Object.values(FILES).forEach(f => void removeFromDisk(f))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
