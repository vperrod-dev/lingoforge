import { describe, it, expect, vi, afterEach } from 'vitest'
import { generate, generateJSON, generateVision, isOllamaOnline, resetStatus } from './ollama'

function stubFetchResponse(response: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ response, done: true }),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetStatus()
})

describe('generate', () => {
  it('returns the response field from the Ollama payload', async () => {
    stubFetchResponse('hello')
    await expect(generate('prompt')).resolves.toBe('hello')
  })

  it('throws with status and body on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })),
    )
    await expect(generate('prompt')).rejects.toThrow('Ollama 500: boom')
  })
})

describe('generateJSON', () => {
  it('parses a clean JSON response', async () => {
    stubFetchResponse('{"a": 1}')
    await expect(generateJSON('prompt')).resolves.toEqual({ a: 1 })
  })

  it('recovers JSON wrapped in prose via brace extraction', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubFetchResponse('Sure! Here is the JSON:\n```json\n{"vocab": []}\n```\nHope that helps.')
    await expect(generateJSON('prompt')).resolves.toEqual({ vocab: [] })
  })

  it('throws when the response contains no JSON object at all', async () => {
    stubFetchResponse('I cannot help with that.')
    await expect(generateJSON('prompt')).rejects.toThrow('Failed to parse Ollama JSON')
  })
})

describe('generateVision', () => {
  it('recovers JSON wrapped in prose via brace extraction', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubFetchResponse('The image shows: {"objects": []} done')
    await expect(generateVision('prompt', 'base64img')).resolves.toEqual({ objects: [] })
  })

  it('throws when the response contains no JSON object at all', async () => {
    stubFetchResponse('just prose')
    await expect(generateVision('prompt', 'base64img')).rejects.toThrow('Failed to parse vision JSON')
  })
})

describe('isOllamaOnline', () => {
  it('reports offline when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    await expect(isOllamaOnline()).resolves.toBe(false)
  })

  it('reports online when /api/tags responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    await expect(isOllamaOnline()).resolves.toBe(true)
  })
})
