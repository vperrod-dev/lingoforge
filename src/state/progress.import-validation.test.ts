import { describe, it, expect, beforeEach, vi } from 'vitest'

// node test env has no localStorage; stub before progress.ts (via profiles.ts persist) loads
vi.hoisted(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  })
})

const { useProgress, emptyProgress } = await import('./progress')

describe('importData validation', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgress.setState({
      profileId: null,
      data: emptyProgress(),
      storageError: false,
    })
  })

  it('accepts valid well-formed progress JSON', () => {
    const json = JSON.stringify({
      xp: 42,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: { '2026-07-30': { minutes: 10, xp: 10, lessons: 1 } },
      badges: {},
      courses: {
        ru: {
          lessonCompletions: { l1: 1 },
          srsItems: { v1: { vocabId: 'v1', stability: 1, difficulty: 0.2, dueAt: 0, reps: 1, lapses: 0 } },
        },
      },
    })
    expect(useProgress.getState().importData(json)).toBe(true)
    expect(useProgress.getState().data.xp).toBe(42)
    expect(useProgress.getState().data.activeCourse).toBe('ru')
  })

  it('rejects JSON missing xp', () => {
    const json = JSON.stringify({
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON missing activeCourse', () => {
    const json = JSON.stringify({
      xp: 0,
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON missing dailyGoalMinutes', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyLog: {},
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON missing dailyLog', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON missing badges', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON missing courses', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON with xp given as a string instead of a number', () => {
    const json = JSON.stringify({
      xp: '42',
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON with dailyGoalMinutes given as a string instead of a number', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: '10',
      dailyLog: {},
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON with activeCourse given as a number instead of a string', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 42,
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON with dailyLog as an array instead of an object', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: [],
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON with badges as an array instead of an object', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: [],
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects JSON with courses as a string instead of an object', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: 'oops',
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects valid JSON with an invalid DayLog minutes type', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: { '2026-07-30': { minutes: '10', xp: 10, lessons: 1 } },
      badges: {},
      courses: {},
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects valid JSON with an SRS item missing required fields', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: {
        ru: {
          lessonCompletions: {},
          srsItems: { v1: { vocabId: 'v1', stability: 1, difficulty: 0.2, dueAt: 0 } },
        },
      },
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })

  it('rejects valid JSON with lessonCompletions value outside 0..5', () => {
    const json = JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: {},
      badges: {},
      courses: {
        ru: {
          lessonCompletions: { l1: 6 },
          srsItems: {},
        },
      },
    })
    expect(useProgress.getState().importData(json)).toBe(false)
  })
})
