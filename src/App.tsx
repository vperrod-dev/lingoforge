import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router'
import { useProfiles } from './state/profiles'
import { useProgress } from './state/progress'
import { ProfilePicker } from './app/ProfilePicker'
import { Layout } from './app/Layout'
import { PathScreen } from './app/PathScreen'
import { LessonScreen } from './app/LessonScreen'
import { ReviewScreen } from './app/ReviewScreen'
import { TopicPickerScreen } from './app/TopicPickerScreen'
import { ScenarioPickerScreen } from './app/ScenarioPickerScreen'

// Screens a learner reaches only by choosing them: kept out of the initial
// bundle so the path screen (and the camera/AI-only screens most users never
// open) do not share one download.
const PlacementScreen = lazy(() => import('./app/PlacementScreen').then((m) => ({ default: m.PlacementScreen })))
const TopicLessonScreen = lazy(() => import('./app/TopicLessonScreen').then((m) => ({ default: m.TopicLessonScreen })))
const ScenarioLessonScreen = lazy(() => import('./app/ScenarioLessonScreen').then((m) => ({ default: m.ScenarioLessonScreen })))
const PointLearnScreen = lazy(() => import('./app/PointLearnScreen').then((m) => ({ default: m.PointLearnScreen })))
const ReadingScreen = lazy(() => import('./app/ReadingScreen').then((m) => ({ default: m.ReadingScreen })))
const ReadingPickerScreen = lazy(() => import('./app/ReadingPickerScreen').then((m) => ({ default: m.ReadingPickerScreen })))
const PhrasebookScreen = lazy(() => import('./app/PhrasebookScreen').then((m) => ({ default: m.PhrasebookScreen })))
const FlashcardsScreen = lazy(() => import('./app/FlashcardsScreen').then((m) => ({ default: m.FlashcardsScreen })))
const StatsScreen = lazy(() => import('./app/StatsScreen').then((m) => ({ default: m.StatsScreen })))
const AlphabetScreen = lazy(() => import('./app/AlphabetScreen').then((m) => ({ default: m.AlphabetScreen })))

export default function App() {
  const { profiles, activeProfileId } = useProfiles()
  const profile = profiles.find((p) => p.id === activeProfileId)
  const loadForProfile = useProgress((s) => s.loadForProfile)
  const loadedProfileId = useProgress((s) => s.profileId)
  const storageError = useProgress((s) => s.storageError)

  useEffect(() => {
    if (profile) loadForProfile(profile.id, profile.courses[0])
  }, [profile, loadForProfile])

  if (!profile) return <ProfilePicker />
  // wait until the right profile's progress is in the store
  if (loadedProfileId !== profile.id) return null

  return (
    <HashRouter>
      {storageError && (
        <div role="alert" className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          Storage is full — your progress can’t be saved. Free up space or export a backup from Stats.
        </div>
      )}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/lesson/:courseId/:lessonId" element={<LessonScreen />} />
          <Route path="/placement/:courseId" element={<PlacementScreen />} />
          <Route path="/topic-lesson/play" element={<TopicLessonScreen />} />
          <Route path="/scenario-lesson/play" element={<ScenarioLessonScreen />} />
          <Route path="/point-learn" element={<PointLearnScreen />} />
          <Route path="/read/:courseId/:textId" element={<ReadingScreen />} />
          <Route element={<Layout />}>
            <Route path="/" element={<PathScreen />} />
            <Route path="/alphabet" element={<AlphabetScreen />} />
            <Route path="/alphabet/:drillId" element={<AlphabetScreen />} />
            <Route path="/review" element={<ReviewScreen />} />
            <Route path="/flashcards" element={<FlashcardsScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/topic-lesson" element={<TopicPickerScreen />} />
            <Route path="/scenario-lesson" element={<ScenarioPickerScreen />} />
            <Route path="/read" element={<ReadingPickerScreen />} />
            <Route path="/phrasebook" element={<PhrasebookScreen />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
