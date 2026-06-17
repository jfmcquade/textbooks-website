/**
 * Core data model for the textbook catalogue.
 *
 * SCHEMA-FLEXIBLE BUT UI-STABLE
 * -----------------------------
 * Only `id`, `title`, `description`, `authors`, and `url` are guaranteed to
 * exist. Every other field is optional. UI components must read core fields
 * directly but must treat all optional fields defensively (check before use).
 *
 * The `meta` bag exists so arbitrary future fields (difficulty, edition,
 * license, prerequisites, ...) can be added WITHOUT changing this interface or
 * migrating existing data. Unknown fields are ignored safely by the UI.
 */
export interface Textbook {
  id: string;
  title: string;
  description: string;
  authors: string[];
  url: string; // external textbook site (e.g. GitHub Pages)

  language?: string;
  variant?: string; // e.g. python, r, general
  subject?: string;
  keywords?: string[];

  meta?: Record<string, unknown>; // arbitrary future expansion
}

/**
 * The three facets the catalogue filters on. Kept as a const tuple so the
 * filtering code, the data layer (facet derivation) and the UI all agree on
 * the same set of keys without hardcoding them in multiple places.
 *
 * To add a new facet later (e.g. "license"), add the key here and ensure it is
 * an optional `string` field on `Textbook` — the facet derivation and filter
 * panel pick it up automatically.
 */
export const FACET_KEYS = ['language', 'variant', 'subject'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

/** A facet plus the distinct values present in the dataset, used by the UI. */
export interface Facet {
  key: FacetKey;
  /** Human label for the facet group, e.g. "Language". */
  label: string;
  /** Distinct values found in the dataset, sorted alphabetically. */
  values: string[];
}

/**
 * The full filter/search state. This is the single shape that is:
 *  - parsed from / serialised to the URL query string,
 *  - applied by the pure filtering functions,
 *  - reflected by the filter controls.
 *
 * Each facet maps to a list of selected values (multi-select).
 */
export interface CatalogueState {
  /** Selected values per facet. Empty array (or missing key) = no constraint. */
  facets: Record<FacetKey, string[]>;
  /** Free-text search query (case-insensitive). */
  search: string;
}
