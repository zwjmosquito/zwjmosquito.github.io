# Stores Page Detail — Design Spec

**Date:** 2026-04-23
**Status:** Approved through design; ready for implementation planning
**Owner:** Wenji Zhang

## Summary

Replace the placeholder single-card `/stores/` page with a hand-written single-store page for **MoLi** (baby hair accessories, Amazon Brand Store). One personal paragraph + hero banner + logo + CTA to the Amazon store. Not search-indexed.

## Goals

1. Give MoLi real space on the personal site without turning the page into a marketing surface.
2. Lead with the personal story (brand and daughter growing up together) rather than product specs.
3. Keep the page quiet, journal-like, consistent with the `butter` aesthetic.
4. Make the page reachable but not crawlable by search engines.

## Non-goals

- Multiple stores (the data model shrinks from an array to a single hand-written page).
- Product listings, reviews, ratings, cart integration — Amazon handles all of that at the destination URL.
- Newsletter signup, contact form, analytics beyond what the rest of the site has.
- Privacy beyond "noindex" — the URL remains accessible to anyone who has it.

## Scope

**In:**
- Overwrite `src/pages/stores.astro` with a hand-written single-store layout.
- Extend `src/layouts/Layout.astro` with an optional `noindex` prop; set `true` on the Stores page.
- Add `public/robots.txt` disallowing `/stores/` for well-behaved crawlers.
- Delete `src/content/stores.json` (no longer needed for one store).
- Delete `src/components/StoreCard.astro` (no longer needed for one store).

**Out:**
- Any change to nav, home page, about, cycling, or journal.
- Any new content collection or data model for "stores".

## Content

### Assets (already in repo at `public/stores/moli/`)

- `1.png` — logo, 500×500 PNG with transparent background, 23 KB.
- `moli-baby-hair-accessories-banner.jpg` — hero banner, 6912×3456 JPEG, ~520 KB.

### Store metadata (hard-coded in `stores.astro`)

- **Name:** MoLi
- **Tagline:** "Baby hair accessories. Since 2023."
- **Store URL:** <https://www.amazon.com/stores/MoLiBabyCollection/page/98AFAF1B-8843-4533-91A5-A20BFA795075?lp_asin=B0D1WNYBBY&ref_=ast_bln&store_ref=bl_ast_dp_brandlogo_sto>

### Copy (starting draft; user can edit directly in `stores.astro`)

> I started MoLi in 2023 — the year my daughter was born.
> Every bow, every little clip has been tested first on her.
> The brand and the kid are growing up together.

## Layout

Single column, max-width 4xl (matches other pages). Stacked vertically:

```
┌─────────────────────────────────────────────┐
│                                             │
│   [hero banner, rounded, full container]    │
│                                             │
└─────────────────────────────────────────────┘

  [● 32px logo]  MoLi                 (Newsreader, 3xl)
                 Baby hair accessories. Since 2023.   (muted, tagline)

  [ ~3-sentence personal paragraph ]            (Inter, prose-lg)

  [ Visit on Amazon → ]                          (rust primary button)
```

### Styling specifics

- Banner: `w-full rounded-box object-cover aspect-[2/1]` — crops the banner to a consistent 2:1 ratio regardless of source dimensions.
- Logo + name: horizontal flex with `gap-4`, logo square 32px (`w-8 h-8`), name in Newsreader at `text-3xl font-medium`.
- Tagline: `text-neutral text-sm` on its own line below the name.
- Paragraph: `prose prose-lg` class, `max-w-none`, Inter (from base).
- Button: DaisyUI `btn btn-primary`, text "Visit on Amazon →", opens in new tab (`target="_blank" rel="noopener"`).

## Privacy (noindex)

Two layers, both low-cost:

1. **Per-page meta tag** — when `noindex` prop on `Layout.astro` is `true`, render:
   ```html
   <meta name="robots" content="noindex, nofollow" />
   ```
   Stores page passes `noindex={true}` when using `<Layout>`.

2. **`public/robots.txt`** — single file at the site root:
   ```
   User-agent: *
   Disallow: /stores/
   ```

Well-behaved crawlers (Google, Bing, etc.) respect both. The page URL remains accessible to anyone who has it; this is "not indexed," not "private."

## Data model change

**Before:** `src/content/stores.json` = `[{ name, url, image, description }]`. Consumed by `src/components/StoreCard.astro` rendered in a grid on `stores.astro`.

**After:** All store detail is inlined in `src/pages/stores.astro`. The JSON and the StoreCard component are deleted (not orphaned).

Rationale: one store + a personal story doesn't justify a data collection. Inlining makes the content easier to tweak (no schema round-trip) and removes a whole file per store from the code surface.

**Forward compatibility:** if a second store is ever added, we can reintroduce a list or a content collection at that time. YAGNI until then.

## Error handling

- If `public/stores/moli/1.png` or the banner JPG is missing, the `<img>` tags render broken images — accepted; the page is otherwise fine, and the assets are under version control.
- If the Amazon URL ever changes, it's a one-line edit in `stores.astro`.
- No runtime API calls, no failure modes beyond file-not-found.

## Testing

- **Build check:** `npm run build` must complete; CI already enforces this.
- **Link check:** Lychee (already in CI) must pass. The Amazon URL is external and is excluded from `--offline` mode. The banner and logo paths are root-relative and Lychee resolves them via `--root-dir`.
- **Manual smoke:** visit `/stores/` locally, confirm: hero banner renders, logo renders, name + tagline visible, paragraph visible, button links to the Amazon URL.
- **Privacy check:** view-source of `/stores/` should contain `<meta name="robots" content="noindex, nofollow">`. `curl https://zwjmosquito.github.io/robots.txt` should return the disallow rule.

No unit tests — this is a static page with no logic.

## Implementation order

1. Extend `Layout.astro` with optional `noindex` prop; emit meta tag when true.
2. Create `public/robots.txt`.
3. Overwrite `src/pages/stores.astro`.
4. Delete `src/content/stores.json` and `src/components/StoreCard.astro`.
5. `npm run build` → verify local.
6. Commit, push, watch Actions run green.

One small commit (or a pair — one for Layout + robots, one for the stores rewrite + deletions — either is fine).

## Out-of-scope ideas that came up

- Customer photos / product thumbnails: deferred until the user has photos they want to share and enough material to justify a section.
- "About the brand" vs "behind the scenes" separation: current single paragraph handles both.
- Watermarking or embedded store badge: not needed — the logo + banner are the visual identity.
