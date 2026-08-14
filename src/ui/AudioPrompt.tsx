import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { speak } from '../audio/tts'

interface Props {
  text: string
  lang: string
}

/**
 * The replay button for every listen-first exercise, plus the escape hatch when
 * the device makes no sound: a phone with no Russian voice installed (and a
 * missing MP3, or a blocked autoplay) used to leave these exercises completely
 * silent and unanswerable. Showing the text is a worse exercise than hearing
 * it, but it is not a dead end.
 */
export function AudioPrompt({ text, lang }: Props) {
  const [silent, setSilent] = useState(false)

  useEffect(() => {
    // Phones block autoplay, so an inaudible first attempt proves nothing —
    // only a tap that stays silent does. This just gives the audio a chance to
    // lead when the browser allows it.
    speak(text, lang)
  }, [text, lang])

  const replay = async () => {
    const heard = await speak(text, lang)
    setSilent(!heard)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label="Replay audio"
        className="clay clay-press flex size-24 items-center justify-center bg-primary text-on-primary"
        onClick={replay}
      >
        <Volume2 className="size-10" aria-hidden />
      </button>
      {silent && (
        <p className="clay flex flex-col items-center gap-1 border-gold bg-amber-50 px-4 py-3 text-center">
          <span className="flex items-center gap-2 text-sm font-bold text-fg-muted">
            <VolumeX className="size-4" aria-hidden /> No audio on this device
          </span>
          <span className="font-display text-2xl font-bold" lang={lang}>{text}</span>
        </p>
      )}
    </div>
  )
}
