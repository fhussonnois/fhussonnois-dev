# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog for fhussonnois.dev, built with Hugo and the [hugo-theme-mini](https://github.com/nodejh/hugo-theme-mini) theme (included as a git submodule under `themes/mini`). Deployed to GitHub Pages via GitHub Actions.

## Build Commands

```bash
# Local development server
hugo server -D

# Production build (same as CI)
hugo --minify -v -s . -d ./public

# Create a new blog post
hugo new posts/YYYY-MM-DD-slug.md
```

Hugo version used in CI: **0.120.3** (extended).

## Architecture

- **hugo.yaml** — Site configuration (base URL, theme, params, social links, navigation tabs)
- **content/** — Markdown content organized by section: `posts/`, `about/`, `projects/`, `conferences/`
- **layouts/** — Template overrides for the mini theme:
  - `partials/profile.html` — Custom avatar and author header on homepage
  - `partials/navigation.html` — Custom nav bar with section tabs + RSS button
  - `partials/svgs/rss.svg` — RSS icon SVG partial
  - `section/projects.html`, `section/conferences.html` — Custom list layouts for those sections
- **static/** — Static assets: `css/custom.css` (style overrides), `images/avatar.png`, `CNAME`
- **archetypes/default.md** — Template for `hugo new` (uses TOML front matter with title/date/draft)

## Content Conventions

- Blog posts use **TOML front matter** (`+++` delimiters) with fields: `author`, `title`, `date` (YYYY-MM-DD), `tags`, `draft`
- Post filenames follow the pattern: `YYYY-MM-DD-slug.md`
- Goldmark renderer is configured with `unsafe: true` to allow raw HTML in Markdown

## Deployment

Push to `main` triggers the GitHub Actions workflow (`.github/workflows/github-page.yml`) which builds with Hugo and deploys to the `gh-pages` branch using `peaceiris/actions-gh-pages`.
