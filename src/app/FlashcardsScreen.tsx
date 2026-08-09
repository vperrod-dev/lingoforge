import { useMemo, useState } from 'react'
import { Layers, Volume2, ArrowLeft, RotateCcw, Check, X } from 'lucide-react'
import { courses } from '../content'
import type { Course, Unit, VocabItem } from '../content/types'
import { useProgress } from '../state/progress'
import { ClayButton } from '../ui/ClayButton'
import { playFanfare } from '../audio/sfx'

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.85
  speechSynthesis.speak(u)
}

function unitVocab(course: Course, unit: Unit): VocabItem[] {
  const ids = new Set(unit.skills.flatMap((s) => s.lessons.flatMap((l) => l.vocabIds)))
  return [...ids].map((id) => course.vocab.find((v) => v.id === id)).filter((v): v is VocabItem => Boolean(v))
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function FlashcardsScreen() {
  const data = useProgress((s) => s.data)
  const { reviewVocab, addXp, addStudyMinutes } = useProgress()
  const course = courses[data.activeCourse]

  const [unitId, setUnitId] = useState<string | null>(null)
  const [deck, setDeck] = useState<VocabItem[]>([])
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [done, setDone] = useState(false)

  const decks = useMemo(
    () => course.units.map((u) => ({ unit: u, cards: unitVocab(course, u) })).filter((d) => d.cards.length > 0),
    [course],
  )

  function startDeck(unit: Unit) {
    setUnitId(unit.id)
    setDeck(shuffle(unitVocab(course, unit)))
    setPos(0)
    setFlipped(false)
    setKnown(0)
    setDone(false)
  }

  function exitDeck() {
    setUnitId(null)
    setDone(false)
  }

  function rate(correct: boolean) {
    const card = deck[pos]
    if (card) reviewVocab(course.id, card.id, correct)
    if (correct) setKnown((k) => k + 1)
    if (pos + 1 >= deck.length) {
      const total = deck.length
      const remembered = known + (correct ? 1 : 0)
      addXp(remembered * 2)
      addStudyMinutes(Math.max(1, Math.round(total * 0.2)))
      playFanfare()
      setDone(true)
    } else {
      setPos((p) => p + 1)
      setFlipped(false)
    }
  }

  // ---- Deck picker ----
  if (!unitId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Layers className="size-14 text-primary" aria-hidden />
          <h1 className="font-display text-3xl font-bold">Flashcards {course.flag}</h1>
          <p className="max-w-md text-fg-muted">
            Flip through a topic, tap the speaker to hear it, and rate yourself. What you know
            comes back for review right before you forget it.
          </p>
        </div>
        {decks.map(({ unit, cards }) => (
          <button
            key={unit.id}
            type="button"
            onClick={() => startDeck(unit)}
            className="clay clay-press flex items-center gap-4 p-4 text-left"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-indigo-700 bg-primary text-on-primary">
              <Layers aria-hidden />
            </span>
            <span className="grow">
              <span className="block font-display text-lg font-bold">{unit.title}</span>
              <span className="text-sm text-fg-muted">{unit.description}</span>
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {cards.length}
            </span>
          </button>
        ))}
      </div>
    )
  }

  // ---- Deck finished ----
  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <h2 className="font-display text-3xl font-bold text-primary">
          Deck done! {known}/{deck.length} known
        </h2>
        <p className="max-w-sm text-fg-muted">
          Those words are now in your review queue. Come back to Practice to lock them in.
        </p>
        <div className="flex gap-3">
          <ClayButton variant="primary" onClick={() => startDeck(course.units.find((u) => u.id === unitId)!)}>
            <RotateCcw className="mr-1 inline size-4" aria-hidden /> Again
          </ClayButton>
          <ClayButton variant="neutral" onClick={exitDeck}>
            All topics
          </ClayButton>
        </div>
      </div>
    )
  }

  // ---- Studying a card ----
  const card = deck[pos]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={exitDeck}
          className="flex items-center gap-1 font-bold text-fg-muted"
          aria-label="Back to all topics"
        >
          <ArrowLeft className="size-5" aria-hidden /> Topics
        </button>
        <span className="font-display font-bold text-fg-muted" aria-live="polite">
          {pos + 1} / {deck.length}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-border-soft">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${(pos / deck.length) * 100}%` }}
        />
      </div>

      {/* Flip card */}
      <div style={{ perspective: '1600px' }} className="w-full">
        <div
          role="button"
          tabIndex={0}
          aria-label="Flashcard, activate to flip"
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              setFlipped((f) => !f)
            }
          }}
          className="relative mx-auto h-80 w-full max-w-md cursor-pointer select-none"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.2,0.7,0.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'none',
          }}
        >
          {/* Front — English prompt */}
          <div
            className="clay absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-fg-muted">English</span>
            <span className="font-display text-4xl font-bold">{card.translation}</span>
            <span className="text-xs uppercase tracking-widest text-fg-muted">tap to reveal</span>
          </div>

          {/* Back — Russian detail */}
          <div
            className="clay absolute inset-0 flex flex-col justify-center gap-2 p-5"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-3xl font-bold text-ru">{card.lemma}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  speak(card.lemma, course.ttsLang)
                }}
                className="clay clay-press flex size-11 shrink-0 items-center justify-center"
                aria-label={`Hear ${card.lemma}`}
              >
                <Volume2 className="size-5 text-primary" aria-hidden />
              </button>
            </div>
            {card.hint && <span className="text-lg italic text-fg-muted">{card.hint}</span>}
            <span className="font-display text-xl font-bold">{card.translation}</span>
            {card.literal && (
              <span className="text-sm text-ru">
                <span className="font-bold uppercase tracking-wide">Literally:</span> {card.literal}
              </span>
            )}
            {card.note && (
              <span className="text-sm text-fg-muted">
                <span aria-hidden className="text-ru">* </span>
                {card.note}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="mx-auto flex w-full max-w-md gap-3">
        <ClayButton variant="danger" className="grow" onClick={() => rate(false)}>
          <X className="mr-1 inline size-5" aria-hidden /> Again
        </ClayButton>
        <ClayButton variant="accent" className="grow" onClick={() => rate(true)}>
          <Check className="mr-1 inline size-5" aria-hidden /> Know it
        </ClayButton>
      </div>
    </div>
  )
}
