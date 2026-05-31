export {}

declare global {
  interface Window {
    storage?: {
      read<T>(filename: string, fallback: T): Promise<T>
      write(filename: string, data: unknown): Promise<void>
      remove(filename: string): Promise<void>
      dataDir(): Promise<string>
      onMemoryExtractRequest(callback: () => void): () => void
      onMemoryForgetScan(callback: () => void): () => void
    }
  }
}
