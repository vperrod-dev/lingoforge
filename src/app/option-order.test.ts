import { describe, expect, it } from 'vitest'
import { readings } from '../content/readings'
import { optionOrder } from './option-order'

describe('optionOrder', () => {
  it('returns every index exactly once', () => {
    expect([...optionOrder('ru-dlg-cafe:0', 4)].sort()).toEqual([0, 1, 2, 3])
  })

  it('returns the same order for the same seed', () => {
    expect(optionOrder('ru-dlg-cafe:0', 4)).toEqual(optionOrder('ru-dlg-cafe:0', 4))
  })

  it('spreads the correct answer across button positions in the authored readings', () => {
    const positions = Object.values(readings)
      .flat()
      .flatMap((text) =>
        (text.questions ?? []).map((q, qi) =>
          optionOrder(`${text.id}:${qi}`, q.options.length).indexOf(q.correctIndex),
        ),
      )

    expect(new Set(positions).size).toBeGreaterThan(2)
  })
})
