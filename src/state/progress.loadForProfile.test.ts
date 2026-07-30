import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
})

import { useProgress } from './progress'
import { progressStorageKey, type CourseId } from './profiles'
import type { ProgressData } from './progress'

const dataFor = (over: Partial<ProgressData> = {}): ProgressData => ({
  xp: 42,
  activeCourse: 'ru',
  dailyGoalMinutes: 10,
  dailyLog: {},
  badges: {},
  courses: { ru: { lessonCompletions: {}, srsItems: {} } },
  ...over,
})

beforeEach(() => {
  store.clear()
})

describe('loadForProfile', () => {
  type State = ReturnType<typeof useProgress.getState>

  const itLoads = (
    label: string,
    profileId: string,
    defaultCourse: CourseId,
    raw: string | null,
    expected: Partial<ProgressData>,
  ) =>
    it(label, () => {
      if (raw !== null) store.set(progressStorageKey(profileId), raw)
      useProgress.getState().loadForProfile(profileId, defaultCourse)
      const state = useProgress.getState() as State
      expect(state.profileId).toBe(profileId)
      expect(state.storageError).toBe(false)
      expect(state.data).toMatchObject(expected)
    })

  describe('missing data', () => {
    it('initializes to defaults with empty storage', () => {
      useProgress.getState().loadForProfile('p1', 'ru')
      expect(useProgress.getState().data).toEqual({
        xp: 0,
        activeCourse: 'ru',
        dailyGoalMinutes: 10,
        dailyLog: {},
        badges: {},
        courses: {},
      })
    })

    it('uses the passed defaultCourse parameter', () => {
      useProgress.getState().loadForProfile('p2', 'es')
      expect(useProgress.getState().data.activeCourse).toBe('es')
    })
  })

  describe('corrupted JSON', () => {
    const corruptRaw = '{not json!!'

    it('falls back to fresh state instead of throwing', () => {
      store.set(progressStorageKey('p-corrupt'), corruptRaw)
      useProgress.getState().loadForProfile('p-corrupt', 'ru')
      expect(useProgress.getState().data).toMatchObject({ xp: 0, activeCourse: 'ru' })
    })

    it('preserves the original blob under a backup key', () => {
      store.set(progressStorageKey('p-backup'), corruptRaw)
      useProgress.getState().loadForProfile('p-backup', 'ru')
      expect(localStorage.getItem(`${progressStorageKey('p-backup')}:corrupt`)).toBe(corruptRaw)
    })

    it('recovers cleanly when writing the corrupt backup throws', () => {
      store.set(progressStorageKey('p-quota'), '{oops')
      vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      })
      useProgress.getState().loadForProfile('p-quota', 'es')
      expect(useProgress.getState().data).toMatchObject({ xp: 0, activeCourse: 'es' })
    })
  })

  describe('valid profile data', () => {
    itLoads(
      'hydrates from valid JSON',
      'p-valid',
      'ru',
      JSON.stringify(dataFor({ xp: 99 })),
      { xp: 99, activeCourse: 'ru' },
    )

    it('keeps non-default dailyGoalMinutes from storage', () => {
      store.set(progressStorageKey('p-goal'), JSON.stringify(dataFor({ dailyGoalMinutes: 25 })))
      useProgress.getState().loadForProfile('p-goal', 'ru')
      expect(useProgress.getState().data.dailyGoalMinutes).toBe(25)
    })

    it('hydrates populated dailyLog and badges', () => {
      const blob = dataFor({
        dailyLog: { '2026-07-01': { minutes: 5, xp: 20, lessons: 1 } },
        badges: { 'first-lesson': 1751328000000 },
      })
      store.set(progressStorageKey('p-full'), JSON.stringify(blob))
      useProgress.getState().loadForProfile('p-full', 'ru')
      expect(useProgress.getState().data.dailyLog['2026-07-01']).toMatchObject({ minutes: 5, xp: 20, lessons: 1 })
      expect(useProgress.getState().data.badges['first-lesson']).toBe(1751328000000)
    })

    it('loads course progress for a non-default active course', () => {
      const blob = dataFor({
        activeCourse: 'es',
        courses: { es: { lessonCompletions: { 'a': 2 }, srsItems: { v: { reps: 1 } } } },
      })
      store.set(progressStorageKey('p-course'), JSON.stringify(blob))
      useProgress.getState().loadForProfile('p-course', 'ru')
      expect(useProgress.getState().data.activeCourse).toBe('es')
      expect(useProgress.getState().data.courses.es!.lessonCompletions['a']).toBe(2)
      expect(useProgress.getState().data.courses.es!.srsItems['v']).toEqual({ reps: 1 })
    })
  })

  describe('malformed shape but valid JSON', () => {
    const blob = JSON.stringify({ xp: 'nope' })

    it('falls back to fresh state', () => {
      store.set(progressStorageKey('p-shape'), blob)
      useProgress.getState().loadForProfile('p-shape', 'es')
      expect(useProgress.getState().data).toMatchObject({ xp: 0, activeCourse: 'es' })
    })

    it('backs up the blob under the corrupt key', () => {
      store.set(progressStorageKey('p-shape-bak'), blob)
      useProgress.getState().loadForProfile('p-shape-bak', 'ru')
      expect(localStorage.getItem(`${progressStorageKey('p-shape-bak')}:corrupt`)).toBe(blob)
    })
  })
})
