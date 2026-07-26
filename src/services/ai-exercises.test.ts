import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateJSON } from './ollama'
import { generateTopicVocab, topicVocabToExercises } from './ai-exercises'
import type { ExerciseInstance } from '../engine/exercise-gen'

type Cloze = Extract<ExerciseInstance, { kind: 'cloze' }>
type WithCorrect = Extract<ExerciseInstance, { correctIndex: number }>

vi.mock('./ollama', () => ({ generateJSON: vi.fn() }))
const mockGenerateJSON = vi.mocked(generateJSON)

const validItem = {
  word: 'gato',
  translation: 'cat',
  pronunciation: 'GAH-toh',
  example: 'El gato duerme.',
  exampleTranslation: 'The cat sleeps.',
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('generateTopicVocab', () => {
  it('returns well-formed vocab items', async () => {
    mockGenerateJSON.mockResolvedValue({ vocab: [validItem] })
    await expect(generateTopicVocab('animals', 'es-ES')).resolves.toEqual([validItem])
  })

  it('drops malformed items and keeps the valid ones', async () => {
    mockGenerateJSON.mockResolvedValue({ vocab: [validItem, { word: 'perro' }, null] })
    await expect(generateTopicVocab('animals', 'es-ES')).resolves.toEqual([validItem])
  })

  it('throws when every item is malformed', async () => {
    mockGenerateJSON.mockResolvedValue({ vocab: [{ word: 42 }] })
    await expect(generateTopicVocab('animals', 'es-ES')).rejects.toThrow('unusable vocabulary')
  })

  it('throws when the response has no vocab array', async () => {
    mockGenerateJSON.mockResolvedValue(null)
    await expect(generateTopicVocab('animals', 'es-ES')).rejects.toThrow('unusable vocabulary')
  })
})

describe('topicVocabToExercises', () => {
  it('blanks the vocab word in the cloze even when it carries trailing punctuation', () => {
    const item = { ...validItem, word: 'gato', example: 'Veo un gato.', exampleTranslation: 'I see a cat.' }
    const cloze = topicVocabToExercises([item]).find((e): e is Cloze => e.kind === 'cloze')
    expect(cloze && cloze.tokens[cloze.blankIndex]).toBe('gato.')
  })

  it('keeps the correct answer among the options for every choice and listening exercise', () => {
    const vocab = ['gato/cat', 'perro/dog', 'pez/fish', 'ave/bird'].map((s) => {
      const [word, translation] = s.split('/')
      return { word, translation, pronunciation: '', example: `Un ${word}.`, exampleTranslation: `A ${translation}.` }
    })
    const indexes = topicVocabToExercises(vocab)
      .filter((e) => e.kind === 'choice' || e.kind === 'listening')
      .map((e) => (e as WithCorrect).correctIndex)
    expect(indexes).not.toContain(-1)
  })

  it('returns no exercises for empty input', () => {
    expect(topicVocabToExercises([])).toEqual([])
  })
})
