import { createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage wrapped so setItem/getItem can't throw — mirrors progress.ts's
 * saveToStorage guard. In Safari private mode or when the quota is exceeded,
 * localStorage.setItem throws; without this, persist() would surface it as an
 * uncaught error from createProfile/setAiEnabled etc. Here it degrades to
 * in-memory-only state instead.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch (e) {
      console.warn('lingoforge: failed to read from localStorage', e)
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch (e) {
      console.warn('lingoforge: failed to save to localStorage', e)
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch (e) {
      console.warn('lingoforge: failed to remove from localStorage', e)
    }
  },
}

export const safeJSONStorage = createJSONStorage(() => safeLocalStorage)
