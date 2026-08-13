// @vitest-environment jsdom
// The scenario lesson payload is read back from sessionStorage, where a stale or corrupted
// value would otherwise reach scenarioToExercises and crash the screen mid-render.
// Same guard contract as TopicLessonScreen.test.tsx.
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../audio/sfx', () => ({ playFanfare: vi.fn(), playCorrect: vi.fn(), playWrong: vi.fn() }))
vi.mock('../exercises/render', () => ({
  renderExercise: () => <button type="button">right</button>,
}))

import { ScenarioLessonScreen } from './ScenarioLessonScreen'

const scenarioLesson = {
  scenario: 'Ordering coffee',
  ttsLang: 'es-ES',
  data: {
    title: 'At the café',
    culturalTip: 'Coffee is served small and strong.',
    vocab: [
      { word: 'café', translation: 'coffee', pronunciation: 'kah-FEH' },
      { word: 'leche', translation: 'milk', pronunciation: 'LEH-cheh' },
      { word: 'azúcar', translation: 'sugar', pronunciation: 'ah-SOO-kar' },
      { word: 'taza', translation: 'cup', pronunciation: 'TAH-sah' },
    ],
    phrases: [{ phrase: 'Un café, por favor', translation: 'A coffee, please', usage: 'ordering' }],
    dialogue: [
      { speaker: 'other', line: '¿Qué desea?', translation: 'What would you like?' },
      { speaker: 'you', line: 'Un café, por favor', translation: 'A coffee, please' },
    ],
  },
}

function renderScreen() {
  render(
    <MemoryRouter>
      <ScenarioLessonScreen />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  sessionStorage.removeItem('scenarioLesson')
})

describe('ScenarioLessonScreen', () => {
  it('plays the lesson for a well-formed payload', () => {
    sessionStorage.setItem('scenarioLesson', JSON.stringify(scenarioLesson))
    renderScreen()
    expect(screen.queryByText('No scenario lesson data found.')).toBeNull()
  })

  it('shows the no-data fallback instead of crashing on a malformed payload', () => {
    sessionStorage.setItem('scenarioLesson', JSON.stringify({ scenario: 'Ordering coffee' }))
    renderScreen()
    expect(screen.getByText('No scenario lesson data found.')).toBeTruthy()
  })

  it('shows the no-data fallback when vocab items are the wrong shape', () => {
    sessionStorage.setItem(
      'scenarioLesson',
      JSON.stringify({ ...scenarioLesson, data: { ...scenarioLesson.data, vocab: ['café'] } }),
    )
    renderScreen()
    expect(screen.getByText('No scenario lesson data found.')).toBeTruthy()
  })
})
