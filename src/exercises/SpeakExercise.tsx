import { useEffect, useState } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import { speak } from '../audio/tts'
import { matchesAny } from '../engine/answer-check'
import { createRecognizer } from '../audio/stt'

interface Props {
  ttsText: string
  ttsLang: string
  accept: string[]
  answer: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

export function SpeakExercise({ ttsText, ttsLang, accept, answer, onAnswer }: Props) {
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    speak(ttsText, ttsLang)
  }, [ttsText, ttsLang])

  const startListening = () => {
    if (submitted || listening) return
    const rec = createRecognizer(ttsLang)
    if (!rec) return
    setListening(true)
    rec.onresult = (e) => {
      const alternatives: string[] = Array.from(e.results[0]).map((r) => r.transcript)
      setHeard(alternatives[0])
      setSubmitted(true)
      onAnswer(alternatives.some((t) => matchesAny(accept, t)), answer)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Say it out loud</h2>
      <button
        type="button"
        aria-label="Replay audio"
        className="clay clay-press mx-auto flex size-20 items-center justify-center bg-primary text-on-primary"
        onClick={() => speak(ttsText, ttsLang)}
      >
        <Volume2 className="size-8" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Record your voice"
        disabled={submitted}
        onClick={startListening}
        className={`clay clay-press mx-auto flex size-24 items-center justify-center ${listening ? 'border-primary bg-primary-soft' : ''}`}
      >
        <Mic className="size-10" aria-hidden />
      </button>
      {heard && <p className="text-center text-fg-muted">Heard: "{heard}"</p>}
    </div>
  )
}
