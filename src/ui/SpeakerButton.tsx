import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { speak } from '../audio/tts'

interface Props {
  text: string
  lang: string
  label?: string
  /** Show the text when the tap made no sound — for prompts that are audio-only. */
  revealOnSilence?: boolean
}

/**
 * Every inline 🔊 in the app. `speak()` reports whether the device actually made
 * a sound; a tap that stays silent (no voice installed for the language, muted
 * device) says so instead of looking broken.
 */
export function SpeakerButton({ text, lang, label = 'Play audio', revealOnSilence }: Props) {
  const [silent, setSilent] = useState(false)

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-label={label}
        className="clay clay-press flex size-11 shrink-0 items-center justify-center text-primary"
        // stopPropagation: flashcards put this button on top of a card that flips on tap
        onClick={async (e) => {
          e.stopPropagation()
          setSilent(!(await speak(text, lang)))
        }}
      >
        <Volume2 aria-hidden />
      </button>
      {silent && (
        <span className="flex items-center gap-1 text-sm font-bold text-fg-muted">
          <VolumeX className="size-4" aria-hidden /> No audio here
          {revealOnSilence && <span className="font-display text-lg" lang={lang}> — {text}</span>}
        </span>
      )}
    </span>
  )
}
