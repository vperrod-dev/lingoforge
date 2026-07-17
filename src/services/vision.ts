import { generateVision } from './ollama'

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

const LANG_NAMES: Record<string, string> = {
  'ru-RU': 'Russian',
  'es-ES': 'Spanish',
}

export async function identifyObjects(
  imageBase64: string,
  ttsLang: string,
): Promise<DetectedObject[]> {
  const lang = LANG_NAMES[ttsLang] ?? 'Spanish'
  const prompt = `Look at this image. Identify up to 8 distinct objects visible in the photo.

Return JSON: { "objects": [{ "name_en": "English name", "name_target": "name in ${lang}", "pronunciation": "phonetic hint for English speaker", "example": "example sentence in ${lang} using this word", "exampleTranslation": "English translation of example", "bbox": [x1, y1, x2, y2] }] }

Coordinates should be percentages (0-100) of image dimensions.
Rules:
- Only identify clearly visible, distinct objects
- Use common, practical vocabulary
- Example sentences should be simple A2 level`

  const result = await generateVision<Partial<VisionResponse> | null>(prompt, imageBase64)
  const raw = Array.isArray(result?.objects) ? result.objects : []
  const objects = raw.filter(isVisionObject)
  if (objects.length < raw.length) {
    console.warn(`Ollama vision: dropped ${raw.length - objects.length} malformed object(s)`)
  }
  if (raw.length > 0 && objects.length === 0) {
    throw new Error('The AI returned unusable object data — please try again')
  }
  return objects.map((o) => ({
    nameEn: o.name_en,
    nameTarget: o.name_target,
    pronunciation: o.pronunciation,
    example: o.example,
    exampleTranslation: o.exampleTranslation,
    bbox: o.bbox,
  }))
}

export function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}
