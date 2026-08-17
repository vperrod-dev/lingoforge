import { describe, it, expect } from 'vitest'
import { courses, getLesson } from '../content'
import {
  errorCorrectionExercise,
  generateLessonExercises,
  letterPool,
  reorderDictationExercise,
  spellFromWord,
} from './exercise-gen'

const ru = courses.ru
const lesson = getLesson(ru, 'u2s1l1') // Drinks: 5 short words, sentences, a pattern

describe('spellFromWord', () => {
  it('includes every answer letter as a tile and lowercases the answer', () => {
    const ex = spellFromWord('Чай', 'tea', letterPool(ru))
    expect(ex.kind).toBe('spell')
    if (ex.kind !== 'spell') return
    expect(ex.answer).toBe('чай')
    for (const ch of 'чай') expect(ex.tiles).toContain(ch)
  })

  it('blanks only the requested letters and shows the rest', () => {
    const ex = spellFromWord('спасибо', 'thank you', letterPool(ru), { blanks: 2 })
    if (ex.kind !== 'spell') throw new Error('not spell')
    expect(ex.shown?.filter((ch) => ch === null).length).toBe(2)
    expect(ex.shown?.filter((ch) => ch !== null).join('').length).toBe(5)
    expect(ex.tiles.length).toBe(5) // 2 blanks + 3 distractors
  })

  it('never blanks every letter of a word', () => {
    const ex = spellFromWord('да', 'yes', letterPool(ru), { blanks: 2 })
    if (ex.kind !== 'spell') throw new Error('not spell')
    expect(ex.shown).toBeUndefined()
  })

  it('marks audio variants with ttsText', () => {
    const ex = spellFromWord('чай', 'tea', letterPool(ru), { audio: true })
    expect(ex.kind === 'spell' && ex.ttsText).toBe('чай')
  })
})

describe('errorCorrectionExercise', () => {
  // Real vocab word with alternative forms so the swap is guaranteed to differ.
  const vocab = ru.vocab.find((v) => (v.forms ?? []).length > 0)!
  const sentence = {
    text: `${vocab.lemma} тут?`,
    translation: 'x here?',
    vocabIds: [vocab.id],
  }

  it('points errorIndex at the token that was swapped and keeps the rest intact', () => {
    for (let i = 0; i < 20; i++) {
      const ex = errorCorrectionExercise(ru, sentence)
      if (!ex || ex.kind !== 'errorCorrection') throw new Error('wrong kind')
      const original = sentence.text.split(/\s+/)
      expect(ex.tokens).toHaveLength(original.length)
      expect(ex.errorIndex).toBe(0) // only token 0 matches the sentence vocab
      expect(ex.correctToken).toBe(original[0])
      expect(ex.tokens[0]).not.toBe(original[0])
      expect(ex.tokens.slice(1)).toEqual(original.slice(1))
    }
  })

  it('preserves trailing punctuation on the swapped token', () => {
    const punct = { text: `Где ${vocab.lemma}?`, translation: 'where?', vocabIds: [vocab.id] }
    for (let i = 0; i < 20; i++) {
      const ex = errorCorrectionExercise(ru, punct)
      if (!ex || ex.kind !== 'errorCorrection') throw new Error('wrong kind')
      expect(ex.errorIndex).toBe(1)
      expect(ex.tokens[1].endsWith('?')).toBe(true)
    }
  })

  it('never swaps a punctuation-only token when the sentence has no recognizable vocab', () => {
    // The fallback used to pick a raw random index, so it could land on "—" and
    // build an exercise whose "wrong word" was an empty core.
    const noVocab = { text: 'zzz — qqq !', translation: 'nonsense', vocabIds: [] }
    for (let i = 0; i < 30; i++) {
      const ex = errorCorrectionExercise(ru, noVocab)
      if (!ex || ex.kind !== 'errorCorrection') throw new Error('wrong kind')
      expect(ex.correctToken).toMatch(/\p{L}/u)
    }
  })

  it('never swaps in the literal string "undefined" when the vocab word has no alternate forms and the course is too small for a distractor lemma', () => {
    // Single-vocab, single-form "course" — the exact conditions that used to leave
    // wrongCore undefined: no altForms, and distractorLemmas has nothing to exclude to.
    const soleVocab = { id: 'v1', lemma: 'hola', translation: 'hi', forms: [] }
    const tinyCourse = { ...ru, vocab: [soleVocab] } as typeof ru
    const tinySentence = { text: `${soleVocab.lemma} tú?`, translation: 'hi you?', vocabIds: [soleVocab.id] }
    for (let i = 0; i < 20; i++) {
      const ex = errorCorrectionExercise(tinyCourse, tinySentence)
      expect(ex).toBeNull()
    }
  })
})

describe('reorderDictationExercise', () => {
  const [a, b] = ru.vocab.filter((v) => !v.lemma.includes(' '))
  const sentence = { text: `${a.lemma} ${b.lemma}!`, translation: 'ab', vocabIds: [a.id, b.id] }

  it('answer chips reproduce the sentence without punctuation, in order', () => {
    const ex = reorderDictationExercise(ru, sentence)
    if (ex.kind !== 'reorderDictation') throw new Error('wrong kind')
    expect(ex.answerChips).toEqual([a.lemma, b.lemma])
    expect(ex.sentence).toBe(sentence.text)
  })

  it('distractor chips never duplicate an answer chip', () => {
    for (let i = 0; i < 20; i++) {
      const ex = reorderDictationExercise(ru, sentence)
      if (ex.kind !== 'reorderDictation') throw new Error('wrong kind')
      const answers = new Set(ex.answerChips.map((c) => c.toLowerCase()))
      for (const d of ex.distractorChips) expect(answers.has(d.toLowerCase())).toBe(false)
    }
  })

  it('adds at most 2 distractors', () => {
    const ex = reorderDictationExercise(ru, sentence)
    if (ex.kind !== 'reorderDictation') throw new Error('wrong kind')
    expect(ex.distractorChips.length).toBeLessThanOrEqual(2)
  })
})

describe('generateLessonExercises balance', () => {
  it('never lets multiple-choice dominate (≤ 4 of ≤ 14)', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (let i = 0; i < 25; i++) {
      const ex = generateLessonExercises(ru, lesson, 0, 'letters')
      expect(ex.length).toBeLessThanOrEqual(14)
      expect(ex.filter((e) => e.kind === 'choice').length).toBeLessThanOrEqual(4)
      expect(ex.filter((e) => e.kind === 'listening').length).toBeLessThanOrEqual(2)
    }
  })

  it('offers spelling activities for short words', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    const kinds = new Set<string>()
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 0, 'tiles')) kinds.add(e.kind)
    }
    expect(kinds.has('spell')).toBe(true)
  })

  it('mixes many activity types (not just select)', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    const kinds = new Set<string>()
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 0, 'letters')) kinds.add(e.kind)
    }
    // production + listening variety beyond multiple-choice
    expect(kinds.has('spell')).toBe(true)
    expect(kinds.size).toBeGreaterThanOrEqual(6)
  })
})

describe('difficulty ramp', () => {
  // What a lesson asks the learner to produce follows their stage (production-stage.ts):
  // letters = complete a shown word, tiles = build it, typing = write it. Replaying a
  // lesson never unlocks more than the stage allows.
  const KEYBOARD_KINDS = ['typing', 'translate', 'dictation']

  it('gives a learner still on the alphabet no text input, however often they replay', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (const crown of [0, 1, 2, 3, 5]) {
      for (let i = 0; i < 20; i++) {
        const kinds = generateLessonExercises(ru, lesson, crown, 'letters').map((e) => e.kind)
        expect(kinds.filter((k) => KEYBOARD_KINDS.includes(k))).toEqual([])
      }
    }
  })

  it('never asks a learner on the alphabet for a whole word: every spell shows letters, blanks ≤ 2', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 0, 'letters')) {
        if (e.kind !== 'spell') continue
        expect(e.shown?.some((ch) => ch !== null)).toBe(true)
        expect(e.shown?.filter((ch) => ch === null).length).toBeLessThanOrEqual(2)
      }
    }
  })

  it('gives no text input at the tiles stage either', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (let i = 0; i < 30; i++) {
      const kinds = generateLessonExercises(ru, lesson, 5, 'tiles').map((e) => e.kind)
      expect(kinds.filter((k) => KEYBOARD_KINDS.includes(k))).toEqual([])
    }
  })

  it('lets a first-time learner pick the missing word instead of spelling it', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 0, 'letters')) {
        if (e.kind === 'cloze') expect(e.options?.length).toBeGreaterThan(1)
      }
    }
  })

  it('drops the cloze chips once the learner is typing', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 2, 'typing')) {
        if (e.kind === 'cloze') expect(e.options).toBeUndefined()
      }
    }
  })

  it('brings sentence typing in at the typing stage', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    const kinds = new Set<string>()
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 2, 'typing')) kinds.add(e.kind)
    }
    expect(kinds.has('translate') && kinds.has('dictation')).toBe(true)
  })

  it('types short words from scratch only on the fourth pass', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    const kinds = new Set<string>()
    for (let i = 0; i < 30; i++) {
      for (const e of generateLessonExercises(ru, lesson, 3, 'typing')) kinds.add(e.kind)
    }
    expect(kinds.has('typing')).toBe(true)
  })

  it('shows a first-time learner every recognition exercise before any production one', () => {
    if (!lesson) throw new Error('fixture lesson missing')
    for (let i = 0; i < 30; i++) {
      const kinds = generateLessonExercises(ru, lesson, 0, 'letters').map((e) => e.kind)
      const lastChoice = kinds.lastIndexOf('choice')
      const firstProduction = kinds.findIndex((k) => k === 'spell' || k === 'cloze' || k === 'wordBank')
      if (lastChoice === -1 || firstProduction === -1) continue
      expect(lastChoice).toBeLessThan(firstProduction)
    }
  })
})
