---
title: About
slug: about
template: page
description: What this catalogue is, and what it is not.
---

# About this catalogue

The **Open Textbook Catalogue** is a minimal, static index of openly hosted
digital textbooks. It exists to make a growing collection of independently
published textbooks **discoverable** — nothing more.

## What it is

- A discovery and indexing layer over textbooks hosted elsewhere.
- A fast, fully static website with client-side search and filtering.
- An open, extensible catalogue designed to grow over time.

## What it is not

- It does **not** host any textbook content. Every entry links out to an
  externally hosted site (for example, a GitHub Pages deployment).
- It is **not** a CMS, a database, or an account-based platform.

## How entries are organised

Each textbook has a small set of guaranteed fields — title, description,
authors, and a link — plus optional metadata such as language, variant
(e.g. Python or R) and subject. Optional fields are used only when present, so
older entries that lack them still display correctly.

This page itself is just a Markdown file dropped into `src/content/pages/`.
Adding another page is as simple as adding another Markdown file — no code or
routing changes required.
