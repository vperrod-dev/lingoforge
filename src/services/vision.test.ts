import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateVision } from './ollama'
import { identifyObjects } from './vision'

vi.mock('./ollama', () => ({ generateVision: vi.fn() }))
const mockGenerateVision = vi.mocked(generateVision)

const validObject = {
  name_en: 'cup',
  name_target: 'taza',
  pronunciation: 'TAH-sah',
  example: 'La taza es azul.',
  exampleTranslation: 'The cup is blue.',
  bbox: [10, 20, 30, 40],
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('identifyObjects', () => {
  it('maps snake_case response fields to camelCase objects', async () => {
    mockGenerateVision.mockResolvedValue({ objects: [validObject] })
    await expect(identifyObjects('img', 'es-ES')).resolves.toEqual([
      {
        nameEn: 'cup',
        nameTarget: 'taza',
        pronunciation: 'TAH-sah',
        example: 'La taza es azul.',
        exampleTranslation: 'The cup is blue.',
        bbox: [10, 20, 30, 40],
      },
    ])
  })

  it('drops objects with a malformed bbox', async () => {
    mockGenerateVision.mockResolvedValue({
      objects: [validObject, { ...validObject, bbox: [10, 20, 30] }, { ...validObject, bbox: [1, 2, 3, 'x'] }],
    })
    const result = await identifyObjects('img', 'es-ES')
    expect(result).toHaveLength(1)
  })

  it('returns an empty list when the model finds no objects', async () => {
    mockGenerateVision.mockResolvedValue({ objects: [] })
    await expect(identifyObjects('img', 'es-ES')).resolves.toEqual([])
  })

  it('throws when objects were returned but all are malformed', async () => {
    mockGenerateVision.mockResolvedValue({ objects: [{ name_en: 42 }] })
    await expect(identifyObjects('img', 'es-ES')).rejects.toThrow('unusable object data')
  })
})
