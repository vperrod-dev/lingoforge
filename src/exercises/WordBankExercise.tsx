import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { speak } from '../audio/tts'
import { ClayButton } from '../ui/ClayButton'
import { isCorrectAnswer } from '../engine/answer-check'

interface Props {
  sentence: string
  translation: string
  answerChips: string[]
  distractorChips: string[]
  ttsLang: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

interface Chip {
  id: number
  word: string
}

export function WordBankExercise({ sentence, translation, answerChips, distractorChips, ttsLang, onAnswer }: Props) {
  const [bank] = useState<Chip[]>(() => {
    const all = [...answerChips, ...distractorChips].map((word, id) => ({ id, word }))
    return all.sort(() => Math.random() - 0.5)
  })

  const [placed, setPlaced] = useState<Chip[]>([])
  const [submitted, setSubmitted] = useState(false)

  const toggle = (chip: Chip, isPlaced: boolean) => {
    if (submitted) return
    setPlaced((p) => {
      if (isPlaced) return p.filter((c) => c.id !== chip.id)
      // guard against double-fire adding the same chip twice in one batch
      return p.some((c) => c.id === chip.id) ? p : [...p, chip]
    })
  }

  const submit = () => {
    if (submitted) return
    setSubmitted(true)
    const given = placed.map((c) => c.word).join(' ')
    onAnswer(isCorrectAnswer(sentence, given), sentence)
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Build the sentence</h2>
      <div className="flex items-center gap-3">
        <p className="font-display text-2xl font-bold">{translation}</p>
        <button
          type="button"
          aria-label="Play sentence audio"
          className="clay clay-press flex size-11 shrink-0 items-center justify-center text-primary"
          onClick={() => speak(sentence, ttsLang)}
        >
          <Volume2 aria-hidden />
        </button>
      </div>

      <div className="clay min-h-16 bg-bg/60 p-3" aria-label="Your answer">
        <div className="flex flex-wrap gap-2">
          {placed.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggle(chip, true)}
              className="clay clay-press bg-primary px-3 py-1.5 text-lg font-semibold text-on-primary"
            >
              {chip.word}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {bank.map((chip) => {
          const used = placed.some((c) => c.id === chip.id)
          return (
            <button
              key={chip.id}
              type="button"
              disabled={used || submitted}
              onClick={() => toggle(chip, false)}
              className={`clay clay-press px-3 py-1.5 text-lg font-semibold ${used ? 'invisible' : ''}`}
            >
              {chip.word}
            </button>
          )
        })}
      </div>

      <ClayButton variant="primary" disabled={placed.length === 0 || submitted} onClick={submit}>
        Check
      </ClayButton>
    </div>
  )
}
