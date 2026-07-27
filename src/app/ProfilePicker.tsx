import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useProfiles } from '../state/profiles'
import type { CourseId } from '../content/types'
import { ClayButton } from '../ui/ClayButton'

const AVATARS = ['🦊', '🐻', '🐸', '🦉', '🐱', '🐹', '🦁', '🐼']

export function ProfilePicker() {
  const { profiles, createProfile, switchProfile, deleteProfile } = useProfiles()
  const [creating, setCreating] = useState(profiles.length === 0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  // start empty — preselecting a course made "tap to choose" deselect it
  const [courses, setCourses] = useState<CourseId[]>([])

  const toggleCourse = (c: CourseId) =>
    setCourses((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  const create = () => {
    if (!name.trim() || courses.length === 0) return
    createProfile(name.trim(), avatar, courses)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-8 p-6">
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-display text-5xl font-extrabold text-primary"
      >
        LingoForge
      </motion.h1>

      {!creating ? (
        <>
          <h2 className="text-xl font-bold text-fg-muted">Who is learning today?</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {profiles.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => switchProfile(p.id)}
                  className="clay clay-press flex w-full flex-col items-center gap-2 p-6"
                >
                  <span className="text-5xl" aria-hidden>{p.avatar}</span>
                  <span className="font-display text-xl font-bold">{p.name}</span>
                  <span className="text-sm text-fg-muted">{p.courses.map((c) => (c === 'ru' ? '🇷🇺' : '🇪🇸')).join(' ')}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete ${p.name}? All their progress will be erased.`)) {
                      deleteProfile(p.id)
                    }
                  }}
                  className="clay clay-press absolute -right-2 -top-2 flex size-11 items-center justify-center text-fg-muted"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </motion.div>
            ))}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="clay clay-press flex flex-col items-center justify-center gap-2 p-6 text-fg-muted"
            >
              <Plus className="size-10" aria-hidden />
              <span className="font-display text-lg font-bold">New learner</span>
            </button>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="clay flex w-full max-w-md flex-col gap-6 p-6">
          <h2 className="font-display text-2xl font-bold">Create your profile</h2>
          <label className="flex flex-col gap-2">
            <span className="font-bold">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="clay min-h-12 px-4 text-lg focus:outline-none focus-visible:outline-3 focus-visible:outline-primary"
              placeholder="e.g. Victor"
              maxLength={20}
            />
          </label>
          <fieldset>
            <legend className="mb-2 font-bold">Pick an avatar</legend>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={avatar === a}
                  onClick={() => setAvatar(a)}
                  className={`clay clay-press flex size-12 items-center justify-center text-2xl ${avatar === a ? 'border-primary bg-primary/10' : ''}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-bold">What do you want to learn? (tap one or both)</legend>
            <div className="flex gap-3">
              <button
                type="button"
                aria-pressed={courses.includes('ru')}
                onClick={() => toggleCourse('ru')}
                className={`clay clay-press flex grow items-center justify-center gap-2 px-4 py-3 font-bold ${courses.includes('ru') ? 'border-ru bg-red-50' : ''}`}
              >
                {courses.includes('ru') && <Check className="size-5 text-ru" aria-hidden />}
                🇷🇺 Russian
              </button>
              <button
                type="button"
                aria-pressed={courses.includes('es')}
                onClick={() => toggleCourse('es')}
                className={`clay clay-press flex grow items-center justify-center gap-2 px-4 py-3 font-bold ${courses.includes('es') ? 'border-es bg-amber-50' : ''}`}
              >
                {courses.includes('es') && <Check className="size-5 text-es" aria-hidden />}
                🇪🇸 Spanish
              </button>
            </div>
          </fieldset>
          <div className="flex gap-3">
            {profiles.length > 0 && (
              <ClayButton onClick={() => setCreating(false)}>Back</ClayButton>
            )}
            <ClayButton variant="primary" className="grow" disabled={!name.trim() || courses.length === 0} onClick={create}>
              Start learning!
            </ClayButton>
          </div>
          {(!name.trim() || courses.length === 0) && (
            <p className="text-center text-sm text-fg-muted" aria-live="polite">
              {!name.trim() && courses.length === 0
                ? 'Type your name and pick a language to start'
                : !name.trim()
                  ? 'Type your name to start'
                  : 'Pick at least one language to start'}
            </p>
          )}
        </motion.div>
      )}
    </main>
  )
}
