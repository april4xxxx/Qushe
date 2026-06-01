import type { ChatMessage, EvalRecord, Memory, MemoryStore, Task, TimeBlock, UserProfile, WeekSchedule } from '../types'

const FILES = {
  profile: 'profile.json',
  tasks: 'tasks.json',
  chatMessages: 'chat.json',
  apiKey: 'apikey.json',
  evals: 'evals.json',
  memories: 'memories.json',
  schedule: 'schedule.json',
} as const

const DEFAULT_MEMORY_STORE: MemoryStore = {
  version: 1,
  extractedAt: '',
  memories: [],
  trash: [],
}

const DEFAULT_SCHEDULE: WeekSchedule = {
  version: 1,
  blocks: [],
}

interface CacheShape {
  profile: UserProfile | null
  tasks: Task[]
  chatMessages: ChatMessage[]
  apiKey: string
  evals: EvalRecord[]
  memoryStore: MemoryStore
  schedule: WeekSchedule
  loaded: boolean
}

const cache: CacheShape = {
  profile: null,
  tasks: [],
  chatMessages: [],
  apiKey: '',
  evals: [],
  memoryStore: { ...DEFAULT_MEMORY_STORE },
  schedule: { ...DEFAULT_SCHEDULE },
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
  const [profile, tasks, chatMessages, apiKeyData, evals, memoryStore, schedule] = await Promise.all([
    loadFromDisk<UserProfile | null>(FILES.profile, null),
    loadFromDisk<Task[]>(FILES.tasks, []),
    loadFromDisk<ChatMessage[]>(FILES.chatMessages, []),
    loadFromDisk<{ value: string }>(FILES.apiKey, { value: '' }),
    loadFromDisk<EvalRecord[]>(FILES.evals, []),
    loadFromDisk<MemoryStore>(FILES.memories, { ...DEFAULT_MEMORY_STORE }),
    loadFromDisk<WeekSchedule>(FILES.schedule, { ...DEFAULT_SCHEDULE }),
  ])
  cache.profile = profile
  cache.tasks = tasks
  cache.chatMessages = chatMessages
  cache.apiKey = apiKeyData.value ?? ''
  cache.evals = evals
  cache.memoryStore = memoryStore
  cache.schedule = schedule
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

export function getMemoryStore(): MemoryStore {
  return cache.memoryStore
}

export function getMemories(): Memory[] {
  return cache.memoryStore.memories
}

export function getMemoryTrash(): Memory[] {
  return cache.memoryStore.trash
}

export function addMemory(memory: Memory): void {
  cache.memoryStore = {
    ...cache.memoryStore,
    memories: [...cache.memoryStore.memories, memory],
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function addMemories(memories: Memory[]): void {
  cache.memoryStore = {
    ...cache.memoryStore,
    memories: [...cache.memoryStore.memories, ...memories],
    extractedAt: new Date().toISOString(),
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function updateMemory(id: string, updates: Partial<Memory>): void {
  const idx = cache.memoryStore.memories.findIndex(m => m.id === id)
  if (idx === -1) return
  const updated = { ...cache.memoryStore.memories[idx], ...updates }
  cache.memoryStore = {
    ...cache.memoryStore,
    memories: [
      ...cache.memoryStore.memories.slice(0, idx),
      updated,
      ...cache.memoryStore.memories.slice(idx + 1),
    ],
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function deleteMemory(id: string): void {
  const memory = cache.memoryStore.memories.find(m => m.id === id)
  if (!memory) return
  cache.memoryStore = {
    ...cache.memoryStore,
    memories: cache.memoryStore.memories.filter(m => m.id !== id),
    trash: [...cache.memoryStore.trash, memory],
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function restoreMemory(id: string): void {
  const memory = cache.memoryStore.trash.find(m => m.id === id)
  if (!memory) return
  cache.memoryStore = {
    ...cache.memoryStore,
    memories: [...cache.memoryStore.memories, memory],
    trash: cache.memoryStore.trash.filter(m => m.id !== id),
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function permanentlyDeleteMemory(id: string): void {
  cache.memoryStore = {
    ...cache.memoryStore,
    trash: cache.memoryStore.trash.filter(m => m.id !== id),
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function bumpMemoryReference(ids: string[]): void {
  const now = new Date().toISOString()
  cache.memoryStore = {
    ...cache.memoryStore,
    memories: cache.memoryStore.memories.map(m =>
      ids.includes(m.id)
        ? { ...m, lastReferencedAt: now, referencedCount: m.referencedCount + 1 }
        : m
    ),
  }
  void saveToDisk(FILES.memories, cache.memoryStore)
}

export function getSchedule(): WeekSchedule {
  return cache.schedule
}

export function getBlocks(): TimeBlock[] {
  return cache.schedule.blocks
}

export function getBlocksForDate(date: string): TimeBlock[] {
  return cache.schedule.blocks.filter(b => b.date === date)
}

export function addBlock(block: TimeBlock): void {
  cache.schedule = {
    ...cache.schedule,
    blocks: [...cache.schedule.blocks, block],
  }
  void saveToDisk(FILES.schedule, cache.schedule)
}

export function addBlocks(blocks: TimeBlock[]): void {
  cache.schedule = {
    ...cache.schedule,
    blocks: [...cache.schedule.blocks, ...blocks],
  }
  void saveToDisk(FILES.schedule, cache.schedule)
}

export function updateBlock(id: string, updates: Partial<TimeBlock>): void {
  const idx = cache.schedule.blocks.findIndex(b => b.id === id)
  if (idx === -1) return
  cache.schedule = {
    ...cache.schedule,
    blocks: [
      ...cache.schedule.blocks.slice(0, idx),
      { ...cache.schedule.blocks[idx], ...updates },
      ...cache.schedule.blocks.slice(idx + 1),
    ],
  }
  void saveToDisk(FILES.schedule, cache.schedule)
}

export function deleteBlock(id: string): void {
  cache.schedule = {
    ...cache.schedule,
    blocks: cache.schedule.blocks.filter(b => b.id !== id),
  }
  void saveToDisk(FILES.schedule, cache.schedule)
}

export function clearBlocksForDate(date: string): void {
  cache.schedule = {
    ...cache.schedule,
    blocks: cache.schedule.blocks.filter(b => b.date !== date),
  }
  void saveToDisk(FILES.schedule, cache.schedule)
}

export function clearAllData(): void {
  cache.profile = null
  cache.tasks = []
  cache.chatMessages = []
  cache.apiKey = ''
  cache.evals = []
  cache.memoryStore = { ...DEFAULT_MEMORY_STORE }
  cache.schedule = { ...DEFAULT_SCHEDULE }
  Object.values(FILES).forEach(f => void removeFromDisk(f))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
