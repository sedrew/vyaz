# Changelog

Real bug fixes and features, not every commit — loosely [Keep a Changelog](https://keepachangelog.com/)
format. A docs-only entry is one line. A fix or feature gets enough detail to
act on, the commit(s) it landed in, and a link to the [Roadmap](ROADMAP.md)
item when it closes or advances one.

## [Unreleased]

### Fixed

- **Docs API reference 404s** — `/api/references/<pkg>/src/classes|interfaces|functions/`
  links 404'd two ways at once: VitePress's `base` was being prepended a
  second time on top of a hardcoded `/vyaz` prefix (`/vyaz/vyaz/...`), and
  separately `typedoc-plugin-markdown` never emits an index page for those
  category directories — only per-symbol files live there, so the links were
  dead even with the base fixed. Dropped the double base and removed the
  category links, keeping `Package index` (already lists every symbol with a
  direct link). (`7cc6dbe`, `7fd7093`)

### Docs

- Top nav trimmed to Guide / Playground / Converter / API, each a dropdown;
  Tables and Cases moved under Guide/Playground. Sidebar still lists every
  page. (`b208621`, `6588282`)
- Converter page opens straight into HTML or Markdown mode via
  `?format=html|markdown` from the nav. (`b208621`)
- Mode/Cases `<select>` toolbar controls had lost their border and arrow to
  VitePress's base CSS reset and read as plain text — gave them a visible
  dropdown affordance. (`b208621`)
- New logo (transparent background), home hero image, page footer.
  (`b208621`, `6588282`, `413b46c`)
