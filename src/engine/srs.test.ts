import { describe, it, expect } from 'vitest'

import { newSrsItem, review, dueItems, type SrsItem } from './srs'

const NOW = 1_700_000_000_000
const DAY_MS = 24 * 60 * 60 * 1000

const item = (over: Partial<SrsItem> = {}): SrsItem => ({
  ...newSrsItem('v1', NOW),
  ...over,
})

describe('newSrsItem', () => {
  it('is due one day after first exposure', () => {
    expect(newSrsItem('v1', NOW).dueAt).toBe(NOW + DAY_MS)
  })

  it('starts with one rep', () => {
    expect(newSrsItem('v1', NOW).reps).toBe(1)
  })

  it('starts with zero lapses', () => {
    expect(newSrsItem('v1', NOW).lapses).toBe(0)
  })

  it('keeps the vocab id', () => {
    expect(newSrsItem('abc', NOW).vocabId).toBe('abc')
  })
})

describe('review — correct answer', () => {
  it('grows stability', () => {
    const before = item()
    expect(review(before, true, NOW).stability).toBeGreaterThan(before.stability)
  })

  it('grows stability more for easier items', () => {
    const easy = review(item({ difficulty: 0.1 }), true, NOW)
    const hard = review(item({ difficulty: 0.9 }), true, NOW)
    expect(easy.stability).toBeGreaterThan(hard.stability)
  })

  it('schedules the next review stability-days out', () => {
    const after = review(item(), true, NOW)
    expect(after.dueAt).toBe(NOW + after.stability * DAY_MS)
  })

  it('eases difficulty down', () => {
    expect(review(item({ difficulty: 0.3 }), true, NOW).difficulty).toBeCloseTo(0.25)
  })

  it('clamps difficulty at zero', () => {
    expect(review(item({ difficulty: 0.02 }), true, NOW).difficulty).toBe(0)
  })

  it('increments reps', () => {
    expect(review(item(), true, NOW).reps).toBe(2)
  })

  it('does not count a lapse', () => {
    expect(review(item(), true, NOW).lapses).toBe(0)
  })
})

describe('review — wrong answer (lapse)', () => {
  it('resets stability down', () => {
    const before = item({ stability: 10 })
    expect(review(before, false, NOW).stability).toBeCloseTo(3)
  })

  it('never drops stability below the six-hour floor', () => {
    expect(review(item({ stability: 0.5 }), false, NOW).stability).toBe(0.25)
  })

  it('schedules the next review from the reduced stability', () => {
    const after = review(item({ stability: 10 }), false, NOW)
    expect(after.dueAt).toBe(NOW + after.stability * DAY_MS)
  })

  it('bumps difficulty up', () => {
    expect(review(item({ difficulty: 0.3 }), false, NOW).difficulty).toBeCloseTo(0.45)
  })

  it('clamps difficulty at one', () => {
    expect(review(item({ difficulty: 0.95 }), false, NOW).difficulty).toBe(1)
  })

  it('increments lapses', () => {
    expect(review(item({ lapses: 2 }), false, NOW).lapses).toBe(3)
  })

  it('still increments reps', () => {
    expect(review(item(), false, NOW).reps).toBe(2)
  })
})

describe('dueItems', () => {
  it('excludes items not yet due', () => {
    const future = item({ dueAt: NOW + 1 })
    expect(dueItems([future], NOW)).toEqual([])
  })

  it('includes an item due exactly now', () => {
    const due = item({ dueAt: NOW })
    expect(dueItems([due], NOW)).toEqual([due])
  })

  it('sorts most-overdue first', () => {
    const a = item({ vocabId: 'a', dueAt: NOW - 1 })
    const b = item({ vocabId: 'b', dueAt: NOW - DAY_MS })
    expect(dueItems([a, b], NOW).map((i) => i.vocabId)).toEqual(['b', 'a'])
  })
})
