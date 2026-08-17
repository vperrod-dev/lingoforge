import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateJSON } from './ollama'
import { generateScenario, scenarioToExercises, type ScenarioData } from './scenario-gen'
import type { ExerciseInstance } from '../engine/exercise-gen'

type Cloze = Extract<ExerciseInstance, { kind: 'cloze' }>
type WithCorrect = Extract<ExerciseInstance, { correctIndex: number }>

vi.mock('./ollama', () => ({ generateJSON: vi.fn() }))
const mockGenerateJSON = vi.mocked(generateJSON)

const validVocab = { word: 'café', translation: 'coffee', pronunciation: 'kah-FEH' }
const validPhrase = { phrase: 'Un café, por favor', translation: 'A coffee, please', usage: 'ordering' }
const validLine = { speaker: 'you', line: 'Hola', translation: 'Hello' }

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('generateScenario', () => {
  it('returns the valid sections of a well-formed response', async () => {
    mockGenerateJSON.mockResolvedValue({
      title: 'At the café',
      culturalTip: 'Tipping is optional.',
      vocab: [validVocab],
      phrases: [validPhrase],
      dialogue: [validLine],
    })
    const result = await generateScenario('ordering coffee', 'es-ES')
    expect(result).toEqual({
      title: 'At the café',
      culturalTip: 'Tipping is optional.',
      vocab: [validVocab],
      phrases: [validPhrase],
      dialogue: [validLine],
    })
  })

  it('caps over-long dialogue lines so they cannot flood the UI', async () => {
    mockGenerateJSON.mockResolvedValue({
      dialogue: [{ ...validLine, line: 'x'.repeat(1000) }],
    })
    const result = await generateScenario('ordering coffee', 'es-ES')
    expect(result.dialogue[0].line).toHaveLength(300)
  })

  it('drops dialogue lines with an invalid speaker', async () => {
    mockGenerateJSON.mockResolvedValue({
      vocab: [validVocab],
      dialogue: [validLine, { speaker: 'narrator', line: 'Hm', translation: 'Hm' }],
    })
    const result = await generateScenario('ordering coffee', 'es-ES')
    expect(result.dialogue).toEqual([validLine])
  })

  it('falls back to the situation as title when title is missing', async () => {
    mockGenerateJSON.mockResolvedValue({ vocab: [validVocab] })
    const result = await generateScenario('ordering coffee', 'es-ES')
    expect(result.title).toBe('ordering coffee')
  })

  it('throws when every section is empty or malformed', async () => {
    mockGenerateJSON.mockResolvedValue({ vocab: [{ word: 1 }], phrases: 'nope', dialogue: null })
    await expect(generateScenario('ordering coffee', 'es-ES')).rejects.toThrow('unusable scenario')
  })
})

describe('scenarioToExercises', () => {
  it('keeps the correct answer among the options for every choice and listening exercise', () => {
    const scenario: ScenarioData = {
      title: 't',
      culturalTip: '',
      vocab: ['café/coffee', 'té/tea', 'agua/water', 'leche/milk'].map((s) => {
        const [word, translation] = s.split('/')
        return { word, translation, pronunciation: '' }
      }),
      phrases: ['Un café/A coffee', 'Un té/A tea', 'Solo agua/Just water', 'Con leche/With milk'].map((s) => {
        const [phrase, translation] = s.split('/')
        return { phrase, translation, usage: '' }
      }),
      dialogue: [
        { speaker: 'you', line: 'Hola buenos días', translation: 'Hello good morning' },
        { speaker: 'other', line: 'Buenos días', translation: 'Good morning' },
        { speaker: 'you', line: 'Un café por favor', translation: 'A coffee please' },
        { speaker: 'other', line: 'Claro que sí', translation: 'Of course' },
      ],
    }
    const indexes = scenarioToExercises(scenario, 'es-ES')
      .filter((e) => e.kind === 'choice' || e.kind === 'listening')
      .map((e) => (e as WithCorrect).correctIndex)
    expect(indexes).not.toContain(-1)
  })

  it('produces a dialogue cloze whose blank is one of the line tokens', () => {
    const scenario: ScenarioData = {
      title: 't',
      culturalTip: '',
      vocab: [],
      phrases: [],
      dialogue: [{ speaker: 'you', line: 'Un café por favor', translation: 'A coffee please' }],
    }
    const cloze = scenarioToExercises(scenario, 'es-ES').find((e): e is Cloze => e.kind === 'cloze')
    expect(cloze?.tokens).toContain(cloze?.answer)
  })

  it('skips cloze for single-word user lines', () => {
    const scenario: ScenarioData = {
      title: 't',
      culturalTip: '',
      vocab: [],
      phrases: [],
      dialogue: [{ speaker: 'you', line: 'Hola', translation: 'Hello' }],
    }
    const clozes = scenarioToExercises(scenario, 'es-ES').filter((e) => e.kind === 'cloze')
    expect(clozes).toEqual([])
  })
})
