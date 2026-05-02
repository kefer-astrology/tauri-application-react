---
title: "Svelte frontend"
description: "Operational guide for the alternate Svelte + Vite + Tauri workspace."
weight: 25
---

# Svelte frontend (alternate Tauri shell)

`apps/web-svelte` is the alternate Svelte port of the app. It is no longer the unequivocally "more advanced" shell in every area: some radix, settings, and workspace behavior have been pulled much closer to React, while other screens are still behind React or remain more prototype-like.

## Current status

- Svelte now has substantially better parity with the React radix experience than it did originally:
  - richer workspace defaults for observable bodies, aspects, aspect colors, and aspect line tier settings
  - React-like wheel geometry and element-based zodiac coloring
  - UTC-safe time stepping with `seconds`, `minutes`, `hours`, `days`, `months`, and `years`
  - translation packs generated from the same `translations.csv` source as React
- It includes a wired transit compute flow through Tauri `compute_transit_series`.
- It still carries more compatibility-era assumptions than React in some places, especially around storage/query helpers and in-memory fallbacks.
- Recent performance fixes removed several avoidable reactive loops and backend reload paths, but Svelte is still the shell where interaction/performance polish needs the most care.
- Treat it as a valuable alternate target and implementation surface, but not as a guarantee that every internal path is already on the final desktop persistence model.

## Commands

```bash
npm install
npm run dev:svelte            # Vite only, http://localhost:1422
npm run check:svelte          # Svelte type/check pass
npm run build:svelte          # Frontend -> apps/web-svelte/dist/
npm run tauri:dev:svelte      # Desktop app using the Svelte frontend
npm run tauri:build:svelte    # Desktop bundle with Svelte as foreground
npm run docs:prepare          # Builds all frontends and copies them into docs/static/apps/
```

## Layout

| Path                           | Purpose                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `apps/web-svelte/src/App.svelte` | Main shell for panels, radix/chart interactions, settings, and transit controls.                         |
| `apps/web-svelte/src/lib/`     | Svelte state, i18n, glyphs, shared UI primitives, and Tauri `invoke` usage.                             |
| `apps/web-svelte/src/lib/i18n/` | Generated locale JSON (`cs`, `en`, `fr`, `es`) plus the Svelte runtime helper.                           |
| `apps/web-svelte/vite.config.ts` | Shared static root, docs-safe base path support, and the alternate Vite/Tauri dev ports (`1422`/`1423`). |

## Structure conventions

- `src/App.svelte` is currently a large integration shell. Treat it as orchestration glue, not as the preferred home for new feature logic.
- New feature UI should usually be extracted into `src/lib/components/` instead of extending `App.svelte` with another large conditional branch.
- Shared Svelte UI primitives belong under `src/lib/components/ui/`.
- Rune-backed global state should live in `src/lib/state/*.svelte.ts`, with plain `.ts` wrappers only when needed for cleaner imports.
- Shared visual asset resolution belongs in dedicated helpers such as:
  - `src/lib/stores/app-shell-icons.svelte.ts`
  - `src/lib/stores/glyphs.svelte.ts`
- Do not add or revive app-local icon families under `src/lib/icons/` for app-shell style navigation. That directory is legacy; shared app-shell icons and logos come from repo-root `static/`.

## UI component strategy

- Prefer the shared Svelte UI primitives under `apps/web-svelte/src/lib/components/ui/` before introducing bespoke controls.
- Those primitives are the Svelte-side equivalent of the repo’s shadcn-style component layer and should be the first place to extend styling behavior.
- Styling should flow through shared tokens, variants, spacing, and wrappers before adding one-off component CSS.
- When two views are structurally similar, prefer extracting a shared panel, menu, or content container rather than repeating another mode-specific block inside `App.svelte`.

## Current behavior notes

- Main radix composition currently lives across:
  - `apps/web-svelte/src/App.svelte`
  - `apps/web-svelte/src/lib/components/MiddleContent.svelte`
  - `apps/web-svelte/src/lib/components/RadixChart.svelte`
  - `apps/web-svelte/src/lib/components/TimeNavigationPanel.svelte`
- Workspace defaults and chart payload building are centralized in:
  - `apps/web-svelte/src/lib/state/layout.svelte.ts`
- Shared time-navigation state lives in:
  - `apps/web-svelte/src/lib/stores/timeNavigation.svelte.ts`
- Query helpers and compatibility fallbacks live in:
  - `apps/web-svelte/src/lib/stores/data.svelte.ts`

## Frontend parity snapshot

The table below is the practical React-to-Svelte parity snapshot as of the current branch.
It is intentionally feature-oriented rather than file-oriented so it can serve as a restart
checklist for future sync work.

| Area | React reference | Svelte status | Notes |
| --- | --- | --- | --- |
| Workspace defaults and persistence | `apps/web-react/src/lib/tauri/chartPayload.ts`, `apps/web-react/src/app/components/settings-view.tsx` | **Mostly synced** | Svelte now persists default bodies, aspects, aspect orbs, aspect colors, and aspect line tier settings through workspace defaults. |
| Translation source | `translations.csv`, `scripts/csv-to-locales.mjs` | **Synced** | React and Svelte locale packs are generated from the same CSV source and should be treated as a single pipeline. |
| Current Sky bootstrap | `apps/web-react/src/lib/tauri/chartPayload.ts` | **Synced in behavior** | Svelte now boots a real `Current Sky` chart with workspace defaults instead of leaving the radix empty. |
| Radix wheel geometry | `apps/web-react/src/app/components/horoscope-wheel.tsx` | **Partially synced** | Svelte wheel structure, house cusp handling, aspect drawing, and element coloring were pulled much closer to React, but rendering polish is not yet 1:1. |
| Radix wheel coloring | `apps/web-react/src/app/components/horoscope-wheel.tsx` | **Partially synced** | Element-based zodiac coloring is present in Svelte; finer React wheel tint/filter details still differ. |
| Radix dashboard composition | `apps/web-react/src/app/components/horoscope-dashboard.tsx` | **Partially synced** | Svelte profile panel, astrolabe values, and right-side positions are closer to React, but the full interaction model is still less unified. |
| Astrolabe stepping model | `apps/web-react/src/app/components/horoscope-dashboard.tsx` | **Partially synced** | Svelte supports UTC-safe stepping and `months`/`years`, but still needs more UI and flow parity with the React dashboard experience. |
| Astrolabe shift rendering stability | React dashboard update flow | **Improved, not final** | Svelte now keeps the last wheel rendered during loading and guards against stale async position results, reducing visible flicker. |
| JPL runtime behavior during radix interaction | React uses the same backend layer | **Synced at backend level** | The Rust JPL backend now caches loaded `Almanac` instances by BSP path set, so Svelte no longer repeatedly reloads `de440s.bsp` while stepping. |
| Settings screen coverage | `apps/web-react/src/app/components/settings-view.tsx` | **Mostly synced** | Svelte covers language, location, house system, observable objects, aspects, and appearance, but still differs in some UX details and component richness. |
| Location selector UX | `apps/web-react/src/app/components/location-selector.tsx` | **Not yet synced** | React has a reusable popover/search location selector; Svelte still relies on simpler text-entry flows in most places. |
| Time picker UX | `apps/web-react/src/app/components/time-roller-picker.tsx` | **Not yet synced** | Svelte does not yet have a React-equivalent reusable time roller / richer time input control. |
| Information view | `apps/web-react/src/app/components/information-view.tsx` | **Not synced** | React’s information screen is much richer; Svelte info mode remains significantly lighter. |
| Transits configuration UI | `apps/web-react/src/app/components/transits-content.tsx`, `transits-bodies-config.tsx` | **Partially synced** | Svelte has real Tauri `compute_transit_series` wiring, but its transits screen organization and configurator UX still trail the React component set. |
| Open/save workspace flows | `apps/web-react/src/lib/tauri/workspace.ts`, React app shell | **Functionally available** | Svelte can open workspaces and use workspace defaults, but React’s app composition around those flows is cleaner. |
| App-shell decomposition | `apps/web-react/src/app/` + providers/components split | **Behind React** | Svelte still centralizes a lot of orchestration in `App.svelte`, which makes parity work and performance tuning harder than in React. |

## Recent performance fixes

The current Svelte branch already includes several important stability/performance fixes that are easy to regress:

- Language switching no longer mirrors local selector state through multiple `$effect` loops; selectors are controlled directly from global i18n state.
- Astrolabe/radix updates no longer replace the wheel with a full loading placeholder on every shift step; the last wheel stays rendered and loading is shown as an overlay badge.
- Position loading in `MiddleContent.svelte` now uses stable request keys so chart recomputation does not automatically retrigger the same expensive fetches.
- The JPL backend now caches loaded `anise::Almanac` instances by BSP path set, so radix interaction does not repeatedly reload `de440s.bsp`.
- Default observable bodies no longer auto-enable unsupported asteroid SPK lookups in fresh/default flows.

When debugging new sluggishness, check those paths first before adding more reactive effects.

## Remaining parity priorities

If parity work resumes later, the highest-value remaining items are:

1. Finish radix dashboard parity:
   align the combined profile / astrolabe / positions interaction model more closely with React `horoscope-dashboard.tsx`.
2. Finish wheel polish parity:
   continue bringing `RadixChart.svelte` closer to React `horoscope-wheel.tsx` in rendering detail, glyph treatment, and update smoothness.
3. Port richer input primitives:
   add Svelte equivalents for React `location-selector.tsx` and `time-roller-picker.tsx`.
4. Port or redesign the information view:
   React `information-view.tsx` remains the biggest single feature-screen gap.
5. Improve transits screen parity:
   keep the existing wired compute flow, but bring the configuration UI closer to React’s dedicated transits components.
6. Continue decomposition of `App.svelte`:
   move orchestration and mode-specific logic into focused components/stores so future parity and performance work becomes cheaper.

## Shared static assets

Both frontends consume the same repo-root `static/` tree:

- `static/app-shell/icons/default/*.svg`
- `static/app-shell/icons/modern/*.svg`
- `static/app-shell/logo-full-*.svg`
- `static/app-shell/logo-mark-*.svg`
- `static/glyphs/default/{planets,zodiac}/*.svg`
- `static/glyphs/modern/{planets,zodiac}/*.svg`

App-shell SVGs are shared source assets, but they are not intrinsically uniform:

- the `default` icon family is mostly filled artwork authored in a `209 x 209` box
- the `modern` family is mostly `24 x 24` stroke-based artwork
- full logos are rectangular and must not be rendered through a square-only assumption

Normalization therefore happens in the frontend render layer:

- Svelte paths and logo ratios live in `apps/web-svelte/src/lib/stores/app-shell-icons.svelte.ts`
- the shared masked renderer is `apps/web-svelte/src/lib/components/SharedSvgIcon.svelte`
- React mirrors the same behavior in its own app-shell helper and shared SVG wrapper

That render-layer normalization is per icon, not just per family, because several icons within the same set occupy meaningfully different visual area.

Legacy note:

- `apps/web-svelte/src/lib/icons/` should be treated as obsolete local icon residue, not as the source of truth for the app shell.
- Shared shell visuals should continue to resolve through the repo-root `static/` assets and the corresponding Svelte helper stores.

Svelte resolves these through `import.meta.env.BASE_URL`, so the same code works for:

- normal app builds and Tauri builds
- docs publishing under `/apps/web-svelte/`

## Static docs build

`npm run docs:prepare` already builds every workspace under `apps/*` and copies each finished `dist/` into `docs/static/apps/<app>/`. That means the Svelte app is automatically published under the docs artifact alongside React, with no extra per-app copy step.

Published static entry points:

- Svelte: `apps/web-svelte/`
- React: `apps/web-react/`

## Tauri targeting

The base `src-tauri/tauri.conf.json` still points at React by default. Use the override configs when you want the desktop shell to foreground Svelte instead:

- `src-tauri/tauri.react.conf.json`
- `src-tauri/tauri.svelte.conf.json`

The root scripts wrap those configs so you can switch foregrounds without editing Tauri config files by hand.

## Data-path note

- Svelte can render from real computed chart payloads returned by Tauri.
- Some Svelte data helpers also call storage compatibility commands such as `query_positions`.
- In the current desktop app, those storage commands do not persist computed data in Rust, so Svelte may fall back to in-memory chart computation results when query calls return empty data.
- Because of that mixed model, performance investigation should always consider both frontend reactivity and backend command frequency, not just visible render code.
