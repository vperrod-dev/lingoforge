import { useState } from 'react'
import { AudioPrompt } from '../ui/AudioPrompt'
import { ClayButton } from '../ui/ClayButton'
import { isCorrectAnswer } from '../engine/answer-check'
import { shuffle } from '../engine/seeded-random'

interface Props {
  sentence: string
  ttsLang: string
  answerChips: string[]
  distractorChips: string[]
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

interface Chip {
  id: number
  word: string
}

export function ReorderDictationExercise({ sentence, ttsLang, answerChips, distractorChips, onAnswer }: Props) {
  const [bank] = useState<Chip[]>(() => {
    const all = [...answerChips, ...distractorChips].map((word, id) => ({ id, word }))
    return shuffle(all)
  })

  const [placed, setPlaced] = useState<Chip[]>([])
  const [submitted, setSubmitted] = useState(false)

  const toggle = (chip: Chip, isPlaced: boolean) => {
    if (submitted) return
    setPlaced((p) => {
      if (isPlaced) return p.filter((c) => c.id !== chip.id)
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
      <h2 className="text-lg font-bold text-fg-muted">Listen, then build the sentence</h2>
      <AudioPrompt text={sentence} lang={ttsLang} />

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
