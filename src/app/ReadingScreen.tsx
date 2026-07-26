import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Volume2, Eye, EyeOff } from 'lucide-react'
import { courses, getReading } from '../content'
import type { CourseId } from '../content/types'
import { useProgress } from '../state/progress'
import { speak } from '../audio/tts'
import { GlossText } from '../ui/GlossText'
import { ClayButton } from '../ui/ClayButton'
import { optionOrder } from './option-order'

export function ReadingScreen() {
  const { courseId, textId } = useParams<{ courseId: CourseId; textId: string }>()
  const navigate = useNavigate()
  const data = useProgress((s) => s.data)
  const { reviewVocab, addXp } = useProgress()

  const course = courseId ? courses[courseId] : undefined
  const text = courseId && textId ? getReading(courseId, textId) : undefined

  const [showTranslation, setShowTranslation] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)

  if (!course || !text) {
    return <p className="p-8 text-center text-fg-muted">Reading not found.</p>
  }

  const srsItems = data.courses[course.id]?.srsItems ?? {}

  const handleAdd = (vocabId: string) => {
    reviewVocab(course.id, vocabId, true)
    setAddedIds((prev) => new Set(prev).add(vocabId))
  }

  const glossProps = { course, glossary: text.glossary, srsItems, addedIds, onAdd: handleAdd }

  const fullText =
    text.kind === 'dialogue' ? (text.turns ?? []).map((t) => t.text).join(' ') : text.body ?? ''

  const questions = text.questions ?? []
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined)
  const correctCount = questions.filter((q, i) => answers[i] === q.correctIndex).length

  const checkAnswers = () => {
    if (checked) return
    setChecked(true)
    addXp(correctCount * 5)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-4 pb-36">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate('/read')}
          className="clay clay-press flex size-11 shrink-0 items-center justify-center text-fg-muted"
        >
          <ArrowLeft aria-hidden />
        </button>
        <h1 className="grow font-display text-xl font-bold">{text.title}</h1>
        <button
          type="button"
          aria-label="Listen"
          onClick={() => speak(fullText, course.ttsLang)}
          className="clay clay-press flex size-11 shrink-0 items-center justify-center text-primary"
        >
          <Volume2 aria-hidden />
        </button>
        <button
          type="button"
          aria-label={showTranslation ? 'Hide translation' : 'Show translation'}
          onClick={() => setShowTranslation((v) => !v)}
          className="clay clay-press flex size-11 shrink-0 items-center justify-center text-fg-muted"
        >
          {showTranslation ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </header>

      {text.kind === 'story' ? (
        <article className="flex flex-col gap-4 text-lg">
          {(text.body ?? '').split(/\n\n+/).map((para, i) => (
            <p key={i}>
              <GlossText text={para} {...glossProps} />
            </p>
          ))}
          {showTranslation && text.translation && (
            <p className="border-t-2 border-border-soft pt-4 text-base text-fg-muted">{text.translation}</p>
          )}
        </article>
      ) : (
        <div className="flex flex-col gap-3">
          {(text.turns ?? []).map((turn, i) => (
            <div key={i} className="clay bg-bg p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-bold text-fg-muted">{turn.speaker}</span>
                <button
                  type="button"
                  aria-label="Play line"
                  className="text-primary"
                  onClick={() => speak(turn.text, course.ttsLang)}
                >
                  <Volume2 className="size-3.5" aria-hidden />
                </button>
              </div>
              <p className="text-lg">
                <GlossText text={turn.text} {...glossProps} />
              </p>
              {showTranslation && <p className="mt-1 text-sm text-fg-muted">{turn.translation}</p>}
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <section className="flex flex-col gap-4 border-t-4 border-border-soft pt-4">
          <h2 className="font-display text-lg font-bold">Comprehension</h2>
          {questions.map((q, qi) => (
            <div key={qi} className="flex flex-col gap-2">
              <p className="font-semibold">{q.q}</p>
              <div className="flex flex-col gap-2">
                {optionOrder(`${text.id}:${qi}`, q.options.length).map((oi) => {
                  const opt = q.options[oi]
                  const picked = answers[qi] === oi
                  const isRight = oi === q.correctIndex
                  let cls = 'clay clay-press p-3 text-left'
                  if (checked && isRight) cls += ' border-accent bg-accent-soft'
                  else if (checked && picked && !isRight) cls += ' border-danger bg-danger-soft'
                  else if (picked) cls += ' border-primary'
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={checked}
                      className={cls}
                      onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {checked ? (
            <p className="font-display text-lg font-bold text-primary">
              {correctCount} / {questions.length} correct · +{correctCount * 5} XP
            </p>
          ) : (
            <ClayButton variant="primary" disabled={!allAnswered} onClick={checkAnswers}>
              Check answers
            </ClayButton>
          )}
        </section>
      )}
    </div>
  )
}
