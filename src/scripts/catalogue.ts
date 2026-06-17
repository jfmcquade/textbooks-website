/**
 * CATALOGUE CLIENT SCRIPT
 * -----------------------
 * The only client-side JavaScript in the app. It keeps the rendered catalogue
 * in sync with the filter controls AND the URL:
 *
 *   - reads filter/search state from the controls,
 *   - shows/hides the (already server-rendered) cards via the `hidden`
 *     attribute — no re-rendering, no data re-fetch,
 *   - mirrors state into the URL query string (shareable, back/forward works),
 *   - restores state from the URL on load and on popstate.
 *
 * Matching rules mirror `filtering.ts` exactly:
 *   facets: AND across groups, OR within a group; search: case-insensitive
 *   substring over the precomputed `data-search` text. URL (de)serialisation is
 *   imported from the shared module so encoding stays single-sourced.
 */
import type { CatalogueState, FacetKey } from '../lib/types';
import { FACET_KEYS } from '../lib/types';
import {
  emptyState,
  paramsFromState,
  stateFromParams,
} from '../lib/filtering';

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-catalogue]');
  if (!root) return;

  const searchInput =
    root.querySelector<HTMLInputElement>('[data-search-input]');
  const checkboxes = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[data-facet]'),
  );
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>('[data-textbook]'),
  );
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-clear-all]');
  const countEl = root.querySelector<HTMLElement>('[data-result-count]');
  const totalEl = root.querySelector<HTMLElement>('[data-total-count]');
  const emptyEl = root.querySelector<HTMLElement>('[data-empty-state]');

  const total = cards.length;

  /** Build current state from the form controls. */
  function readState(): CatalogueState {
    const state = emptyState();
    for (const cb of checkboxes) {
      if (!cb.checked) continue;
      const facet = cb.dataset.facet as FacetKey | undefined;
      if (facet && FACET_KEYS.includes(facet)) state.facets[facet].push(cb.value);
    }
    state.search = searchInput?.value ?? '';
    return state;
  }

  /** Push a state into the form controls (used when restoring from the URL). */
  function writeControls(state: CatalogueState): void {
    for (const cb of checkboxes) {
      const facet = cb.dataset.facet as FacetKey | undefined;
      cb.checked = !!facet && state.facets[facet]?.includes(cb.value);
    }
    if (searchInput) searchInput.value = state.search;
  }

  /** Does one card satisfy the state? Mirrors filtering.ts rules. */
  function matches(card: HTMLElement, state: CatalogueState): boolean {
    for (const key of FACET_KEYS) {
      const selected = state.facets[key];
      if (selected.length === 0) continue;
      const value = card.dataset[key];
      if (!value || !selected.includes(value)) return false;
    }
    const q = state.search.trim().toLowerCase();
    if (q !== '') {
      const text = card.dataset.search ?? '';
      if (!text.includes(q)) return false;
    }
    return true;
  }

  /** Apply the state to the DOM: toggle cards, update count + empty state. */
  function render(state: CatalogueState): void {
    let visible = 0;
    for (const card of cards) {
      const show = matches(card, state);
      // Toggle the grid item (the <li>), not the <article>: the card has its
      // own `display` rule that would override the `hidden` attribute, and
      // hiding the wrapper also removes its empty grid cell. Fall back to the
      // card itself if the markup ever changes.
      const item = card.closest<HTMLElement>('li') ?? card;
      item.hidden = !show;
      if (show) visible++;
    }
    if (countEl) countEl.textContent = String(visible);
    if (totalEl) totalEl.textContent = String(total);
    if (emptyEl) emptyEl.hidden = visible !== 0;

    const active =
      state.search.trim() !== '' ||
      FACET_KEYS.some((k) => state.facets[k].length > 0);
    if (clearBtn) clearBtn.hidden = !active;
  }

  /** Write state to the URL. `replace` avoids stacking history while typing. */
  function syncUrl(state: CatalogueState, replace: boolean): void {
    const params = paramsFromState(state);
    const qs = params.toString();
    const url = qs ? `${location.pathname}?${qs}` : location.pathname;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
  }

  // --- events -------------------------------------------------------------

  // Facet toggles: distinct history entry per change.
  for (const cb of checkboxes) {
    cb.addEventListener('change', () => {
      const state = readState();
      render(state);
      syncUrl(state, false);
    });
  }

  // Search: debounced; replace history so back doesn't step per keystroke.
  let searchTimer: number | undefined;
  searchInput?.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      const state = readState();
      render(state);
      syncUrl(state, true);
    }, 150);
  });

  clearBtn?.addEventListener('click', () => {
    const state = emptyState();
    writeControls(state);
    render(state);
    syncUrl(state, false);
  });

  // Back/forward: restore from the URL.
  window.addEventListener('popstate', () => {
    const state = stateFromParams(location.search);
    writeControls(state);
    render(state);
  });

  // Initial paint: the URL is the source of truth. Set the controls to match,
  // apply the filters, then lift the flash guard so the (now correct) results
  // become visible.
  const initial = stateFromParams(location.search);
  writeControls(initial);
  render(initial);
  document.documentElement.classList.remove('is-prefiltering');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
