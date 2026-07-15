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

import { courses } from '../content'
import { todayKey, computeStreak, isProgressData, useProgress, type DayLog, type ProgressData } from './progress'
import { progressStorageKey } from './profiles'

/** Key for a date `daysAgo` days before `base`. */
const keyFor = (daysAgo: number, base: Date = new Date(2026, 6, 13)) => {
  const d = new Date(base)
  d.setDate(d.getDate() - daysAgo)
  return todayKey(d)
}

const log = (entries: Record<number, Partial<DayLog>>): Record<string, DayLog> => {
  const out: Record<string, DayLog> = {}
  for (const [ago, v] of Object.entries(entries)) {
    out[keyFor(Number(ago))] = { minutes: 0, xp: 0, lessons: 0, ...v }
  }
  return out
}

const GOAL = 10

describe('todayKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('computeStreak', () => {
  it('returns 0 for an empty log', () => {
    expect(computeStreak({}, GOAL, new Date(2026, 6, 13))).toBe(0)
  })

  it('counts a single day that met the goal today', () => {
    const dailyLog = log({ 0: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(1)
  })

  it('counts consecutive days ending today', () => {
    const dailyLog = log({ 0: { minutes: GOAL }, 1: { minutes: GOAL }, 2: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(3)
  })

  it('rolls back to yesterday when today is not yet met', () => {
    // Today not met, but yesterday + day before are met → streak from yesterday.
    const dailyLog = log({ 0: { minutes: 0 }, 1: { minutes: GOAL }, 2: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(2)
  })

  it('counts a streak that ends yesterday when today is missed', () => {
    const dailyLog = log({ 1: { minutes: GOAL }, 2: { minutes: GOAL }, 3: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(3)
  })

  it('stops at the first gap and does not count earlier days', () => {
    const dailyLog = log({
      0: { minutes: GOAL },
      1: { minutes: GOAL },
      2: { minutes: 0 }, // gap
      3: { minutes: GOAL }, // earlier met day, must NOT be counted
    })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(2)
  })

  it('does not count a day below the goal with no lessons', () => {
    const dailyLog = log({ 0: { minutes: GOAL - 1 }, 1: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(1)
  })

  it('counts a day met by lessons even with zero minutes', () => {
    const dailyLog = log({ 0: { lessons: 1 }, 1: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(2)
  })

  it('treats exactly meeting the goal as met', () => {
    const dailyLog = log({ 0: { minutes: GOAL } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(1)
  })

  it('does not count the day after a missed today twice', () => {
    // Today missing, yesterday met, day before missing → streak 1.
    const dailyLog = log({ 1: { minutes: GOAL }, 2: { minutes: 0 } })
    expect(computeStreak(dailyLog, GOAL, new Date(2026, 6, 13))).toBe(1)
  })
})

const validData = (over: Partial<ProgressData> = {}): ProgressData => ({
  xp: 42,
  activeCourse: 'ru',
  dailyGoalMinutes: 10,
  dailyLog: {},
  badges: {},
  courses: { ru: { lessonCompletions: { l1: 1 }, srsItems: {} } },
  ...over,
})

describe('isProgressData', () => {
  it('accepts a well-formed backup', () => {
    expect(isProgressData(validData())).toBe(true)
  })
  it('rejects non-objects and arrays', () => {
    expect(isProgressData(null)).toBe(false)
    expect(isProgressData([])).toBe(false)
    expect(isProgressData('hi')).toBe(false)
  })
  it('rejects a non-numeric xp', () => {
    expect(isProgressData({ ...validData(), xp: '42' })).toBe(false)
  })
  it('rejects an unknown activeCourse', () => {
    expect(isProgressData({ ...validData(), activeCourse: 'klingon' })).toBe(false)
  })
  it('rejects a non-object dailyLog', () => {
    expect(isProgressData({ ...validData(), dailyLog: [] })).toBe(false)
  })
  it('rejects a course entry without srsItems', () => {
    expect(isProgressData({ ...validData(), courses: { ru: { lessonCompletions: {} } } })).toBe(false)
  })
})

describe('useProgress store', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgress.getState().loadForProfile('test-profile', 'ru')
  })

  describe('loadForProfile', () => {
    it('starts fresh when nothing is stored', () => {
      expect(useProgress.getState().data.xp).toBe(0)
      expect(useProgress.getState().data.activeCourse).toBe('ru')
    })

    it('loads previously stored data', () => {
      localStorage.setItem(progressStorageKey('p2'), JSON.stringify(validData({ xp: 99 })))
      useProgress.getState().loadForProfile('p2', 'ru')
      expect(useProgress.getState().data.xp).toBe(99)
    })

    it('falls back to fresh state on corrupted JSON instead of throwing', () => {
      localStorage.setItem(progressStorageKey('p3'), '{not json!!')
      useProgress.getState().loadForProfile('p3', 'es')
      expect(useProgress.getState().data).toMatchObject({ xp: 0, activeCourse: 'es' })
    })

    it('preserves the corrupted blob under a backup key', () => {
      localStorage.setItem(progressStorageKey('p4'), '{not json!!')
      useProgress.getState().loadForProfile('p4', 'ru')
      expect(localStorage.getItem(`${progressStorageKey('p4')}:corrupt`)).toBe('{not json!!')
    })
  })

  describe('exportData / importData', () => {
    it('round-trips through export and import', () => {
      useProgress.getState().addXp(10)
      const exported = useProgress.getState().exportData()
      useProgress.getState().loadForProfile('other', 'ru')
      expect(useProgress.getState().importData(exported)).toBe(true)
      expect(useProgress.getState().data.xp).toBe(10)
    })

    it('rejects invalid JSON without changing state', () => {
      useProgress.getState().addXp(5)
      expect(useProgress.getState().importData('not json')).toBe(false)
      expect(useProgress.getState().data.xp).toBe(5)
    })

    it('rejects JSON with a malformed courses field', () => {
      const bad = JSON.stringify(validData({ courses: { ru: 'oops' } as unknown as ProgressData['courses'] }))
      expect(useProgress.getState().importData(bad)).toBe(false)
    })

    it('rejects a JSON array', () => {
      expect(useProgress.getState().importData('[]')).toBe(false)
    })

    it('persists an accepted import to localStorage', () => {
      const backup = JSON.stringify(validData({ xp: 77 }))
      useProgress.getState().importData(backup)
      const stored = JSON.parse(localStorage.getItem(progressStorageKey('test-profile'))!)
      expect(stored.xp).toBe(77)
    })
  })

  describe('completeLesson', () => {
    it('records the completion and seeds SRS items for new vocab', () => {
      useProgress.getState().completeLesson('ru', 'lesson-a', ['v1', 'v2'])
      const cp = useProgress.getState().data.courses.ru!
      expect(cp.lessonCompletions['lesson-a']).toBe(1)
      expect(Object.keys(cp.srsItems).sort()).toEqual(['v1', 'v2'])
    })

    it('caps crown level at 5', () => {
      for (let i = 0; i < 7; i++) useProgress.getState().completeLesson('ru', 'lesson-a', [])
      expect(useProgress.getState().data.courses.ru!.lessonCompletions['lesson-a']).toBe(5)
    })

    it('bumps the daily lesson count for today', () => {
      useProgress.getState().completeLesson('ru', 'lesson-a', [])
      expect(useProgress.getState().data.dailyLog[todayKey()].lessons).toBe(1)
    })

    it('does not reset an existing SRS item', () => {
      useProgress.getState().completeLesson('ru', 'lesson-a', ['v1'])
      useProgress.getState().reviewVocab('ru', 'v1', true)
      const reviewed = useProgress.getState().data.courses.ru!.srsItems['v1']
      useProgress.getState().completeLesson('ru', 'lesson-b', ['v1'])
      expect(useProgress.getState().data.courses.ru!.srsItems['v1']).toEqual(reviewed)
    })
  })

  describe('skipToUnit', () => {
    it('marks every lesson in earlier unlocked units as completed', () => {
      useProgress.getState().skipToUnit('ru', 1)
      const firstUnit = courses.ru.units.filter((u) => !u.locked)[0]
      const lessonIds = firstUnit.skills.flatMap((s) => s.lessons.map((l) => l.id))
      const completions = useProgress.getState().data.courses.ru!.lessonCompletions
      for (const id of lessonIds) expect(completions[id]).toBeGreaterThanOrEqual(1)
    })

    it('leaves lessons of the target unit and beyond untouched', () => {
      useProgress.getState().skipToUnit('ru', 1)
      const secondUnit = courses.ru.units.filter((u) => !u.locked)[1]
      const lessonIds = secondUnit.skills.flatMap((s) => s.lessons.map((l) => l.id))
      const completions = useProgress.getState().data.courses.ru!.lessonCompletions
      for (const id of lessonIds) expect(completions[id]).toBeUndefined()
    })

    it('does not downgrade a lesson already completed more than once', () => {
      useProgress.getState().completeLesson('ru', courses.ru.units[0].skills[0].lessons[0].id, [])
      useProgress.getState().completeLesson('ru', courses.ru.units[0].skills[0].lessons[0].id, [])
      useProgress.getState().skipToUnit('ru', 1)
      const id = courses.ru.units[0].skills[0].lessons[0].id
      expect(useProgress.getState().data.courses.ru!.lessonCompletions[id]).toBe(2)
    })
  })

  describe('reviewVocab', () => {
    it('creates an SRS item on first review of unseen vocab', () => {
      useProgress.getState().reviewVocab('ru', 'fresh', true)
      expect(useProgress.getState().data.courses.ru!.srsItems['fresh']).toBeDefined()
    })

    it('updates the existing item on subsequent reviews', () => {
      useProgress.getState().reviewVocab('ru', 'v', true)
      const first = useProgress.getState().data.courses.ru!.srsItems['v']
      useProgress.getState().reviewVocab('ru', 'v', true)
      const second = useProgress.getState().data.courses.ru!.srsItems['v']
      expect(second.reps).toBeGreaterThan(first.reps)
    })
  })

  describe('earnBadge', () => {
    it('records an earned timestamp', () => {
      useProgress.getState().earnBadge('first-lesson')
      expect(useProgress.getState().data.badges['first-lesson']).toBeGreaterThan(0)
    })

    it('does not overwrite the timestamp when earned again', () => {
      useProgress.getState().earnBadge('first-lesson')
      const first = useProgress.getState().data.badges['first-lesson']
      useProgress.getState().earnBadge('first-lesson')
      expect(useProgress.getState().data.badges['first-lesson']).toBe(first)
    })
  })
})
