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

  const result = await generateVision<VisionResponse>(prompt, imageBase64)
  if (!result.objects) console.warn('Ollama vision response missing "objects" — using empty list')
  return (result.objects ?? []).map((o) => ({
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
