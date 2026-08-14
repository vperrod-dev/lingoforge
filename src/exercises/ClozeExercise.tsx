import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { ClayButton } from '../ui/ClayButton'
import { ScriptKeypad } from '../ui/ScriptKeypad'
import { isCorrectAnswer } from '../engine/answer-check'

interface Props {
  tokens: string[]
  blankIndex: number
  translation: string
  answer: string
  /** Chips to pick from. Absent once the learner is typing the answer instead. */
  options?: string[]
  ttsLang: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

export function ClozeExercise({ tokens, blankIndex, translation, answer, options, ttsLang, onAnswer }: Props) {
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const pick = (option: string) => {
    if (submitted) return
    setSubmitted(true)
    setText(option)
    onAnswer(isCorrectAnswer(answer, option), answer)
  }

  const submit = () => {
    if (submitted || !text.trim()) return
    setSubmitted(true)
    onAnswer(isCorrectAnswer(answer, text), answer)
  }

  const hint = () => {
    const next = revealed + 1
    setRevealed(next)
    setText(answer.slice(0, next))
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Fill in the blank</h2>
      <p className="text-fg-muted">{translation}</p>
      <p className="font-display text-2xl font-bold leading-relaxed">
        {tokens.map((token, i) =>
          i === blankIndex && options ? (
            <span
              key={i}
              className="clay mx-1 inline-block min-w-24 px-2 py-1 text-center text-xl font-semibold"
            >
              {text || '\u00a0'}
            </span>
          ) : i === blankIndex ? (
            <input
              key={i}
              autoFocus
              value={text}
              disabled={submitted}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              aria-label="Missing word"
              className="clay mx-1 inline-block w-32 px-2 py-1 text-center text-xl font-semibold focus:outline-none focus-visible:outline-3 focus-visible:outline-primary"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          ) : (
            <span key={i}>{token} </span>
          ),
        )}
      </p>
      {options ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={submitted}
              onClick={() => pick(option)}
              className="clay clay-press min-h-14 px-4 py-3 text-lg font-semibold"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <>
      <ScriptKeypad
        lang={ttsLang}
        disabled={submitted}
        onInsert={(char) => setText((t) => t + char)}
        onBackspace={() => setText((t) => t.slice(0, -1))}
      />
      <div className="flex items-center gap-3">
        <ClayButton
          variant="neutral"
          disabled={submitted || revealed >= answer.length}
          onClick={hint}
        >
          <span className="flex items-center gap-2">
            <Lightbulb className="size-5" aria-hidden /> Hint
          </span>
        </ClayButton>
        <ClayButton
          variant="primary"
          className="grow"
          disabled={!text.trim() || submitted}
          onClick={submit}
        >
          Check
        </ClayButton>
      </div>
        </>
      )}
    </div>
  )
}
