import { useState } from 'react'
import { ClayButton } from '../ui/ClayButton'
import { shuffle } from '../engine/seeded-random'

interface Phrase {
  line: string
  translation: string
}

interface Props {
  phrases: Phrase[]
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

export function PhraseOrderExercise({ phrases, onAnswer }: Props) {
  const [shuffled] = useState(() =>
    shuffle(phrases.map((p, i) => ({ ...p, originalIndex: i }))),
  )

  const [placed, setPlaced] = useState<typeof shuffled>([])
  const [submitted, setSubmitted] = useState(false)

  const remaining = shuffled.filter(
    (s) => !placed.some((p) => p.originalIndex === s.originalIndex),
  )

  const addPhrase = (phrase: (typeof shuffled)[0]) => {
    if (submitted) return
    setPlaced((prev) => [...prev, phrase])
  }

  const removePhrase = (phrase: (typeof shuffled)[0]) => {
    if (submitted) return
    setPlaced((prev) => prev.filter((p) => p.originalIndex !== phrase.originalIndex))
  }

  const submit = () => {
    if (submitted) return
    setSubmitted(true)
    const isCorrect = placed.every((p, i) => p.originalIndex === i)
    const correctAnswer = phrases.map((p) => p.line).join(' → ')
    onAnswer(isCorrect, correctAnswer)
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Put the conversation in order</h2>

      <div className="clay min-h-20 bg-bg/60 p-3" aria-label="Your order">
        <div className="flex flex-col gap-2">
          {placed.map((phrase, i) => (
            <button
              key={phrase.originalIndex}
              type="button"
              onClick={() => removePhrase(phrase)}
              className="clay clay-press flex items-center gap-3 bg-primary/10 p-3 text-left"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold">{phrase.line}</span>
                <span className="block text-xs text-fg-muted">{phrase.translation}</span>
              </span>
            </button>
          ))}
          {placed.length === 0 && (
            <p className="py-4 text-center text-sm text-fg-muted">Tap phrases below in conversation order</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {remaining.map((phrase) => (
          <button
            key={phrase.originalIndex}
            type="button"
            disabled={submitted}
            onClick={() => addPhrase(phrase)}
            className="clay clay-press p-3 text-left"
          >
            <span className="block text-sm font-semibold">{phrase.line}</span>
            <span className="block text-xs text-fg-muted">{phrase.translation}</span>
          </button>
        ))}
      </div>

      <ClayButton
        variant="primary"
        disabled={placed.length !== phrases.length || submitted}
        onClick={submit}
      >
        Check
      </ClayButton>
    </div>
  )
}
