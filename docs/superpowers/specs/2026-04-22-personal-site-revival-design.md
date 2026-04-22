# Personal Site Revival — Design Spec

**Date:** 2026-04-22
**Status:** Approved through design; ready for implementation planning
**Owner:** Wenji Zhang
**Site:** `zwjmosquito.github.io`

## Summary

Revive the dormant personal site (last updated 2017-11-16) as a quiet, journal-style personal website. The flagship feature is an interactive map that visualizes cumulative Strava cycling distance as progress along a virtual route from Seattle to Dali, China.

All 2017 content (LintCode/LeetCode posts, NexT theme, Hexo-generated HTML) is being replaced. The old output is preserved on an `archive-2017` branch for reference.

## Goals

1. Replace the 2017 coding-problems blog with a personal/life site (journal, cycling, stores).
2. Make cycling progress a living, visible narrative via a Seattle→Dali virtual journey map.
3. Keep authoring simple: write Markdown, commit, push, live in minutes.
4. Keep the site fast, quiet in tone, and maintainable by one person.

## Non-goals

- Work, career, portfolio, or résumé content.
- Multi-author workflows, comments, tags/categories, search, RSS (all can be added later if needed).
- Photography gallery, speaking/hackathon sections (Bloomfolio's portfolio sections get stripped).
- Backporting or preserving any 2017 content in the live site.

## Scope

**In:** Content infrastructure (Astro + content collections), four pages (Journal, Cycling, Stores, About), Strava sync pipeline, map visualization, deployment via GitHub Actions to GitHub Pages, archiving of the 2017 site.

**Out (for this phase):** Custom domain, internationalization, photo galleries, commenting, RSS, analytics, newsletter.

## Architecture

### Stack

- **Astro 5** — static site generator, islands architecture
- **Tailwind CSS 4** — styling
- **DaisyUI** — component/theme system (inherited from Bloomfolio base)
- **Leaflet** + **OpenStreetMap** tiles — map rendering (free, no API key)
- **Node.js** — required for build (user does not currently have Node installed locally; install as first implementation step)

### Base theme

Fork [Bloomfolio](https://github.com/lauroguedes/bloomfolio) (MIT, free) as the visual starting point. Customizations:

- Strip Bloomfolio's Work Experience, Education, Hackathon sections.
- Repurpose the "Projects" grid as the Stores page.
- Replace the landing page with a journal feed + cycling-progress teaser strip.
- Add a dedicated `/cycling/` page with the `<CyclingMap />` component.
- Swap fonts (see Visual Design).
- Add a custom DaisyUI theme named `butter` (see Visual Design) as the light-mode default.

### Repository structure

```
/                            # master branch = source code
├─ src/
│  ├─ content/
│  │  ├─ config.ts           # content collection schema
│  │  └─ journal/            # Markdown posts (YYYY-MM-DD-<slug>.md)
│  ├─ data/
│  │  ├─ strava.json         # generated, committed — source of truth for builds
│  │  └─ route.geojson       # pre-computed Seattle → Dali route
│  ├─ components/
│  │  ├─ CyclingMap.astro    # map island (client-loaded)
│  │  ├─ CyclingTeaser.astro # small stats strip for home page
│  │  ├─ JournalCard.astro
│  │  └─ ... (Bloomfolio components retained)
│  ├─ layouts/
│  │  ├─ BaseLayout.astro
│  │  └─ PostLayout.astro
│  ├─ pages/
│  │  ├─ index.astro         # journal feed + cycling teaser
│  │  ├─ cycling.astro       # full map
│  │  ├─ stores.astro        # store grid
│  │  ├─ about.astro
│  │  ├─ posts/[...slug].astro
│  │  └─ 404.astro
│  └─ styles/
│     └─ themes.css          # butter theme (DaisyUI)
├─ scripts/
│  ├─ sync-strava.mjs        # Strava API → strava.json
│  ├─ auth-strava.mjs        # one-time OAuth helper
│  └─ build-route.mjs        # one-time route.geojson generator
├─ public/                   # static assets (favicon, og images)
├─ .github/workflows/
│  ├─ deploy.yml             # build + deploy on push
│  └─ daily-sync.yml         # cron: sync Strava + rebuild
├─ astro.config.mjs
├─ tailwind.config.mjs
├─ package.json
└─ tsconfig.json
```

### Branch strategy

- **`master`** — source code. Replaces current contents.
- **`gh-pages`** — built site output, pushed automatically by Actions. Never edited by hand.
- **`archive-2017`** — snapshot of current `master` before the rewrite. Preserves the 2017 NexT-generated HTML (including the `2017/`, `archives/`, `css/`, `fancybox/`, `images/`, `js/`, `lib/`, `index.html` tree) for reference.

### Deployment

GitHub Actions workflow:
- **On push to `master`:** install, `astro build`, push `dist/` to `gh-pages` branch. GitHub Pages serves from `gh-pages`.
- **Daily cron (07:00 UTC):** run `sync-strava.mjs` with committed refresh token, commit the updated `strava.json` if changed, then trigger a build+deploy. This keeps the cycling map current even without manual commits.

## Information Architecture

### Pages

| Page | URL | Purpose |
|---|---|---|
| Journal (home) | `/` | Tiny hero (avatar + name + one-line tagline), cycling teaser strip, reverse-chronological journal feed |
| Post detail | `/posts/<slug>/` | Single Markdown post |
| Cycling | `/cycling/` | Seattle → Dali map, cumulative stats, recent rides list |
| Stores | `/stores/` | Card grid of stores (re-skinned Bloomfolio Projects) |
| About | `/about/` | One-page bio + social links |
| 404 | — | Friendly fallback |

### Navigation

Top bar: `[avatar]  Journal  Cycling  Stores  About  [theme toggle]`

### What's deliberately not here

Tags, categories, search, comments, RSS, photo gallery, work experience, résumé. Any of these can be added as future scope when a concrete need arises.

## Data Flow: Strava → Cycling Map

### Decisions locked in for this feature

- **Route shape:** Trans-Pacific via Alaska / Russia / northern China (cyclable-in-spirit path).
- **Activity types counted:** `Ride` only (outdoor). `VirtualRide` (Zwift etc.) excluded.
- **Start date for counting:** 2026-04-10. Rides before this date are ignored for progress.

### One-time setup

1. Create a Strava API application at [developers.strava.com](https://developers.strava.com) → obtain `client_id` + `client_secret`.
2. Run `scripts/auth-strava.mjs` locally once. It opens the Strava OAuth consent page, catches the redirect, exchanges the code for a refresh token, and prints the token.
3. Store three secrets in the GitHub Actions repo settings:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REFRESH_TOKEN`
4. Run `scripts/build-route.mjs` once to generate `src/data/route.geojson` from a set of waypoints (Seattle → Anchorage → Nome → Anadyr → Magadan → Harbin → Beijing → Xi'an → Chengdu → Dali, refined to coastline-hugging or highway-following polylines). The script outputs a dense polyline and records `route_total_km`. This file is committed and rarely regenerated.

### Sync script behavior (`scripts/sync-strava.mjs`)

Runs in CI on every build and on the daily cron. Flow:

1. Exchange `STRAVA_REFRESH_TOKEN` for a short-lived `access_token`.
2. Read existing `src/data/strava.json`. If present, use its `last_synced_ts` as the `after` parameter; otherwise default to `2026-04-10T00:00:00Z` (configured start date).
3. `GET /api/v3/athlete/activities?after=<ts>&per_page=200` with pagination.
4. Filter activities to `type == "Ride"`.
5. Map each to `{ id, start_date, distance_m, moving_time_s, name, map_polyline }`.
6. Merge into `strava.json`, dedupe by id.
7. Recompute:
   - `total_distance_m` = sum of filtered activities' `distance_m`
   - `total_km` = `total_distance_m / 1000`
   - `ride_count` = filtered activities count
   - `last_ride_date` = max `start_date`
   - `last_synced_ts` = now (ISO 8601)
8. Write `strava.json` back.
9. Exit 0. The workflow's next step commits `strava.json` if it changed.

### Why the JSON is committed

- Deterministic, reproducible builds.
- Site stays buildable even if Strava's API is down.
- Page visitors never hit Strava (no rate limits, no tokens exposed).
- `git log src/data/strava.json` becomes a simple audit trail of sync runs.

### `<CyclingMap />` component

An Astro island loaded only on `/cycling/`. Receives `strava.json` and `route.geojson` as props (resolved at build time). Renders a Leaflet map with:

- The full route as a faded tan polyline (`#d0bfa6`).
- The traveled portion — `min(total_km, route_total_km)` measured along the polyline — as a bright rust polyline (`#b85a3d`).
- A small rust bicycle marker at the current virtual position.
- A tooltip: `"247 km / 12,893 km — currently somewhere near Vancouver, BC"` (nearest-waypoint lookup for the descriptive label).
- Basemap: CartoDB Positron tiles (desaturated, cream-friendly).

**Distance interpolation** (the one piece of custom logic worth unit-testing):

```
function positionAlongRoute(routeCoords, targetKm) {
  // routeCoords: [[lng,lat], [lng,lat], ...]
  // Walk segments, accumulate great-circle distance (haversine),
  // find the segment containing targetKm, linearly interpolate
  // between its endpoints, return { lat, lng, nearestWaypoint }.
}
```

If `targetKm >= routeTotalKm`, pin to the Dali endpoint with a "arrived" flag.

### `<CyclingTeaser />` component

Small, static (no JS). Renders on the home page:

```
🚴  247 km / 12,893 km · 1.9% · currently near Vancouver, BC   See the map →
```

Reads the same `strava.json` at build time. No map — just a one-line status strip above the journal feed.

## Visual Design

### Theme: "Butter" (custom DaisyUI theme)

Light mode (default):

| Role | Value | Notes |
|---|---|---|
| Base | `#f6efd9` | Soft cream-butter background |
| Base content | `#2b2522` | Warm near-black text |
| Primary | `#b85a3d` | Muted rust — links, route line, key actions |
| Secondary | `#6b8e23` | Muted olive (subtle accent for tags/chips if added) |
| Neutral | `#8a7f6b` | Warm grey for dates, metadata, captions |
| Base-200 | `#efe6c9` | Card backgrounds |
| Base-300 | `#e5d9b6` | Hairlines, borders |

Dark mode: DaisyUI's built-in `dim` theme (warm dark, calm — not pure black).

Additional DaisyUI themes that ship with Bloomfolio (`synthwave`, `retro`, `valentine`, `light`) stay available via the theme toggle but are not the default.

### Typography

- **Headings:** [Newsreader](https://fonts.google.com/specimen/Newsreader) (Google Fonts, variable, optical sizes). Humanist serif, warm on cream, designed for reading.
- **Body:** Inter (already in Bloomfolio). Quiet, legible, unopinionated.
- **Numbers / monospace:** JetBrains Mono. Used for the km counter, dates, ride distances — tabular figures to prevent layout shift.

### Page feels

- **Home:** quiet hero (small avatar + name + one-line tagline), cycling teaser strip, reverse-chronological journal cards. No thumbnails by default. Generous whitespace.
- **Post:** centered single column (~65 ch), Newsreader headings, Inter body. Date + title at top, content below. Previous/next links at the bottom.
- **Cycling:** map occupies the upper ~60% of the viewport. Below: large monospace counter (`247 km`), subtle caption (`of 12,893 km · 1.9% · started April 10, 2026`), then a list of the last 5 rides.
- **Stores:** Bloomfolio's card grid, reskinned in butter palette. Each card: image, store name, one-line description, "Visit →" link.
- **About:** single column, portrait photo (optional), prose bio, social links.

### Animations

Bloomfolio's blur-fade page transitions are kept. Disabled under `prefers-reduced-motion: reduce`.

## Content Model

### Journal post frontmatter

```yaml
---
title: "A ride through the Cascades"
date: 2026-04-22
excerpt: "First real ride of the season. Lost feeling in my fingers by mile 20."
cover: "./cover.jpg"       # optional
draft: false               # optional, defaults false
---
```

Content collection schema validates these fields at build time via Zod. Invalid frontmatter fails the build loudly.

### Stores schema

Static file `src/content/stores.json`:

```json
[
  {
    "name": "Store name",
    "url": "https://...",
    "image": "/stores/store-name.jpg",
    "description": "One line."
  }
]
```

Hand-edited. No CMS.

## Error Handling

| Scenario | Behavior |
|---|---|
| Strava API returns 5xx or times out | Sync script logs a warning and exits 0 without modifying `strava.json`. Build continues with the cached data. |
| Refresh token expired / revoked | Sync script exits 1 with a clear message. CI run fails. User re-runs `auth-strava.mjs` locally, updates the GitHub secret. |
| No rides since start date | Map renders with the Seattle start pin, traveled polyline empty, counter shows `0 km`, caption reads "Let's go." |
| `targetKm >= route_total_km` | Marker pinned to Dali endpoint, caption reads "Arrived in Dali on <date>." |
| JS disabled in the visitor's browser | `<CyclingMap />` renders a `<noscript>` block: the current km counter (baked in statically at build time) and a one-line "Enable JavaScript to see the interactive map." No image fallback in v1. |
| `prefers-reduced-motion: reduce` | Page transitions disabled; map pan/zoom animations also shortened. |
| Invalid post frontmatter | Build fails loudly in CI; user sees the error, fixes, re-pushes. |

## Testing

Pragmatic scope for a one-person personal site:

- **Build check:** CI runs `astro build` on every push and PR. Build failure blocks deploy.
- **Link check:** CI runs [lychee](https://github.com/lycheeverse/lychee) on the built `dist/`. Broken internal links fail the build; broken external links warn only.
- **Lighthouse budget:** CI runs Lighthouse on `/` and `/cycling/`. Fails if Performance < 90 or Accessibility < 95.
- **Unit test:** one Vitest file covering `positionAlongRoute()` — the distance interpolation logic. Cover: zero distance, midpoint, past-the-end, exact waypoint.
- **Strava sync smoke test:** a separate Vitest file with a mocked fetch, verifies merge/dedupe/totals logic in `sync-strava.mjs`.
- **Manual preview:** `npm run dev` before pushing new posts.

**Deliberately out of scope:** full component test suite, visual regression, E2E browser tests. Revisit if the site grows substantially.

## Migration Plan (high-level — concrete steps deferred to implementation plan)

1. Create `archive-2017` branch from current `master` HEAD. Push.
2. On `master`: delete all current files.
3. Scaffold new Astro + Bloomfolio project.
4. Apply theme/font/structure customizations per this spec.
5. Implement sync script, auth helper, route builder.
6. Run one-time OAuth setup, store secrets, run first Strava sync.
7. Write the first journal post (a "hello, I'm back" note) so the feed isn't empty.
8. Wire up GitHub Actions (deploy + daily cron).
9. Verify site at `https://zwjmosquito.github.io`.
10. Retire the old 2017 URLs (any inbound traffic now 404s — acceptable given the site has been dormant since 2017).

## Open Items (to decide during implementation, not blocking this spec)

- Exact waypoint list for the Seattle→Dali route — needs a one-session pass to refine the polyline with the user.
- Avatar image — user to provide.
- Tagline copy — user to write or hand me a rough sketch.
- Social links to include on About page — user to list.
- Daily cron hour — 07:00 UTC is a placeholder; user can pick a preferred hour.

## Future (explicitly deferred)

- Custom domain.
- Photo gallery.
- Tags / categories / search.
- RSS feed (easy add — ~1 hour).
- Analytics (privacy-respecting, e.g., Plausible or GoatCounter).
- Richer cycling dashboard (charts, PRs, streaks, heatmap of where rides happen).
- Multi-language (EN/ZH).
