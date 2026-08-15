import { generateVision } from './ollama'
import { langName } from './lang-names'

export interface DetectedObject {
  nameEn: string
  nameTarget: string
  pronunciation: string
  example: string
  exampleTranslation: string
  bbox: [number, number, number, number]
}

interface VisionResponse {
  objects: {
    name_en: string
    name_target: string
    pronunciation: string
    example: string
    exampleTranslation: string
    bbox: [number, number, number, number]
  }[]
}

function isVisionObject(v: unknown): v is VisionResponse['objects'][number] {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.name_en === 'string' &&
    typeof o.name_target === 'string' &&
    typeof o.pronunciation === 'string' &&
    typeof o.example === 'string' &&
    typeof o.exampleTranslation === 'string' &&
    Array.isArray(o.bbox) &&
    o.bbox.length === 4 &&
    o.bbox.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

// The model's response feeds straight into layout percentages and on-screen text —
// clamp/cap it instead of trusting an adversarial or malformed reply.
const MAX_TEXT_LENGTH = 300
const capText = (s: string) => (s.length > MAX_TEXT_LENGTH ? s.slice(0, MAX_TEXT_LENGTH) : s)
const clampPercent = (n: number) => Math.min(100, Math.max(0, n))
// A swapped pair (x2 < x1) renders as a negative CSS width, hiding the box.
const clampBox = ([x1, y1, x2, y2]: [number, number, number, number]): [number, number, number, number] => {
  const [left, right] = [clampPercent(x1), clampPercent(x2)].sort((a, b) => a - b)
  const [top, bottom] = [clampPercent(y1), clampPercent(y2)].sort((a, b) => a - b)
  return [left, top, right, bottom]
}

export async function identifyObjects(
  imageBase64: string,
  ttsLang: string,
  signal?: AbortSignal,
): Promise<DetectedObject[]> {
  const lang = langName(ttsLang)
  const prompt = `Look at this image. Identify up to 8 distinct objects visible in the photo.

Return JSON: { "objects": [{ "name_en": "English name", "name_target": "name in ${lang}", "pronunciation": "phonetic hint for English speaker", "example": "example sentence in ${lang} using this word", "exampleTranslation": "English translation of example", "bbox": [x1, y1, x2, y2] }] }

Coordinates should be percentages (0-100) of image dimensions.
Rules:
- Only identify clearly visible, distinct objects
- Use common, practical vocabulary
- Example sentences should be simple A2 level`

  const result = await generateVision<Partial<VisionResponse> | null>(prompt, imageBase64, undefined, signal)
  const raw = Array.isArray(result?.objects) ? result.objects : []
  const objects = raw.filter(isVisionObject)
  if (objects.length < raw.length) {
    console.warn(`Ollama vision: dropped ${raw.length - objects.length} malformed object(s)`)
  }
  if (raw.length > 0 && objects.length === 0) {
    throw new Error('The AI returned unusable object data — please try again')
  }
  return objects.map((o) => ({
    nameEn: capText(o.name_en),
    nameTarget: capText(o.name_target),
    pronunciation: capText(o.pronunciation),
    example: capText(o.example),
    exampleTranslation: capText(o.exampleTranslation),
    bbox: clampBox(o.bbox),
  }))
}

// Vision model only needs enough resolution to name objects, not the native
// capture size (up to 1280x960) — downscale before encoding to shrink the
// payload sent to Ollama.
const MAX_CAPTURE_DIMENSION = 640

export function captureFrame(video: HTMLVideoElement): string {
  const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
  const width = Math.round(video.videoWidth * scale)
  const height = Math.round(video.videoHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}
