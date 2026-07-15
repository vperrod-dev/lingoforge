import { describe, it, expect } from 'vitest'
import { BADGES } from './badges'
import type { ProgressData } from './progress'

const emptyData = (over: Partial<ProgressData> = {}): ProgressData => ({
  xp: 0,
  activeCourse: 'ru',
  dailyGoalMinutes: 10,
  dailyLog: {},
  badges: {},
  courses: {},
  ...over,
})

const course = (lessonCompletions: Record<string, number> = {}, srsItems: Record<string, unknown> = {}) => ({
  lessonCompletions,
  srsItems: srsItems as ProgressData['courses']['ru'] extends infer C
    ? C extends { srsItems: infer S }
      ? S
      : never
    : never,
})

const badge = (id: string) => BADGES.find((b) => b.id === id)!

// streak badges evaluate against the real clock — build logs relative to today
const dayLog = (daysAgo: number[]): ProgressData['dailyLog'] => {
  const out: ProgressData['dailyLog'] = {}
  for (const ago of daysAgo) {
    const d = new Date()
    d.setDate(d.getDate() - ago)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out[key] = { minutes: 10, xp: 0, lessons: 0 }
  }
  return out
}

describe('BADGES', () => {
  it('has unique badge ids', () => {
    const ids = BADGES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('first-lesson', () => {
  it('is not earned with no lessons', () => {
    expect(badge('first-lesson').earned(emptyData())).toBe(false)
  })
  it('is earned once any lesson is completed', () => {
    expect(badge('first-lesson').earned(emptyData({ courses: { ru: course({ 'l1': 1 }) } }))).toBe(true)
  })
})

describe('streak-3', () => {
  it('is not earned on a 2-day streak', () => {
    expect(badge('streak-3').earned(emptyData({ dailyLog: dayLog([0, 1]) }))).toBe(false)
  })
  it('is earned on a 3-day streak', () => {
    expect(badge('streak-3').earned(emptyData({ dailyLog: dayLog([0, 1, 2]) }))).toBe(true)
  })
})

describe('streak-7', () => {
  it('is earned at exactly 7 consecutive days', () => {
    expect(badge('streak-7').earned(emptyData({ dailyLog: dayLog([0, 1, 2, 3, 4, 5, 6]) }))).toBe(true)
  })
  it('is not earned at 6 consecutive days', () => {
    expect(badge('streak-7').earned(emptyData({ dailyLog: dayLog([0, 1, 2, 3, 4, 5]) }))).toBe(false)
  })
})

describe('words-50 / words-100', () => {
  it('words-50 is not earned at 49 words', () => {
    const srs: Record<string, unknown> = {}
    for (let i = 0; i < 49; i++) srs[`w${i}`] = {}
    expect(badge('words-50').earned(emptyData({ courses: { ru: course({}, srs) } }))).toBe(false)
  })
  it('words-50 is earned at >= 50 words', () => {
    const srs: Record<string, unknown> = {}
    for (let i = 0; i < 50; i++) srs[`w${i}`] = {}
    expect(badge('words-50').earned(emptyData({ courses: { ru: course({}, srs) } }))).toBe(true)
  })
  it('words-100 is earned at >= 100 words', () => {
    const srs: Record<string, unknown> = {}
    for (let i = 0; i < 100; i++) srs[`w${i}`] = {}
    expect(badge('words-100').earned(emptyData({ courses: { ru: course({}, srs) } }))).toBe(true)
  })
  it('counts words across multiple courses', () => {
    const srsA: Record<string, unknown> = {}
    const srsB: Record<string, unknown> = {}
    for (let i = 0; i < 30; i++) srsA[`a${i}`] = {}
    for (let i = 0; i < 25; i++) srsB[`b${i}`] = {}
    expect(badge('words-50').earned(emptyData({ courses: { ru: course({}, srsA), es: course({}, srsB) } }))).toBe(true)
  })
})

describe('alphabet-master', () => {
  it('is only earned once explicitly awarded', () => {
    expect(badge('alphabet-master').earned(emptyData())).toBe(false)
    expect(badge('alphabet-master').earned(emptyData({ badges: { 'alphabet-master': 1234 } }))).toBe(true)
  })
})

describe('xp-500 / xp-1000', () => {
  it('xp-500 is not earned below 500', () => {
    expect(badge('xp-500').earned(emptyData({ xp: 499 }))).toBe(false)
  })
  it('xp-500 is earned at exactly 500', () => {
    expect(badge('xp-500').earned(emptyData({ xp: 500 }))).toBe(true)
  })
  it('xp-1000 is earned at >= 1000', () => {
    expect(badge('xp-1000').earned(emptyData({ xp: 1000 }))).toBe(true)
  })
})
