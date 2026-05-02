---
title: "CI todo"
description: "Planned automation and CI follow-up work."
weight: 110
---

# CI / GitHub Actions - planned work

Tracking items for automation; not implemented yet.

## 1. Translations (CSV → locale JSON)

**Goal:** Keep `translations.csv` and generated `**/locales/*.json` in sync without manual mistakes.

**Sketch:**

- Trigger on pull requests (and/or pushes to `main`) when `translations.csv` or `scripts/csv-to-locales.mjs` changes.
- Job steps: `actions/checkout`, setup Node (see `package.json` engines if you add them), `npm ci`, `npm run i18n:sync`.
- **Verify:** `git diff --exit-code` on tracked locale files — fail the job if the repo would change (forces commit of regenerated JSON).
- **Alternative:** auto-commit from a bot account (team policy); only use if you trust branch protections.

**Related:** `localeOutputDirs` in `scripts/csv-to-locales.mjs` — extend when new frontends (e.g. Svelte) are added so one workflow still covers all outputs.

---

## 2. Rust / Tauri builds (per platform)

**Goal:** Reproducible desktop builds in CI.

**Sketch:**

- Use a **matrix** of runners: e.g. `ubuntu-latest`, `macos-latest`, `windows-latest` (trim to what you actually ship).
- On each runner, install **Rust** via `dtolnay/rust-toolchain@stable` (or match `rust-toolchain.toml` / `src-tauri/Cargo.toml` `rust-version`).
- Install **Tauri v2 prerequisites** per OS ([Linux deps](https://tauri.app/start/prerequisites/), MSVC on Windows if building there).
- Cache `~/.cargo` and `src-tauri/target` where it helps.
- Build: `npm ci`, then either `npm run build -w web-react` + `npm run tauri:build` or `npm run build -w web-svelte` + `npm run tauri:build:svelte` (or `cargo build` only for a faster smoke test).

**Note on wording “compiler for each chart”:** If this meant **one Rust toolchain per CI job / per OS target**, the matrix above is the usual pattern (each runner has its own `rustc` for that platform). If it meant **astrological chart** workloads compiled or validated in Rust per chart, that is **application logic** — track separately (e.g. tests under `src-tauri/`, not this doc).

---

## 3. Optional follow-ups

- Python sidecar: keep it optional in CI while Rust/no-sidecar is the baseline. When needed, build `kefer-backend` (or your binary name) and attach it as a separate artifact or release asset instead of making desktop bundle jobs depend on it.
- Code signing / notarization secrets (Windows, macOS) — only when you are ready to release.

## 4. Scope note

This page is only for CI / automation follow-up.

UI cleanup items such as SVG replacement, color tweaks, or theme-selector polish should be tracked in frontend planning docs or issue/backlog tooling instead of here.
