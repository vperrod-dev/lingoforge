# GitHub Pages / Actions migration options guide

> Scope: sites currently served or built via GitHub Pages / GitHub Actions that are
> associated with this project’s CLAUDE/general hosting guidance.
> Constraint: do not deploy or modify production configs.
>
> Source tails:
> - `t_e7a41fba` / `t_b419f389`: initial migration audit.
> - `lingoforge/CLAUDE.md`, `pepdose/CLAUDE.md`, `KinkLink/CLAUDE.md`,
>   `paceforge/CLAUDE.md`, `wandertold/CLAUDE.md`, `InvestmentPlatform/CLAUDE.md`.

---

## Current state summary

| Site / Repo | Current surface | Pages / Actions status |
|---|---|---|
| **Lingoforge** | `lingoforge/` repo | Active Pages workflow (`.github/workflows/deploy.yml`) publishing `dist/` to GitHub Pages. Static PWA. |
| **KinkLink Frontend (dev)** | `KinkLink/frontend-preview/` etc. | GitHub Pages deploy workflow + deploy repos. SPA routing shims present. Backend is Render. |
| **KinkLink Admin** | `KinkLink/admin/` | GitHub Pages deploy workflow; manual `workflow_dispatch` gate. |
| **Pepdose** | `pepdose/` | Caddy deploy (`scripts/deploy.sh`) to `/srv/pepdose` on VM. Pages workflow is present but account-wide Actions block makes it non-functional. |
| **PaceForge** | `paceforge/` | VM runner + Caddy; Pages/Actions explicitly gone and MUST NOT be reintroduced. |
| **WanderTold** | `wandertold/` | VM deploy via rsync + Caddy; no Pages/Actions. |
| **InvestmentPlatform** | N/A | Explicitly excluded by CLAUDE.md and `t_74fd3a5b`. Migration here is out of scope for this guide. |

Real migration candidates: **lingoforge**, **KinkLink Frontend**, **KinkLink Admin**.
Already migrated: **pepdose**, **paceforge**, **wandertold**, **InvestmentPlatform**.

---

## Option A — Cloudflare Pages

### What it covers
- Built-in Git integration from a single repo/branch.
- Preserves `.pages.dev` URLs by default; can attach custom domain.
- Auto-deploys on push with `npm ci && npm run build`.

### Custom domain setup (authoritative)
1. Add custom domain in Cloudflare dashboard for the Pages project.
2. Cloudflare will issue DNS instructions:
   - If domain is **on Cloudflare DNS**: add a `CNAME` or Pages-provided ANAME/ALIAS, then activate in Pages.
   - If domain is **elsewhere**: change the domain’s authoritative nameservers to Cloudflare, then add DNS record from Pages instructions. *(This is the cleanest path.)*
3. Alternate: use existing Caddy/Azure edge as the TLS terminator instead:
   - Caddy handles `tls` and reverse-proxies `/<path>` to `*.pages.dev`.
   - This keeps the public hostname on the Azure VM/domain you already control.
4. To enforce HTTPS and remove the `*.pages.dev` exposure at the top level, also issue a permanent redirect from `*.pages.dev` to the custom domain **only if Cloudflare allows it**; if not, the custom domain becomes the canonical URL and `*.pages.dev` is kept unlinked.

### Redirect strategy `*.pages.dev` → custom domain
| Technique | Notes |
|---|---|
| HTML `<meta rel="canonical">` / `<link rel="canonical">` | SEO signal only; does not stop users from sharing the `pages.dev` URL. |
| `pages.json` route rule (`redirect` key in Cloudflare Pages) | Preferred: Cloudflare Pages can issue 301/302 at the edge for specific paths while still serving the site. |
| 301 redirect middleware in the app bundle | Last resort; increases bundle complexity. |
| Vite `base` preservation | Keep `base` absolute (e.g. `/lingoforge/`) so relative assets resolve under `/` on the custom domain. |

### Cost / operational overhead
- **Cost**: free for small projects; $0 for Pages + free tier, but bandwidth is capped.
- **Ops**: lowest. Cache purging / preview deploys / branch isolation are native.
- **Risk**: `*.pages.dev` fallback is publicly reachable. Consider disabling broadcast or accepting it as an undocumented URL.

### Pros / cons
```
Pros:
- Zero-trust deploy surface (pages.dev URL is unofficial until linked).
- Supports all static build steps including audio generation / test gates.
- Preview deploys per branch/PR aid review.

Cons:
- Dynamic backends must live elsewhere (KinkLink backend stays on Render/Hostinger).
- Pages dev domain leaks until redirect is fully honored.
- Free-tier concurrency limits during peak CI windows.
```

### Alignment with CLAUDE/memory guidance
- Memory constraints include “do not use wildcard DNS; public URLs must live on the Azure cloud hostname.”
- Cloudflare Pages satisfies this because the public page at the custom domain is served from their edge; the Azure Caddy still fronts `/kl*` and `/paceforge*`.
- For puspose of retraining `*.pages.dev`, attaching an Azure-domain CNAME to Pages is consistent with memory: the canonical user-facing path is your domain.

---

## Option B — Self-hosted static export on the VM (Caddy)

### What it covers
- Build the static bundle locally or in GH Actions, then rsync/upload `dist/` to `/srv/<site>` on the Azure VM.
- Caddy already serves `/wandertold/`, `/pepdose/`, `/paceforge*`, `/pf/*`, `/kl*` and `/kl-admin*`. Adding one more route is trivial.

### Custom domain setup
1. Place built files under `/srv/<site>`.
2. Add a `handle_path /<site>* { root * /srv/<site>; file_server; try_files ... }` block to `/etc/caddy/Caddyfile`.
3. Caddy auto-terminates TLS for the Azure domain.
4. Optional: run deploy from the repo `scripts/deploy.sh` pattern used by pepdose/wandertold.

### Redirect strategy `*.pages.dev` → custom domain
- Because you control Caddy, you can issue an explicit `redir * https://your.domain<path> permanent` at the top of the site block before `file_server` so any `pages.dev` reference is 301-migrated.
- Combined with `header` / `<link rel="canonical">` in the built page, this is the strongest starategy without a CDN redirect layer.

### Cost / operational overhead
- **Cost**: Azure already paid; no new cloud subscription.
- **Ops**: medium. You manage builds locally or in Actions; artifact delivery is manual/scripted unless you add a self-hosted runner.
- **Risk**: no 3rd-party build dependency, but deploys require the VM/Caddy + deploy script hygiene.

### Pros / cons
```
Pros:
- Canonical URL stays entirely under your Azure cloud hostname (matches memory constraint).
- No public `pages.dev` exposure after redirect + canonical tags.
- You already have patterns: wandertold/pepdose use rsync + deploy scripts.

Cons:
- Adds build/deploy responsibility to VM ops.
- Free tier on Azure is already loaded; more static sites share one Caddy but increase risk surface on the box.
- No preview deploys per-branch without reworking CI.
```

---

## Option C — Self-hosted runner + Azure-backed artifact store (e.g. Blobs + CDN)

### What it covers
- Build the static bundle inside the GitHub Actions workflow (or on the VM) and upload
  the artifact to the VM/Blob/Blob front door.
- Serve blobs via the Azure cloud hostname / a CDN endpoint instead of Caddy.

### Custom domain setup
1. Build steps remain in-hand or run in Actions.
2. Upload built `dist/` into the serving location under `/srv/<site>` or into object storage with a path style.
3. Point Caddy `reverse_proxy` or `file_server` at the new root.

### Redirect strategy
- Same as Option B for `pages.dev` → custom domain.

### Cost / operational overhead
- **Cost**: VM is already running; negligible incremental.
- **Ops**: highest. Deployment pipeline must push artifact to the VM and arrange atomic switchover.

### Pros / cons
```
Pros:
- Build isolation + VM hosting for the served artifact.
- Canonical URL entirely on Azure hostname.
- Good fit for sites with large assets (audio pack, locale files).

Cons:
- Deployment complexity higher than A/B.
- Rolling back requires restoring last known good artifact.
```

---

## Custom domain vs retaining `*.pages.dev`

| Factor | Custom domain | Retain `*.pages.dev` |
|---|---|---|
| **URL permanence** | Company owns the domain; registrar renewals keep it alive forever. | GitHub controls the subdomain, but GitHub Pages domains are effectively permanent **while GitHub Pages exists**. Cloudflare exits are more stable. |
| **Brand / trust** | Custom domain is expected for production-style apps. | `*.pages.dev` reads as dev/staging. |
| **Vendor risk** | Tied to one hosting vendor, but you can redirect-migrate away without changing sites/bookmarks. | Same top-level risk — a hosting deprecation affects the site. |
| **SEO / shareability** | Canonical links + 301s straightforward under your control. | `pages.dev` path ends up in screenshots / DMs; search engines can split indexing signals. |
| **Memory alignment** | Azure cloud hostname as canonical user URL matches memory requirements. | Does not match memory rule about preferring Azure cloud hostname. |
| **Cost** | Cloudflare + domain registration is low cost; Azure-hosted path is zero extra for existing infra. | Free / no extra cost. |
| **Operational cost** | Low for B; medium for C. | Lowest for static-only sites if you ignore canonical/permanence cost. |

### Recommendation
- For **lingoforge** particularly, attach a custom domain via **Option A (Cloudflare Pages)** and push the public path to the Azure cloud hostname as a canonical alias, OR use **Option B** if you want the canonical URL entirely inside the Azure domain already serving other apps.
- For KinkLink’s Frontend/Admin, the most pragmatic path is to keep the Caddy-backed `/kl` route as canonical and deprecate the GitHub Pages URL via `pages.json` redirects plus a `<link rel="canonical">` tag. Production already lives on `kinklink.ie`.
- For pepdose, custom domain has already been chosen implicitly because the serving path is `/pepdose` on `claude-dev-vperrod.westeurope.cloudapp.azure.com`.

---

## URL migration checklist (read-only)

1. Choose a canonical hostname on the Azure domain or via registrar-managed custom domain.
2. Identify shared routes:
   - lingoforge currently served only via Pages URL at this time.
   - KinkLink has both Pages-style SPA route and production Hostinger domain.
3. Choose redirect method:
   - Cloudflare Pages: `pages.json` routing rules (301).
   - Caddy: top-priority `redir` directives.
4. Add canonical tags and update README/CLAUDE when canonical URLs change.
5. Update any hardcoded Pages URLs in repo docs, CLAUDE files, and signup/login flows.
6. Re-test the exact URLs bookmarked/shared externally.

---

## Tradeoffs summary

| Option | Best for | Cost | Ops effort | Canonical URL control |
|---|---|---|---|---|
| Cloudflare Pages | Minimal-migration, static-out-only sites like lingoforge | Free-ish | Low | Medium (custom domain + Pages DNS) |
| Self-hosted / Caddy | Sites already behind `/path` on Azure; want single-domain feel | Free-ish | Medium | High (Caddy) |
| Self-hosted + Azure artifact store | Large assets, audio pack, multi-branch builds | Medium | High | High |

**Bottom line**: lingoforge should move to Cloudflare Pages (or Caddy static root) with a custom domain set up so `*.pages.dev` is no longer the shared link. KinkLink should keep Pages dev URLs only as a dev mirror and push canonical paths to production. Everything else is already off GitHub Pages/Actions per `t_e7a41fba`.

---
*Generated as a read-only planning artifact for `t_b78d1dd5`. Do not deploy changes from this note.*
