// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
//
// Deployment notes:
// - Default config produces a fully static site (`output: 'static'` is implicit),
//   which works on both GitHub Pages and Cloudflare Pages with no adapter.
// - For GitHub Pages under a project subpath, set `site` and `base`, e.g.:
//     site: 'https://<user>.github.io',
//     base: '/textbooks-website',
//   These are left unset here so it works at the domain root (Cloudflare Pages,
//   custom domain, or a GitHub user/organisation page). Configure when deploying.
export default defineConfig({
  // No integrations needed: plain CSS + a tiny island of vanilla JS keeps the
  // JS footprint well under target. See README for the styling rationale.
});
