import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { ClayButton } from '../ui/ClayButton'
import { ScriptKeypad } from '../ui/ScriptKeypad'
import { matchesAny } from '../engine/answer-check'

interface Props {
  prompt: string
  accept: string[]
  answer: string
  ttsLang: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

export function TypingExercise({ prompt, accept, answer, ttsLang, onAnswer }: Props) {
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const submit = () => {
    if (submitted || !text.trim()) return
    setSubmitted(true)
    onAnswer(matchesAny(accept, text), answer)
  }

  const hint = () => {
    const next = revealed + 1
    setRevealed(next)
    setText(answer.slice(0, next))
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Type the translation</h2>
      <p className="font-display text-3xl font-bold">{prompt}</p>
      <label className="flex flex-col gap-2">
        <span className="sr-only">Your translation</span>
        <input
          autoFocus
          value={text}
          disabled={submitted}
          lang={ttsLang}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="clay min-h-14 px-4 text-xl font-semibold focus:outline-none focus-visible:outline-3 focus-visible:outline-primary"
          placeholder="Type here…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>
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
    </div>
  )
}
