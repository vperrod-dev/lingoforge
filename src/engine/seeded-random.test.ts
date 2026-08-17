import { describe, it, expect } from 'vitest'
import { mulberry32, sample, shuffle } from './seeded-random'

describe('shuffle', () => {
  it('returns a permutation of the input: same elements, same length, order may differ', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = shuffle(input, mulberry32(1))
    expect(result).toHaveLength(input.length)
    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    shuffle(input, mulberry32(1))
    expect(input).toEqual([1, 2, 3])
  })
})

describe('sample', () => {
  it('returns n unique elements drawn from the input array', () => {
    const input = ['a', 'b', 'c', 'd', 'e']
    const result = sample(input, 3, mulberry32(42))
    expect(result).toHaveLength(3)
    expect(new Set(result).size).toBe(3)
    for (const item of result) expect(input).toContain(item)
  })
})

describe('mulberry32', () => {
  it('is deterministic for a fixed seed: same seed produces the same output sequence', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const sequenceA = Array.from({ length: 5 }, () => a())
    const sequenceB = Array.from({ length: 5 }, () => b())
    expect(sequenceA).toEqual(sequenceB)
  })

  it('produces a different sequence for a different seed', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })
})
