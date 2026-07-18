import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateJSON } from './ollama'
import { generateTopicVocab } from './ai-exercises'

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
