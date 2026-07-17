import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UtensilsCrossed, Plane, Stethoscope, ShoppingCart, Hotel, Phone,
  MapPin, Train, Loader2, WifiOff, Sparkles, Theater,
} from 'lucide-react'
import { ClayButton } from '../ui/ClayButton'
import { isOllamaOnline } from '../services/ollama'
import { generateScenario } from '../services/scenario-gen'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { AiOptIn } from '../ui/AiOptIn'
import { courses } from '../content'

const PRESETS = [
  { label: 'Restaurant', icon: UtensilsCrossed, scenario: 'ordering food at a restaurant' },
  { label: 'Airport', icon: Plane, scenario: 'checking in at the airport' },
  { label: 'Doctor', icon: Stethoscope, scenario: 'visiting the doctor' },
  { label: 'Shopping', icon: ShoppingCart, scenario: 'buying clothes at a store' },
  { label: 'Hotel', icon: Hotel, scenario: 'checking into a hotel' },
  { label: 'Phone call', icon: Phone, scenario: 'making a phone call' },
  { label: 'Directions', icon: MapPin, scenario: 'asking for directions on the street' },
  { label: 'Train', icon: Train, scenario: 'buying a train ticket' },
  { label: 'Cinema', icon: Theater, scenario: 'buying movie tickets' },
]

type Status = 'idle' | 'checking' | 'generating' | 'offline' | 'error'

export function ScenarioPickerScreen() {
  const navigate = useNavigate()
  const data = useProgress((s) => s.data)
  const course = courses[data.activeCourse]

  const aiEnabled = useSettings((s) => s.aiEnabled)
  const [customScenario, setCustomScenario] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const startLesson = async (scenario: string) => {
    if (!scenario.trim()) return
    setStatus('checking')
    setErrorMsg('')

    const online = await isOllamaOnline()
    if (!online) {
      setStatus('offline')
      return
    }

    setStatus('generating')
    try {
      const data = await generateScenario(scenario.trim(), course.ttsLang)
      if (data.dialogue.length === 0 && data.vocab.length === 0) {
        throw new Error('No scenario content generated')
      }
      sessionStorage.setItem(
        'scenarioLesson',
        JSON.stringify({ scenario: scenario.trim(), data, ttsLang: course.ttsLang }),
      )
      navigate('/scenario-lesson/play')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Generation failed')
      setStatus('error')
    }
  }

  const isLoading = status === 'checking' || status === 'generating'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Scenario Lesson</h1>
        <p className="text-fg-muted">
          Pick a situation — AI generates a dialogue and exercises in {course.name}
        </p>
      </div>

      {!aiEnabled && <AiOptIn />}
      {aiEnabled && <>

      {status === 'offline' && (
        <div className="clay flex items-center gap-3 border-danger bg-danger-soft p-4">
          <WifiOff className="size-5 shrink-0 text-red-700" aria-hidden />
          <div>
            <p className="font-bold text-red-800">Ollama is not running</p>
            <p className="text-sm text-red-700">
              Start it with <code className="rounded bg-red-100 px-1">ollama serve</code> then try again
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="clay border-danger bg-danger-soft p-4">
          <p className="font-bold text-red-800">Something went wrong</p>
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={customScenario}
          onChange={(e) => setCustomScenario(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startLesson(customScenario)}
          placeholder="Type any situation..."
          disabled={isLoading}
          className="clay min-h-11 grow px-4 py-2 disabled:opacity-50"
        />
        <ClayButton
          variant="primary"
          onClick={() => startLesson(customScenario)}
          disabled={isLoading || !customScenario.trim()}
        >
          {isLoading ? <Loader2 className="size-5 animate-spin" aria-label="Loading" /> : <Sparkles className="size-5" aria-hidden />}
        </ClayButton>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PRESETS.map(({ label, icon: Icon, scenario }) => (
          <motion.button
            key={scenario}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => startLesson(scenario)}
            disabled={isLoading}
            className="clay clay-press flex flex-col items-center gap-2 p-3 disabled:opacity-50"
          >
            <Icon className="size-7 text-primary" aria-hidden />
            <span className="text-xs font-bold">{label}</span>
          </motion.button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="size-10 animate-spin text-primary" aria-label="Generating lesson" />
          <p className="text-fg-muted">
            {status === 'checking' ? 'Connecting to Ollama...' : 'Building your scenario...'}
          </p>
          <p className="text-sm text-fg-muted">This can take 20-40 seconds</p>
        </div>
      )}
      </>}
    </div>
  )
}
