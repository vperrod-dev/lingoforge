import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Zap, Target, Timer, Lightbulb } from 'lucide-react'
import {
  scenarioToExercises,
  isScenarioVocab,
  isScenarioPhrase,
  isDialogueLine,
  type ScenarioData,
} from '../services/scenario-gen'
import { LessonPlayer, type LessonResult } from '../exercises/LessonPlayer'
import { renderExercise } from '../exercises/render'
import { useProgress } from '../state/progress'
import { Confetti } from '../ui/Confetti'
import { ClayButton } from '../ui/ClayButton'
import { playFanfare } from '../audio/sfx'

interface StoredScenario {
  scenario: string
  data: ScenarioData
  ttsLang: string
}

function isStoredScenario(v: unknown): v is StoredScenario {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (typeof s.data !== 'object' || s.data === null) return false
  const d = s.data as Record<string, unknown>
  return (
    typeof s.scenario === 'string' &&
    typeof s.ttsLang === 'string' &&
    typeof d.title === 'string' &&
    typeof d.culturalTip === 'string' &&
    Array.isArray(d.vocab) &&
    d.vocab.every(isScenarioVocab) &&
    Array.isArray(d.phrases) &&
    d.phrases.every(isScenarioPhrase) &&
    Array.isArray(d.dialogue) &&
    d.dialogue.every(isDialogueLine)
  )
}

export function ScenarioLessonScreen() {
  const navigate = useNavigate()
  const { addXp, addStudyMinutes, reviewVocab } = useProgress()
  const progressData = useProgress((s) => s.data)
  const [result, setResult] = useState<LessonResult | null>(null)

  const stored: StoredScenario | null = useMemo(() => {
    const raw = sessionStorage.getItem('scenarioLesson')
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isStoredScenario(parsed) ? parsed : null
    } catch {
      return null
    }
  }, [])

  const exercises = useMemo(
    () => stored ? scenarioToExercises(stored.data, stored.ttsLang) : [],
    [stored],
  )

  if (!stored || exercises.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <p className="text-fg-muted">No scenario lesson data found.</p>
        <ClayButton variant="primary" onClick={() => navigate('/scenario-lesson')}>
          Back to scenarios
        </ClayButton>
      </div>
    )
  }

  const handleComplete = (r: LessonResult) => {
    addXp(r.xp)
    addStudyMinutes(r.minutes)
    for (const [vocabId, correct] of Object.entries(r.vocabOutcomes)) {
      reviewVocab(progressData.activeCourse, vocabId, correct)
    }
    playFanfare()
    setResult(r)
  }

  if (result) {
    const accuracy = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 100
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
        <Confetti />
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="font-display text-4xl font-extrabold text-primary"
        >
          Scenario complete!
        </motion.h1>
        <p className="text-fg-muted">{stored.scenario}</p>

        {stored.data.culturalTip && (
          <div className="clay flex max-w-sm items-start gap-3 border-gold bg-amber-50 p-4">
            <Lightbulb className="size-5 shrink-0 text-gold" aria-hidden />
            <p className="text-sm">{stored.data.culturalTip}</p>
          </div>
        )}

        <div className="flex gap-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="clay flex flex-col items-center gap-1 p-5">
            <Zap className="size-6 text-gold" aria-hidden />
            <span className="font-display text-2xl font-bold">+{result.xp}</span>
            <span className="text-sm text-fg-muted">XP</span>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="clay flex flex-col items-center gap-1 p-5">
            <Target className="size-6 text-accent" aria-hidden />
            <span className="font-display text-2xl font-bold">{accuracy}%</span>
            <span className="text-sm text-fg-muted">accuracy</span>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="clay flex flex-col items-center gap-1 p-5">
            <Timer className="size-6 text-primary" aria-hidden />
            <span className="font-display text-2xl font-bold">{Math.max(1, Math.round(result.minutes))}m</span>
            <span className="text-sm text-fg-muted">studied</span>
          </motion.div>
        </div>
        <div className="flex gap-3">
          <ClayButton variant="neutral" onClick={() => navigate('/scenario-lesson')}>
            New scenario
          </ClayButton>
          <ClayButton variant="primary" onClick={() => navigate('/')}>
            Home
          </ClayButton>
        </div>
      </main>
    )
  }

  return (
    <LessonPlayer
      exercises={exercises}
      ttsLang={stored.ttsLang}
      renderExercise={(ex, onAnswer) => renderExercise(ex, stored.ttsLang, onAnswer)}
      onComplete={handleComplete}
      onExit={() => navigate('/scenario-lesson')}
    />
  )
}
