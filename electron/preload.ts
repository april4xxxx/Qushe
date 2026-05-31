import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('storage', {
  read: <T>(filename: string, fallback: T): Promise<T> =>
    ipcRenderer.invoke('storage:read', filename, fallback),
  write: (filename: string, data: unknown): Promise<void> =>
    ipcRenderer.invoke('storage:write', filename, data),
  remove: (filename: string): Promise<void> =>
    ipcRenderer.invoke('storage:remove', filename),
  dataDir: (): Promise<string> => ipcRenderer.invoke('storage:dataDir'),
})
