import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'progress')

const readFixture = (name: string): string => fs.readFileSync(path.join(fixturesDir, name), 'utf8')

let map: Map<string, string>
function createLocalStorage(): Storage {
  map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? '',
  } as unknown as Storage
}

let mod: Awaited<ReturnType<typeof import('../state/progress.ts')>>

describe('useProgress importData / exportData', () => {
  beforeEach(async () => {
    globalThis.localStorage = createLocalStorage()
    mod = await import('../state/progress.ts')
    mod.useProgress.setState({
      profileId: null,
      data: mod.emptyProgress(),
      storageError: false,
    })
  })

  it('returns true after importing valid JSON and updates state data', () => {
    const imported = JSON.parse(readFixture('valid-full.json'))

    expect(mod.useProgress.getState().importData(readFixture('valid-full.json'))).toBe(true)
    expect(mod.useProgress.getState().data).toEqual(imported)
  })

  it('round-trips through exportData -> importData', () => {
    const store = mod.useProgress.getState()
    store.setDailyGoal(20)
    store.addXp(7)
    store.addStudyMinutes(45)
    store.completeLesson('es', 'lsn-a', ['v1'])
    store.earnBadge('first-lesson')
    store.setActiveCourse('ru')

    const json = mod.useProgress.getState().exportData()
    globalThis.localStorage.clear()
    mod.useProgress.setState({
      profileId: null,
      data: mod.emptyProgress(),
      storageError: false,
    })
    expect(mod.useProgress.getState().importData(json)).toBe(true)

    expect(mod.useProgress.getState().data).toEqual(JSON.parse(json))
  })

  it('gracefully fails on null JSON string', () => {
    expect(mod.useProgress.getState().importData('null')).toBe(false)
    expect(mod.useProgress.getState().data).toEqual(mod.emptyProgress())
  })

  it('gracefully fails on plain array JSON', () => {
    expect(mod.useProgress.getState().importData('[1,2,3]')).toBe(false)
    expect(mod.useProgress.getState().data).toEqual(mod.emptyProgress())
  })

  it('gracefully fails on missing required fields', () => {
    expect(mod.useProgress.getState().importData(readFixture('invalid-missing-xp.json'))).toBe(false)
    expect(mod.useProgress.getState().data).toEqual(mod.emptyProgress())
  })

  it('gracefully fails on malformed nested structures', () => {
    expect(mod.useProgress.getState().importData(readFixture('invalid-bad-dailylog-entry.json'))).toBe(false)
    expect(mod.useProgress.getState().data).toEqual(mod.emptyProgress())
  })

  it('does not load for profile on invalid progress data', () => {
    const valid = JSON.parse(readFixture('valid-full.json'))
    mod.useProgress.setState({
      profileId: null,
      data: valid,
      storageError: false,
    })

    mod.useProgress.getState().loadForProfile('p-corrupt', 'es')

    expect(mod.useProgress.getState().data).not.toEqual(valid)
    expect(mod.isProgressData(mod.useProgress.getState().data)).toBe(true)
    expect(mod.useProgress.getState().data.xp).toBe(0)
    expect(mod.useProgress.getState().storageError).toBe(false)
  })

  it('passes validation for well-formed valid ProgressData JSON', () => {
    const valid = JSON.parse(readFixture('valid-full.json'))
    expect(mod.useProgress.getState().importData(readFixture('valid-full.json'))).toBe(true)
    expect(mod.useProgress.getState().data).toEqual(valid)
  })

  it('rejects JSON missing each top-level required field individually', () => {
    const base = {
      xp: minNumber(0),
      activeCourse: 'ru',
      dailyGoalMinutes: minNumber(10),
      dailyLog: {},
      badges: {},
      courses: {},
    } as Record<string, unknown>

    const requiredFields = [
      'xp',
      'activeCourse',
      'dailyGoalMinutes',
      'dailyLog',
      'badges',
      'courses',
    ]

    for (const field of requiredFields) {
      const missing = { ...base }
      delete missing[field]
      expect(mod.useProgress.getState().importData(JSON.stringify(missing))).toBe(false, `missing ${field} should be rejected`)
    }
  })

  it('strips unknown top-level fields from an imported backup instead of persisting them raw', () => {
    const valid = JSON.parse(readFixture('valid-full.json'))
    const withJunk = { ...valid, __proto__evil: 'nope', injectedField: { nested: true } }

    expect(mod.useProgress.getState().importData(JSON.stringify(withJunk))).toBe(true)
    expect(mod.useProgress.getState().data).toEqual(valid)
    expect(mod.useProgress.getState().data).not.toHaveProperty('injectedField')
  })

  it('rejects JSON with wrong types for required top-level fields', () => {
    const base = {
      xp: minNumber(0),
      activeCourse: 'ru',
      dailyGoalMinutes: minNumber(10),
      dailyLog: {},
      badges: {},
      courses: {},
    } as Record<string, unknown>

    const badTypes: Array<{ field: string; value: unknown }> = [
      { field: 'xp', value: '0' },
      { field: 'activeCourse', value: 1 },
      { field: 'dailyGoalMinutes', value: '10' },
      { field: 'dailyLog', value: 'bad' },
      { field: 'badges', value: null },
      { field: 'courses', value: true },
    ]

    for (const { field, value } of badTypes) {
      const abort = { ...base, [field]: value }
      expect(mod.useProgress.getState().importData(JSON.stringify(abort))).toBe(false, `${field} bad type should be rejected`)
    }
  })
})

function minNumber(value: number): number {
  return value
}
