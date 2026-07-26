import { NavLink, Outlet } from 'react-router'
import { Map, Type, Dumbbell, BarChart3, Users } from 'lucide-react'
import { useProfiles } from '../state/profiles'
import { useProgress, computeStreak, todayKey } from '../state/progress'
import { Flame } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Learn', icon: Map },
  { to: '/alphabet', label: 'Alphabet', icon: Type, ruOnly: true },
  { to: '/review', label: 'Practice', icon: Dumbbell },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
]

export function Layout() {
  const { profiles, activeProfileId, switchProfile } = useProfiles()
  const profile = profiles.find((p) => p.id === activeProfileId)
  const data = useProgress((s) => s.data)
  const streak = computeStreak(data.dailyLog, data.dailyGoalMinutes)
  const todayMinutes = data.dailyLog[todayKey()]?.minutes ?? 0
  const goalPct = Math.min(100, Math.round((todayMinutes / data.dailyGoalMinutes) * 100))

  const visibleTabs = tabs.filter((t) => !t.ruOnly || data.activeCourse === 'ru')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => switchProfile(null)}
          className="clay clay-press flex items-center gap-2 px-3 py-1.5"
          aria-label={`Switch profile (current: ${profile?.name})`}
        >
          <span className="text-2xl" aria-hidden>{profile?.avatar}</span>
          <span className="font-display font-bold">{profile?.name}</span>
          <Users className="size-4 text-fg-muted" aria-hidden />
        </button>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-display text-lg font-bold text-gold" title={`${streak}-day streak`}>
            <Flame className={`size-5 ${streak > 0 ? 'fill-gold' : ''}`} aria-hidden /> {streak}
          </span>
          <div
            className="relative size-11 rounded-full"
            role="progressbar"
            aria-valuenow={goalPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Daily goal ${goalPct}%`}
            style={{
              background: `conic-gradient(var(--color-accent) ${goalPct * 3.6}deg, var(--color-border-soft) 0deg)`,
            }}
          >
            <div className="absolute inset-1 flex items-center justify-center rounded-full bg-bg text-xs font-bold">
              {Math.floor(todayMinutes)}m
            </div>
          </div>
        </div>
      </header>

      <main className="grow px-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t-4 border-border-soft bg-surface" aria-label="Main">
        <div className="mx-auto flex w-full max-w-3xl">
          {visibleTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 grow flex-col items-center justify-center gap-0.5 font-bold ${
                  isActive ? 'text-primary' : 'text-fg-muted'
                }`
              }
            >
              <Icon aria-hidden className="size-6" />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
