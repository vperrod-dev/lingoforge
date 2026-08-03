import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'src/state/progress.json-input-security.test.ts'],
  },
})
