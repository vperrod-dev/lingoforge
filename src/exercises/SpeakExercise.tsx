import { useEffect, useRef, useState } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import { speak, stopSpeaking } from '../audio/tts'
import { matchesAny } from '../engine/answer-check'
import { createRecognizer, isSpeechSupported, speechErrorMessage } from '../audio/stt'
import type { SpeechRecognition } from '../audio/stt'
import { ClayButton } from '../ui/ClayButton'

/** Mobile recognizers sometimes never fire onend; don't leave the mic spinning. */
const LISTEN_TIMEOUT_MS = 12_000

interface Props {
  ttsText: string
  ttsLang: string
  /** Transliteration of `ttsText`, when the course has one */
  hint?: string
  accept: string[]
  answer: string
  onAnswer: (correct: boolean, correctAnswer: string, opts?: { skipped?: boolean }) => void
}

export function SpeakExercise({ ttsText, ttsLang, hint, accept, answer, onAnswer }: Props) {
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const recognizer = useRef<SpeechRecognition | null>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supported = isSpeechSupported()

  useEffect(() => {
    speak(ttsText, ttsLang)
  }, [ttsText, ttsLang])

  // Leaving the exercise must release the mic, or the next one can't start its own.
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current)
      recognizer.current?.abort()
    },
    [],
  )

  const stopListening = () => {
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = null
    setListening(false)
  }

  const startListening = () => {
    if (submitted || listening) return
    setProblem(null)
    setHeard(null)
    // The mic would otherwise record our own playback and score it as the learner.
    stopSpeaking()
    const rec = createRecognizer(ttsLang)
    if (!rec) {
      setProblem('This browser has no speech recognition. Chrome or Safari support it — or skip this one.')
      return
    }
    recognizer.current = rec
    rec.onresult = (e) => {
      const alternatives: string[] = Array.from(e.results[0]).map((r) => r.transcript)
      stopListening()
      setHeard(alternatives[0])
      setSubmitted(true)
      onAnswer(alternatives.some((t) => matchesAny(accept, t)), answer)
    }
    rec.onerror = (e) => {
      stopListening()
      setProblem(speechErrorMessage(e.error))
    }
    rec.onend = () => stopListening()
    try {
      rec.start()
    } catch {
      // Chrome throws InvalidStateError when a previous session is still winding down.
      setProblem('The mic is still busy from the last try. Give it a second and tap again.')
      return
    }
    setListening(true)
    timeout.current = setTimeout(() => {
      recognizer.current?.abort()
      stopListening()
      setProblem("Didn't hear anything. Tap the mic, then speak straight away.")
    }, LISTEN_TIMEOUT_MS)
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Say it out loud</h2>

      {/* Shown, not just spoken: phones block audio until you tap something, and a
          silent prompt with no text leaves nothing to say. */}
      <div className="flex items-center justify-center gap-3">
        <p lang={ttsLang} className="font-display text-3xl font-bold">
          {ttsText}
        </p>
        <button
          type="button"
          aria-label="Replay audio"
          className="clay clay-press flex size-12 shrink-0 items-center justify-center bg-primary text-on-primary"
          onClick={() => speak(ttsText, ttsLang)}
        >
          <Volume2 className="size-6" aria-hidden />
        </button>
      </div>
      {hint && <p className="text-center text-fg-muted">say it like: {hint}</p>}

      {supported ? (
        <button
          type="button"
          aria-label={listening ? 'Listening — speak now' : 'Record your voice'}
          disabled={submitted}
          onClick={startListening}
          className={`clay clay-press mx-auto flex size-24 items-center justify-center ${listening ? 'animate-pulse border-primary bg-primary-soft' : ''}`}
        >
          <Mic className="size-10" aria-hidden />
        </button>
      ) : (
        <p className="clay bg-amber-50 p-3 text-center" role="status">
          This browser can't listen to you — speech recognition is missing. Say it out loud anyway,
          then skip on.
        </p>
      )}

      {listening && <p className="text-center text-fg-muted">Listening…</p>}
      {heard && <p className="text-center text-fg-muted">Heard: "{heard}"</p>}
      {problem && (
        <p className="clay bg-amber-50 p-3 text-center" role="status">
          {problem}
        </p>
      )}

      {!submitted && (
        <ClayButton
          variant="neutral"
          className="mx-auto"
          onClick={() => onAnswer(false, answer, { skipped: true })}
        >
          Can't speak now — skip
        </ClayButton>
      )}
    </div>
  )
}
