import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { courses } from '../content'
import type { CourseId } from '../content/types'
import { generatePlacementQuiz, getUnitQuestionCounts, scorePlacement } from '../engine/placement'
import { LessonPlayer, type LessonResult } from '../exercises/LessonPlayer'
import { renderExercise } from '../exercises/render'
import { useProgress } from '../state/progress'
import { ClayButton } from '../ui/ClayButton'

export function PlacementScreen() {
  const { courseId } = useParams<{ courseId: CourseId }>()
  const navigate = useNavigate()
  const skipToUnit = useProgress((s) => s.skipToUnit)
  const [unitIndex, setUnitIndex] = useState<number | null>(null)

  const course = courseId ? courses[courseId] : undefined
  const exercises = useMemo(() => (course ? generatePlacementQuiz(course) : []), [course])

  if (!course) {
    return <p className="p-8 text-center text-fg-muted">Course not found.</p>
  }

  const unlockedUnits = course.units.filter((u) => !u.locked)

  const handleComplete = (r: LessonResult) => {
    const counts = getUnitQuestionCounts(course)
    const correctByPosition = exercises.map((ex) =>
      'vocabIds' in ex ? ex.vocabIds.every((id) => r.vocabOutcomes[id]) : false,
    )
    const passedUnitIndex = scorePlacement(correctByPosition, counts)
    skipToUnit(course.id, passedUnitIndex)
    setUnitIndex(passedUnitIndex)
  }

  if (unitIndex !== null) {
    const reachedUnit = unlockedUnits[unitIndex - 1]
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="font-display text-3xl font-extrabold text-primary"
        >
          {reachedUnit ? `Estimated level: ${reachedUnit.level}` : 'Starting from the basics'}
        </motion.h1>
        <p className="text-fg-muted">
          {reachedUnit
            ? `We're skipping you ahead to "${reachedUnit.title}".`
            : "We're starting you from the very first lesson."}
        </p>
        <ClayButton variant="primary" className="min-w-48" onClick={() => navigate('/')}>
          Continue
        </ClayButton>
        <button type="button" className="text-sm text-fg-muted underline" onClick={() => { skipToUnit(course.id, 0); navigate('/') }}>
          Start from the beginning instead
        </button>
      </main>
    )
  }

  if (exercises.length === 0) {
    return <p className="p-8 text-center text-fg-muted">No placement questions available for this course yet.</p>
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
