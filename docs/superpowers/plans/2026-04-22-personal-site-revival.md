# Personal Site Revival Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `zwjmosquito.github.io` as a quiet, journal-style personal site on Astro 5 + Bloomfolio, with a Seattle→Dali virtual-cycling map fed by the Strava API.

**Architecture:** Fork Bloomfolio (MIT, free), strip portfolio sections, add a journal content collection + three custom pages (cycling, stores, about), bake Strava data into a committed JSON at build time, render the map as a Leaflet island, deploy via GitHub Actions to the `gh-pages` branch. The 2017 Hexo output is preserved on an `archive-2017` branch.

**Tech Stack:** Astro 5, Tailwind 4, DaisyUI 5, Leaflet + OpenStreetMap (CartoDB Positron tiles), Node.js 20+, Vitest, GitHub Actions, lychee (link check), Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-04-22-personal-site-revival-design.md`

---

## Execution notes

- **Run in a worktree.** Before starting Task 2, create a fresh worktree so `master` stays clean until the plan completes. Example: `git worktree add ../zwjmosquito-revival master`.
- **Commit after every task's final step.** Frequent small commits let us review or roll back cleanly.
- **TDD for logic, preview-verification for UI.** Vitest tests are required for `positionAlongRoute()` and the sync merge/dedupe logic. Astro pages are verified with `npm run dev` + manual preview — Astro has no mature unit-test story for `.astro` files, and over-testing UI on a personal site is wasted effort.
- **User actions are flagged `[USER]`.** These tasks block on the user (e.g. creating a Strava API app, providing an avatar image). The agent pauses and prompts.

---

## Task 1: Install Node.js and verify toolchain `[USER]`

**Files:** none

- [ ] **Step 1: Install Node.js 20+ via Homebrew**

```bash
brew install node@20
brew link node@20 --force
```

- [ ] **Step 2: Verify versions**

```bash
node --version   # Expected: v20.x.x
npm --version    # Expected: 10.x.x
git --version    # Expected: 2.x.x
```

If `node --version` doesn't print a v20+ value, stop and resolve before continuing.

- [ ] **Step 3: Configure git identity if not already set**

```bash
git config --global user.name "Wenji Zhang"
git config --global user.email "xiangpeng19@gmail.com"
```

No commit needed — this is setup.

---

## Task 2: Archive the 2017 site

**Files:**
- Create branch: `archive-2017`
- Wipe: all current contents of `master`

- [ ] **Step 1: Confirm you're on the latest `master`**

```bash
cd /Users/wenjizhang/Documents/zwjmosquito.github.io
git checkout master
git pull origin master
git status
```

Expected: clean working tree on `master`.

- [ ] **Step 2: Create and push the archive branch**

```bash
git checkout -b archive-2017
git push -u origin archive-2017
git checkout master
```

- [ ] **Step 3: Remove all 2017 site files from master, keep only the spec + plan docs**

```bash
git rm -r 2017 archives css fancybox images js lib index.html
git status    # should show deletions staged; docs/ and .gitignore remain
```

- [ ] **Step 4: Commit the wipe**

```bash
git commit -m "chore: remove 2017 Hexo output (archived on archive-2017 branch)"
```

- [ ] **Step 5: Do NOT push yet.** We'll push after the new site is in place so `zwjmosquito.github.io` doesn't 404 in the gap. (GitHub Pages will keep serving the last successful deploy until we push gh-pages.)

---

## Task 3: Clone Bloomfolio as the base and inventory its structure

**Files:**
- Create: everything from Bloomfolio into the current repo root

- [ ] **Step 1: Clone Bloomfolio into a scratch directory**

```bash
cd /tmp
git clone https://github.com/lauroguedes/bloomfolio.git
```

- [ ] **Step 2: Copy Bloomfolio source into the revival repo (excluding its .git)**

```bash
cd /Users/wenjizhang/Documents/zwjmosquito.github.io
rsync -av --exclude='.git' --exclude='node_modules' /tmp/bloomfolio/ ./
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: completes without errors (may show warnings about optional deps; ignore).

- [ ] **Step 4: Start the dev server and verify the site loads**

```bash
npm run dev
```

Expected: dev server starts on a local port (commonly 4321). Open the printed URL in a browser. You should see Bloomfolio's demo portfolio with the sunflower theme.

Stop the server with `Ctrl+C`.

- [ ] **Step 5: Inventory the structure**

Run `ls src/` and write down the actual folder names. Expected (subject to Bloomfolio's version):

```
src/
  assets/
  components/
  content/
  data/
  layouts/
  pages/
  styles/
  config.ts         (or similar)
```

If a folder named `keystatic/` or a file named `keystatic.config.ts` exists at the repo root, note it — we'll remove it in Task 4.

- [ ] **Step 6: Commit the base**

```bash
git add -A
git commit -m "feat: bootstrap Astro site from Bloomfolio base"
```

---

## Task 4: Strip portfolio sections and remove Keystatic

**Files:**
- Delete: Bloomfolio's work/education/hackathon content files and components
- Delete: `keystatic.config.ts`, `src/keystatic/`, Keystatic routes
- Modify: `package.json` (remove `@keystatic/*` deps)

- [ ] **Step 1: Delete Keystatic config and admin route**

```bash
rm -f keystatic.config.ts keystatic.config.mjs
rm -rf src/keystatic
# Delete the admin page if it exists
find src/pages -iname 'keystatic*' -delete
find src/pages -iname 'admin*' -delete
```

- [ ] **Step 2: Remove Keystatic npm dependencies**

Open `package.json` and delete any line in `dependencies` or `devDependencies` whose package name starts with `@keystatic/`. Then:

```bash
npm install    # re-resolves and writes an updated package-lock.json
```

- [ ] **Step 3: Delete Bloomfolio's portfolio content collections**

Inspect `src/content/` — you'll see collections like `work`, `education`, `hackathons`, `projects`. We're keeping **none** of them (we're replacing with `journal` and `stores`).

```bash
rm -rf src/content/work src/content/education src/content/hackathons
# keep src/content for now — we'll replace it in Task 7
```

Also delete the matching section components (paths may differ — adjust to what's in your tree):

```bash
rm -f src/components/sections/Work.astro \
      src/components/sections/Education.astro \
      src/components/sections/Hackathons.astro \
      src/components/sections/Contact.astro
```

- [ ] **Step 4: Edit `src/pages/index.astro` to remove references to deleted sections**

Open `src/pages/index.astro`. Delete `import` statements and JSX-style usages for `Work`, `Education`, `Hackathons`, `Contact`. Leave `Hero`, `About`, and `Projects` in place for now — we'll replace the whole home page in Task 9, but the build needs to succeed in between.

- [ ] **Step 5: Verify the build still works**

```bash
npm run build
```

Expected: build completes without error. If you get "cannot find module" errors, you missed an import — search for the deleted component name with `grep -r 'Work' src/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: strip portfolio sections and Keystatic from Bloomfolio"
```

---

## Task 5: Add the `butter` DaisyUI theme

**Files:**
- Modify: `src/styles/global.css` (or the existing global stylesheet — find it with `grep -rl '@plugin' src/styles`)

- [ ] **Step 1: Locate the global CSS file**

Find the file where Bloomfolio registers DaisyUI themes. It's the file containing `@plugin "daisyui"` — likely `src/styles/global.css`.

```bash
grep -rl '@plugin' src/styles
```

- [ ] **Step 2: Append the butter theme definition**

Append this block to the located global CSS file:

```css
@plugin "daisyui/theme" {
  name: "butter";
  default: true;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: oklch(94% 0.04 90);    /* #f6efd9 — cream page background */
  --color-base-200: oklch(90% 0.05 90);    /* #efe6c9 — card background */
  --color-base-300: oklch(86% 0.07 90);    /* #e5d9b6 — hairline */
  --color-base-content: oklch(22% 0.02 50); /* #2b2522 — warm near-black */

  --color-primary: oklch(58% 0.14 45);     /* #b85a3d — muted rust */
  --color-primary-content: oklch(98% 0.01 90);

  --color-secondary: oklch(60% 0.10 120);  /* #6b8e23 — muted olive */
  --color-secondary-content: oklch(98% 0.01 90);

  --color-accent: oklch(58% 0.14 45);      /* same as primary for simplicity */
  --color-accent-content: oklch(98% 0.01 90);

  --color-neutral: oklch(55% 0.03 80);     /* #8a7f6b — warm grey */
  --color-neutral-content: oklch(98% 0.01 90);

  --color-info: oklch(70% 0.12 220);
  --color-success: oklch(70% 0.15 140);
  --color-warning: oklch(78% 0.15 80);
  --color-error: oklch(65% 0.20 30);

  --radius-selector: 0.25rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;
}
```

- [ ] **Step 3: Verify butter is the default**

```bash
npm run dev
```

Expected: the dev site now shows a cream background. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(theme): add butter theme as light-mode default"
```

---

## Task 6: Wire up Newsreader, Inter, and JetBrains Mono fonts

**Files:**
- Modify: `src/layouts/Layout.astro` (or whichever is the root layout)
- Modify: global CSS (Tailwind font-family utilities)

- [ ] **Step 1: Locate the root layout**

```bash
grep -rl '<html' src/layouts
```

- [ ] **Step 2: Add Google Fonts preconnect + stylesheet link in `<head>`**

Inside the root layout's `<head>` element, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
/>
```

- [ ] **Step 3: Add font-family utilities to global CSS**

Append to the global CSS file:

```css
@layer base {
  html { font-family: 'Inter', system-ui, sans-serif; }
  h1, h2, h3, h4, h5, h6 { font-family: 'Newsreader', Georgia, serif; font-weight: 500; }
  code, pre, .font-mono, .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
}
```

- [ ] **Step 4: Verify in the browser**

```bash
npm run dev
```

Expected: headings now render in Newsreader (serif), body in Inter. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(fonts): wire Newsreader / Inter / JetBrains Mono via Google Fonts"
```

---

## Task 7: Set up the `journal` content collection

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/journal/.gitkeep`
- Create: `src/content/journal/2026-04-22-hello-again.md` (first post, placeholder content)

- [ ] **Step 1: Write the content collection schema**

Create `src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const journal = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    excerpt: z.string().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
```

- [ ] **Step 2: Create the journal folder and first post**

```bash
mkdir -p src/content/journal
touch src/content/journal/.gitkeep
```

Create `src/content/journal/2026-04-22-hello-again.md`:

```markdown
---
title: "Hello, again"
date: 2026-04-22
excerpt: "Nine years later, picking this place back up. New direction, new look."
---

It's been a minute. This site sat at the bottom of an abandoned blog theme for
nine years. Time to put it back to work — this time as a quiet journal, a
cycling tracker, and a home for whatever else I'm up to.

More soon.
```

- [ ] **Step 3: Verify Astro picks up the collection**

```bash
npm run dev
```

Dev server should start without content-schema errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(content): set up journal collection with first post"
```

---

## Task 8: Replace the home page with the journal feed

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/components/JournalCard.astro`
- Create: `src/components/Hero.astro` (tiny replacement, or reuse Bloomfolio's if trivially adaptable)

- [ ] **Step 1: Create `src/components/JournalCard.astro`**

```astro
---
interface Props {
  title: string;
  date: Date;
  excerpt?: string;
  slug: string;
}
const { title, date, excerpt, slug } = Astro.props;
const formattedDate = date.toISOString().slice(0, 10);
---
<article class="py-6 border-b border-base-300 last:border-b-0">
  <a href={`/posts/${slug}/`} class="group block">
    <p class="mono text-sm text-neutral mb-2">{formattedDate}</p>
    <h2 class="text-2xl md:text-3xl font-medium mb-2 group-hover:text-primary transition-colors">
      {title}
    </h2>
    {excerpt && <p class="text-base-content/80 leading-relaxed">{excerpt}</p>}
    <p class="mt-3 text-sm text-primary">Read →</p>
  </a>
</article>
```

- [ ] **Step 2: Replace `src/pages/index.astro`**

Overwrite with:

```astro
---
import Layout from '../layouts/Layout.astro';
import JournalCard from '../components/JournalCard.astro';
import CyclingTeaser from '../components/CyclingTeaser.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('journal', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---
<Layout title="Wenji Zhang">
  <section class="py-8">
    <div class="flex items-center gap-4 mb-10">
      <img src="/avatar.jpg" alt="Wenji" class="w-14 h-14 rounded-full object-cover" onerror="this.style.display='none'" />
      <div>
        <h1 class="text-3xl font-medium leading-tight">Wenji Zhang</h1>
        <p class="text-neutral">Notes, rides, and whatever else.</p>
      </div>
    </div>

    <CyclingTeaser />

    <div class="mt-10">
      {posts.map(post => (
        <JournalCard
          title={post.data.title}
          date={post.data.date}
          excerpt={post.data.excerpt}
          slug={post.slug}
        />
      ))}
    </div>
  </section>
</Layout>
```

- [ ] **Step 3: Create a stub `src/components/CyclingTeaser.astro` (real implementation in Task 20)**

```astro
---
// Stubbed — will read strava.json in Task 20
---
<div class="py-4 px-5 rounded-box bg-base-200 text-sm text-neutral mono">
  🚴  — km / — km · setting up…
</div>
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Expected: home page shows the hero, the stub teaser strip, and the "Hello, again" post card. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(home): journal feed with cycling teaser stub"
```

---

## Task 9: Post detail page

**Files:**
- Create: `src/pages/posts/[...slug].astro`
- Modify: `src/layouts/` — add a `PostLayout.astro` if not present

- [ ] **Step 1: Create `src/pages/posts/[...slug].astro`**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('journal', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

interface Props { post: CollectionEntry<'journal'>; }
const { post } = Astro.props;
const { Content } = await post.render();
const formattedDate = post.data.date.toISOString().slice(0, 10);
---
<Layout title={post.data.title}>
  <article class="max-w-2xl mx-auto py-12">
    <p class="mono text-sm text-neutral mb-3">{formattedDate}</p>
    <h1 class="text-4xl font-medium mb-8 leading-tight">{post.data.title}</h1>
    <div class="prose prose-lg max-w-none prose-headings:font-serif">
      <Content />
    </div>
    <p class="mt-12 text-sm"><a href="/" class="text-primary">← Back to journal</a></p>
  </article>
</Layout>
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Click the post card on `/`. Expected: navigates to `/posts/2026-04-22-hello-again/` and renders the Markdown. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(posts): post detail page"
```

---

## Task 10: About page

**Files:**
- Create or modify: `src/pages/about.astro`

- [ ] **Step 1: Create `src/pages/about.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="About">
  <section class="max-w-2xl mx-auto py-12 prose prose-lg">
    <h1>About</h1>
    <p>
      Hi, I'm Wenji. This site is a personal log — cycling, small shops, life.
      It's intentionally quiet.
    </p>
    <p>
      <strong>Find me:</strong>
      <a href="mailto:xiangpeng19@gmail.com">email</a> ·
      <a href="https://www.strava.com/athletes/{STRAVA_ID}">strava</a>
    </p>
  </section>
</Layout>
```

Replace `{STRAVA_ID}` with your actual Strava athlete ID once known (can be left as a placeholder for first deploy and fixed later — it's explicitly called out in the spec's Open Items).

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Visit `/about`. Expected: about page renders. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(about): add about page"
```

---

## Task 11: Stores page

**Files:**
- Create: `src/content/stores.json`
- Create: `src/pages/stores.astro`
- Create: `src/components/StoreCard.astro`

- [ ] **Step 1: Create `src/content/stores.json` with at least one entry**

```json
[
  {
    "name": "MoLi",
    "url": "https://example.com",
    "image": "/stores/moli.jpg",
    "description": "(one-line store description — fill in)."
  }
]
```

User will replace the placeholder fields with real data. Build does not require the image to exist yet.

- [ ] **Step 2: Create `src/components/StoreCard.astro`**

```astro
---
interface Props {
  name: string;
  url: string;
  image: string;
  description: string;
}
const { name, url, image, description } = Astro.props;
---
<a href={url} target="_blank" rel="noopener" class="block rounded-box bg-base-200 overflow-hidden hover:bg-base-300 transition-colors">
  <img src={image} alt={name} class="w-full h-48 object-cover bg-base-300" onerror="this.style.display='none'" />
  <div class="p-5">
    <h3 class="text-xl font-medium mb-1">{name}</h3>
    <p class="text-sm text-base-content/80">{description}</p>
    <p class="mt-3 text-sm text-primary">Visit →</p>
  </div>
</a>
```

- [ ] **Step 3: Create `src/pages/stores.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import StoreCard from '../components/StoreCard.astro';
import stores from '../content/stores.json';
---
<Layout title="Stores">
  <section class="max-w-4xl mx-auto py-12">
    <h1 class="text-4xl font-medium mb-8">Stores</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {stores.map(s => <StoreCard {...s} />)}
    </div>
  </section>
</Layout>
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Visit `/stores`. Expected: one store card renders (with broken image, that's fine). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(stores): add stores page with one placeholder entry"
```

---

## Task 12: Update site config + navigation

**Files:**
- Modify: `src/config.ts` (or whatever Bloomfolio uses for site config)
- Modify: the nav component

- [ ] **Step 1: Find the nav component and site config**

```bash
grep -rl 'Journal\|Projects\|Work' src/components/layout 2>/dev/null || grep -rl 'nav' src/components --include='*.astro'
grep -rl 'siteName\|siteTitle' src --include='*.ts'
```

- [ ] **Step 2: Update nav links**

In the nav component, replace Bloomfolio's default links with:

```ts
[
  { label: 'Journal', href: '/' },
  { label: 'Cycling', href: '/cycling/' },
  { label: 'Stores', href: '/stores/' },
  { label: 'About', href: '/about/' },
]
```

- [ ] **Step 3: Update site metadata**

In `src/config.ts` (or equivalent), set:

```ts
export const SITE = {
  title: 'Wenji Zhang',
  description: 'A quiet journal — rides, shops, notes.',
  url: 'https://zwjmosquito.github.io',
  author: 'Wenji Zhang',
};
```

- [ ] **Step 4: Remove the "Built with Bloomfolio" footer attribution (optional — MIT allows removal)**

Search for "Bloomfolio" in footer-related components and replace with your preferred footer content or leave a discreet credit.

- [ ] **Step 5: Verify all four nav links work**

```bash
npm run dev
```

Click through `/`, `/cycling/` (404 for now — OK), `/stores/`, `/about/`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(config): update site metadata and nav"
```

---

## Task 13: Generate the Seattle→Dali route

**Files:**
- Create: `scripts/build-route.mjs`
- Create: `src/data/route.geojson` (generated output)

This is a one-time generator. It produces a dense polyline along the waypoints you choose and records the total length in kilometers.

- [ ] **Step 1: Create `scripts/build-route.mjs`**

```js
#!/usr/bin/env node
// One-time generator: writes src/data/route.geojson by densifying a
// list of waypoints (straight-line interpolation between each pair).
// Distance is haversine-based.

import fs from 'node:fs';
import path from 'node:path';

// Ordered waypoints: Seattle → Anchorage → Nome → Anadyr → Magadan
// → Harbin → Beijing → Xi'an → Chengdu → Dali.
// Edit these to refine the route's "shape" — ferry-hops are implied.
const WAYPOINTS = [
  { name: 'Seattle',   lat: 47.6062,  lng: -122.3321 },
  { name: 'Anchorage', lat: 61.2181,  lng: -149.9003 },
  { name: 'Nome',      lat: 64.5011,  lng: -165.4064 },
  { name: 'Anadyr',    lat: 64.7337,  lng:  177.5103 },
  { name: 'Magadan',   lat: 59.5638,  lng:  150.8035 },
  { name: 'Harbin',    lat: 45.8038,  lng:  126.5349 },
  { name: 'Beijing',   lat: 39.9042,  lng:  116.4074 },
  { name: 'Xian',      lat: 34.3416,  lng:  108.9398 },
  { name: 'Chengdu',   lat: 30.5728,  lng:  104.0668 },
  { name: 'Dali',      lat: 25.6925,  lng:  100.1619 },
];

const STEP_KM = 25; // densify every 25 km

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function interpolate(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

const densified = [];
let totalKm = 0;
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i], b = WAYPOINTS[i + 1];
  const segKm = haversineKm(a, b);
  const steps = Math.max(1, Math.ceil(segKm / STEP_KM));
  for (let s = 0; s <= steps; s++) {
    // avoid duplicating the join between segments
    if (i > 0 && s === 0) continue;
    const t = s / steps;
    const p = interpolate(a, b, t);
    densified.push([p.lng, p.lat]);
  }
  totalKm += segKm;
}

const geojson = {
  type: 'Feature',
  properties: {
    waypoints: WAYPOINTS,
    total_km: Number(totalKm.toFixed(2)),
    generated_at: new Date().toISOString(),
  },
  geometry: { type: 'LineString', coordinates: densified },
};

const outPath = path.resolve('src/data/route.geojson');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${densified.length} points, total ${totalKm.toFixed(0)} km to ${outPath}`);
```

- [ ] **Step 2: Run it**

```bash
mkdir -p src/data
node scripts/build-route.mjs
```

Expected output: `Wrote <N> points, total <~15000> km to .../route.geojson`. The actual total depends on waypoint choice — expect 12,000–16,000 km.

- [ ] **Step 3: Sanity-check the output**

```bash
node -e "const g=JSON.parse(require('fs').readFileSync('src/data/route.geojson')); console.log('total_km:', g.properties.total_km, 'points:', g.geometry.coordinates.length);"
```

Expected: total_km ~13000, points in the hundreds.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-route.mjs src/data/route.geojson
git commit -m "feat(cycling): generate Seattle→Dali route (trans-Pacific via Alaska/Russia)"
```

---

## Task 14: Register Strava API app and run OAuth `[USER]`

**Files:**
- Create: `scripts/auth-strava.mjs`

- [ ] **Step 1: Create a Strava API application** `[USER]`

Go to <https://www.strava.com/settings/api> and create a new application. Fill in:
- **Application Name:** Wenji personal site
- **Category:** Personal
- **Website:** https://zwjmosquito.github.io
- **Authorization Callback Domain:** `localhost`

Record the `Client ID` and `Client Secret` shown on the settings page.

- [ ] **Step 2: Write `scripts/auth-strava.mjs`**

```js
#!/usr/bin/env node
// One-time helper: walks through Strava's OAuth flow locally.
// Usage:
//   STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=... node scripts/auth-strava.mjs
// Prints a refresh_token you can store in GitHub Actions secrets.

import http from 'node:http';
import { exec } from 'node:child_process';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in env');
  process.exit(1);
}

const REDIRECT = 'http://localhost:8787/callback';
const SCOPE = 'read,activity:read_all';

const authUrl =
  `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}` +
  `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&approval_prompt=force&scope=${encodeURIComponent(SCOPE)}`;

console.log('Opening browser for Strava authorization...');
console.log('If the browser does not open, visit manually:', authUrl);
exec(`open "${authUrl}"`); // macOS

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end('not found');
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('missing code');
    return;
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();

  console.log('\n✅ Strava tokens:');
  console.log(JSON.stringify({ refresh_token: tokens.refresh_token, athlete_id: tokens.athlete?.id }, null, 2));
  console.log('\nStore refresh_token in GitHub Actions secret: STRAVA_REFRESH_TOKEN');

  res.writeHead(200, { 'content-type': 'text/html' }).end(
    '<h2>Done. Copy the refresh_token from the terminal.</h2>'
  );
  server.close();
  process.exit(0);
});

server.listen(8787, () => console.log('Listening on http://localhost:8787'));
```

- [ ] **Step 3: Run the OAuth flow** `[USER]`

```bash
STRAVA_CLIENT_ID=<your id> STRAVA_CLIENT_SECRET=<your secret> node scripts/auth-strava.mjs
```

A browser opens Strava's authorization page. Click Authorize. The terminal prints a `refresh_token` and `athlete_id`. **Save both to a password manager.**

- [ ] **Step 4: Add secrets to GitHub Actions** `[USER]`

Go to <https://github.com/zwjmosquito/zwjmosquito.github.io/settings/secrets/actions> and add:
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`

- [ ] **Step 5: Commit the script (no secrets in the repo)**

```bash
git add scripts/auth-strava.mjs
git commit -m "feat(strava): add one-time OAuth helper"
```

---

## Task 15: Implement the Strava sync script with TDD

**Files:**
- Create: `scripts/lib/strava-merge.mjs` (pure logic — testable)
- Create: `scripts/sync-strava.mjs` (CLI wrapper around the lib + fetch)
- Create: `tests/strava-merge.test.mjs`
- Modify: `package.json` — add `vitest` devDep + `test` script

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

Then add to `package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write the failing test for merge/dedupe/totals**

Create `tests/strava-merge.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { mergeActivities, recompute } from '../scripts/lib/strava-merge.mjs';

describe('mergeActivities', () => {
  it('appends new activities', () => {
    const existing = [{ id: 1, distance_m: 10000, start_date: '2026-04-10T00:00:00Z', type: 'Ride' }];
    const incoming = [{ id: 2, distance_m: 5000, start_date: '2026-04-11T00:00:00Z', type: 'Ride' }];
    const merged = mergeActivities(existing, incoming);
    expect(merged).toHaveLength(2);
  });

  it('deduplicates by id', () => {
    const existing = [{ id: 1, distance_m: 10000, start_date: '2026-04-10T00:00:00Z', type: 'Ride' }];
    const incoming = [{ id: 1, distance_m: 12000, start_date: '2026-04-10T00:00:00Z', type: 'Ride' }];
    const merged = mergeActivities(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].distance_m).toBe(12000); // incoming wins on conflict
  });

  it('filters out non-Ride activity types', () => {
    const incoming = [
      { id: 1, distance_m: 10000, start_date: '2026-04-10T00:00:00Z', type: 'Ride' },
      { id: 2, distance_m: 20000, start_date: '2026-04-10T00:00:00Z', type: 'VirtualRide' },
      { id: 3, distance_m: 30000, start_date: '2026-04-10T00:00:00Z', type: 'Run' },
    ];
    const merged = mergeActivities([], incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(1);
  });
});

describe('recompute', () => {
  it('computes total_km from distance_m', () => {
    const activities = [
      { id: 1, distance_m: 10000, start_date: '2026-04-10T00:00:00Z', type: 'Ride' },
      { id: 2, distance_m: 15500, start_date: '2026-04-11T00:00:00Z', type: 'Ride' },
    ];
    const result = recompute(activities);
    expect(result.total_km).toBe(25.5);
    expect(result.ride_count).toBe(2);
    expect(result.last_ride_date).toBe('2026-04-11T00:00:00Z');
  });

  it('handles empty activities list', () => {
    const result = recompute([]);
    expect(result.total_km).toBe(0);
    expect(result.ride_count).toBe(0);
    expect(result.last_ride_date).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm test
```

Expected: tests fail with "cannot find module '../scripts/lib/strava-merge.mjs'".

- [ ] **Step 4: Implement `scripts/lib/strava-merge.mjs`**

```js
export function mergeActivities(existing, incoming) {
  const filtered = incoming.filter(a => a.type === 'Ride');
  const byId = new Map();
  for (const a of existing) byId.set(a.id, a);
  for (const a of filtered) byId.set(a.id, a); // incoming overwrites
  return Array.from(byId.values());
}

export function recompute(activities) {
  const total_m = activities.reduce((sum, a) => sum + a.distance_m, 0);
  const total_km = Number((total_m / 1000).toFixed(2));
  const ride_count = activities.length;
  const last_ride_date = activities.length
    ? activities.reduce((max, a) => (a.start_date > max ? a.start_date : max), '1970-01-01')
    : null;
  return { total_distance_m: total_m, total_km, ride_count, last_ride_date };
}
```

- [ ] **Step 5: Run tests; expect pass**

```bash
npm test
```

Expected: all 5 tests pass.

- [ ] **Step 6: Implement the CLI sync script `scripts/sync-strava.mjs`**

```js
#!/usr/bin/env node
// Reads STRAVA_* env vars, fetches new activities since last sync,
// merges into src/data/strava.json, writes back.

import fs from 'node:fs';
import path from 'node:path';
import { mergeActivities, recompute } from './lib/strava-merge.mjs';

const START_DATE = '2026-04-10T00:00:00Z';
const DATA_PATH = 'src/data/strava.json';

async function refreshAccessToken(id, secret, refresh) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: id, client_secret: secret,
      grant_type: 'refresh_token', refresh_token: refresh,
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  const body = await res.json();
  return body.access_token;
}

async function fetchActivities(token, afterIso) {
  const after = Math.floor(new Date(afterIso).getTime() / 1000);
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`activities fetch failed: ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  return all.map(a => ({
    id: a.id,
    start_date: a.start_date,
    distance_m: a.distance,
    moving_time_s: a.moving_time,
    name: a.name,
    type: a.type,
    map_polyline: a.map?.summary_polyline ?? null,
  }));
}

async function main() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    console.error('Missing STRAVA_* env vars');
    process.exit(1);
  }

  let existing = { activities: [], last_synced_ts: START_DATE };
  if (fs.existsSync(DATA_PATH)) {
    existing = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  }

  const token = await refreshAccessToken(STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN);
  let incoming;
  try {
    incoming = await fetchActivities(token, existing.last_synced_ts ?? START_DATE);
  } catch (e) {
    console.warn('Strava fetch failed; keeping cached data:', e.message);
    process.exit(0);
  }

  const merged = mergeActivities(existing.activities, incoming);
  const totals = recompute(merged);

  const output = {
    ...totals,
    last_synced_ts: new Date().toISOString(),
    activities: merged.sort((a, b) => b.start_date.localeCompare(a.start_date)),
  };

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
  console.log(`Synced ${incoming.length} activities. Total: ${totals.total_km} km across ${totals.ride_count} rides.`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 7: Run tests once more to confirm green**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(strava): sync script with tested merge/dedupe/totals logic"
```

---

## Task 16: First Strava sync (produce initial strava.json)

**Files:**
- Create: `src/data/strava.json` (generated)

- [ ] **Step 1: Run the sync locally** `[USER]`

```bash
STRAVA_CLIENT_ID=<id> STRAVA_CLIENT_SECRET=<secret> STRAVA_REFRESH_TOKEN=<refresh> \
  node scripts/sync-strava.mjs
```

Expected: `Synced N activities. Total: X km across Y rides.` If you haven't ridden since 2026-04-10, N will be 0 and totals will be 0.

- [ ] **Step 2: Inspect the generated file**

```bash
cat src/data/strava.json | head -30
```

Expected fields: `total_distance_m`, `total_km`, `ride_count`, `last_ride_date`, `last_synced_ts`, `activities` array.

- [ ] **Step 3: Commit**

```bash
git add src/data/strava.json
git commit -m "feat(strava): initial strava.json"
```

---

## Task 17: Implement `positionAlongRoute` helper with TDD

**Files:**
- Create: `src/lib/route-math.ts`
- Create: `tests/route-math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/route-math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { positionAlongRoute, haversineKm } from '../src/lib/route-math';

describe('haversineKm', () => {
  it('computes known short distance', () => {
    // Seattle → Vancouver BC ≈ 195 km
    const d = haversineKm({ lat: 47.6062, lng: -122.3321 }, { lat: 49.2827, lng: -123.1207 });
    expect(d).toBeGreaterThan(190);
    expect(d).toBeLessThan(210);
  });
});

describe('positionAlongRoute', () => {
  const route = [
    [-122.3321, 47.6062], // Seattle
    [-123.1207, 49.2827], // Vancouver (~195 km)
    [-123.9, 49.8],       // somewhere further (~100 km more)
  ];

  it('returns start point for 0 km', () => {
    const p = positionAlongRoute(route, 0);
    expect(p.lat).toBeCloseTo(47.6062, 3);
    expect(p.lng).toBeCloseTo(-122.3321, 3);
    expect(p.arrived).toBe(false);
  });

  it('returns end point when km >= total', () => {
    const p = positionAlongRoute(route, 100000);
    expect(p.lat).toBeCloseTo(49.8, 1);
    expect(p.arrived).toBe(true);
  });

  it('interpolates between waypoints', () => {
    // Halfway to Vancouver (~97.5 km)
    const p = positionAlongRoute(route, 97.5);
    expect(p.lat).toBeGreaterThan(47.6);
    expect(p.lat).toBeLessThan(49.3);
    expect(p.arrived).toBe(false);
  });

  it('lands on a waypoint when km equals a cumulative boundary', () => {
    const total01 = haversineKm({ lat: 47.6062, lng: -122.3321 }, { lat: 49.2827, lng: -123.1207 });
    const p = positionAlongRoute(route, total01);
    expect(p.lat).toBeCloseTo(49.2827, 2);
    expect(p.lng).toBeCloseTo(-123.1207, 2);
  });
});
```

- [ ] **Step 2: Run tests; expect failure**

```bash
npm test
```

Expected: fails with "cannot find module '../src/lib/route-math'".

- [ ] **Step 3: Implement `src/lib/route-math.ts`**

```ts
export interface LngLat { lat: number; lng: number }
export interface Position extends LngLat { arrived: boolean }

const R = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Given a route polyline as [[lng,lat], ...] and a distance in km,
 * returns the interpolated position along the polyline.
 */
export function positionAlongRoute(coords: [number, number][], targetKm: number): Position {
  if (!coords.length) throw new Error('empty route');
  if (targetKm <= 0) {
    const [lng, lat] = coords[0];
    return { lat, lng, arrived: false };
  }

  let remaining = targetKm;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const segKm = haversineKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
    if (remaining <= segKm) {
      const t = segKm === 0 ? 0 : remaining / segKm;
      return {
        lat: lat1 + (lat2 - lat1) * t,
        lng: lng1 + (lng2 - lng1) * t,
        arrived: false,
      };
    }
    remaining -= segKm;
  }

  const [lng, lat] = coords[coords.length - 1];
  return { lat, lng, arrived: true };
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
npm test
```

Expected: all tests in both files pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cycling): positionAlongRoute helper with unit tests"
```

---

## Task 18: Build the `<CyclingMap />` component

**Files:**
- Install: `leaflet`
- Create: `src/components/CyclingMap.astro`

- [ ] **Step 1: Install Leaflet**

```bash
npm install leaflet
npm install --save-dev @types/leaflet
```

- [ ] **Step 2: Create `src/components/CyclingMap.astro`**

```astro
---
import stravaData from '../data/strava.json';
import routeData from '../data/route.geojson';
import { positionAlongRoute } from '../lib/route-math';

const coords = routeData.geometry.coordinates as [number, number][];
const routeTotalKm: number = routeData.properties.total_km;
const totalKm: number = stravaData.total_km ?? 0;
const pos = positionAlongRoute(coords, totalKm);
const progressPct = Math.min(100, (totalKm / routeTotalKm) * 100);

// Nearest-waypoint lookup for human-readable caption
function nearestWaypoint() {
  let best = routeData.properties.waypoints[0];
  let bestKm = Infinity;
  for (const wp of routeData.properties.waypoints) {
    const dLat = wp.lat - pos.lat, dLng = wp.lng - pos.lng;
    const approx = Math.sqrt(dLat * dLat + dLng * dLng);
    if (approx < bestKm) { bestKm = approx; best = wp; }
  }
  return best.name;
}
const nearName = nearestWaypoint();
---

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<div
  id="cycling-map"
  data-coords={JSON.stringify(coords)}
  data-traveled-km={totalKm}
  data-total-km={routeTotalKm}
  data-pos-lat={pos.lat}
  data-pos-lng={pos.lng}
  class="w-full h-[500px] rounded-box"
></div>

<div class="mt-6 text-center">
  <p class="mono text-5xl">{totalKm.toFixed(0)} <span class="text-2xl text-neutral">km</span></p>
  <p class="text-neutral mt-2">of {routeTotalKm.toFixed(0)} km · {progressPct.toFixed(1)}% · near {nearName}</p>
</div>

<script>
  import L from 'leaflet';

  const el = document.getElementById('cycling-map')!;
  const coords = JSON.parse(el.dataset.coords!) as [number, number][];
  const posLat = parseFloat(el.dataset.posLat!);
  const posLng = parseFloat(el.dataset.posLng!);
  const traveledKm = parseFloat(el.dataset.traveledKm!);

  // Build the traveled slice: walk forward until we've accumulated traveledKm.
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  function hav(a: [number, number], b: [number, number]) {
    const dLat = toRad(b[1] - a[1]), dLng = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  let rem = traveledKm;
  const traveled: [number, number][] = [coords[0]];
  for (let i = 0; i < coords.length - 1 && rem > 0; i++) {
    const seg = hav(coords[i], coords[i+1]);
    if (rem >= seg) {
      traveled.push(coords[i+1]);
      rem -= seg;
    } else {
      const t = seg === 0 ? 0 : rem / seg;
      traveled.push([
        coords[i][0] + (coords[i+1][0] - coords[i][0]) * t,
        coords[i][1] + (coords[i+1][1] - coords[i][1]) * t,
      ]);
      rem = 0;
    }
  }

  const map = L.map('cycling-map', { scrollWheelZoom: false }).setView([posLat, posLng], 3);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap, © CartoDB',
    maxZoom: 18,
  }).addTo(map);

  // Full route — faded tan
  L.polyline(coords.map(([lng, lat]) => [lat, lng]), {
    color: '#d0bfa6', weight: 3, opacity: 0.7,
  }).addTo(map);

  // Traveled — bright rust
  if (traveled.length > 1) {
    L.polyline(traveled.map(([lng, lat]) => [lat, lng]), {
      color: '#b85a3d', weight: 4,
    }).addTo(map);
  }

  // Current position marker
  const icon = L.divIcon({
    className: '',
    html: '<div style="background:#b85a3d;color:white;padding:4px 8px;border-radius:12px;font-size:12px">🚴</div>',
    iconAnchor: [16, 16],
  });
  L.marker([posLat, posLng], { icon }).addTo(map);

  // Fit the full route in view
  const latlngs = coords.map(([lng, lat]) => [lat, lng]) as [number, number][];
  map.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20] });
</script>
```

- [ ] **Step 3: Configure Astro to treat `.geojson` as JSON (if not default)**

Astro imports `.json` natively but may not handle `.geojson`. Verify with a quick build. If import fails, rename `src/data/route.geojson` to `src/data/route.json` (and update the build script's output path and the import). This is simpler than configuring a loader.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(cycling): CyclingMap Leaflet component"
```

---

## Task 19: Cycling page

**Files:**
- Create: `src/pages/cycling.astro`

- [ ] **Step 1: Create `src/pages/cycling.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import CyclingMap from '../components/CyclingMap.astro';
import stravaData from '../data/strava.json';

const recent = (stravaData.activities ?? []).slice(0, 5);
---
<Layout title="Cycling">
  <section class="max-w-4xl mx-auto py-12">
    <h1 class="text-4xl font-medium mb-2">Seattle → Dali</h1>
    <p class="text-neutral mb-8">Every real ride moves the marker. Started April 10, 2026.</p>

    <CyclingMap />

    {recent.length > 0 && (
      <div class="mt-16">
        <h2 class="text-2xl font-medium mb-6">Recent rides</h2>
        <ul class="divide-y divide-base-300">
          {recent.map((r) => (
            <li class="py-4 flex justify-between items-center">
              <div>
                <p class="font-medium">{r.name}</p>
                <p class="text-sm text-neutral mono">{r.start_date.slice(0, 10)}</p>
              </div>
              <p class="mono">{(r.distance_m / 1000).toFixed(1)} km</p>
            </li>
          ))}
        </ul>
      </div>
    )}
  </section>
</Layout>
```

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

Visit `/cycling`. Expected: map renders, marker near Seattle, counter shows 0 km (or your actual total), recent rides list appears if you have any. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(cycling): cycling page with map and recent rides"
```

---

## Task 20: Real `<CyclingTeaser />` for the home page

**Files:**
- Modify: `src/components/CyclingTeaser.astro` (replace stub)

- [ ] **Step 1: Overwrite `src/components/CyclingTeaser.astro`**

```astro
---
import stravaData from '../data/strava.json';
import routeData from '../data/route.geojson';

const totalKm: number = stravaData.total_km ?? 0;
const routeTotalKm: number = routeData.properties.total_km;
const progressPct = Math.min(100, (totalKm / routeTotalKm) * 100);
---
<a href="/cycling/" class="block py-4 px-5 rounded-box bg-base-200 hover:bg-base-300 transition-colors">
  <div class="flex items-center justify-between gap-4 text-sm">
    <div class="flex items-center gap-3">
      <span class="text-xl">🚴</span>
      <span class="mono">{totalKm.toFixed(0)} km / {routeTotalKm.toFixed(0)} km</span>
      <span class="text-neutral">· {progressPct.toFixed(1)}% to Dali</span>
    </div>
    <span class="text-primary">See the map →</span>
  </div>
</a>
```

- [ ] **Step 2: Verify on home page**

```bash
npm run dev
```

Expected: home page teaser now shows real numbers (0 km / ~13000 km / 0.0% at first). Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(cycling): real teaser strip on home page"
```

---

## Task 21: GitHub Actions — build & deploy

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Enable GitHub Pages with Actions as source** `[USER]`

Go to <https://github.com/zwjmosquito/zwjmosquito.github.io/settings/pages>. Under **Source**, select **GitHub Actions**.

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Build and Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Push master and watch the first Actions run** `[USER]`

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add build and deploy workflow"
git push origin master
```

Open <https://github.com/zwjmosquito/zwjmosquito.github.io/actions>. Wait for the run to finish (~2 minutes).

- [ ] **Step 4: Verify the live site**

Visit <https://zwjmosquito.github.io>. Expected: the new butter-themed site loads, home page shows "Hello, again" and the cycling teaser.

---

## Task 22: Daily Strava sync cron

**Files:**
- Create: `.github/workflows/sync-strava.yml`

- [ ] **Step 1: Create `.github/workflows/sync-strava.yml`**

```yaml
name: Daily Strava Sync

on:
  schedule:
    - cron: '0 7 * * *'   # 07:00 UTC daily
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: node scripts/sync-strava.mjs
        env:
          STRAVA_CLIENT_ID: ${{ secrets.STRAVA_CLIENT_ID }}
          STRAVA_CLIENT_SECRET: ${{ secrets.STRAVA_CLIENT_SECRET }}
          STRAVA_REFRESH_TOKEN: ${{ secrets.STRAVA_REFRESH_TOKEN }}
      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if ! git diff --quiet src/data/strava.json; then
            git add src/data/strava.json
            git commit -m "chore: daily Strava sync"
            git push
          else
            echo "No changes to strava.json"
          fi
```

The pushed commit will trigger `deploy.yml` (by design — that's how the site updates). `sync-strava.yml` is cron-only, so it won't trigger itself into a loop.

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/sync-strava.yml
git commit -m "ci: add daily Strava sync cron"
git push origin master
```

- [ ] **Step 3: Manually trigger the sync workflow to verify** `[USER]`

Go to <https://github.com/zwjmosquito/zwjmosquito.github.io/actions/workflows/sync-strava.yml> → **Run workflow** → select `master` → **Run**.

Expected: workflow completes, either committing updated `strava.json` or logging "No changes."

---

## Task 23: Link checker (lychee)

**Files:**
- Modify: `.github/workflows/deploy.yml` — add a lychee step before deploy

- [ ] **Step 1: Add a lychee step after build**

In the `build` job, after `- run: npm run build`, insert:

```yaml
      - name: Check links
        uses: lycheeverse/lychee-action@v1
        with:
          args: --offline --include-fragments ./dist
          fail: true
```

`--offline` skips HTTP checks of external URLs (fast, no rate limits). If you want external checks too, remove `--offline` but expect occasional false positives from 403/429.

- [ ] **Step 2: Push and verify**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add lychee link checker"
git push origin master
```

Watch the Actions run. Expected: lychee step passes.

---

## Task 24: Lighthouse CI

**Files:**
- Create: `.lighthouserc.json`
- Modify: `.github/workflows/deploy.yml` — add a Lighthouse job

- [ ] **Step 1: Create `.lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": ["http://localhost/", "http://localhost/cycling/"],
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

- [ ] **Step 2: Add a Lighthouse job to `deploy.yml`**

After the `build` job, add:

```yaml
  lighthouse:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli@0.13.x
      - run: lhci autorun
```

And change `deploy:` to depend on both:

```yaml
  deploy:
    needs: [build, lighthouse]
```

- [ ] **Step 3: Push and verify**

```bash
git add -A
git commit -m "ci: add Lighthouse CI with performance/a11y budgets"
git push origin master
```

Watch the Actions run. If Lighthouse fails the budget, lower the `minScore` temporarily and open an issue to fix perf/a11y.

---

## Task 25: Final verification and content pass `[USER]`

**Files:**
- Replace placeholders in: `src/pages/about.astro`, `src/content/stores.json`, `public/avatar.jpg`
- Write a second journal post to give the feed some life

- [ ] **Step 1: Add your avatar**

Place `avatar.jpg` in `public/`. The home page `<img src="/avatar.jpg">` will pick it up.

- [ ] **Step 2: Fill in the about page**

Replace the placeholder bio and `{STRAVA_ID}` in `src/pages/about.astro` with real copy and your Strava profile URL.

- [ ] **Step 3: Fill in `src/content/stores.json`**

Replace the placeholder entry with real store data. Drop store images into `public/stores/`.

- [ ] **Step 4: (Optional) Delete the `archive-2017` note from history**

If you don't want the archive branch visible publicly, do nothing — it's a branch, not a release. To remove it entirely:

```bash
# Only if you're certain you don't need it
git push origin --delete archive-2017
```

- [ ] **Step 5: Verify the live site end to end**

Visit each URL and confirm it renders correctly:
- <https://zwjmosquito.github.io/>
- <https://zwjmosquito.github.io/cycling/>
- <https://zwjmosquito.github.io/stores/>
- <https://zwjmosquito.github.io/about/>
- <https://zwjmosquito.github.io/posts/2026-04-22-hello-again/>

- [ ] **Step 6: Ride your bike** 🚴

Go ride. Tomorrow at 07:00 UTC, the cron fires, the map advances, and the site re-deploys automatically. Welcome back.

---

## Spec coverage checklist

Every section of the spec should map to at least one task above. Quick cross-walk:

| Spec section | Covered in task(s) |
|---|---|
| Architecture > Stack | 3, 5, 6, 18 |
| Architecture > Base theme (Bloomfolio fork) | 3, 4 |
| Architecture > Repo structure | 2–11 |
| Architecture > Branch strategy | 2, 21 |
| Architecture > Deployment | 21, 22 |
| Information Architecture > Pages | 8, 9, 10, 11, 19 |
| Information Architecture > Navigation | 12 |
| Data Flow > Decisions (route, types, start date) | 13 (route), 15 (type filter), 15/sync (start date) |
| Data Flow > One-time setup | 13, 14, 16 |
| Data Flow > Sync script behavior | 15 |
| Data Flow > `<CyclingMap />` | 18 |
| Data Flow > `<CyclingTeaser />` | 20 |
| Data Flow > distance interpolation | 17 |
| Visual Design > butter theme | 5 |
| Visual Design > Typography | 6 |
| Visual Design > Page feels | 8–11, 19 |
| Visual Design > Animations | Inherited from Bloomfolio (no explicit task) |
| Content Model > Journal frontmatter | 7 |
| Content Model > Stores schema | 11 |
| Error Handling > Strava API failure | 15 (try/catch in main) |
| Error Handling > Token expired | 15 (exits 1, loud CI failure) |
| Error Handling > No rides yet | 18 (map renders with 0 km) |
| Error Handling > JS disabled | Partially: counter is static; explicit `<noscript>` block deferred (low priority) |
| Error Handling > prefers-reduced-motion | Inherited from Bloomfolio |
| Error Handling > invalid frontmatter | 7 (Zod schema fails build) |
| Testing > build check | 21 |
| Testing > link check | 23 |
| Testing > Lighthouse | 24 |
| Testing > positionAlongRoute unit test | 17 |
| Testing > sync smoke test | 15 |
| Migration plan | 2, 21, 25 |
| Open items (avatar, tagline, bio, socials, cron hour) | 25, 22 |

Two small gaps flagged:
1. **Explicit `<noscript>` block inside `<CyclingMap />`** — not added in Task 18. Acceptable: the counter outside the `<script>` is server-rendered, so JS-disabled users see the km number and a broken-but-harmless map div. If you want a proper `<noscript>` message, add one line after `<div id="cycling-map">` in Task 18's component: `<noscript><p>Enable JavaScript to see the interactive map.</p></noscript>`. Trivial follow-up.
2. **`prefers-reduced-motion`** — inherited from Bloomfolio's existing transition handling. No task needed unless it turns out Bloomfolio ignores it; then add a CSS override in `src/styles/global.css`: `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`.
