import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { Zap, Target, Timer } from 'lucide-react'
import { Lightbulb } from 'lucide-react'
import { courses, getLesson, grammarNote } from '../content'
import type { CourseId } from '../content/types'
import { generateLessonExercises } from '../engine/exercise-gen'
import { lessonStage, letterInfo, newLetters } from '../engine/production-stage'
import { SpeakerButton } from '../ui/SpeakerButton'
import { LessonPlayer, type LessonResult } from '../exercises/LessonPlayer'
import { renderExercise } from '../exercises/render'
import { useProgress } from '../state/progress'
import { BADGES } from '../state/badges'
import { Confetti } from '../ui/Confetti'
import { ClayButton } from '../ui/ClayButton'
import { playFanfare } from '../audio/sfx'

export function LessonScreen() {
  const { courseId, lessonId } = useParams<{ courseId: CourseId; lessonId: string }>()
  const navigate = useNavigate()
  const data = useProgress((s) => s.data)
  const { addXp, addStudyMinutes, completeLesson, reviewVocab, earnBadge } = useProgress()
  const [result, setResult] = useState<LessonResult | null>(null)
  const [started, setStarted] = useState(false)

  const course = courseId ? courses[courseId] : undefined
  const lesson = course && lessonId ? getLesson(course, lessonId) : undefined
  const completions = course ? (data.courses[course.id]?.lessonCompletions ?? {}) : {}
  const crowns = lessonId ? (completions[lessonId] ?? 0) : 0
  const note = courseId && lessonId ? grammarNote(courseId, lessonId) : undefined
  const stage = course ? lessonStage(course, completions, crowns) : 'tiles'
  // Letters this lesson introduces — shown before the first pass through it
  const letters = course && lesson && crowns === 0
    ? newLetters(course, lesson).map((ch) => letterInfo(ch)).filter((l) => l !== undefined)
    : []

  const exercises = useMemo(
    () => (course && lesson ? generateLessonExercises(course, lesson, crowns, stage) : []),
    // regenerate only per lesson visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course?.id, lesson?.id],
  )

  if (!course || !lesson) {
    return <p className="p-8 text-center text-fg-muted">Lesson not found.</p>
  }

  const handleComplete = (r: LessonResult) => {
    completeLesson(course.id, lesson.id, lesson.vocabIds)
    addXp(r.xp)
    addStudyMinutes(r.minutes)
    for (const [vocabId, correct] of Object.entries(r.vocabOutcomes)) {
      reviewVocab(course.id, vocabId, correct)
    }
    // badge sweep with fresh store state
    const fresh = useProgress.getState().data
    for (const badge of BADGES) {
      if (badge.earned(fresh)) earnBadge(badge.id)
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
          Lesson complete!
        </motion.h1>
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
        <ClayButton variant="primary" className="min-w-48" onClick={() => navigate('/')}>
          Continue
        </ClayButton>
      </main>
    )
  }

  if ((note || letters.length > 0) && !started) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 p-6">
        {letters.length > 0 && (
          <div className="clay flex flex-col gap-3 border-ru bg-red-50 p-6">
            <h1 className="font-display text-xl font-bold">New letters in this lesson</h1>
            <ul className="flex flex-col gap-2">
              {letters.map((l) => (
                <li key={l.letter} className="flex items-center gap-3">
                  <SpeakerButton text={l.lower} lang={course.ttsLang} label={`Play letter ${l.letter}`} />
                  <span className="w-14 shrink-0 whitespace-nowrap font-display text-2xl font-bold">{l.letter} {l.lower}</span>
                  <span className="text-fg-muted">{l.sound} — {l.example.word} ({l.example.translation})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {note && (
        <div className="clay flex flex-col gap-3 border-gold bg-amber-50 p-6">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold">
            <Lightbulb className="size-6 text-gold" aria-hidden /> {lesson.title}
          </h1>
          <p className="text-lg leading-relaxed">{note}</p>
        </div>
        )}
        <ClayButton variant="primary" className="min-w-48 self-center" onClick={() => setStarted(true)}>
          Start lesson
        </ClayButton>
      </main>
    )
  }

  return (
    <LessonPlayer
      exercises={exercises}
      ttsLang={course.ttsLang}
      renderExercise={(ex, onAnswer) => renderExercise(ex, course.ttsLang, onAnswer)}
      onComplete={handleComplete}
      onExit={() => navigate('/')}
    />
  )
}
