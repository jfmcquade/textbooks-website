/**
 * DATA ABSTRACTION LAYER
 * ----------------------
 * This module is the ONLY place that knows where textbook data comes from.
 * UI components and pages import from here, never from the raw JSON.
 *
 * Today it loads a static JSON file bundled with the repo. Later, a GitHub
 * Action can generate that same JSON (from per-repo `textbook.yml` files) and
 * drop it in at the same path — or this function can be swapped to `fetch()` a
 * remote file — WITHOUT any change to UI code, as long as the returned shape
 * stays `Textbook[]`.
 *
 * Keep this layer thin and explicit: load, normalise, derive facets. No
 * rendering concerns, no filtering concerns (those live in `filtering.ts`).
 */
import type { Textbook, Facet, FacetKey } from './types';
import { FACET_KEYS } from './types';
import rawTextbooks from '../content/textbooks.json';

/** Human-readable labels for each facet group, used by the filter panel. */
const FACET_LABELS: Record<FacetKey, string> = {
  language: 'Language',
  variant: 'Variant',
  subject: 'Subject',
};

/**
 * Defensively coerce one raw record into a `Textbook`. Guarantees the five core
 * fields are present and well-typed; passes optional fields through only when
 * they are the expected type, so malformed/partial entries can never break the
 * UI. Returns `null` for records missing required fields (skipped by caller).
 */
function normalise(raw: unknown): Textbook | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  // Required core fields — without these the entry is unusable.
  if (typeof r.id !== 'string' || r.id.length === 0) return null;
  if (typeof r.title !== 'string') return null;
  if (typeof r.url !== 'string') return null;

  const book: Textbook = {
    id: r.id,
    title: r.title,
    description: typeof r.description === 'string' ? r.description : '',
    authors: Array.isArray(r.authors)
      ? r.authors.filter((a): a is string => typeof a === 'string')
      : [],
    url: r.url,
  };

  // Optional, single-value string facets — copied only when valid.
  if (typeof r.language === 'string') book.language = r.language;
  if (typeof r.variant === 'string') book.variant = r.variant;
  if (typeof r.subject === 'string') book.subject = r.subject;

  if (Array.isArray(r.keywords)) {
    book.keywords = r.keywords.filter((k): k is string => typeof k === 'string');
  }

  // Unknown future fields are preserved verbatim in `meta` and ignored by the
  // UI until something opts in to reading them.
  if (typeof r.meta === 'object' && r.meta !== null) {
    book.meta = r.meta as Record<string, unknown>;
  }

  return book;
}

/** Memoised, normalised dataset (loaded once per build/server start). */
let cache: Textbook[] | null = null;

/**
 * Returns all textbooks. Synchronous today because the source is a bundled
 * import; declared `async` so a future remote-fetch implementation is a
 * drop-in replacement that needs no caller changes.
 */
export async function getTextbooks(): Promise<Textbook[]> {
  if (cache) return cache;
  const list = Array.isArray(rawTextbooks) ? rawTextbooks : [];
  cache = list
    .map(normalise)
    .filter((b): b is Textbook => b !== null);
  return cache;
}

/** Convenience: total count, for the home-page stat. */
export async function getTextbookCount(): Promise<number> {
  return (await getTextbooks()).length;
}

/**
 * Derives the filter facets dynamically from the data — values are NEVER
 * hardcoded. Each facet lists the distinct values actually present, sorted
 * alphabetically (locale-aware). Facets with no values are omitted so the UI
 * doesn't render empty filter groups.
 */
export async function getFacets(): Promise<Facet[]> {
  const books = await getTextbooks();
  const facets: Facet[] = [];

  for (const key of FACET_KEYS) {
    const values = new Set<string>();
    for (const book of books) {
      const value = book[key];
      if (typeof value === 'string' && value.length > 0) values.add(value);
    }
    if (values.size === 0) continue;
    facets.push({
      key,
      label: FACET_LABELS[key],
      values: [...values].sort((a, b) => a.localeCompare(b)),
    });
  }

  return facets;
}
