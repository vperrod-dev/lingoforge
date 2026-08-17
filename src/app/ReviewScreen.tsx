import { useMemo, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { courses } from '../content'
import type { VocabItem } from '../content/types'
import { dueItems } from '../engine/srs'
import { courseStage } from '../engine/production-stage'
import { reviewExercise } from '../engine/review-exercise'
import { wordStatus } from '../engine/word-status'
import { LessonPlayer, type LessonResult } from '../exercises/LessonPlayer'
import { renderExercise } from '../exercises/render'
import { useProgress } from '../state/progress'
import { ClayButton } from '../ui/ClayButton'
import { playFanfare } from '../audio/sfx'

export function ReviewScreen() {
  const data = useProgress((s) => s.data)
  const { addXp, addStudyMinutes, reviewVocab } = useProgress()
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState<LessonResult | null>(null)

  const course = courses[data.activeCourse]
  const srsItems = Object.values(data.courses[course.id]?.srsItems ?? {})
  const due = dueItems(srsItems)
  const stage = courseStage(course, data.courses[course.id]?.lessonCompletions ?? {})

  const exercises = useMemo(() => {
    if (!playing) return []
    return due
      .slice(0, 12)
      .map((item) => course.vocab.find((v) => v.id === item.vocabId))
      .filter((v): v is VocabItem => Boolean(v))
      .map((v) => reviewExercise(course, v, stage, wordStatus(data.courses[course.id]?.srsItems[v.id]) === 'known'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  if (playing && exercises.length > 0 && !finished) {
    return (
      <LessonPlayer
        exercises={exercises}
        ttsLang={course.ttsLang}
        renderExercise={(ex, onAnswer) => renderExercise(ex, course.ttsLang, onAnswer)}
        onComplete={(r) => {
          for (const [vocabId, correct] of Object.entries(r.vocabOutcomes)) {
            reviewVocab(course.id, vocabId, correct)
          }
          addXp(r.xp)
          addStudyMinutes(r.minutes)
          playFanfare()
          setFinished(r)
        }}
        onExit={() => setPlaying(false)}
      />
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <h2 className="font-display text-3xl font-bold text-primary">Review done! +{finished.xp} XP</h2>
        <ClayButton variant="primary" onClick={() => { setPlaying(false); setFinished(null) }}>
          Back
        </ClayButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <Dumbbell className="size-16 text-primary" aria-hidden />
      <h1 className="font-display text-3xl font-bold">Practice {course.flag}</h1>
      {due.length > 0 ? (
        <>
          <p className="max-w-md text-fg-muted">
            <strong className="text-fg">{due.length}</strong> word{due.length === 1 ? '' : 's'} due for review.
            Reviewing right before you forget is what makes memory stick — do this first, every day.
          </p>
          <ClayButton variant="primary" className="min-w-48 text-lg" onClick={() => setPlaying(true)}>
            Start review
          </ClayButton>
        </>
      ) : (
        <p className="max-w-md text-fg-muted">
          {srsItems.length === 0
            ? 'Complete lessons to add words here. They come back for review right when you are about to forget them.'
            : 'Nothing due right now — great job! Come back later or learn a new lesson.'}
        </p>
      )}
    </div>
  )
}
