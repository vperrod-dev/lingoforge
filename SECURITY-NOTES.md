# Security notes

## GHSA-qwww-vcr4-c8h2 — React Router RSC Mode CSRF Bypass — RESOLVED / not applicable (2026-07-26)

Resolved: migrated `react-router-dom` (v7) to `react-router` ^8.3.0 (commit 07cc0bd). `npm audit` no longer reports this advisory.

Not applicable regardless: LingoForge is a client-only SPA using `HashRouter` (see `src/App.tsx`) with only `Routes`/`Route`/`Link`/`NavLink`/`useNavigate`/`useParams`. It has no `createBrowserRouter`, no route `loader`/`action` data functions, and no React Server Components. The advisory affects only RSC / framework data-loading mode, which this app does not use.

Nightly auto-repair: stop re-bumping react-router for this advisory — it is cleared and not exploitable here.
