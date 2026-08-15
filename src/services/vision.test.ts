// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateVision } from './ollama'
import { identifyObjects, captureFrame } from './vision'

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

  it('clamps bbox coordinates outside the 0-100 percent range', async () => {
    mockGenerateVision.mockResolvedValue({
      objects: [{ ...validObject, bbox: [-10, 40, 150, 200] }],
    })
    const [result] = await identifyObjects('img', 'es-ES')
    expect(result.bbox).toEqual([0, 40, 100, 100])
  })

  it('orders swapped bbox pairs so the box never gets a negative width or height', async () => {
    mockGenerateVision.mockResolvedValue({
      objects: [{ ...validObject, bbox: [90, 10, 20, 90] }],
    })
    const [result] = await identifyObjects('img', 'es-ES')
    expect(result.bbox).toEqual([20, 10, 90, 90])
  })

  it('caps overly long text fields instead of passing them through to the UI', async () => {
    const huge = 'x'.repeat(1000)
    mockGenerateVision.mockResolvedValue({
      objects: [{ ...validObject, example: huge }],
    })
    const [result] = await identifyObjects('img', 'es-ES')
    expect(result.example).toHaveLength(300)
  })
})

describe('captureFrame', () => {
  let canvas: HTMLCanvasElement | undefined
  let drawImage: ReturnType<typeof vi.fn>

  beforeEach(() => {
    drawImage = vi.fn()
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreateElement(tag)
      if (tag === 'canvas') canvas = el as HTMLCanvasElement
      return el
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA')
  })

  const fakeVideo = (videoWidth: number, videoHeight: number) =>
    ({ videoWidth, videoHeight }) as HTMLVideoElement

  it('downscales a landscape frame to the max dimension, preserving aspect ratio', () => {
    captureFrame(fakeVideo(1280, 960))
    expect(canvas!.width).toBe(640)
    expect(canvas!.height).toBe(480)
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 640, 480)
  })

  it('downscales a portrait frame the same way', () => {
    captureFrame(fakeVideo(960, 1280))
    expect(canvas!.width).toBe(480)
    expect(canvas!.height).toBe(640)
  })

  it('does not upscale a frame already under the max dimension', () => {
    captureFrame(fakeVideo(320, 240))
    expect(canvas!.width).toBe(320)
    expect(canvas!.height).toBe(240)
  })

  it('returns the base64 payload without the data URL prefix', () => {
    expect(captureFrame(fakeVideo(320, 240))).toBe('AAA')
  })
})
