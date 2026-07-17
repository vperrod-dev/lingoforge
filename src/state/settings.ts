import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  /** Opt-in for AI lessons via a local Ollama server (localhost:11434). Off by default. */
  aiEnabled: boolean
  setAiEnabled: (on: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      aiEnabled: false,
      setAiEnabled: (on) => set({ aiEnabled: on }),
    }),
    { name: 'lingoforge:settings' },
  ),
)
