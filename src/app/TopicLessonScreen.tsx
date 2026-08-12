import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Zap, Target, Timer } from 'lucide-react'
import { topicVocabToExercises } from '../services/ai-exercises'
import { LessonPlayer, type LessonResult } from '../exercises/LessonPlayer'
import { renderExercise } from '../exercises/render'
import { useProgress } from '../state/progress'
import { Confetti } from '../ui/Confetti'
import { ClayButton } from '../ui/ClayButton'
import { playFanfare } from '../audio/sfx'

interface TopicLessonData {
  topic: string
  vocab: { word: string; translation: string; pronunciation: string; example: string; exampleTranslation: string }[]
  ttsLang: string
}

function isTopicLessonData(v: unknown): v is TopicLessonData {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return (
    typeof d.topic === 'string' &&
    typeof d.ttsLang === 'string' &&
    Array.isArray(d.vocab) &&
    d.vocab.every(
      (w) =>
        typeof w === 'object' &&
        w !== null &&
        typeof (w as Record<string, unknown>).word === 'string' &&
        typeof (w as Record<string, unknown>).translation === 'string' &&
        typeof (w as Record<string, unknown>).pronunciation === 'string' &&
        typeof (w as Record<string, unknown>).example === 'string' &&
        typeof (w as Record<string, unknown>).exampleTranslation === 'string',
    )
  )
}

export function TopicLessonScreen() {
  const navigate = useNavigate()
  const { addXp, addStudyMinutes, reviewVocab } = useProgress()
  const data = useProgress((s) => s.data)
  const [result, setResult] = useState<LessonResult | null>(null)

  const lessonData: TopicLessonData | null = useMemo(() => {
    const raw = sessionStorage.getItem('topicLesson')
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isTopicLessonData(parsed) ? parsed : null
    } catch {
      return null
    }
  }, [])

  const exercises = useMemo(
    () => lessonData ? topicVocabToExercises(lessonData.vocab) : [],
    [lessonData],
  )

  if (!lessonData || exercises.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <p className="text-fg-muted">No topic lesson data found.</p>
        <ClayButton variant="primary" onClick={() => navigate('/topic-lesson')}>
          Back to topics
        </ClayButton>
      </div>
    )
  }

  const handleComplete = (r: LessonResult) => {
    addXp(r.xp)
    addStudyMinutes(r.minutes)
    for (const [vocabId, correct] of Object.entries(r.vocabOutcomes)) {
      reviewVocab(data.activeCourse, vocabId, correct)
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
          Topic complete!
        </motion.h1>
        <p className="text-fg-muted">
          {lessonData.topic}
        </p>
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
          <ClayButton variant="neutral" onClick={() => navigate('/topic-lesson')}>
            New topic
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
      ttsLang={lessonData.ttsLang}
      renderExercise={(ex, onAnswer) => renderExercise(ex, lessonData.ttsLang, onAnswer)}
      onComplete={handleComplete}
      onExit={() => navigate('/topic-lesson')}
    />
  )
}
