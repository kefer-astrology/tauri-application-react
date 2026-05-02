---
title: "SPICE backend"
description: "Current JPL/SPICE backend architecture and runtime status."
weight: 41
---

# SPICE backend

This page describes the current **JPL / SPICE** backend architecture in Kefer.

## Why this direction is required — licensing

Swiss Ephemeris (libswe / Kerykeion) is dual-licensed: **AGPL** or a paid commercial license from Astrodienst.
The AGPL obligation is incurred at **compilation time**: as long as libswe is linked into the Rust binary, or Kerykeion is imported in Python, the entire application is under AGPL.

The JPL-centered path removes this dependency from the default Rust build:

| Path | Library | License | File |
|------|---------|---------|------|
| Python sidecar | Skyfield | MIT | `de440s.bsp` (public domain) |
| Rust standalone | `anise` | MPL-2.0 | `de440s.bsp` (public domain) |

Both paths share the same `de440s.bsp` SPICE kernel file present at `backend-python/source/de440s.bsp` and bundled in `src-tauri/resources/de440s.bsp`. `de421.bsp` is still bundled as an additional fallback kernel. See **[ephemeris-manager](./ephemeris-manager/)** for the full catalog, download mechanism, and asteroid body support.

Status note:

- Rust currently prefers the bundled/downloaded BSP set managed by `EphemerisManager`.
- Python currently prefers `de440s.bsp` when present and falls back to `de421.bsp`.

## Purpose

The JPL backend should become the canonical astronomy layer for long-term Kefer architecture.

Its job is to provide:

- precise astronomy primitives
- backend-neutral output
- explicit kernel and provenance metadata

It should **not** own astrology semantics such as zodiac assignment, house interpretation, aspect policy, or tradition rules.

## Boundary

SPICE belongs in the **astronomy backend layer**.

That means it should answer questions like:

- where is body `X` at moment `T`
- what are the observer-relative axes for moment `T` and observer `O`
- what are the house cusps for the requested system
- what astronomy metadata is available for this result

It should not answer:

- what sign a point belongs to
- how houses should be interpreted in a tradition
- which aspects count and which orb policy applies
- how Vedic vs Western defaults differ

## Ephemeris file format

The Python and Rust paths both target the **SPICE BSP (SPK) format** — `.bsp` files such as `de421.bsp`.

This is distinct from the old-format JPL binary files (`.eph`) used by Swiss Ephemeris's `swejpl.c` mode (`SEFLG_JPLEPH`).
`JplViaSwissAstronomyBackend` in Rust uses the `.eph` format via libswe. It does **not** use `.bsp` files and does **not** remove the AGPL dependency.

## Rust backend: `anise`

[`anise`](https://github.com/nyx-space/anise) (nyx-space) is a pure Rust astrodynamics library that reads SPICE BSP files directly — no C library linking, no CSPICE dependency.

`anise` is implemented in the Rust backend.

| Property | Result |
|----------|--------|
| License | **MPL-2.0** — file-level copyleft only; using it as a dependency does not affect application code |
| Version | 0.9.6, actively maintained |
| C deps | None — pure Rust, cross-platform |
| Maturity | NASA TRL 9; used operationally on the Firefly Blue Ghost lunar lander |
| BSP support | ✅ reads DE440s/DE440/DE441 natively; DE440s covers 1900–2050 |
| Bodies | ✅ Sun, Moon, 8 planets, Pluto (DE440+ files identical to DE421 for queryable bodies) |
| Output | ICRF/J2000 state vectors; frame transforms available |
| Precision | Sub-arcsecond; validated against 100k+ queries at machine precision |

**Implemented above the backend:**

- **Ecliptic longitude** ✅ — ICRF/J2000 → ecliptic via obliquity rotation in `houses.rs`
- **Lunar nodes** ✅ — Mean Node computed analytically (IAU 1980 formula); South Node = Mean + 180°
- **Asteroid body IDs** ✅ — Ceres, Pallas, Juno, Vesta frames are registered via DE440-era NAIF IDs; actual position queries still require a dedicated asteroid SPK kernel. See [ephemeris-manager](./ephemeris-manager/)
- **House cusps** ✅ — Whole Sign + Placidus in `houses.rs`; other systems fall back to Whole Sign with a warning
- **Ayanamsha** — Routed through Python/Swiss for Vedic charts; own implementation pending

**Current Rust module layout:**

```text
src-tauri/src/
  astronomy.rs              # AstronomyBackend trait + backend_for_chart()
  ephemeris_manager.rs      # BSP catalog, download, multi-file almanac construction
  jpl_backend.rs            # JplAstronomyBackend — reads de440s.bsp via anise, MPL-2.0
  houses.rs                 # pure-Rust obliquity, GMST, ASC/MC, Placidus/WholeSign, Mean Node
  swisseph.rs               # gated behind "swisseph" Cargo feature flag (AGPL)
```

## Python module layout

Current Python layout target:

```text
backend-python/module/
  astronomy.py             # shared backend protocol / selection
  spice/
    __init__.py
    kernels.py             # kernel loading and source resolution
    time.py                # UTC/TT/TDB normalization
    frames.py              # frame transforms
    observer.py            # topocentric helpers
    bodies.py              # body queries and mappings
    houses.py              # house cusp integration
```

The Python and Rust seams are intended to stay aligned at the backend contract level.

## Core interface

The backend interface should stay small.

Current contract shape:

```python
class EphemerisBackend(Protocol):
    def backend_id(self) -> str: ...
    def ephemeris_source(self, chart) -> str | None: ...
    def body_state(self, body, moment, observer, frame) -> BodyState: ...
    def axes(self, moment, observer, house_system) -> Axes: ...
    def house_cusps(self, moment, observer, house_system) -> HouseCusps: ...
    def ayanamsha(self, moment, mode) -> float | None: ...
```

Kefer does not need to expose raw SPICE details everywhere in the app.
It needs a stable backend-neutral astronomy contract.

## Kernel strategy

The SPICE backend should load kernels explicitly and surface their source in provenance.

Expected kernel categories:

- planetary ephemeris kernels
- leap second kernels
- time conversion support kernels as needed
- frame or orientation kernels if required by chosen calculations

Rules:

- kernel resolution should be deterministic
- provenance should include enough information to identify the active kernel set
- app flows should not silently switch kernel sources

## Time handling

SPICE work should sit on top of one canonical time model.

Rules:

- parse input timestamps once
- preserve offset-aware instants exactly
- convert into the required SPICE time scale in one dedicated layer
- do not mix astrology-localization rules into astronomy time conversion

## Frames and transforms

SPICE should return astronomy primitives in clearly documented frames.

That means the backend should make explicit:

- which frame the body state came from
- where precession/nutation choices are handled
- where geocentric vs topocentric differences are applied

Transform policy should live in one place, not be reimplemented per feature.

## Houses and axes

The backend should provide:

- observer-relative angles
- valid `house_cusps` for supported systems

If a requested house system is unsupported or reduced-fidelity:

- the response should remain honest
- provenance or warnings should say so
- the frontend must not invent geometry silently

## Provenance

Every SPICE result should be able to surface:

- `backend_used`
- `ephemeris_source`
- active kernel source or identifier
- `warnings`

When fallback occurs:

- `fallback_used` must be true
- the warning should say why

## Relationship to astrology layers

SPICE should feed:

- coordinate / projection transforms
- zodiac projection
- house interpretation
- aspect computation
- tradition-specific rule engines

Those higher layers remain Kefer-owned logic.

## Implementation status

1. ~~assess `anise`~~ ✅ — viable; MPL-2.0, pure Rust, NASA TRL 9
2. ~~implement `JplAstronomyBackend` in `src-tauri/src/jpl_backend.rs` behind the `AstronomyBackend` trait~~ ✅
3. ~~implement `src-tauri/src/houses.rs` — pure-Rust Whole Sign and Placidus house cusp calculations~~ ✅
4. ~~implement ecliptic longitude transform (ICRF → ecliptic via obliquity rotation)~~ ✅
5. ~~implement Mean Node + South Node analytically~~ ✅
6. ~~gate `swisseph.rs` behind a `swisseph` Cargo feature flag~~ ✅ (off by default; `cargo check` → license-clean)
7. ~~implement `EphemerisManager` — multi-BSP catalog, download, asteroid support~~ ✅ — see [ephemeris-manager](./ephemeris-manager/)
8. ~~upgrade default BSP from `de421` to `de440s`~~ ✅ — bundled in `src-tauri/resources/de440s.bsp`
9. ~~avoid reloading BSP files for every chart compute~~ ✅ — Rust now caches chained `Almanac` instances by active BSP path set
10. dedicated asteroid kernels for Ceres, Pallas, Juno, Vesta are still needed before those bodies become queryable
11. validation against Swiss output at the astronomy layer is partial; a J2000 spot-check test exists
12. CI / release workflow configs should keep the `swisseph` feature default-off

**True Node**: Not yet implemented. `mean_node_lon()` computes the Mean North Node. True Node requires iterative convergence on Moon–ecliptic intersection — deferred.

## Current status

### Rust

[src-tauri/src/astronomy.rs](src-tauri/src/astronomy.rs):

- `AstronomyBackend` trait: `backend_id()`, `ephemeris_source()`, `compute_chart_data()`
- `SwissAstronomyBackend` — uses libswe, **AGPL; gated behind `swisseph` feature**
- `JplViaSwissAstronomyBackend` — uses libswe + `SEFLG_JPLEPH`; **AGPL; gated**
- `JplAstronomyBackend` ✅ — loads BSP via `anise` 0.9.6, **MPL-2.0, always available**; uses `EphemerisManager` to resolve multiple files and caches chained `Almanac` instances by BSP path set
- `backend_for_chart(chart)` — prefers `JplAstronomyBackend`; falls back to Swiss only when `swisseph` feature is enabled
- `houses.rs` ✅ — pure-Rust obliquity, GMST, ASC/MC, Whole Sign + Placidus, Mean Node, South Node, ICRF→ecliptic
- `ephemeris_manager.rs` ✅ — BSP catalog (de440s/de440/de441), download with progress events, multi-BSP almanac, asteroid NAIF IDs
- `build.rs` ✅ — only compiles libswe when `CARGO_FEATURE_SWISSEPH` is set

### Python

[backend-python/module/astronomy.py](backend-python/module/astronomy.py):

- `AstronomyBackend` Protocol + `ChartData` dataclass
- `SwissAstronomyBackend` — wraps Kerykeion/Swiss path, **AGPL active**
- `JplAstronomyBackend` — wraps Skyfield + local BSP, preferring `de440s.bsp` and falling back to `de421.bsp`, ✅ **MIT + public domain**
- `backend_for_chart()` — selects based on `chart.config.engine`
- `compute_chart_data()` implemented on both backends
- Python JPL now computes `axes` and `house_cusps`
- `services.py` now routes chart computation through the structured chart-data seam
- `services.py` also exposes `compute_aspects_for_chart()` as a Python-native aspect seam
- `cli.py` chart compute now consumes `ChartData` directly
- `/function-wrapper/module/` should mirror these same Python seam changes if that copy remains active in parallel

### Seam alignment

- Rust: `compute_chart_data()` → `AstronomyChartData { positions, axes, house_cusps, warnings }`
- Python: `compute_chart_data()` → `ChartData { positions, axes, house_cusps, warnings }` ✅ aligned

### Remaining gaps

| Item | Notes |
|------|-------|
| True Node | iterative Moon–ecliptic convergence; Mean Node available now |
| Part of Fortune | pure formula (ASC + Moon − Sun); no BSP needed |
| Black Moon Lilith | mean lunar apogee; extend `mean_node_lon()` logic |
| Minor aspects (Sesquisquare, Semisquare, Semisextile) | angle constants only |
| Ceres, Pallas, Juno, Vesta | NAIF frames registered; need dedicated asteroid SPK kernel — DE planetary files only store planet positions |
| Chiron | not in any standard DE file; JPL Horizons API integration is still absent |
| CI: `swisseph` feature off by default | pending CI config update |
| Full no-Swiss smoke test | end-to-end chart compute with zero Swiss/Kerykeion dependency |

### References

- [ephemeris-manager](./ephemeris-manager/) — BSP catalog, download, asteroid bodies ← **new**
- [docs/content/docs/architecture.md](docs/content/docs/architecture.md)
- [src-tauri/src/astronomy.rs](src-tauri/src/astronomy.rs)
- [src-tauri/src/ephemeris_manager.rs](src-tauri/src/ephemeris_manager.rs)
- [backend-python/module/astronomy.py](backend-python/module/astronomy.py)
