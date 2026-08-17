import { useEffect, useMemo, useState } from 'react'
import { Delete } from 'lucide-react'
import { speak } from '../audio/tts'
import { SpeakerButton } from '../ui/SpeakerButton'
import { ClayButton } from '../ui/ClayButton'
import { isCorrectAnswer } from '../engine/answer-check'

interface Props {
  prompt: string
  answer: string
  tiles: string[]
  /** When set, the word is spoken — a listening + spelling drill */
  ttsText?: string
  /** Missing-letter mode: the word with null for each blank; tiles fill only the blanks */
  shown?: (string | null)[]
  ttsLang: string
  onAnswer: (correct: boolean, correctAnswer: string) => void
}

interface Tile {
  id: number
  letter: string
}

export function SpellExercise({ prompt, answer, tiles, ttsText, shown, ttsLang, onAnswer }: Props) {
  const bank = useMemo<Tile[]>(() => tiles.map((letter, id) => ({ id, letter })), [tiles])

  const [placed, setPlaced] = useState<Tile[]>([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (ttsText) speak(ttsText, ttsLang)
  }, [ttsText, ttsLang])

  const blankCount = shown ? shown.filter((ch) => ch === null).length : Infinity

  const add = (tile: Tile) => {
    if (submitted) return
    setPlaced((p) => (p.some((t) => t.id === tile.id) || p.length >= blankCount ? p : [...p, tile]))
  }

  const backspace = () => {
    if (submitted) return
    setPlaced((p) => p.slice(0, -1))
  }

  const submit = () => {
    if (submitted) return
    setSubmitted(true)
    const letters = placed.map((t) => t.letter)
    const given = shown ? shown.map((ch) => ch ?? letters.shift() ?? '').join('') : letters.join('')
    onAnswer(isCorrectAnswer(answer, given), answer)
  }

  // Missing-letter mode: fixed letters inline, blanks fill left to right
  let nextBlank = 0
  const wordSlots = shown?.map((ch, i) => {
    if (ch !== null) {
      return (
        <span key={i} className="min-w-6 text-center text-2xl font-bold">
          {ch}
        </span>
      )
    }
    const tile = placed[nextBlank++]
    return tile ? (
      <button
        key={i}
        type="button"
        onClick={() => setPlaced((p) => p.filter((t) => t.id !== tile.id))}
        className="clay clay-press min-w-9 bg-primary px-2 py-1 text-center text-xl font-bold text-on-primary"
      >
        {tile.letter}
      </button>
    ) : (
      <span key={i} aria-label="missing letter" className="inline-block h-9 min-w-9 rounded-lg border-2 border-dashed border-primary/60" />
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-fg-muted">{shown ? 'Complete the word' : 'Spell the word'}</h2>

      <div className="flex items-center gap-3">
        <p className="font-display text-2xl font-bold">{ttsText && !shown ? '🔊 Listen and spell' : prompt}</p>
        {ttsText && (
          <SpeakerButton text={ttsText} lang={ttsLang} label="Replay audio" revealOnSilence />
        )}
      </div>

      {/* Assembled letters */}
      <div className="clay flex min-h-16 items-center gap-1 bg-bg/60 p-3" aria-label="Your spelling">
        <div className="flex grow flex-wrap items-center gap-1">
          {wordSlots ?? placed.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => setPlaced((p) => p.filter((t) => t.id !== tile.id))}
              className="clay clay-press min-w-10 bg-primary px-3 py-1.5 text-center text-xl font-bold text-on-primary"
            >
              {tile.letter}
            </button>
          ))}
        </div>
        {placed.length > 0 && !submitted && (
          <button
            type="button"
            aria-label="Delete last letter"
            onClick={backspace}
            className="clay clay-press flex size-10 shrink-0 items-center justify-center text-fg-muted"
          >
            <Delete aria-hidden />
          </button>
        )}
      </div>

      {/* Letter bank */}
      <div className="flex flex-wrap gap-2">
        {bank.map((tile) => {
          const used = placed.some((t) => t.id === tile.id)
          return (
            <button
              key={tile.id}
              type="button"
              disabled={used || submitted}
              onClick={() => add(tile)}
              className={`clay clay-press min-w-12 px-4 py-2 text-center text-xl font-bold ${used ? 'invisible' : ''}`}
            >
              {tile.letter}
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
