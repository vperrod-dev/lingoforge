import { vi } from 'vitest'

// The suite runs in the node environment (no jsdom), but the app's error log and
// profile persistence talk to localStorage. Provide a spy-able in-memory stand-in
// so tests can assert on reads/writes without pulling in a DOM.
const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: vi.fn((k: string) => store.get(k) ?? null),
  setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
  removeItem: vi.fn((k: string) => void store.delete(k)),
  clear: vi.fn(() => store.clear()),
})
