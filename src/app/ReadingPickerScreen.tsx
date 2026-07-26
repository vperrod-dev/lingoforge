import { Link } from 'react-router'
import { BookOpen, MessageSquare } from 'lucide-react'
import { courses, readings } from '../content'
import { useProgress } from '../state/progress'

export function ReadingPickerScreen() {
  const data = useProgress((s) => s.data)
  const course = courses[data.activeCourse]
  const texts = readings[course.id] ?? []

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Read</h1>
        <p className="text-fg-muted">
          Real {course.name} stories and dialogues. Tap any word to hear it, see its meaning, and add it to Practice.
        </p>
      </header>

      {texts.length === 0 ? (
        <p className="text-fg-muted">No reading yet for this course.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {texts.map((t) => {
            const Icon = t.kind === 'dialogue' ? MessageSquare : BookOpen
            return (
              <Link
                key={t.id}
                to={`/read/${course.id}/${t.id}`}
                className="clay clay-press flex items-center gap-4 p-4"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-indigo-700 bg-primary text-on-primary">
                  <Icon aria-hidden />
                </span>
                <span className="grow text-left">
                  <span className="block font-display text-lg font-bold">{t.title}</span>
                  <span className="text-sm text-fg-muted">
                    {t.kind === 'dialogue' ? 'Dialogue' : 'Story'} · {t.level}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
