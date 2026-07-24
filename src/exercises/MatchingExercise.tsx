import { useState } from 'react'

interface Pair {
  left: string
  right: string
  vocabId: string
}

interface Props {
  pairs: Pair[]
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

/** Match game: all pairs must be matched; mistakes allowed but tracked. */
export function MatchingExercise({ pairs, onAnswer }: Props) {
  const [rights] = useState(() => [...pairs].sort(() => Math.random() - 0.5))
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [shake, setShake] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)

  const tryMatch = (rightVocabId: string) => {
    if (!selectedLeft) return
    if (selectedLeft === rightVocabId) {
      const next = new Set(matched).add(rightVocabId)
      setMatched(next)
      setSelectedLeft(null)
      if (next.size === pairs.length) {
        onAnswer(mistakes === 0, `all matched, but with ${mistakes} miss${mistakes === 1 ? '' : 'es'}`)
      }
    } else {
      setMistakes((m) => m + 1)
      setShake(rightVocabId)
      setTimeout(() => setShake(null), 300)
      setSelectedLeft(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">Match the pairs</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {pairs.map((p) => (
            <button
              key={p.vocabId}
              type="button"
              disabled={matched.has(p.vocabId)}
              onClick={() => setSelectedLeft(p.vocabId)}
              className={`clay clay-press min-h-12 px-3 py-2 text-lg font-semibold ${
                matched.has(p.vocabId)
                  ? 'border-accent bg-accent-soft opacity-60'
                  : selectedLeft === p.vocabId
                    ? 'border-primary bg-primary text-on-primary'
                    : ''
              }`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rights.map((p) => (
            <button
              key={p.vocabId}
              type="button"
              disabled={matched.has(p.vocabId) || !selectedLeft}
              onClick={() => tryMatch(p.vocabId)}
              className={`clay clay-press min-h-12 px-3 py-2 text-lg font-semibold ${
                matched.has(p.vocabId) ? 'border-accent bg-accent-soft opacity-60' : ''
              } ${shake === p.vocabId ? 'border-danger bg-danger-soft' : ''}`}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
