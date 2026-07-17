import { Sparkles } from 'lucide-react'

import { ClayButton } from './ClayButton'
import { useSettings } from '../state/settings'

/** Opt-in card shown on AI screens while the aiEnabled setting is off. */
export function AiOptIn({ detail }: { detail?: string }) {
  const setAiEnabled = useSettings((s) => s.setAiEnabled)
  return (
    <div className="clay flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-lg font-extrabold">AI lessons are off</h2>
      </div>
      <p className="text-sm text-fg-muted">
        This feature talks to an <strong>Ollama</strong> server running on your own
        machine (<code className="rounded bg-bg/60 px-1">localhost:11434</code>).
        Nothing is sent to the internet, but it is an optional extra dependency —
        the rest of LingoForge works without it.
        {detail ? ` ${detail}` : ''}
      </p>
      <ClayButton variant="primary" onClick={() => setAiEnabled(true)}>
        Enable AI lessons
      </ClayButton>
    </div>
  )
}
