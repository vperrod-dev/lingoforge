/**
 * Speech-to-text wrapper around the Web Speech API (SpeechRecognition).
 * Browser support is inconsistent (notably absent in Firefox) — always
 * feature-detect with isSpeechSupported() before relying on this, and
 * before generating any exercise that requires it.
 */

// The Web Speech API is absent from TypeScript's DOM lib; declare the minimal
// surface this wrapper (and its callers) actually touch.
export interface SpeechRecognitionAlternative {
  transcript: string
}
export type SpeechRecognitionResult = ArrayLike<SpeechRecognitionAlternative>
export type SpeechRecognitionResultList = ArrayLike<SpeechRecognitionResult>
export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}
export interface SpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
}
interface SpeechRecognitionWindow {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as SpeechRecognitionWindow
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/** Returns a configured recognizer, or null if unsupported. */
export function createRecognizer(lang: string): SpeechRecognition | null {
  const w = window as unknown as SpeechRecognitionWindow
  const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!SpeechRecognitionCtor) return null
  const recognizer = new SpeechRecognitionCtor()
  recognizer.lang = lang
  recognizer.interimResults = false
  recognizer.maxAlternatives = 3
  return recognizer
}
