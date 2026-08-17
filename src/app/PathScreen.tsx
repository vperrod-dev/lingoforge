import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Lock, Check, Star, Hand, Sparkles, Coffee, Package, Users, MessageCircle, MapPin, Home, Hash, Clock, Wand2, Theater, Camera, GraduationCap, ChevronDown, ChevronUp, BookOpen, MessagesSquare, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { courses, ruAlphabet } from '../content'
import type { CourseId } from '../content/types'
import { ALPHABET_DRILL_IDS, alphabetDone, alphabetDrillDone } from '../engine/production-stage'
import { useState } from 'react'
import { useProfiles } from '../state/profiles'
import { useProgress } from '../state/progress'
import { VoiceWarning } from '../ui/VoiceWarning'

const skillIcons: Record<string, LucideIcon> = {
  hand: Hand,
  sparkles: Sparkles,
  coffee: Coffee,
  package: Package,
  users: Users,
  'message-circle': MessageCircle,
  'map-pin': MapPin,
  home: Home,
  hash: Hash,
  clock: Clock,
}

export function PathScreen() {
  const { profiles, activeProfileId } = useProfiles()
  const profile = profiles.find((p) => p.id === activeProfileId)
  const data = useProgress((s) => s.data)
  const setActiveCourse = useProgress((s) => s.setActiveCourse)

  const course = courses[data.activeCourse]
  const completions = data.courses[course.id]?.lessonCompletions ?? {}

  // Russian starts with Unit 0, the alphabet: one path node per drill, before "First words".
  const alphabetNodes = course.id === 'ru'
    ? ALPHABET_DRILL_IDS.map((id) => ({
        id,
        title: id === 'alpha-confusables' ? 'Confusable pairs' : (ruAlphabet.groups.find((g) => `alpha-${g.id}` === id)?.title ?? id),
      }))
    : []
  const crownsOf = (id: string) => (id.startsWith('alpha-') ? Number(alphabetDrillDone(id, completions)) : (completions[id] ?? 0))

  // A node is unlocked when all nodes before it (path order) are completed at least once
  const orderedIds = [...alphabetNodes.map((n) => n.id), ...course.units.flatMap((u) => u.skills.flatMap((s) => s.lessons.map((l) => l.id)))]
  const firstIncomplete = orderedIds.findIndex((id) => !crownsOf(id))
  const unlockedUpTo = firstIncomplete === -1 ? orderedIds.length : firstIncomplete

  const [roadmapOpen, setRoadmapOpen] = useState(false)

  const unitProgress = [
    ...(alphabetNodes.length > 0
      ? [{ unit: { id: 'alphabet', title: 'The Cyrillic alphabet', level: 'A0', locked: false }, total: alphabetNodes.length, completed: alphabetNodes.filter((n) => crownsOf(n.id)).length }]
      : []),
    ...course.units.map((unit) => {
      const unitLessons = unit.skills.flatMap((s) => s.lessons)
      const completed = unitLessons.filter((l) => (completions[l.id] ?? 0) > 0).length
      return { unit, total: unitLessons.length, completed }
    }),
  ]

  let lessonIndex = alphabetNodes.length - 1

  const pathNode = (id: string, title: string, to: string, index: number) => {
    const crowns = crownsOf(id)
    const unlocked = index <= unlockedUpTo
    const isNext = index === unlockedUpTo
    const node = (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`clay flex min-h-20 w-full max-w-sm items-center gap-4 p-4 ${
          !unlocked ? 'opacity-50' : 'clay-press'
        } ${isNext ? (course.id === 'ru' ? 'border-ru' : 'border-es') : ''} ${
          crowns > 0 ? 'border-accent' : ''
        }`}
      >
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-full border-3 ${
            crowns > 0
              ? 'border-green-700 bg-accent text-on-primary'
              : unlocked
                ? 'border-indigo-700 bg-primary text-on-primary'
                : 'border-border-soft bg-bg text-fg-muted'
          }`}
        >
          {crowns > 0 ? <Check aria-hidden /> : unlocked ? <Star aria-hidden /> : <Lock aria-hidden />}
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">{title}</span>
          {crowns > 0 && !id.startsWith('alpha-') && (
            <span className="flex gap-0.5" aria-label={`Level ${crowns} of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${i < crowns ? 'fill-gold text-gold' : 'text-border-soft'}`}
                  aria-hidden
                />
              ))}
            </span>
          )}
        </span>
      </motion.div>
    )
    return unlocked ? (
      <Link key={id} to={to} className="w-full max-w-sm">
        {node}
      </Link>
    ) : (
      <div key={id} className="w-full max-w-sm" aria-disabled>
        {node}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {profile && profile.courses.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Course">
          {profile.courses.map((id: CourseId) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={data.activeCourse === id}
              onClick={() => setActiveCourse(id)}
              className={`clay clay-press px-4 py-2 font-display font-bold ${
                data.activeCourse === id
                  ? id === 'ru'
                    ? 'border-ru bg-red-50'
                    : 'border-es bg-amber-50'
                  : ''
              }`}
            >
              {courses[id].flag} {courses[id].name}
            </button>
          ))}
        </div>
      )}

      <VoiceWarning lang={course.ttsLang} courseName={course.name} />

      {course.id === 'ru' && !alphabetDone('ru', completions) && (
        <Link to="/alphabet" className="clay clay-press block border-ru bg-red-50 p-4">
          <p className="font-display text-lg font-bold">Start here: the Cyrillic alphabet</p>
          <p className="text-fg-muted">Russian is phonetic — learn the letters first and every lesson gets easier. Five short drills.</p>
        </Link>
      )}

      <Link to={`/placement/${course.id}`} className="clay clay-press flex items-center gap-4 border-gold bg-amber-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-amber-700 bg-gold text-white">
          <GraduationCap aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">
            {Object.keys(completions).length === 0 ? 'Placement Test' : 'Level Test'}
          </span>
          <span className="text-sm text-fg-muted">
            {Object.keys(completions).length === 0
              ? `Already know some ${course.name}? Skip ahead.`
              : 'Test your level and unlock higher lessons'}
          </span>
        </span>
      </Link>

      {/* Roadmap overview */}
      <div className="clay overflow-hidden">
        <button
          type="button"
          onClick={() => setRoadmapOpen((v) => !v)}
          className="flex w-full items-center justify-between p-4"
        >
          <span className="font-display text-lg font-bold">Roadmap</span>
          {roadmapOpen
            ? <ChevronUp className="size-5 text-fg-muted" aria-hidden />
            : <ChevronDown className="size-5 text-fg-muted" aria-hidden />}
        </button>
        {roadmapOpen && (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {unitProgress.map(({ unit, total, completed }) => {
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0
              const unitRef = `unit-${unit.id}`
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setRoadmapOpen(false)
                    document.getElementById(unitRef)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="clay clay-press flex items-center gap-3 p-3 text-left"
                >
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    pct === 100 ? 'bg-accent text-on-primary' : 'bg-primary/10 text-primary'
                  }`}>
                    {unit.level}
                  </span>
                  <span className="grow">
                    <span className="block text-sm font-bold">{unit.title}</span>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-border-soft">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-accent' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </span>
                  <span className="text-xs text-fg-muted">{completed}/{total}</span>
                  {unit.locked && (
                    <Lock className="size-3.5 text-fg-muted" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Link to="/flashcards" className="clay clay-press flex items-center gap-4 border-ru bg-red-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-red-700 bg-ru text-white">
          <Layers aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">Flashcards by topic</span>
          <span className="text-sm text-fg-muted">Flip cards for travel, shopping, friends &amp; more — with audio</span>
        </span>
      </Link>

      <Link to="/topic-lesson" className="clay clay-press flex items-center gap-4 border-primary bg-indigo-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-indigo-700 bg-primary text-on-primary">
          <Wand2 aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">Topic Lesson</span>
          <span className="text-sm text-fg-muted">AI-generated vocab on any topic</span>
        </span>
      </Link>

      <Link to="/scenario-lesson" className="clay clay-press flex items-center gap-4 border-accent bg-emerald-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-green-700 bg-accent text-on-primary">
          <Theater aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">Scenario Lesson</span>
          <span className="text-sm text-fg-muted">Practice real-life situations with AI dialogues</span>
        </span>
      </Link>

      <Link to="/read" className="clay clay-press flex items-center gap-4 border-primary bg-indigo-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-indigo-700 bg-primary text-on-primary">
          <BookOpen aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">Read</span>
          <span className="text-sm text-fg-muted">Stories &amp; dialogues — tap any word to learn it</span>
        </span>
      </Link>

      <Link to="/phrasebook" className="clay clay-press flex items-center gap-4 border-accent bg-emerald-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-green-700 bg-accent text-on-primary">
          <MessagesSquare aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">Phrasebook</span>
          <span className="text-sm text-fg-muted">Survival phrases for real situations</span>
        </span>
      </Link>

      <Link to="/point-learn" className="clay clay-press flex items-center gap-4 border-gold bg-amber-50 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-3 border-amber-700 bg-gold text-white">
          <Camera aria-hidden />
        </span>
        <span className="grow text-left">
          <span className="block font-display text-lg font-bold">Point &amp; Learn</span>
          <span className="text-sm text-fg-muted">Snap a photo — AI labels objects in {course.name}</span>
        </span>
      </Link>

      {alphabetNodes.length > 0 && (
        <section id="unit-alphabet" className="flex flex-col gap-4">
          <div className="clay bg-primary p-4 text-on-primary">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold">The Cyrillic alphabet</h2>
              <span className="rounded-full border-2 border-on-primary/40 px-2 py-0.5 text-xs font-bold">A0</span>
            </div>
            <p className="text-sm opacity-90">Unit 0 — meet the 33 letters, group by group. Words come next.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            {alphabetNodes.map((n, i) => pathNode(n.id, n.title, `/alphabet/${n.id}`, i))}
          </div>
        </section>
      )}

      {course.units.map((unit) => (
        <section key={unit.id} id={`unit-${unit.id}`} className="flex flex-col gap-4">
          <div className={`clay bg-primary p-4 text-on-primary ${unit.locked ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold">{unit.title}</h2>
              <span className="rounded-full border-2 border-on-primary/40 px-2 py-0.5 text-xs font-bold">
                {unit.level}
              </span>
            </div>
            <p className="text-sm opacity-90">{unit.description}</p>
            {unit.locked && (
              <span className="mt-2 inline-block rounded-full bg-on-primary/20 px-2 py-0.5 text-xs font-bold">
                Coming soon
              </span>
            )}
          </div>
          {!unit.locked && unit.skills.map((skill) => {
            const Icon = skillIcons[skill.icon] ?? Sparkles
            return (
              <div key={skill.id} className="flex flex-col items-center gap-3">
                <h3 className="flex items-center gap-2 font-display font-bold text-fg-muted">
                  <Icon className="size-4" aria-hidden /> {skill.title}
                </h3>
                {skill.lessons.map((lesson) => {
                  lessonIndex++
                  return pathNode(lesson.id, lesson.title, `/lesson/${course.id}/${lesson.id}`, lessonIndex)
                })}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
