import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  UtensilsCrossed, Plane, Briefcase, Dumbbell, Heart, ShoppingBag,
  Music, GraduationCap, Home, MessageCircle, Loader2, WifiOff, Sparkles,
} from 'lucide-react'
import { ClayButton } from '../ui/ClayButton'
import { isOllamaOnline } from '../services/ollama'
import { generateTopicVocab } from '../services/ai-exercises'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { AiOptIn } from '../ui/AiOptIn'
import { courses } from '../content'

const PRESETS = [
  { label: 'Food & Cooking', icon: UtensilsCrossed, topic: 'food and cooking' },
  { label: 'Travel', icon: Plane, topic: 'travel and tourism' },
  { label: 'Work', icon: Briefcase, topic: 'work and office' },
  { label: 'Fitness', icon: Dumbbell, topic: 'fitness and sports' },
  { label: 'Health', icon: Heart, topic: 'health and body' },
  { label: 'Shopping', icon: ShoppingBag, topic: 'shopping and clothes' },
  { label: 'Music', icon: Music, topic: 'music and instruments' },
  { label: 'School', icon: GraduationCap, topic: 'school and education' },
  { label: 'Home', icon: Home, topic: 'home and furniture' },
  { label: 'Socializing', icon: MessageCircle, topic: 'socializing and friendships' },
]

type Status = 'idle' | 'checking' | 'generating' | 'offline' | 'error'

export function TopicPickerScreen() {
  const navigate = useNavigate()
  const data = useProgress((s) => s.data)
  const course = courses[data.activeCourse]

  const aiEnabled = useSettings((s) => s.aiEnabled)
  const [customTopic, setCustomTopic] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const startLesson = async (topic: string) => {
    if (!topic.trim()) return
    setStatus('checking')
    setErrorMsg('')

    const online = await isOllamaOnline()
    if (!online) {
      setStatus('offline')
      return
    }

    setStatus('generating')
    try {
      const vocab = await generateTopicVocab(topic.trim(), course.ttsLang)
      if (vocab.length === 0) throw new Error('No vocabulary generated')
      // Store in sessionStorage for the lesson screen to pick up
      sessionStorage.setItem('topicLesson', JSON.stringify({ topic: topic.trim(), vocab, ttsLang: course.ttsLang }))
      navigate('/topic-lesson/play')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Generation failed')
      setStatus('error')
    }
  }

  const isLoading = status === 'checking' || status === 'generating'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Topic Lesson</h1>
        <p className="text-fg-muted">
          Pick a topic — AI generates vocab and exercises in {course.name}
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
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startLesson(customTopic)}
          placeholder="Type any topic..."
          disabled={isLoading}
          className="clay min-h-11 grow px-4 py-2 disabled:opacity-50"
        />
        <ClayButton
          variant="primary"
          onClick={() => startLesson(customTopic)}
          disabled={isLoading || !customTopic.trim()}
        >
          {isLoading ? <Loader2 className="size-5 animate-spin" aria-label="Loading" /> : <Sparkles className="size-5" aria-hidden />}
        </ClayButton>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRESETS.map(({ label, icon: Icon, topic }) => (
          <motion.button
            key={topic}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => startLesson(topic)}
            disabled={isLoading}
            className="clay clay-press flex flex-col items-center gap-2 p-4 disabled:opacity-50"
          >
            <Icon className="size-7 text-primary" aria-hidden />
            <span className="text-sm font-bold">{label}</span>
          </motion.button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="size-10 animate-spin text-primary" aria-label="Generating lesson" />
          <p className="text-fg-muted">
            {status === 'checking' ? 'Connecting to Ollama...' : 'Generating vocabulary...'}
          </p>
          <p className="text-sm text-fg-muted">This can take 15-30 seconds</p>
        </div>
      )}
      </>}
    </div>
  )
}
