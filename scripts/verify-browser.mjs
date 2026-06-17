/**
 * End-to-end browser verification of the catalogue's interactive behaviour,
 * driving the locally-installed Chrome via puppeteer-core (no browser download).
 *
 * Verifies the things static checks can't: that filtered-out cards are actually
 * removed from layout (computed display:none), that the count matches the number
 * of *visible* cards, and that URL state + back/forward work.
 *
 * Run against a running preview server:  node scripts/verify-browser.mjs <baseUrl>
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:4322';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
  if (!ok) failures++;
}

/** Count cards that are actually visible (offsetParent !== null). */
async function visibleCards(page) {
  return page.$$eval('[data-textbook]', (els) =>
    els.filter((el) => el.offsetParent !== null).map((el) => el.dataset.language),
  );
}
async function countText(page) {
  return page.$eval('[data-result-count]', (el) => el.textContent?.trim());
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
});
try {
  const page = await browser.newPage();

  // 1. Initial load: all 10 visible, count says 10.
  await page.goto(`${BASE}/catalogue`, { waitUntil: 'networkidle0' });
  let vis = await visibleCards(page);
  check('initial: 10 cards visible', vis.length === 10, `got ${vis.length}`);
  check('initial: count = 10', (await countText(page)) === '10');

  // 2. Select language=de → exactly 1 visible (the German book), count = 1.
  await page.click('input[data-facet="language"][value="de"]');
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-textbook]')].filter(
        (el) => el.offsetParent !== null,
      ).length === 1,
    { timeout: 3000 },
  );
  vis = await visibleCards(page);
  check('de filter: exactly 1 card visible', vis.length === 1, `got ${vis.length}`);
  check('de filter: that card is German', vis[0] === 'de', `got ${vis[0]}`);
  check('de filter: count text = 1', (await countText(page)) === '1');
  check('de filter: URL has language=de', page.url().includes('language=de'), page.url());

  // 3. Add search that excludes the German book → 0 visible, empty state shown.
  await page.type('[data-search-input]', 'pytorch');
  await page.waitForFunction(
    () => {
      const empty = document.querySelector('[data-empty-state]');
      return empty && !empty.hidden;
    },
    { timeout: 3000 },
  );
  vis = await visibleCards(page);
  check('de + "pytorch": 0 cards visible', vis.length === 0, `got ${vis.length}`);
  check('de + "pytorch": empty state visible', true);

  // 4. Clear all → back to 10 visible, URL clean.
  await page.click('[data-clear-all]');
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-textbook]')].filter(
        (el) => el.offsetParent !== null,
      ).length === 10,
    { timeout: 3000 },
  );
  vis = await visibleCards(page);
  check('clear all: 10 visible again', vis.length === 10, `got ${vis.length}`);
  check('clear all: URL has no query', !page.url().includes('?'), page.url());

  // 5. Shared deep-link renders pre-filtered with no flash of all cards.
  await page.goto(`${BASE}/catalogue?variant=r`, { waitUntil: 'networkidle0' });
  vis = await visibleCards(page);
  check('deep-link variant=r: only R books visible', vis.every((l) => l !== undefined) && vis.length === 2, `got ${vis.length}`);
  check('deep-link: R checkbox is checked', await page.$eval('input[data-facet="variant"][value="r"]', (el) => el.checked));

  // 6. Back/forward: go to a filtered state, then back restores previous.
  await page.goto(`${BASE}/catalogue`, { waitUntil: 'networkidle0' });
  await page.click('input[data-facet="subject"][value="math"]');
  await page.waitForFunction(() => location.search.includes('subject=math'), { timeout: 3000 });
  await page.goBack({ waitUntil: 'load' });
  await page.waitForFunction(
    () =>
      !location.search &&
      [...document.querySelectorAll('[data-textbook]')].filter(
        (el) => el.offsetParent !== null,
      ).length === 10,
    { timeout: 3000 },
  );
  vis = await visibleCards(page);
  check('back button: restores all 10 + clean URL', vis.length === 10 && !page.url().includes('?'), `got ${vis.length} ${page.url()}`);

  console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILED'}`);
} finally {
  await browser.close();
}
if (failures > 0) throw new Error(`${failures} browser check(s) failed`);
