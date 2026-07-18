import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useProfiles } from './state/profiles'
import { useProgress } from './state/progress'
import { ProfilePicker } from './app/ProfilePicker'
import { Layout } from './app/Layout'
import { PathScreen } from './app/PathScreen'
import { LessonScreen } from './app/LessonScreen'
import { PlacementScreen } from './app/PlacementScreen'
import { AlphabetScreen } from './app/AlphabetScreen'
import { ReviewScreen } from './app/ReviewScreen'
import { StatsScreen } from './app/StatsScreen'
import { TopicPickerScreen } from './app/TopicPickerScreen'
import { TopicLessonScreen } from './app/TopicLessonScreen'
import { ScenarioPickerScreen } from './app/ScenarioPickerScreen'
import { ScenarioLessonScreen } from './app/ScenarioLessonScreen'
import { PointLearnScreen } from './app/PointLearnScreen'
import { ReadingPickerScreen } from './app/ReadingPickerScreen'
import { ReadingScreen } from './app/ReadingScreen'
import { PhrasebookScreen } from './app/PhrasebookScreen'

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
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/topic-lesson" element={<TopicPickerScreen />} />
          <Route path="/scenario-lesson" element={<ScenarioPickerScreen />} />
          <Route path="/read" element={<ReadingPickerScreen />} />
          <Route path="/phrasebook" element={<PhrasebookScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
