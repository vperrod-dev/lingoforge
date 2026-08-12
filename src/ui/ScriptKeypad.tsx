import { useState } from 'react'
import { Delete, Keyboard } from 'lucide-react'

/**
 * On-screen keys for characters the learner's own keyboard probably can't type.
 * A phone has no Cyrillic keyboard until you install one, which makes every
 * typed Russian answer a dead end; Spanish only needs the accented letters.
 * Alphabetical (not ЙЦУКЕН) — a beginner hunts letters faster that way.
 */
/** Rows are kept to 11 keys so none of them overflows a phone's width. */
const LAYOUTS: Record<string, string[]> = {
  ru: ['абвгдеёжзий', 'клмнопрстуф', 'хцчшщъыьэюя'],
  es: ['áéíóúüñ¿¡'],
}

interface Props {
  /** Course TTS language, e.g. "ru-RU" */
  lang: string
  onInsert: (char: string) => void
  onBackspace: () => void
  disabled?: boolean
}

export function ScriptKeypad({ lang, onInsert, onBackspace, disabled }: Props) {
  const rows = LAYOUTS[lang.split('-')[0]]
  const [open, setOpen] = useState(true)

  if (!rows) return null

  // Keeping focus in the input preserves the caret and the "Check on Enter" flow.
  const keep = (e: React.PointerEvent) => e.preventDefault()

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 self-start text-sm font-bold text-fg-muted"
        aria-expanded={open}
      >
        <Keyboard className="size-4" aria-hidden />
        {open ? 'Hide keyboard' : 'Show keyboard'}
      </button>

      {open && (
        <div className="flex flex-col gap-1" aria-label="On-screen keyboard">
          {rows.map((row) => (
            <div key={row} className="flex justify-center gap-1">
              {[...row].map((char) => (
                <button
                  key={char}
                  type="button"
                  lang={lang}
                  disabled={disabled}
                  onPointerDown={keep}
                  onClick={() => onInsert(char)}
                  className="clay clay-press min-w-0 grow basis-0 px-0 py-3 text-center text-lg font-bold"
                >
                  {char}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-1">
            <button
              type="button"
              aria-label="Space"
              disabled={disabled}
              onPointerDown={keep}
              onClick={() => onInsert(' ')}
              className="clay clay-press grow py-2 text-center font-bold"
            >
              space
            </button>
            <button
              type="button"
              aria-label="Delete last letter"
              disabled={disabled}
              onPointerDown={keep}
              onClick={onBackspace}
              className="clay clay-press flex min-w-16 items-center justify-center py-2"
            >
              <Delete aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
