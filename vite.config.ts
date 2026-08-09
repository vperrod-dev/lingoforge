/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:single` produces one self-contained HTML file (no PWA/SW —
// service workers don't run on file://)
// The single-file build inlines every script and runs from file://, where the
// meta CSP ('self' = the null origin) blocks the whole app. Drop it there.
const stripCspMeta = {
  name: 'strip-csp-meta',
  transformIndexHtml: (html: string) =>
    html.replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, ''),
}

export default defineConfig(({ mode }) => {
  const singleFile = mode === 'singlefile'
  const ollamaUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_OLLAMA_URL || 'http://localhost:11434'

  // Keeps the CSP connect-src in sync with services/ollama.ts's BASE_URL so a
  // build pointed at a remote Ollama instance (VITE_OLLAMA_URL) doesn't get
  // silently blocked by a CSP still hardcoded to localhost.
  const templateCsp = {
    name: 'template-csp-ollama-url',
    transformIndexHtml: (html: string) => html.replace('__OLLAMA_URL__', ollamaUrl),
  }

  return {
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    templateCsp,
    ...(singleFile
      ? [viteSingleFile(), stripCspMeta]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            workbox: {
              runtimeCaching: [
                {
                  urlPattern: /\/audio\/.+\.mp3$/,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'lingoforge-audio-v1',
                    expiration: { maxEntries: 600 },
                  },
                },
              ],
            },
            manifest: {
              name: 'LingoForge',
              short_name: 'LingoForge',
              description: 'Learn Russian and Spanish with games, SRS and daily goals',
              theme_color: '#4F46E5',
              background_color: '#EEF2FF',
              display: 'standalone',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
              ],
            },
          }),
        ]),
  ],
  build: singleFile ? { outDir: 'dist-single' } : {},
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  }
})
