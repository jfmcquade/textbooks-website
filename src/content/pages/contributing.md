---
title: Contributing
slug: contributing
template: page
description: How a textbook gets listed in the catalogue.
---

# Contributing a textbook

This catalogue is built to be fed by automation in the future, but the data
model is simple enough to understand today.

## The data model

Every entry needs five core fields:

- **id** — a unique, URL-safe identifier
- **title**
- **description**
- **authors** — a list of names
- **url** — the externally hosted textbook site

Optional fields add structure when available: `language`, `variant`,
`subject`, and `keywords`. Anything else can live under a free-form `meta`
object (for example `edition`, `license`, or `prerequisites`) without changing
the schema.

## Planned workflow (not yet implemented)

The intended future flow is:

1. Each textbook repository includes a small `textbook.yml` metadata file.
2. A GitHub Action reads those files, validates them against the schema, and
   regenerates the central catalogue data.
3. The site rebuilds and deploys automatically.

Until that exists, entries live in a single JSON file that the site reads at
build time. The user interface never reads that file directly — it goes through
a small data layer — so swapping the static file for generated data requires no
changes to the interface.

> This page is itself a Markdown file in `src/content/pages/`. It demonstrates
> that new pages can be added simply by dropping a file into that folder.
