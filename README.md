# Open Textbook Catalogue

A minimal, static **catalogue of digital textbooks**. The textbooks themselves
are **not** hosted here — every entry links out to an externally hosted site
(e.g. GitHub Pages). This app is purely a discovery / index layer.

Built with **Astro** + **TypeScript**, fully static, client-side search and
filtering, no backend, no database, no external APIs.

---

## Quick start

Requires **Node 22+**.

```bash
npm install
npm run dev          # local dev server
npm run build        # static build → dist/
npm run preview      # serve the built site
npm run check        # astro + TypeScript type check
npm run test:logic   # verify the pure filtering/URL logic
```

---

## What it does

- **Home** (`/`) — short description + a live textbook count.
- **Catalogue** (`/catalogue`) — the primary feature:
  - Multi-select filters for **language**, **variant**, **subject**, derived
    dynamically from the data (never hardcoded).
  - Case-insensitive **search** across title, description, keywords and authors.
  - Filters + search combine as `(language AND variant AND subject) AND search`,
    with **OR within** a facet and **AND across** facets.
  - All filter/search state lives in the **URL** (`?language=en&variant=python&search=matrix`)
    so views are shareable and browser back/forward works.
- **Markdown pages** (`/about`, `/contributing`, …) — driven entirely by files
  in `src/content/pages/`. Add a page by dropping in a Markdown file; no routing
  changes.

---

## Architecture

Two-layer content architecture:

```
src/
├─ content/
│  ├─ textbooks.json          # STRUCTURED data layer (the catalogue source)
│  └─ pages/*.md              # CONTENT layer (static markdown pages)
├─ content.config.ts          # defines the `pages` collection (+ stops auto-collection)
├─ lib/
│  ├─ types.ts                # Textbook type, facet/state types (single source of truth)
│  ├─ textbooks.ts            # DATA ABSTRACTION LAYER — the only place that knows the source
│  └─ filtering.ts            # pure filter + URL (de)serialisation logic (no DOM, testable)
├─ components/
│  ├─ Layout.astro            # site shell (head, nav, footer)
│  ├─ SearchBar.astro
│  ├─ FilterPanel.astro       # renders facets derived from the data
│  └─ TextbookCard.astro      # depends only on core fields; chips only if present
├─ scripts/
│  └─ catalogue.ts            # the only client JS: filtering + URL state (~2KB)
├─ styles/global.css          # design tokens + base + prose styles
└─ pages/
   ├─ index.astro
   ├─ catalogue.astro
   └─ [slug].astro            # generic route for every markdown page
```

**Clear separation of concerns:**

- **Data layer** (`lib/textbooks.ts`) is the _only_ module that reads the data
  source. Today it imports `textbooks.json`; tomorrow it can `fetch()` a
  generated file or read Action-built data — the UI never changes because the
  returned shape stays `Textbook[]`. It also normalises records defensively and
  derives facets.
- **Filtering logic** (`lib/filtering.ts`) is pure and framework-free, so the
  same rules are testable (`npm run test:logic`) and mirrored by the client.
- **UI components** depend only on the five guaranteed fields and render
  optional metadata only when present.

### Schema-flexible but UI-stable

Only `id`, `title`, `description`, `authors`, `url` are guaranteed. Everything
else (`language`, `variant`, `subject`, `keywords`) is optional, and the `meta`
bag holds arbitrary future fields (`edition`, `license`, `prerequisites`, …).
Unknown fields are ignored safely and never break rendering — so new metadata
can be added over time **without schema migrations**.

---

## Adding content

### Add a textbook

Append an object to `src/content/textbooks.json`:

```json
{
  "id": "unique-id",
  "title": "Title",
  "description": "One-paragraph summary.",
  "authors": ["Author One"],
  "url": "https://author.github.io/book/",
  "language": "en",
  "variant": "python",
  "subject": "cs",
  "keywords": ["topic", "topic"],
  "meta": { "license": "CC-BY-4.0" }
}
```

Only the first five fields are required. New facet values appear in the filters
automatically.

### Add a static page

Drop a Markdown file into `src/content/pages/`:

```md
---
title: FAQ
slug: faq
template: page
description: Frequently asked questions.
---

# FAQ
…
```

It is served at `/faq`. No routing changes needed.

> **Note on `layout` vs `template`:** the brief's example used `layout: page`,
> but Astro 5 reserves the `layout` frontmatter key for its legacy markdown
> layout feature (it tries to resolve the value as a component path, which
> breaks the build). We use `template` instead as a neutral layout hint; the
> generic `[slug].astro` route applies the site layout. `slug` defaults to the
> filename when omitted.

---

## Styling choice

**Plain CSS with design tokens**, not a utility framework. Rationale: the design
is deliberately minimal and the surface area is small, so a handful of CSS custom
properties (spacing scale, type scale, colour) plus per-component scoped styles
are easier to read and audit than a framework — and ship near-zero CSS overhead.
Tokens live in `src/styles/global.css`; everything references them for a
consistent spacing/type rhythm.

## Search choice

Plain **case-insensitive substring** matching over a precomputed searchable
string (title + description + keywords + authors). It fully meets the
requirements with **zero dependencies**. The catalogue ships ~2 KB of JS. If the
dataset grows large enough to need ranked/fuzzy search, `lib/filtering.ts` is the
single seam to swap in Fuse.js or FlexSearch (client-side only — no external
search service).

---

## Deployment

Fully static (`dist/`), so it works as-is on **GitHub Pages** and **Cloudflare
Pages**.

- **Cloudflare Pages / custom domain / root:** no config needed.
- **GitHub Pages project subpath:** set `site` and `base` in `astro.config.mjs`,
  e.g. `site: 'https://<user>.github.io'`, `base: '/textbooks-website'`. All
  internal links already use `import.meta.env.BASE_URL`, so they respect `base`.

---

## Automation readiness (not implemented)

The architecture is ready for a future GitHub Action without any structural
rewrite. Intended flow:

1. Each textbook repo carries a small `textbook.yml` metadata file.
2. An Action reads those files, **validates** them against the `Textbook` schema,
   and regenerates `src/content/textbooks.json` (or an equivalent file the data
   layer reads).
3. A commit/push triggers a rebuild and redeploy.

Why no code changes are needed when that lands:

- `lib/textbooks.ts` is the single swappable data seam.
- The schema is additive (`meta` bag + optional fields), so new metadata needs
  no migration.
- Facets and filters derive from the data, so new values appear automatically.

This is intentionally **not built** here.
