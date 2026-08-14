import { useState } from 'react'
import { SpeakerButton } from '../ui/SpeakerButton'

interface Props {
  prompt: string
  ttsText?: string
  ttsLang: string
  options: string[]
  correctIndex: number
  title: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

export function ChoiceExercise({ prompt, ttsText, ttsLang, options, correctIndex, title, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null)

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    onAnswer(i === correctIndex, options[correctIndex])
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">{title}</h2>
      <div className="flex items-center gap-3">
        <p className="font-display text-3xl font-bold">{prompt}</p>
        {ttsText && (
          <SpeakerButton text={ttsText} lang={ttsLang} />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => {
          let state = ''
          if (picked !== null && i === correctIndex) state = 'border-accent bg-accent-soft'
          else if (picked === i) state = 'border-danger bg-danger-soft'
          return (
            <button
              key={`${i}-${option}`}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(i)}
              className={`clay clay-press min-h-14 px-4 py-3 text-left text-lg font-semibold ${state}`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
