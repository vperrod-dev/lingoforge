import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Scoped to src/ so gitignored sibling checkouts (KinkLink_*) aren't collected.
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/state/progress.json-input-security.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
})
