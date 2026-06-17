/**
 * Content collections config.
 *
 * Only the markdown `pages` collection is defined here. Textbook data is NOT a
 * content collection on purpose: it is plain JSON read through the data layer
 * (`src/lib/textbooks.ts`) so the source can be swapped for Action-generated
 * data without touching the UI. Declaring this config also stops Astro from
 * auto-generating (deprecated) collections for folders under `src/content/`.
 *
 * The schema validates the guaranteed page fields but uses `.passthrough()` so
 * extra frontmatter (future fields) is preserved rather than stripped — the
 * same "schema-flexible but stable" principle used for textbooks.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  // `generateId` keeps entry ids tied to the filename. Without this, the glob
  // loader would consume a frontmatter `slug` as the id and warn when it equals
  // the filename — here `slug` stays plain data that `[slug].astro` reads.
  loader: glob({
    pattern: '*.md',
    base: './src/content/pages',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z
    .object({
      title: z.string(),
      // Optional: defaults to the filename (the loader's entry id) when absent.
      slug: z.string().optional(),
      description: z.string().optional(),
      // Optional layout hint. NOTE: Astro reserves the literal `layout`
      // frontmatter key for its legacy markdown layout feature, so we use
      // `template` here and let `[slug].astro` decide how to render.
      template: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { pages };
