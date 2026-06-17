/**
 * Ad-hoc verification of the pure filtering + URL logic (not a permanent test
 * suite). Run with: node --experimental-strip-types scripts/verify-filtering.ts
 */
import type { Textbook } from '../src/lib/types.ts';
import {
  emptyState,
  filterTextbooks,
  stateFromParams,
  paramsFromState,
} from '../src/lib/filtering.ts';

const books: Textbook[] = [
  { id: 'a', title: 'Linear Algebra', description: 'matrix and vectors', authors: ['X'], url: '#', language: 'en', variant: 'general', subject: 'math', keywords: ['matrix'] },
  { id: 'b', title: 'Stats with Python', description: 'regression', authors: ['Y'], url: '#', language: 'en', variant: 'python', subject: 'stats', keywords: ['pandas'] },
  { id: 'c', title: 'Stats with R', description: 'tidyverse', authors: ['Z'], url: '#', language: 'en', variant: 'r', subject: 'stats' },
  { id: 'd', title: 'Cálculo', description: 'derivadas', authors: ['W'], url: '#', language: 'es', variant: 'general', subject: 'math' },
  { id: 'e', title: 'No-facets book', description: 'plain', authors: ['Q'], url: '#' }, // missing optional fields
];

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}` + (ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
  ok ? pass++ : fail++;
}

const ids = (list: Textbook[]) => list.map((b) => b.id);

// No constraints → everything.
check('empty state returns all', ids(filterTextbooks(books, emptyState())), ['a', 'b', 'c', 'd', 'e']);

// Single facet.
let s = emptyState();
s.facets.subject = ['stats'];
check('subject=stats', ids(filterTextbooks(books, s)), ['b', 'c']);

// AND across facets.
s = emptyState();
s.facets.subject = ['stats'];
s.facets.variant = ['python'];
check('subject=stats AND variant=python', ids(filterTextbooks(books, s)), ['b']);

// OR within a facet.
s = emptyState();
s.facets.language = ['en', 'es'];
check('language=en OR es', ids(filterTextbooks(books, s)), ['a', 'b', 'c', 'd']);

// Search is case-insensitive, spans keywords.
s = emptyState();
s.search = 'MATRIX';
check('search MATRIX (keyword, case-insensitive)', ids(filterTextbooks(books, s)), ['a']);

// Search AND facet combined.
s = emptyState();
s.facets.subject = ['stats'];
s.search = 'tidyverse';
check('subject=stats AND search=tidyverse', ids(filterTextbooks(books, s)), ['c']);

// Book missing optional facet is excluded when that facet is constrained.
s = emptyState();
s.facets.language = ['en'];
check('constrained facet excludes book lacking it', ids(filterTextbooks(books, s)), ['a', 'b', 'c']);

// URL round-trip.
s = emptyState();
s.facets.language = ['en', 'es'];
s.facets.variant = ['python'];
s.search = 'matrix';
const qs = paramsFromState(s).toString();
check('paramsFromState encodes', qs, 'language=en%2Ces&variant=python&search=matrix');
check('stateFromParams round-trips', stateFromParams(qs), s);

// Empty constraints are omitted from the URL.
check('empty state → empty query', paramsFromState(emptyState()).toString(), '');

console.log(`\n${pass} passed, ${fail} failed`);
// Throwing (rather than process.exit) keeps this script free of Node type deps
// while still producing a non-zero exit code when a check fails.
if (fail > 0) throw new Error(`${fail} filtering check(s) failed`);
