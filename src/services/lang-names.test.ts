import { describe, expect, it } from 'vitest'
import { langName } from './lang-names'

describe('langName', () => {
  it('maps a known ttsLang to its language name', () => {
    expect(langName('ru-RU')).toBe('Russian')
  })

  it('throws on an unmapped ttsLang instead of silently guessing', () => {
    expect(() => langName('fr-FR')).toThrow('fr-FR')
  })
})
