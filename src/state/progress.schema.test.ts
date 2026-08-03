import { describe, it, expect } from 'vitest'
import { progressDataSchema, dayLogSchema, srsItemSchema, courseProgressSchema } from './progress.schema'

describe('progress schema accepts valid objects', () => {
  it('dayLog', () => {
    expect(dayLogSchema.safeParse({ minutes: 5, xp: 10, lessons: 1 }).success).toBe(true)
  })

  it('srsItem', () => {
    expect(
      srsItemSchema.safeParse({
        vocabId: 'v1',
        stability: 1.5,
        difficulty: 0.2,
        dueAt: 1_755_000_000_000,
        reps: 1,
        lapses: 0,
      }).success,
    ).toBe(true)
  })

  it('courseProgress', () => {
    expect(
      courseProgressSchema.safeParse({
        lessonCompletions: { l1: 2 },
        srsItems: { v1: { vocabId: 'v1', stability: 1, difficulty: 0.1, dueAt: 0, reps: 1, lapses: 0 } },
      }).success,
    ).toBe(true)
  })

  it('full progressData', () => {
    expect(
      progressDataSchema.safeParse({
        xp: 42,
        activeCourse: 'ru',
        dailyGoalMinutes: 10,
        dailyLog: { '2026-07-01': { minutes: 5, xp: 20, lessons: 1 } },
        badges: { 'first-lesson': 1751328000000 },
        courses: {
          ru: {
            lessonCompletions: { l1: 1 },
            srsItems: {
              v1: { vocabId: 'v1', stability: 1, difficulty: 0.2, dueAt: 0, reps: 1, lapses: 0 },
            },
          },
        },
      }).success,
    ).toBe(true)
  })
})

describe('progress schema rejects invalid objects', () => {
  it('rejects a non-object', () => {
    expect(progressDataSchema.safeParse(null).success).toBe(false)
  })

  it('rejects an unknown activeCourse', () => {
    expect(progressDataSchema.safeParse({ xp: 0, activeCourse: 'klingon' }).success).toBe(false)
  })

  it('rejects a dayLog missing a field', () => {
    expect(dayLogSchema.safeParse({ minutes: 1, lessons: 1 }).success).toBe(false)
  })

  it('rejects a negative reps count', () => {
    expect(
      srsItemSchema.safeParse({ vocabId: 'v1', stability: 1, difficulty: 0.1, dueAt: 0, reps: -1, lapses: 0 }).success,
    ).toBe(false)
  })

  it('rejects non-integer completion counts', () => {
    expect(courseProgressSchema.safeParse({ lessonCompletions: { l1: 1.5 }, srsItems: {} }).success).toBe(false)
  })
})
