# Stores Page Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder single-card `/stores/` page with a hand-written MoLi-specific page featuring a hero banner, logo, personal story, and Amazon CTA — kept out of search indexes via `noindex` + `robots.txt`.

**Architecture:** Extend the root `Layout.astro` with an optional `noindex` prop (emits a `<meta name="robots">` tag when true). Add a root-level `robots.txt` that disallows `/stores/` for crawlers. Overwrite `src/pages/stores.astro` with inlined content (no content collection) and delete the now-unused `src/content/stores.json` + `src/components/StoreCard.astro`.

**Tech Stack:** Astro 6, Tailwind 4, DaisyUI 5 (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-04-23-stores-page-detail-design.md`

---

## Execution notes

- Work in-place on `master` (the user has already approved master rewrites earlier this session).
- Node 22 at `/opt/homebrew/opt/node@22/bin/` — prepend PATH with `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` before any npm command.
- npm installs in this repo need `--legacy-peer-deps` (upstream `@lucide/astro` peer dep mismatch) — irrelevant here since we're not installing anything.
- Vitest and Astro build already configured; no test files needed for this static page.
- Assets already in place: `public/stores/moli/1.png` (logo, 500×500 PNG) and `public/stores/moli/moli-baby-hair-accessories-banner.jpg` (hero, 6912×3456 JPEG, ~520 KB).

---

## Task 1: Add `noindex` support to Layout + create `robots.txt`

**Files:**
- Modify: `src/layouts/Layout.astro`
- Create: `public/robots.txt`

- [ ] **Step 1: Read the current `<head>` section of `src/layouts/Layout.astro`**

Confirm the existing `Props` interface and `const { title, description, ... } = Astro.props;` pattern. Expected (roughly, based on current repo state):

```ts
interface Props {
  title?: string;
  description?: string;
}

const {
  title = "Bloomfolio Template",
  description = "A modern portfolio template built with Astro and DaisyUI",
} = Astro.props;
```

- [ ] **Step 2: Add the `noindex` prop to the Props interface and destructure it**

Edit `src/layouts/Layout.astro`. Change the `Props` interface and destructure like this:

```ts
interface Props {
  title?: string;
  description?: string;
  noindex?: boolean;
}

const {
  title = "Bloomfolio Template",
  description = "A modern portfolio template built with Astro and DaisyUI",
  noindex = false,
} = Astro.props;
```

Do not touch other destructured values or the rest of the frontmatter.

- [ ] **Step 3: Emit the `<meta name="robots">` tag when `noindex` is true**

Inside the `<head>` element of the same file, somewhere near the other `<meta>` tags (e.g., after `<meta name="generator" content={Astro.generator} />` and before the Google Fonts `<link rel="preconnect">` lines), add:

```astro
{noindex && <meta name="robots" content="noindex, nofollow" />}
```

- [ ] **Step 4: Create `public/robots.txt`**

Create a new file at `public/robots.txt` with exactly this content:

```
User-agent: *
Disallow: /stores/
```

- [ ] **Step 5: Verify build**

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH" && npm run build 2>&1 | tail -8
```

Expected: `[build] Complete!`. The `robots.txt` will be copied from `public/` into `dist/` verbatim (Astro serves `public/` static assets at the site root).

- [ ] **Step 6: Confirm `robots.txt` is in the build output**

```bash
cat dist/robots.txt
```

Expected output:

```
User-agent: *
Disallow: /stores/
```

- [ ] **Step 7: Commit**

```bash
git add src/layouts/Layout.astro public/robots.txt
git commit -m "feat(layout): add optional noindex prop + robots.txt for /stores/"
```

---

## Task 2: Rewrite `/stores/` page + remove old scaffolding

**Files:**
- Overwrite: `src/pages/stores.astro`
- Delete: `src/content/stores.json`
- Delete: `src/components/StoreCard.astro`

- [ ] **Step 1: Overwrite `src/pages/stores.astro`**

Replace the entire contents with:

```astro
---
import Layout from "../layouts/Layout.astro";

const STORE_URL =
  "https://www.amazon.com/stores/MoLiBabyCollection/page/98AFAF1B-8843-4533-91A5-A20BFA795075?lp_asin=B0D1WNYBBY&ref_=ast_bln&store_ref=bl_ast_dp_brandlogo_sto";
---

<Layout
  title="MoLi — baby hair accessories"
  description="MoLi, a brand of baby hair accessories started in 2023."
  noindex={true}
>
  <section class="max-w-4xl mx-auto px-4 py-12">
    <img
      src="/stores/moli/moli-baby-hair-accessories-banner.jpg"
      alt="MoLi — baby hair accessories"
      class="w-full rounded-box object-cover aspect-[2/1] mb-10"
    />

    <div class="flex items-center gap-4 mb-2">
      <img
        src="/stores/moli/1.png"
        alt="MoLi logo"
        class="w-8 h-8 object-contain"
      />
      <h1 class="text-3xl font-medium">MoLi</h1>
    </div>
    <p class="text-sm text-neutral mb-8">Baby hair accessories. Since 2023.</p>

    <div class="prose prose-lg max-w-none mb-10">
      <p>
        I started MoLi in 2023 — the year my daughter was born.
        Every bow, every little clip has been tested first on her.
        The brand and the kid are growing up together.
      </p>
    </div>

    <a
      href={STORE_URL}
      target="_blank"
      rel="noopener"
      class="btn btn-primary"
    >
      Visit on Amazon →
    </a>
  </section>
</Layout>
```

- [ ] **Step 2: Delete the old scaffolding**

```bash
rm src/content/stores.json src/components/StoreCard.astro
```

- [ ] **Step 3: Confirm no dangling references**

```bash
grep -rn 'stores\.json\|StoreCard' src/ 2>&1
```

Expected: zero lines of output. If `grep` finds anything, edit those files to remove the references before proceeding.

- [ ] **Step 4: Verify build**

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH" && npm run build 2>&1 | tail -10
```

Expected: `[build] Complete!`. Page count should stay the same (6 pages) — we're rewriting `/stores/`, not adding or removing a route.

- [ ] **Step 5: Smoke test — page renders with correct pieces**

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH" && npm run dev &
sleep 5
curl -sf http://localhost:4321/stores/ -o /tmp/stores.html
echo "---banner---"
grep -c 'moli-baby-hair-accessories-banner.jpg' /tmp/stores.html
echo "---logo---"
grep -c '/stores/moli/1.png' /tmp/stores.html
echo "---copy---"
grep -c 'I started MoLi in 2023' /tmp/stores.html
echo "---noindex---"
grep -c 'noindex, nofollow' /tmp/stores.html
echo "---amazon---"
grep -c 'MoLiBabyCollection' /tmp/stores.html
pkill -f 'astro dev' || true
```

Expected: each `grep -c` line returns at least `1`. If any returns `0`, something is missing — inspect the page source and fix.

- [ ] **Step 6: Confirm robots meta tag is NOT on other pages**

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH" && npm run dev &
sleep 5
curl -sf http://localhost:4321/ -o /tmp/home.html
grep -c 'noindex, nofollow' /tmp/home.html
pkill -f 'astro dev' || true
```

Expected: `0` (home page should not be noindexed).

- [ ] **Step 7: Commit**

```bash
git add src/pages/stores.astro src/content/stores.json src/components/StoreCard.astro
git commit -m "feat(stores): MoLi-specific page with banner, logo, personal story, Amazon CTA"
```

Note: `git add` of deleted files stages the deletion even though the paths no longer exist — this works as expected.

---

## Task 3: Push and verify live

**Files:** none

- [ ] **Step 1: Push**

```bash
git push origin master
```

- [ ] **Step 2: Wait for GitHub Actions to complete**

```bash
eval "$(/opt/homebrew/bin/brew shellenv)" && sleep 120 && gh run list --limit 2
```

Expected: the most recent "Build and Deploy" run shows `completed  success`.

If it fails, check logs:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)" && gh run view --log-failed | tail -40
```

Most likely failure: Lychee complains about the Amazon URL. Fix: it should be skipped by `--offline` mode, but if it complains, add the Amazon domain to a Lychee ignore pattern (not expected; confirm by reading the actual error).

- [ ] **Step 3: Verify the live page**

```bash
curl -sfI https://zwjmosquito.github.io/stores/
curl -sf https://zwjmosquito.github.io/stores/ | grep -c 'noindex, nofollow'
curl -sf https://zwjmosquito.github.io/robots.txt
```

Expected:
- First command: `HTTP/2 200`.
- Second command: prints `1` (noindex tag present).
- Third command: prints the robots.txt content with `Disallow: /stores/`.

---

## Spec coverage checklist

| Spec section | Task |
|---|---|
| Goals (quiet, personal, not indexed) | All — tone in the copy, `noindex` in Tasks 1–2 |
| Non-goals (no multi-store, no product listings, etc.) | N/A — scope respected by inlining |
| Scope > Rewrite stores.astro | Task 2 |
| Scope > Extend Layout with `noindex` prop | Task 1 |
| Scope > Create robots.txt | Task 1 |
| Scope > Delete stores.json and StoreCard | Task 2 |
| Content > Assets | Already in repo; referenced by stores.astro in Task 2 |
| Content > Copy | Task 2 (hard-coded paragraph) |
| Layout & Styling specifics | Task 2 |
| Privacy (meta + robots.txt) | Task 1 |
| Data model change (remove JSON + component) | Task 2 |
| Testing (build, smoke, privacy check) | Tasks 1–3 (smoke in Task 2 step 5, privacy in Task 3 step 3) |
| Implementation order (Layout → robots.txt → stores.astro → cleanup → build → commit → push) | Tasks 1 → 2 → 3 |

No gaps. Every spec section maps to at least one task.

## Self-review notes

- Placeholder scan: no "TBD"/"TODO"/"add appropriate error handling" language. Every step has exact code or exact commands.
- Type consistency: the `noindex` prop is defined in Task 1 (as `boolean`), passed in Task 2 as `{true}`. Names match.
- Scope: 3 tasks, each under 5 minutes. Clean, no hidden complexity.
