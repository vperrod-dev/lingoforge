const BASE_URL = 'http://localhost:11434'

interface GenerateRequest {
  model: string
  prompt: string
  system?: string
  images?: string[]
  stream: false
  format?: 'json'
  options?: { temperature?: number; num_predict?: number }
}

interface GenerateResponse {
  response: string
  done: boolean
}

let _status: 'unknown' | 'online' | 'offline' = 'unknown'
let _lastCheck = 0

export async function isOllamaOnline(): Promise<boolean> {
  if (Date.now() - _lastCheck < 10_000 && _status !== 'unknown') return _status === 'online'
  try {
    const r = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) })
    _status = r.ok ? 'online' : 'offline'
  } catch {
    _status = 'offline'
  }
  _lastCheck = Date.now()
  return _status === 'online'
}

export function resetStatus() {
  _status = 'unknown'
  _lastCheck = 0
}

export async function generate(prompt: string, system?: string): Promise<string> {
  const body: GenerateRequest = {
    model: 'gemma2:9b',
    prompt,
    system,
    stream: false,
    format: 'json',
    options: { temperature: 0.7 },
  }
  const r = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`)
  const data: GenerateResponse = await r.json()
  return data.response
}

export async function generateJSON<T>(prompt: string, system?: string): Promise<T> {
  const raw = await generate(prompt, system)
  try {
    return JSON.parse(raw) as T
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      console.warn(`Ollama returned malformed JSON, recovered via brace-extraction fallback: ${raw.slice(0, 200)}`)
      return JSON.parse(match[0]) as T
    }
    throw new Error(`Failed to parse Ollama JSON: ${raw.slice(0, 200)}`)
  }
}

export async function generateVision<T>(prompt: string, imageBase64: string, system?: string): Promise<T> {
  const body: GenerateRequest = {
    model: 'llava:13b',
    prompt,
    system,
    images: [imageBase64],
    stream: false,
    format: 'json',
    options: { temperature: 0.5 },
  }
  const r = await fetch(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  })
  if (!r.ok) throw new Error(`Ollama vision ${r.status}: ${await r.text()}`)
  const data: GenerateResponse = await r.json()
  const raw = data.response
  try {
    return JSON.parse(raw) as T
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      console.warn(`Ollama vision returned malformed JSON, recovered via brace-extraction fallback: ${raw.slice(0, 200)}`)
      return JSON.parse(match[0]) as T
    }
    throw new Error(`Failed to parse vision JSON: ${raw.slice(0, 200)}`)
  }
}
