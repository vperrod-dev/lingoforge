import { useMemo, useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import type { Course } from '../content/types'
import type { SrsItem } from '../engine/srs'
import { wordStatus } from '../engine/word-status'
import { speak } from '../audio/tts'
import { SpeakerButton } from './SpeakerButton'

interface Lookup {
  vocabId?: string
  translation?: string
}

/** What to send to TTS: the tapped surface without the punctuation glued to it —
 *  'чай.' has no MP3, 'чай' does. */
function spokenForm(surface: string): string {
  return surface.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '')
}

function normalize(s: string): string {
  // lowercase, fold Russian ё→е, drop everything that isn't a letter/mark
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{M}]/gu, '')
}

interface Props {
  text: string
  course: Course
  glossary?: Record<string, string>
  srsItems: Record<string, SrsItem>
  addedIds: Set<string>
  onAdd: (vocabId: string) => void
}

/**
 * Readlang/LingQ-style tappable text: tap any word to hear it, see its translation,
 * and add it to Practice. Words known from the course are coloured by SRS status.
 */
export function GlossText({ text, course, glossary, srsItems, addedIds, onAdd }: Props) {
  const [selected, setSelected] = useState<{ surface: string; info: Lookup } | null>(null)

  // surface form (normalized) → vocab match
  const vocabIndex = useMemo(() => {
    const map = new Map<string, { vocabId: string; translation: string }>()
    for (const v of course.vocab) {
      for (const form of [v.lemma, ...(v.forms ?? [])]) {
        const key = normalize(form)
        if (key && !map.has(key)) map.set(key, { vocabId: v.id, translation: v.translation })
      }
    }
    return map
  }, [course])

  const glossIndex = useMemo(() => {
    const map = new Map<string, string>()
    for (const [k, val] of Object.entries(glossary ?? {})) map.set(normalize(k), val)
    return map
  }, [glossary])

  const lookup = (surface: string): Lookup => {
    const key = normalize(surface)
    const v = vocabIndex.get(key)
    if (v) return { vocabId: v.vocabId, translation: v.translation }
    const g = glossIndex.get(key)
    return { translation: g }
  }

  // split into word / non-word chunks, keep whitespace as-is
  const chunks = text.split(/(\s+)/)
  let key = 0

  return (
    <>
      <span className="leading-relaxed">
        {chunks.map((chunk) => {
          if (/^\s+$/.test(chunk) || chunk === '') return <span key={key++}>{chunk}</span>
          const info = lookup(chunk)
          let cls = 'rounded px-0.5 transition-colors hover:bg-primary/10'
          if (info.vocabId) {
            const status = wordStatus(srsItems[info.vocabId])
            if (status === 'new') cls += ' bg-primary/10 text-primary'
            else if (status === 'learning') cls += ' bg-gold/20'
          } else if (info.translation) {
            cls += ' underline decoration-dotted decoration-fg-muted/50 underline-offset-2'
          }
          return (
            <button
              key={key++}
              type="button"
              className={cls}
              onClick={() => {
                setSelected({ surface: chunk, info })
                speak(spokenForm(chunk), course.ttsLang)
              }}
            >
              {chunk}
            </button>
          )
        })}
      </span>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-primary bg-surface">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 p-4">
            <SpeakerButton text={spokenForm(selected.surface)} lang={course.ttsLang} label="Hear word" />
            <div className="grow">
              <p className="font-display text-lg font-bold">{selected.surface}</p>
              <p className="text-fg-muted">{selected.info.translation ?? 'No translation — tap 🔊 to hear it'}</p>
            </div>
            {selected.info.vocabId &&
              (addedIds.has(selected.info.vocabId) ? (
                <span className="flex items-center gap-1 font-bold text-accent">
                  <Check className="size-5" aria-hidden /> Added
                </span>
              ) : (
                <button
                  type="button"
                  className="clay clay-press flex items-center gap-1 px-3 py-2 font-bold text-primary"
                  onClick={() => onAdd(selected.info.vocabId!)}
                >
                  <Plus className="size-5" aria-hidden /> Practice
                </button>
              ))}
            <button
              type="button"
              aria-label="Close"
              className="clay clay-press flex size-11 shrink-0 items-center justify-center text-fg-muted"
              onClick={() => setSelected(null)}
            >
              <X aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
