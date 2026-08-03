import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.hoisted(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  })
})

import { useProgress } from './progress'
import { computeStreak } from './progress'
import { BADGES } from './badges'

const fresh = () => useProgress.getState().data
const isPersistedShape = (data: unknown): data is { xp: number; activeCourse: string } => {
  if (!data || typeof data !== 'object') return false
  const anyData = data as Record<string, unknown>
  return typeof anyData.xp === 'number' && typeof anyData.activeCourse === 'string'
}

describe('Zustand integration: completeLesson + skipToUnit + reviewVocab + earnBadge', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgress.getState().loadForProfile('integration', 'ru')
  })

  it('completeLesson seeds new vocab and preserves existing SRS state', () => {
    useProgress.getState().completeLesson('ru', 'lsn-1', ['v-a', 'v-b'])
    expect(fresh().courses.ru!.lessonCompletions['lsn-1']).toBe(1)
    expect(Object.keys(fresh().courses.ru!.srsItems)).toEqual(['v-a', 'v-b'])

    useProgress.getState().reviewVocab('ru', 'v-a', true)
    const before = fresh().courses.ru!.srsItems['v-a']

    useProgress.getState().completeLesson('ru', 'lsn-2', ['v-a', 'v-c'])
    expect(fresh().courses.ru!.lessonCompletions['lsn-2']).toBe(1)
    expect(fresh().courses.ru!.srsItems['v-c']).toBeDefined()
    expect(fresh().courses.ru!.srsItems['v-a']).toEqual(before)
  })

  it('completeLesson preserves valid state shape even with odd lesson/vocab inputs', () => {
    useProgress.getState().completeLesson('ru', 'lsn-fail', [])
    useProgress.getState().completeLesson('ru', 'lsn-fail', [''])
    useProgress.getState().completeLesson('ru', 'lsn-fail', [' ', '\t'])

    const data = fresh()
    expect(isPersistedShape(data)).toBe(true)
    expect(data.courses.ru!.lessonCompletions['lsn-fail']).toBe(3)
    expect(data.xp).toBe(0)
    expect(() => JSON.stringify(data)).not.toThrow()
  })

  it('skipToUnit preserves higher completion counts for already-visited lessons', () => {
    useProgress.getState().completeLesson('ru', 'unit-2-lsn', [])
    useProgress.getState().skipToUnit('ru', 2)
    expect(fresh().courses.ru!.lessonCompletions['unit-2-lsn']).toBe(1)
  })

  it('reviewVocab progresses SRS reps/lapses deterministically', () => {
    useProgress.getState().reviewVocab('ru', 'v1', true)
    expect(fresh().courses.ru!.srsItems['v1'].reps).toBe(2)

    useProgress.getState().reviewVocab('ru', 'v2', false)
    const wrong = fresh().courses.ru!.srsItems['v2']
    expect(wrong.reps).toBe(2)
    expect(wrong.lapses).toBe(1)
  })

  it('earnBadge records timestamps and is idempotent', () => {
    useProgress.getState().earnBadge('first-lesson')
    const first = fresh().badges['first-lesson']
    expect(first).toBeGreaterThan(0)

    useProgress.getState().earnBadge('first-lesson')
    expect(fresh().badges['first-lesson']).toBe(first)
  })

  it('completeLesson bumps daily lessons and keeps store JSON-serializable after chained mutations', () => {
    useProgress.getState().completeLesson('ru', 'lsn-chain', ['v1'])
    useProgress.getState().reviewVocab('ru', 'v1', true)
    useProgress.getState().earnBadge('words-50')

    const today = fresh().dailyLog[useProgress.getState().data.dailyLog && Object.keys(fresh().dailyLog)[0] || '']
    expect(today?.lessons).toBe(1)
    expect(() => JSON.stringify(fresh())).not.toThrow()
  })

  it('skipToUnit then completeLesson maintains consistent completions for shared lessons', () => {
    useProgress.getState().skipToUnit('ru', 2)
    const sharedId = Object.keys(fresh().courses.ru!.lessonCompletions)[0]
    const afterSkip = fresh().courses.ru!.lessonCompletions[sharedId]

    useProgress.getState().completeLesson('ru', sharedId, [])
    expect(fresh().courses.ru!.lessonCompletions[sharedId]).toBe(afterSkip! + 1)
    expect(isPersistedShape(fresh())).toBe(true)
  })

  it('reviewVocab bookkeeping survives a full mutation cycle with strange vocab ids', () => {
    const ids = ['', '   ', '\t', 'normal-v']
    for (const id of ids) useProgress.getState().reviewVocab('ru', id, true)

    const items = fresh().courses.ru!.srsItems
    expect(Object.keys(items)).toEqual(expect.arrayContaining(ids))
    for (const id of ids) {
      expect(items[id]).toBeDefined()
      expect(items[id].reps).toBe(2)
    }
  })

  it('earnBadge is no-op for duplicates and preserves previously set timestamps', () => {
    const existing = Date.now() - 1000
    useProgress.getState().data = {
      ...fresh(),
      badges: { ...fresh().badges, 'existing-badge': existing },
    }

    useProgress.getState().earnBadge('existing-badge')
    expect(fresh().badges['existing-badge']).toBe(existing)

    useProgress.getState().earnBadge('new-badge')
    expect(fresh().badges['new-badge']).toBeGreaterThan(existing)
  })

  it('cross-course actions do not leak completions or vocab between stores', () => {
    useProgress.getState().loadForProfile('multi', 'es')
    useProgress.getState().completeLesson('es', 'es-lsn', ['es-v'])
    useProgress.getState().reviewVocab('es', 'es-v', true)

    useProgress.getState().loadForProfile('integration', 'ru')
    useProgress.getState().completeLesson('ru', 'ru-lsn', ['ru-v'])
    useProgress.getState().reviewVocab('ru', 'ru-v', true)

    expect(fresh().courses.es).toBeUndefined()
    expect(Object.keys(fresh().courses.ru!.srsItems)).toEqual(['ru-v'])
  })

  it('badge-earning criteria react to store mutations without explicit earnBadge calls', () => {
    useProgress.getState().addXp(500)
    expect(BADGES.find((b) => b.id === 'xp-500')!.earned(fresh())).toBe(true)
  })

  it('action mutations map to streak-eligible daily log entries for computed badges', () => {
    useProgress.getState().addStudyMinutes(20)
    const log = fresh().dailyLog
    const key = Object.keys(log)[0]
    expect(log[key].minutes).toBe(20)
    expect(computeStreak(log, 10)).toBe(1)
  })

  it('repeated clear+reload of the same profile preserves in-memory mutations performed later', () => {
    useProgress.getState().completeLesson('ru', 'lsn-x', [])
    useProgress.getState().reviewVocab('ru', 'v-x', true)
    useProgress.getState().earnBadge('xp-500')

    useProgress.getState().loadForProfile('integration', 'ru')

    expect(fresh().activeCourse).toBe('ru')
    expect(fresh().courses.ru!.lessonCompletions['lsn-x']).toBe(1)
    expect(fresh().courses.ru!.srsItems['v-x'].reps).toBe(2)
    expect(fresh().badges['xp-500']).toBeGreaterThan(0)
    expect(() => JSON.stringify(fresh())).not.toThrow()
  })

  it('keeps localStorage stub well-formed after repeated mutations', () => {
    useProgress.getState().completeLesson('ru', 'lsn-stale', [])
    useProgress.getState().reviewVocab('ru', 'v-stale', true)
    useProgress.getState().earnBadge('first-lesson')
    useProgress.getState().skipToUnit('ru', 2)
    expect(localStorage.setItem.toString().includes('item => void item')).toBe(false)
    expect(() => JSON.stringify(fresh())).not.toThrow()
  })

  it('stringifies cleanly after many mutations across all four actions', () => {
    useProgress.getState().completeLesson('ru', 'lsn-a', ['v1'])
    useProgress.getState().completeLesson('ru', 'lsn-b', ['v2'])
    useProgress.getState().skipToUnit('ru', 2)
    useProgress.getState().reviewVocab('ru', 'v1', true)
    useProgress.getState().reviewVocab('ru', 'v2', false)
    useProgress.getState().earnBadge('words-50')

    expect(() => JSON.stringify(fresh())).not.toThrow()
    expect(fresh().courses.ru!.srsItems['v1'].reps).toBe(2)
    expect(fresh().courses.ru!.srsItems['v2'].lapses).toBe(1)
  })
})
