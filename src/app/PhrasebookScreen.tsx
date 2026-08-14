import { useState } from 'react'
import { Plus, Check, Hand, Coffee, LifeBuoy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { courses, phrasebook } from '../content'
import { useProgress } from '../state/progress'
import { GlossText } from '../ui/GlossText'
import { SpeakerButton } from '../ui/SpeakerButton'

const packIcons: Record<string, LucideIcon> = {
  hand: Hand,
  coffee: Coffee,
  'life-buoy': LifeBuoy,
}

export function PhrasebookScreen() {
  const data = useProgress((s) => s.data)
  const { reviewVocab } = useProgress()
  const course = courses[data.activeCourse]
  const packs = phrasebook[course.id] ?? []

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const srsItems = data.courses[course.id]?.srsItems ?? {}

  const handleAdd = (vocabId: string) => {
    reviewVocab(course.id, vocabId, true)
    setAddedIds((prev) => new Set(prev).add(vocabId))
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Phrasebook</h1>
        <p className="text-fg-muted">Survival phrases by situation. Tap a word to hear it, or 🔊 for the whole phrase.</p>
      </header>

      {packs.map((pack) => {
        const Icon = packIcons[pack.icon] ?? Hand
        return (
          <section key={pack.id} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Icon className="size-5 text-primary" aria-hidden /> {pack.title}
            </h2>
            <div className="flex flex-col gap-2">
              {pack.phrases.map((phrase, i) => (
                <div key={i} className="clay flex items-center gap-3 p-3">
                  <SpeakerButton text={phrase.text} lang={course.ttsLang} label="Hear phrase" />
                  <span className="grow">
                    <span className="block font-semibold">
                      <GlossText
                        text={phrase.text}
                        course={course}
                        srsItems={srsItems}
                        addedIds={addedIds}
                        onAdd={handleAdd}
                      />
                    </span>
                    <span className="block text-sm text-fg-muted">{phrase.translation}</span>
                  </span>
                  {phrase.vocabId &&
                    (addedIds.has(phrase.vocabId) ? (
                      <Check className="size-5 shrink-0 text-accent" aria-hidden />
                    ) : (
                      <button
                        type="button"
                        aria-label="Add to Practice"
                        className="clay clay-press flex size-9 shrink-0 items-center justify-center text-primary"
                        onClick={() => handleAdd(phrase.vocabId!)}
                      >
                        <Plus className="size-5" aria-hidden />
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
