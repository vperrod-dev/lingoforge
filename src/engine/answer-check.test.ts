import { describe, it, expect } from 'vitest'
import { isCorrectAnswer, matchesAny } from './answer-check'

describe('isCorrectAnswer', () => {
  it('is case-insensitive', () => {
    expect(isCorrectAnswer('Привет', 'привет')).toBe(true)
  })

  it('ignores leading/trailing/extra whitespace', () => {
    expect(isCorrectAnswer('доброе утро', '  доброе   утро ')).toBe(true)
  })

  it('treats ё and е as interchangeable', () => {
    expect(isCorrectAnswer('ещё', 'еще')).toBe(true)
  })

  it('treats ё/е as interchangeable regardless of case', () => {
    expect(isCorrectAnswer('Ёлка', 'елка')).toBe(true)
  })

  it('tolerates missing Spanish accents', () => {
    expect(isCorrectAnswer('está', 'esta')).toBe(true)
  })

  it('tolerates ñ typed as n', () => {
    expect(isCorrectAnswer('mañana', 'manana')).toBe(true)
  })

  it('ignores punctuation including inverted marks', () => {
    expect(isCorrectAnswer('¿Cómo estás?', 'como estas')).toBe(true)
  })

  it('ignores trailing sentence punctuation', () => {
    expect(isCorrectAnswer('Я пью чай.', 'я пью чай')).toBe(true)
  })

  it('ignores commas and dashes inside the sentence', () => {
    expect(isCorrectAnswer('Нет, спасибо — не надо', 'нет спасибо не надо')).toBe(true)
  })

  it('rejects a different word', () => {
    expect(isCorrectAnswer('чай', 'кофе')).toBe(false)
  })

  it('rejects a missing word in a sentence', () => {
    expect(isCorrectAnswer('я пью чай', 'я чай')).toBe(false)
  })
})

describe('matchesAny', () => {
  it('accepts any listed surface form', () => {
    expect(matchesAny(['вода', 'воду'], 'воду')).toBe(true)
  })

  it('accepts a listed form with tolerant normalization applied', () => {
    expect(matchesAny(['El niño', 'los niños'], 'el nino')).toBe(true)
  })

  it('rejects a form that is not listed', () => {
    expect(matchesAny(['вода', 'воду'], 'воды')).toBe(false)
  })

  it('rejects everything for an empty form list', () => {
    expect(matchesAny([], 'вода')).toBe(false)
  })
})
