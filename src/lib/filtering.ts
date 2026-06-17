/**
 * FILTERING LOGIC (pure, framework-free)
 * --------------------------------------
 * Kept separate from both the data layer and the UI so the rules live in one
 * place and are trivially testable. These functions have no DOM or Astro
 * dependencies, so the exact same logic can run at build time (server render)
 * and, in principle, on the client.
 *
 * COMBINED LOGIC (per the spec):
 *
 *   results = (language AND variant AND subject) AND search
 *
 *   - ACROSS facet groups: AND   (must match every constrained facet)
 *   - WITHIN one facet group: OR (e.g. language ∈ {en, es})
 *   - search: case-insensitive substring match over title + description +
 *     keywords (+ authors), AND-combined with the facets.
 *
 * An empty selection for a facet means "no constraint" for that facet.
 * An empty search string means "no constraint" from search.
 */
import type { Textbook, CatalogueState } from './types';
import { FACET_KEYS } from './types';

/** A blank state: nothing selected, no query. */
export function emptyState(): CatalogueState {
  return {
    facets: { language: [], variant: [], subject: [] },
    search: '',
  };
}

/** True when a single book satisfies every constrained facet (AND across, OR within). */
function matchesFacets(book: Textbook, state: CatalogueState): boolean {
  for (const key of FACET_KEYS) {
    const selected = state.facets[key];
    if (!selected || selected.length === 0) continue; // no constraint
    const value = book[key];
    // Constrained facet but the book has no/unmatched value → excluded.
    if (typeof value !== 'string' || !selected.includes(value)) return false;
  }
  return true;
}

/**
 * The searchable text for a book: title, description, keywords and authors,
 * lowercased and joined. Centralised so search coverage is defined in one spot.
 */
export function searchableText(book: Textbook): string {
  return [
    book.title,
    book.description,
    ...(book.keywords ?? []),
    ...book.authors,
  ]
    .join(' ')
    .toLowerCase();
}

/** True when the (already-lowercased) query is empty or found in the book's text. */
function matchesSearch(book: Textbook, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return searchableText(book).includes(q);
}

/** Apply the full combined filter + search to a list of books. */
export function filterTextbooks(
  books: Textbook[],
  state: CatalogueState,
): Textbook[] {
  return books.filter(
    (book) => matchesFacets(book, state) && matchesSearch(book, state.search),
  );
}

/* ------------------------------------------------------------------ *
 * URL <-> state serialisation
 *
 * State lives in the URL query string so views are shareable and the browser
 * back/forward buttons work. Multi-select facets are comma-separated:
 *   /catalogue?language=en,es&variant=python&search=matrix
 * These helpers are the single source of truth for that encoding and are used
 * by both the server (initial render) and the client script.
 * ------------------------------------------------------------------ */

/** Parse a `URLSearchParams` (or query string) into a `CatalogueState`. */
export function stateFromParams(
  params: URLSearchParams | string,
): CatalogueState {
  const sp =
    typeof params === 'string' ? new URLSearchParams(params) : params;
  const state = emptyState();

  for (const key of FACET_KEYS) {
    const raw = sp.get(key);
    if (raw) {
      state.facets[key] = raw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }
  }

  state.search = sp.get('search') ?? '';
  return state;
}

/**
 * Serialise a `CatalogueState` back to a `URLSearchParams`. Empty constraints
 * are omitted so shared URLs stay clean (no `?language=&variant=` noise).
 */
export function paramsFromState(state: CatalogueState): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of FACET_KEYS) {
    const selected = state.facets[key];
    if (selected && selected.length > 0) sp.set(key, selected.join(','));
  }
  if (state.search.trim() !== '') sp.set('search', state.search.trim());
  return sp;
}
