// Local-first by default, but overridable at build time (npm run build) for LAN
// devices / self-hosted servers that can't reach localhost — see vite.config.ts,
// which templates the same URL into index.html's CSP connect-src.
const BASE_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'

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

// Greedy /\{[\s\S]*\}/ grabs the wrong span when prose around the JSON has
// stray braces; instead try each '{' and return the first balanced, parseable span.
function extractJSON(raw: string): string | null {
  for (let start = raw.indexOf('{'); start !== -1; start = raw.indexOf('{', start + 1)) {
    let depth = 0
    let inString = false
    for (let i = start; i < raw.length; i++) {
      const c = raw[i]
      if (inString) {
        if (c === '\\') i++
        else if (c === '"') inString = false
      } else if (c === '"') inString = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) {
        const candidate = raw.slice(start, i + 1)
        try {
          JSON.parse(candidate)
          return candidate
        } catch {
          break
        }
      }
    }
  }
  return null
}

export async function generateJSON<T>(prompt: string, system?: string): Promise<T> {
  const raw = await generate(prompt, system)
  try {
    return JSON.parse(raw) as T
  } catch {
    const extracted = extractJSON(raw)
    if (extracted) {
      console.warn(`Ollama returned malformed JSON, recovered via brace-extraction fallback: ${raw.slice(0, 200)}`)
      return JSON.parse(extracted) as T
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
    const extracted = extractJSON(raw)
    if (extracted) {
      console.warn(`Ollama vision returned malformed JSON, recovered via brace-extraction fallback: ${raw.slice(0, 200)}`)
      return JSON.parse(extracted) as T
    }
    throw new Error(`Failed to parse vision JSON: ${raw.slice(0, 200)}`)
  }
}
