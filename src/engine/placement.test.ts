import { describe, expect, it } from 'vitest'
import { courses } from '../content'
import { generatePlacementQuiz, getUnitQuestionCounts, scorePlacement } from './placement'

describe('scorePlacement', () => {
  it('returns the unit count when every unit passes', () => {
    const unitBoundaries = [3, 3, 3]
    const answers = [true, true, true, true, true, true, true, true, true]
    expect(scorePlacement(answers, unitBoundaries)).toBe(3)
  })

  it('returns 0 when the first unit fails', () => {
    const unitBoundaries = [3, 3, 3]
    const answers = [false, false, false, true, true, true, true, true, true]
    expect(scorePlacement(answers, unitBoundaries)).toBe(0)
  })

  it('returns the index of the first failed unit when results are mixed', () => {
    const unitBoundaries = [3, 3, 3]
    const answers = [true, true, true, false, false, true, true, true, true]
    expect(scorePlacement(answers, unitBoundaries)).toBe(1)
  })

  it('treats exactly 70% correct as a pass', () => {
    const unitBoundaries = [10]
    const answers = [...Array(7).fill(true), ...Array(3).fill(false)]
    expect(scorePlacement(answers, unitBoundaries)).toBe(1)
  })

  it('treats just under 70% as a fail', () => {
    const unitBoundaries = [10]
    const answers = [...Array(6).fill(true), ...Array(4).fill(false)]
    expect(scorePlacement(answers, unitBoundaries)).toBe(0)
  })

  it('stops at a zero-question unit (cannot pass what was never asked)', () => {
    expect(scorePlacement([true, true, true], [3, 0, 3])).toBe(1)
  })

  it('returns 0 for an empty quiz', () => {
    expect(scorePlacement([], [])).toBe(0)
  })

  it('lands exactly on the resume unit used by skipToUnit', () => {
    // 2 units passed → resume index 2 → skipToUnit marks units 0..1 complete
    const unitBoundaries = [3, 3, 3]
    const answers = [true, true, true, true, true, true, false, false, false]
    expect(scorePlacement(answers, unitBoundaries)).toBe(2)
  })
})

describe('getUnitQuestionCounts', () => {
  it('returns one count per unlocked unit, capped at 3', () => {
    const counts = getUnitQuestionCounts(courses.ru)
    expect(counts).toHaveLength(courses.ru.units.filter((u) => !u.locked).length)
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(0)
    for (const c of counts) expect(c).toBeLessThanOrEqual(3)
  })
})

describe('generatePlacementQuiz', () => {
  it('produces exactly the questions promised by the unit counts', () => {
    const expected = getUnitQuestionCounts(courses.ru).reduce((a, b) => a + b, 0)
    expect(generatePlacementQuiz(courses.ru)).toHaveLength(expected)
  })

  it('produces answerable multiple-choice questions', () => {
    for (const q of generatePlacementQuiz(courses.ru)) {
      expect(q.kind).toBe('choice')
      if (q.kind !== 'choice') continue
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThan(q.options.length)
    }
  })
})
