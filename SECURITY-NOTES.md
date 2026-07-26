# Security notes

## GHSA-qwww-vcr4-c8h2 — React Router RSC Mode CSRF Bypass — RESOLVED / not applicable (2026-07-26)

Resolved: migrated `react-router-dom` (v7) to `react-router` ^8.3.0 (commit 07cc0bd). `npm audit` no longer reports this advisory.

Not applicable regardless: LingoForge is a client-only SPA using `HashRouter` (see `src/App.tsx`) with only `Routes`/`Route`/`Link`/`NavLink`/`useNavigate`/`useParams`. It has no `createBrowserRouter`, no route `loader`/`action` data functions, and no React Server Components. The advisory affects only RSC / framework data-loading mode, which this app does not use.

Nightly auto-repair: stop re-bumping react-router for this advisory — it is cleared and not exploitable here.

## npm audit dev-tree advisories (2026-07-26)

`npm audit fix` (non-breaking) applied: `fast-uri` 3.1.2 → 3.1.4, `brace-expansion` 5.0.6 → 5.0.8 and 2.1.1 → 2.1.2, clearing the postcss and fast-uri reports.

Remaining: **GHSA-mh99-v99m-4gvg** (brace-expansion DoS) via `vite-plugin-pwa → workbox-build → @trickfilm400/rollup-plugin-off-main-thread → ejs → jake → filelist`. ACCEPTED, not fixed:

- Dev-only dependency — it never ships in `dist/`.
- The only input it expands is our own build-time file list, not attacker-controlled data, so the unbounded-expansion OOM has no reachable trigger.
- The sole remedy is `npm audit fix --force`, which downgrades/breaks `vite-plugin-pwa` — a real regression risk to the service worker for a non-exploitable dev advisory.

Re-evaluate when `vite-plugin-pwa` ships a release with a patched `workbox-build` chain.
