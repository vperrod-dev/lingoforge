import { useState } from 'react'
import { ScriptKeypad } from '../ui/ScriptKeypad'
import { Volume2, MessageCircle } from 'lucide-react'
import { speak } from '../audio/tts'
import { ClayButton } from '../ui/ClayButton'
import { isCorrectAnswer } from '../engine/answer-check'

interface DialogueLine {
  speaker: 'you' | 'other'
  line: string
  translation: string
}

interface Props {
  lines: DialogueLine[]
  ttsLang: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

export function DialogueExercise({ lines, ttsLang, onAnswer }: Props) {
  const userLines = lines.filter((l) => l.speaker === 'you')
  const [currentBlank, setCurrentBlank] = useState(0)
  const [inputs, setInputs] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const userLineIndices = lines
    .map((l, i) => (l.speaker === 'you' ? i : -1))
    .filter((i) => i >= 0)

  const submit = () => {
    if (submitted) return
    setSubmitted(true)
    let correctCount = 0
    for (let i = 0; i < userLineIndices.length; i++) {
      const idx = userLineIndices[i]
      const given = inputs[idx] ?? ''
      if (isCorrectAnswer(lines[idx].line, given)) correctCount++
    }
    const allCorrect = correctCount === userLineIndices.length
    const correctAnswers = userLines.map((l) => l.line).join(' / ')
    onAnswer(allCorrect, correctAnswers)
  }

  const handleInput = (lineIndex: number, value: string) => {
    setInputs((prev) => ({ ...prev, [lineIndex]: value }))
  }

  const handleKeyDown = (e: React.KeyboardEvent, lineIndex: number) => {
    if (e.key !== 'Enter') return
    const nextBlankIdx = userLineIndices.indexOf(lineIndex)
    if (nextBlankIdx < userLineIndices.length - 1) {
      setCurrentBlank(nextBlankIdx + 1)
    } else {
      submit()
    }
  }

  const allFilled = userLineIndices.every((idx) => (inputs[idx] ?? '').trim().length > 0)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-fg-muted">Complete the dialogue</h2>

      <div className="flex flex-col gap-3">
        {lines.map((line, i) => {
          const isUser = line.speaker === 'you'
          const blankIdx = userLineIndices.indexOf(i)
          return (
            <div
              key={i}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`clay max-w-[80%] p-3 ${
                  isUser ? 'bg-primary/10 border-primary' : 'bg-bg'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <MessageCircle className="size-3.5 text-fg-muted" aria-hidden />
                  <span className="text-xs font-bold text-fg-muted">
                    {isUser ? 'You' : 'Them'}
                  </span>
                  {!isUser && (
                    <button
                      type="button"
                      aria-label="Play line"
                      className="text-primary"
                      onClick={() => speak(line.line, ttsLang)}
                    >
                      <Volume2 className="size-3.5" aria-hidden />
                    </button>
                  )}
                </div>

                {isUser ? (
                  <div>
                    <p className="mb-1 text-xs text-fg-muted">{line.translation}</p>
                    <input
                      autoFocus={blankIdx === currentBlank}
                      value={inputs[i] ?? ''}
                      disabled={submitted}
                      onChange={(e) => handleInput(i, e.target.value)}
                      onFocus={() => setCurrentBlank(blankIdx)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      placeholder="Type your response..."
                      className="clay w-full px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:outline-3 focus-visible:outline-primary"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">{line.line}</p>
                    <p className="text-xs text-fg-muted">{line.translation}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ScriptKeypad
        lang={ttsLang}
        disabled={submitted}
        onInsert={(char) => handleInput(userLineIndices[currentBlank], (inputs[userLineIndices[currentBlank]] ?? '') + char)}
        onBackspace={() => handleInput(userLineIndices[currentBlank], (inputs[userLineIndices[currentBlank]] ?? '').slice(0, -1))}
      />

      <ClayButton variant="primary" disabled={!allFilled || submitted} onClick={submit}>
        Check
      </ClayButton>
    </div>
  )
}
