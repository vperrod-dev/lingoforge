import { describe, it, expect } from 'vitest'
import { splitSentences, splitWords } from './sentences'

describe('splitSentences', () => {
  it('splits a passage where its MP3s were generated — on sentence ends', () => {
    expect(splitSentences('Привет! Я хочу чай.')).toEqual(['Привет!', 'Я хочу чай.'])
  })

  it('treats a paragraph break as a sentence break', () => {
    expect(splitSentences('Кот хочет молоко\n\nСпасибо')).toEqual(['Кот хочет молоко', 'Спасибо'])
  })
})

describe('splitWords', () => {
  it('drops the punctuation glued to a tapped word', () => {
    expect(splitWords('Привет! Я хочу чай.')).toEqual(['Привет', 'Я', 'хочу', 'чай'])
  })
})
