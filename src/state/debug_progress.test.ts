import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const fixturesDir = path.join('test', 'fixtures', 'progress')
const readFixture = (name: string): string =>
  fs.readFileSync(path.join(fixturesDir, name), 'utf8')

const data = JSON.parse(readFixture('valid-full.json'))
console.log(JSON.stringify(data, null, 2))
console.log('courses exists', 'courses' in data, data.courses)
console.log('courses.ru exists', 'ru' in (data.courses || {}))

import { isProgressData } from './src/state/progress'

describe('debug', () => {
  it('debug', () => {
    console.log('result', isProgressData(data))
    expect(true).toBe(true)
  })
})
