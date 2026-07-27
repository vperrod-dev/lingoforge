import { useRef } from 'react'
import { Link } from 'react-router'
import { Download, Upload, Zap, BookOpen, Flame, Footprints, Library, Trophy, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useProgress, computeStreak, todayKey } from '../state/progress'
import { BADGES } from '../state/badges'
import { useProfiles } from '../state/profiles'
import { ClayButton } from '../ui/ClayButton'

const badgeIcons: Record<string, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  'book-open': BookOpen,
  library: Library,
  zap: Zap,
  trophy: Trophy,
  type: Type,
}

function lastNDays(n: number): string[] {
  const days: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    days.push(todayKey(day))
  }
  return days
}

export function StatsScreen() {
  const data = useProgress((s) => s.data)
  const { setDailyGoal, exportData, importData } = useProgress()
  const { profiles, activeProfileId } = useProfiles()
  const profile = profiles.find((p) => p.id === activeProfileId)
  const fileInput = useRef<HTMLInputElement>(null)

  const streak = computeStreak(data.dailyLog, data.dailyGoalMinutes)
  const totalWords = Object.values(data.courses).reduce(
    (sum, c) => sum + Object.keys(c?.srsItems ?? {}).length,
    0,
  )
  const week = lastNDays(7)
  const maxMinutes = Math.max(data.dailyGoalMinutes, ...week.map((d) => data.dailyLog[d]?.minutes ?? 0))
  const heatmap = lastNDays(28)

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lingoforge-${profile?.name ?? 'progress'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    const name = profile?.name ?? 'the active profile'
    if (!confirm(`Import "${file.name}"? This replaces all of ${name}'s current progress (XP, streaks, badges, word reviews) and cannot be undone.`)) return
    const ok = importData(await file.text())
    if (!ok) alert('Could not import — invalid file.')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Your progress</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="clay flex flex-col items-center gap-1 p-4">
          <Zap className="size-6 text-gold" aria-hidden />
          <span className="font-display text-2xl font-bold tabular-nums">{data.xp}</span>
          <span className="text-xs text-fg-muted">total XP</span>
        </div>
        <div className="clay flex flex-col items-center gap-1 p-4">
          <Flame className={`size-6 text-gold ${streak > 0 ? 'fill-gold' : ''}`} aria-hidden />
          <span className="font-display text-2xl font-bold tabular-nums">{streak}</span>
          <span className="text-xs text-fg-muted">day streak</span>
        </div>
        <div className="clay flex flex-col items-center gap-1 p-4">
          <BookOpen className="size-6 text-primary" aria-hidden />
          <span className="font-display text-2xl font-bold tabular-nums">{totalWords}</span>
          <span className="text-xs text-fg-muted">words learning</span>
        </div>
      </div>

      <section className="clay flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl font-bold">Daily goal</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="Daily goal in minutes">
          {[5, 10, 15, 20].map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={data.dailyGoalMinutes === m}
              onClick={() => setDailyGoal(m)}
              className={`clay clay-press grow py-2 font-bold ${
                data.dailyGoalMinutes === m ? 'border-primary bg-primary text-on-primary' : ''
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <p className="text-sm text-fg-muted">
          15–20 minutes a day beats weekend marathons. Consistency is the whole game.
        </p>
      </section>

      <section className="clay flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl font-bold">This week (minutes)</h2>
        <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
          {week.map((day) => {
            const minutes = data.dailyLog[day]?.minutes ?? 0
            const pct = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0
            const met = minutes >= data.dailyGoalMinutes
            return (
              <div key={day} className="flex grow flex-col items-center gap-1" title={`${day}: ${Math.round(minutes)} min`}>
                <div className="flex w-full grow items-end">
                  <div
                    className={`w-full rounded-t-lg border-2 border-b-0 ${
                      met ? 'border-green-700 bg-accent' : 'border-border-soft bg-primary-soft'
                    }`}
                    style={{ height: `${Math.max(pct, minutes > 0 ? 8 : 2)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-fg-muted">{day.slice(8)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="clay flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl font-bold">Streak calendar (4 weeks)</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmap.map((day) => {
            const log = data.dailyLog[day]
            const met = (log?.minutes ?? 0) >= data.dailyGoalMinutes || (log?.lessons ?? 0) > 0
            const some = (log?.minutes ?? 0) > 0 || (log?.lessons ?? 0) > 0
            return (
              <div
                key={day}
                title={`${day}: ${Math.round(log?.minutes ?? 0)} min, ${log?.lessons ?? 0} lessons`}
                className={`aspect-square rounded-md border-2 ${
                  met
                    ? 'border-green-700 bg-accent'
                    : some
                      ? 'border-border-soft bg-accent-soft'
                      : 'border-border-soft bg-bg'
                }`}
              />
            )
          })}
        </div>
      </section>

      <section className="clay flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl font-bold">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((badge) => {
            const Icon = badgeIcons[badge.icon] ?? Trophy
            const earned = Boolean(data.badges[badge.id])
            return (
              <div
                key={badge.id}
                className={`clay flex flex-col items-center gap-1 p-4 text-center ${earned ? 'border-gold' : 'opacity-40'}`}
              >
                <Icon className={`size-7 ${earned ? 'text-gold' : 'text-fg-muted'}`} aria-hidden />
                <span className="font-display font-bold">{badge.title}</span>
                <span className="text-xs text-fg-muted">{badge.description}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="clay flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl font-bold">Placement test</h2>
        <p className="text-sm text-fg-muted">Re-assess your level and skip ahead on the path.</p>
        <Link to={`/placement/${data.activeCourse}`}>
          <ClayButton>Retake placement test</ClayButton>
        </Link>
      </section>

      <section className="clay flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl font-bold">Backup</h2>
        <div className="flex gap-3">
          <ClayButton onClick={doExport}>
            <span className="flex items-center gap-2"><Download className="size-4" aria-hidden /> Export</span>
          </ClayButton>
          <ClayButton onClick={() => fileInput.current?.click()}>
            <span className="flex items-center gap-2"><Upload className="size-4" aria-hidden /> Import</span>
          </ClayButton>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              void doImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
