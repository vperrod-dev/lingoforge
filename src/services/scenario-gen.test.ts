import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateJSON } from './ollama'
import { generateScenario } from './scenario-gen'

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
