import { useRef, useState } from 'react'
import { X, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ExerciseInstance } from '../engine/exercise-gen'
import { xpForAnswer, LESSON_COMPLETE_BONUS } from '../engine/scoring'
import { createTimer, recordActivity, pause, elapsedMs } from '../engine/session-timer'
import type { TimerState } from '../engine/session-timer'
import { playCorrect, playWrong } from '../audio/sfx'
import { ClayButton } from '../ui/ClayButton'

export interface LessonResult {
  xp: number
  correct: number
  total: number
  minutes: number
  /** vocabId → answered correctly on first try */
  vocabOutcomes: Record<string, boolean>
}

interface Props {
  exercises: ExerciseInstance[]
  ttsLang: string
  renderExercise: (
    exercise: ExerciseInstance,
    onAnswer: (correct: boolean, correctAnswer: string, opts?: { skipped?: boolean }) => void,
  ) => React.ReactNode
  onComplete: (result: LessonResult) => void
  onExit: () => void
}

interface Feedback {
  correct: boolean
  correctAnswer: string
}

export function LessonPlayer({ exercises, renderExercise, onComplete, onExit }: Props) {
  const [queue, setQueue] = useState(exercises)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [combo, setCombo] = useState(0)
  const [xp, setXp] = useState(0)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const timer = useRef<TimerState>(createTimer())
  const vocabOutcomes = useRef<Record<string, boolean>>({})
  const retried = useRef<Set<ExerciseInstance>>(new Set())

  const total = exercises.length
  const progress = Math.min(1, index / queue.length)
  const current = queue[index]

  const handleAnswer = (correct: boolean, correctAnswer: string, opts?: { skipped?: boolean }) => {
    timer.current = recordActivity(timer.current)
    // A skip (mic unavailable, can't speak here) moves on without scoring the
    // word wrong and without sending the exercise back around.
    if (opts?.skipped) {
      next()
      return
    }
    const isRetry = retried.current.has(current)
    if ('vocabIds' in current) {
      for (const id of current.vocabIds) {
        if (!(id in vocabOutcomes.current)) vocabOutcomes.current[id] = correct
      }
    }
    if (correct) {
      const newCombo = combo + 1
      setCombo(newCombo)
      if (!isRetry) {
        setXp((x) => x + xpForAnswer(newCombo))
        setFirstTryCorrect((c) => c + 1)
      }
      playCorrect()
    } else {
      setCombo(0)
      playWrong()
      // re-queue at the end for another try (Duolingo pattern)
      retried.current.add(current)
      setQueue((q) => [...q, current])
    }
    setFeedback({ correct, correctAnswer })
  }

  const next = () => {
    setFeedback(null)
    const nextIndex = index + 1
    if (nextIndex >= queue.length) {
      timer.current = pause(timer.current)
      onComplete({
        xp: xp + LESSON_COMPLETE_BONUS,
        correct: firstTryCorrect,
        total,
        minutes: elapsedMs(timer.current) / 60000,
        vocabOutcomes: vocabOutcomes.current,
      })
      return
    }
    setIndex(nextIndex)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-4 pb-36">
      <header className="flex items-center gap-4">
        {/* Labelled, not a bare ✕: reported as "the only way out is to close the app" */}
        <button type="button" aria-label="Exit lesson" onClick={onExit} className="clay clay-press flex min-h-11 shrink-0 items-center gap-1 px-3 font-bold text-fg-muted">
          <X className="size-5" aria-hidden /> Exit
        </button>
        <div className="h-5 grow overflow-hidden rounded-full border-2 border-border-soft bg-surface" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        {combo >= 3 && (
          <span className="flex items-center gap-1 font-display text-lg font-bold text-gold" aria-label={`Combo ${combo}`}>
            <Flame className="size-5 fill-gold" aria-hidden /> {combo}
          </span>
        )}
      </header>

      <motion.section
        key={index}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="grow"
      >
        {/* eslint-disable-next-line react-hooks/refs -- handleAnswer only reads refs inside the onAnswer event callback, never during render */}
        {current && renderExercise(current, handleAnswer)}
      </motion.section>

      {/* Persistent footer: CSS transition (not framer-motion) avoids stacking-context
          issues with fixed positioning inside transformed ancestors */}
      <footer
        aria-hidden={!feedback}
        className={`fixed inset-x-0 bottom-0 z-50 border-t-4 transition-transform duration-200 ease-out ${
          feedback ? 'translate-y-0' : 'translate-y-40 pointer-events-none'
        } ${feedback && !feedback.correct ? 'border-danger bg-danger-soft' : 'border-accent bg-accent-soft'}`}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 p-4">
          <div>
            <p className={`font-display text-xl font-bold ${feedback && !feedback.correct ? 'text-red-800' : 'text-green-800'}`}>
              {feedback && !feedback.correct ? 'Not quite…' : 'Correct!'}
            </p>
            {feedback && !feedback.correct && (
              <p className="text-red-900">
                Answer: <strong>{feedback.correctAnswer}</strong>
              </p>
            )}
          </div>
          <ClayButton
            variant={feedback && !feedback.correct ? 'danger' : 'accent'}
            onClick={next}
            disabled={!feedback}
            tabIndex={feedback ? 0 : -1}
          >
            Continue
          </ClayButton>
        </div>
      </footer>
    </div>
  )
}
