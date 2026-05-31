import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// dist-electron/main.js -> ../dist
process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let mainWindow: BrowserWindow | null = null

function getDataDir(): string {
  return app.getPath('userData')
}

async function readJSON<T>(filename: string, fallback: T): Promise<T> {
  try {
    const filepath = path.join(getDataDir(), filename)
    const raw = await fs.readFile(filepath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJSON(filename: string, data: unknown): Promise<void> {
  const dir = getDataDir()
  await fs.mkdir(dir, { recursive: true })
  const filepath = path.join(dir, filename)
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8')
}

async function removeFile(filename: string): Promise<void> {
  try {
    await fs.unlink(path.join(getDataDir(), filename))
  } catch {
    /* ignore missing files */
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FDFBF7',
    title: '取舍',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('storage:read', async (_event, filename: string, fallback: unknown) => {
  return readJSON(filename, fallback)
})

ipcMain.handle('storage:write', async (_event, filename: string, data: unknown) => {
  await writeJSON(filename, data)
})

ipcMain.handle('storage:remove', async (_event, filename: string) => {
  await removeFile(filename)
})

ipcMain.handle('storage:dataDir', () => getDataDir())

function scheduleDailyExtract(): void {
  const now = new Date()
  const nextMidnight = new Date(now)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  nextMidnight.setHours(0, 0, 0, 0)
  const msUntilMidnight = nextMidnight.getTime() - now.getTime()

  setTimeout(() => {
    mainWindow?.webContents.send('memory:extract-request')
    setInterval(() => {
      mainWindow?.webContents.send('memory:extract-request')
    }, 24 * 60 * 60 * 1000)
  }, msUntilMidnight)
}

function scheduleWeeklyForget(): void {
  const now = new Date()
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7
  const nextSunday = new Date(now)
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)
  nextSunday.setHours(0, 0, 0, 0)
  const msUntilSunday = nextSunday.getTime() - now.getTime()

  setTimeout(() => {
    mainWindow?.webContents.send('memory:forget-scan')
    setInterval(() => {
      mainWindow?.webContents.send('memory:forget-scan')
    }, 7 * 24 * 60 * 60 * 1000)
  }, msUntilSunday)
}

app.whenReady().then(() => {
  createWindow()
  scheduleDailyExtract()
  scheduleWeeklyForget()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
