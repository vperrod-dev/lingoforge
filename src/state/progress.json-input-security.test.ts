import { describe, it, expect, beforeEach } from 'vitest'
import { progressStorageKey } from '../state/profiles'

describe('importData/exportData/loadForProfile JSON security', () => {
  let map: Map<string, string>
  let mod: Awaited<ReturnType<typeof import('../state/progress.ts')>>

  beforeEach(async () => {
    map = new Map()
    globalThis.localStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      get length() { return map.size },
      key: (i: number) => [...map.keys()][i] ?? '',
    } as unknown as Storage
    mod = await import('../state/progress.ts')
    mod.useProgress.setState({ profileId: null, data: mod.emptyProgress(), storageError: false })
  })

  const goodPayload = () =>
    JSON.stringify({
      xp: 0,
      activeCourse: 'ru',
      dailyGoalMinutes: 10,
      dailyLog: { '2026-07-01': { minutes: 1, xp: 1, lessons: 1 } },
      badges: {},
      courses: { ru: { lessonCompletions: { l1: 1 }, srsItems: {} } },
    })

  describe('importData', () => {
    it('accepts a valid schema-conforming payload', () => {
      expect(mod.useProgress.getState().importData(goodPayload())).toBe(true)
    })

    it('rejects malformed JSON without throwing', () => {
      const samples = [
        '{ xp: 0 }',
        '{ xp: }',
        '{ broken',
        '',
        '{"unclosed": "str}',
        '{"double": "quotes""}',
        '{"key": \u0000}',
      ]
      for (const s of samples) {
        expect(() => mod.useProgress.getState().importData(s)).not.toThrow()
        expect(mod.useProgress.getState().importData(s)).toBe(false)
      }
    })

    it('rejects deeply nested objects to prevent DoS recursion', () => {
      const nest = (n: number) => (n === 0 ? '2026-07-01' : `{"a":${nest(n - 1)}}`)
      const deep = `{"xp":0,"activeCourse":"ru","dailyGoalMinutes":10,"dailyLog":${nest(250)},"badges":{},"courses":{}}`
      // Should reject because of shape/schema validation, not crash/hang
      expect(() => mod.useProgress.getState().importData(deep)).not.toThrow()
      expect(mod.useProgress.getState().importData(deep)).toBe(false)
    })

    it('fails fast when JSON.parse itself rejects huge unclosed input', () => {
      const payload = '{' + ' '.repeat(1_000_000) + '"x"' // unclosed huge token stream
      expect(() => mod.useProgress.getState().importData(payload)).not.toThrow()
    })

    it('rejects top-level wrong shapes: object missing required fields', () => {
      const payloads = [
        '{}',
        '{"xp":"1"}',
        '{"xp":0,"activeCourse":"unk"}',
        '{"xp":0,"activeCourse":"ru","dailyGoalMinutes":10}',
        '{"xp":0,"activeCourse":"ru","dailyGoalMinutes":10,"dailyLog":[1,2]}',
        '{"xp":0,"activeCourse":"ru","dailyGoalMinutes":10,"dailyLog":{"d":{"minutes":"nope"}}}',
      ]
      for (const p of payloads) {
        expect(mod.useProgress.getState().importData(p)).toBe(false)
      }
    })

    it('does not mutate Object.prototype via __proto__/constructor pollution', () => {
      const protoBefore = { ...(Object.prototype as Record<string, unknown>) }
      mod.useProgress.getState().importData('{"__proto__":{"polluted":true}}')
      expect(Object.prototype).toEqual(protoBefore)
    })

    it('does not mutate Function.prototype or global classes via prototype pollution', () => {
      expect(() =>
        mod.useProgress.getState().importData(
          '{"constructor":{"prototype":{"polluted":"no"}}}'
        )
      ).not.toThrow()
      // pure JS cannot mutate via parsed data unless explicitly merged into proto;
      // validate nothing weird leaked
      expect((Function.prototype as Record<string, unknown>).polluted).toBeUndefined()
    })

    it('handles adverse string values in schema fields without crashing', () => {
      expect(
        mod.useProgress.getState().importData(
          '{"xp":"abc","activeCourse":"ru","dailyGoalMinutes":10,"badges":{},"dailyLog":{},"courses":{}}'
        )
      ).toBe(false)
      expect(mod.useProgress.getState().data.xp).toBe(0)
    })

    it('rejects arrays nested into record-typed fields', () => {
      const payload = JSON.stringify({
        xp: 0,
        activeCourse: 'ru',
        dailyGoalMinutes: 10,
        dailyLog: { a: null },
        badges: [1, 2],
        courses: { ru: { lessonCompletions: 'x', srsItems: [1] } },
      })
      expect(mod.useProgress.getState().importData(payload)).toBe(false)
    })

    it('rejects invalid SRS item fields while preserving state', () => {
      const payload = JSON.stringify({
        xp: 0,
        activeCourse: 'ru',
        dailyGoalMinutes: 10,
        dailyLog: {},
        badges: {},
        courses: { ru: { lessonCompletions: {}, srsItems: { v1: { vocabId: '', reps: -1 } } } },
      })
      expect(mod.useProgress.getState().importData(payload)).toBe(false)
      expect(mod.useProgress.getState().data.xp).toBe(0)
    })

    it('does not throw on large arrays of strings payloads', () => {
      const big = new Array(20000).fill('x').map((x) => ({ opts: x.repeat(100) }))
      const payload = JSON.stringify({
        xp: 0,
        activeCourse: 'ru',
        dailyGoalMinutes: 10,
        dailyLog: {},
        badges: {},
        courses: {},
        extras: big,
      })
      expect(() => mod.useProgress.getState().importData(payload)).not.toThrow()
      expect(mod.useProgress.getState().importData(payload)).toBe(true)
      expect(mod.useProgress.getState().data).not.toHaveProperty('extras')
    })

    it('tolerates a ~5MB valid payload without crashing or memory issues', () => {
      const hugeDailyLog: Record<string, { minutes: number; xp: number; lessons: number }> = {}
      for (let i = 0; i < 60000; i++)
        hugeDailyLog[`d${i}`] = { minutes: 1, xp: 1, lessons: 1 }
      const payload = JSON.stringify({
        xp: 1,
        activeCourse: 'ru',
        dailyGoalMinutes: 10,
        dailyLog: hugeDailyLog,
        badges: {},
        courses: {},
      })
      expect(() => mod.useProgress.getState().importData(payload)).not.toThrow()
      expect(mod.useProgress.getState().importData(payload)).toBe(true)
      expect(mod.useProgress.getState().data.xp).toBe(1)
    })
  })

  describe('exportData/loadForProfile storage security', () => {
    it('exportData returns parseable JSON', () => {
      const json = mod.useProgress.getState().exportData()
      expect(() => JSON.parse(json)).not.toThrow()
      expect(typeof JSON.parse(json)).toBe('object')
    })

    it('exported JSON parses back into valid schema fields', () => {
      const json = mod.useProgress.getState().exportData()
      const parsed = JSON.parse(json)
      expect(typeof parsed.xp).toBe('number')
      expect(typeof parsed.activeCourse).toBe('string')
      expect(typeof parsed.dailyGoalMinutes).toBe('number')
      expect(typeof parsed.dailyLog).toBe('object')
      expect(typeof parsed.badges).toBe('object')
      expect(typeof parsed.courses).toBe('object')
    })

    it('loadForProfile ignores __proto__ keys in stored JSON', () => {
      const key = progressStorageKey('p1')
      map.set(key, '{ "xp":0,"activeCourse":"ru","dailyGoalMinutes":10,"dailyLog":{},"badges":{},"courses":{},"__proto__":{"polluted":1}}')
      const before = (Object.prototype as Record<string, unknown>).polluted
      mod.useProgress.getState().loadForProfile('p1', 'ru')
      expect(Object.prototype).toEqual({ ...(Object.prototype as Record<string, unknown>), polluted: before })
    })

    it('loadForProfile falls back to fresh state on corrupted JSON', () => {
      const key = progressStorageKey('p2')
      map.set(key, '{broken')
      mod.useProgress.getState().loadForProfile('p2', 'ru')
      expect(mod.useProgress.getState().data).toEqual(mod.emptyProgress('ru'))
      expect(mod.useProgress.getState().storageError).toBe(false)
    })

    it('loadForProfile preserves corrupt blob under backup key when write succeeds', () => {
      const key = progressStorageKey('p3')
      map.set(key, '{broken}')
      mod.useProgress.getState().loadForProfile('p3', 'ru')
      expect(map.get(`${key}:corrupt`)).toBe('{broken}')
    })

    it('loadForProfile tolerates very large stored JSON without throwing', () => {
      const key = progressStorageKey('p4')
      const huge: Record<string, { minutes: number; xp: number; lessons: number }> = {}
      for (let i = 0; i < 50000; i++) huge[`d${i}`] = { minutes: 1, xp: 1, lessons: 1 }
      map.set(
        key,
        JSON.stringify({
          xp: 1,
          activeCourse: 'ru',
          dailyGoalMinutes: 10,
          dailyLog: huge,
          badges: {},
          courses: {},
        })
      )
      expect(() => mod.useProgress.getState().loadForProfile('p4', 'ru')).not.toThrow()
      expect(mod.useProgress.getState().data.xp).toBe(1)
    })

    it('loadForProfile rejects stored JSON with invalid top-level types', () => {
      const key = progressStorageKey('p5')
      map.set(key, '[1,2,3]')
      mod.useProgress.getState().loadForProfile('p5', 'ru')
      expect(mod.useProgress.getState().data).toEqual(mod.emptyProgress('ru'))
    })
  })

  describe('repeated adversarial import/export pipeline', () => {
    it('stays stable under rapid mixed valid/invalid imports', () => {
      const state = mod.useProgress.getState()
      for (let i = 0; i < 200; i++) {
        expect(() => state.importData(goodPayload())).not.toThrow()
        expect(() => state.exportData()).not.toThrow()
        expect(() => state.importData('{"xp":"bad"}')).not.toThrow()
        expect(() => state.importData('null')).not.toThrow()
      }
      expect(state.data.xp).toBe(0)
    })
  })
})
