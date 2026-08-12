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
/** `error` carries the spec's code: not-allowed, no-speech, network, audio-capture… */
export interface SpeechRecognitionErrorEvent {
  error: string
}
export interface SpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
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
  // One utterance per tap: continuous mode holds the phone's mic open until the
  // page is closed, which blocks the next exercise's recognizer from starting.
  recognizer.continuous = false
  recognizer.interimResults = false
  recognizer.maxAlternatives = 3
  return recognizer
}

/** Human-readable cause for a SpeechRecognition error code. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone blocked. Allow mic access for this site in your browser settings, then tap the mic again.'
    case 'audio-capture':
      return 'No microphone found on this device.'
    case 'network':
      return 'Speech recognition needs a connection and could not reach the service.'
    case 'no-speech':
      return "Didn't hear anything. Tap the mic, then speak straight away."
    case 'aborted':
      return 'Recording stopped. Tap the mic to try again.'
    default:
      return 'Speech recognition failed on this device. You can skip this one.'
  }
}
