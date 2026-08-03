import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const fixturesDir = path.join('test', 'fixtures', 'progress')
const readFixture = (name: string): string =>
  fs.readFileSync(path.join(fixturesDir, name), 'utf8')

vi.hoisted(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size },
    key: (i: number) => [...store.keys()][i] ?? '',
  } as unknown as Storage)
})

import { isProgressData } from '../../src/state/progress'

describe('isProgressData fixture cases', () => {
  it('accepts valid-full backup', () => {
    expect(isProgressData(JSON.parse(readFixture('valid-full.json')))).toBe(true)
  })

  it('rejects null', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-null.json')))).toBe(false)
  })

  it('rejects array', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-array.json')))).toBe(false)
  })

  it('rejects partial shape missing xp', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-missing-xp.json')))).toBe(false)
  })

  it('rejects invalid activeCourse', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-bad-course.json')))).toBe(false)
  })

  it('rejects null dailyLog entry', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-bad-dailylog-entry.json')))).toBe(false)
  })

  it('rejects non-numeric badge timestamp', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-bad-badge-timestamp.json')))).toBe(false)
  })

  it('rejects course entry missing srsItems', () => {
    expect(isProgressData(JSON.parse(readFixture('invalid-bad-course-shape.json')))).toBe(false)
  })
})
