---
title: "Project docs"
description: "Core architecture, frontend, Python, integration, and planning notes."
weight: 10
---

# Documentation index

Start here for how the Kefer desktop app is structured and how to work on it.

## Current stack

| Layer                                      | Role                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **React** (`src/app/`, `src/main.tsx`)     | UI shell (shadcn-style Radix components + MUI where used).                                 |
| **Tauri** (`src-tauri/`)                   | Native window, `invoke` commands, Python sidecar lifecycle.                                |
| **Python** (`backend-python/`)             | Ephemeris / chart computation (sidecar binary bundled in `src-tauri/binaries/`).           |
| **Static assets** (`static/` at repo root) | Shared glyphs and favicon; each Vite app points `publicDir` here; URLs stay `/glyphs/...`. |

## Guides (read in this order)

1. **[frontend-react](./frontend-react/)** — React + Vite + Tauri wiring, Tauri API layer, assets, dev commands.
2. **[ui-conventions](./ui-conventions/)** — Four themes, `sidebarThemeStyles`, secondary nav (transits/settings), i18n workflow (`translations.csv` → `npm run i18n:sync`).
3. **[architecture](./architecture/)** — Workspace layout, storage model, data flow (Rust/Python).
4. **[python-package](./python-package/)** — Python module and CLI.
5. **[time-navigation](./time-navigation/)** — Time navigation design (reference; implement with React state/hooks).
6. **[physical-properties](./physical-properties/)** — JPL / physical fields.
7. **[integration-examples](./integration-examples/)** — `invoke` patterns and examples (some older snippets are illustrative only).

## Historical / planning notes

- **[discussion-summary](./discussion-summary/)** and **[implementation-plan](./implementation-plan/)** predate the React shell. Use them for background only; prefer **[frontend-react](./frontend-react/)** and **[ui-conventions](./ui-conventions/)** for the live codebase.

## Automation (todo)

- **[ci-todo](./ci-todo/)** — Planned GitHub Actions: i18n sync verification, Rust/Tauri matrix builds, optional follow-ups.
