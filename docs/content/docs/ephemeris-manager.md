---
title: "Ephemeris manager"
description: "Multi-BSP catalog, automatic download, and asteroid body support via EphemerisManager."
weight: 42
---

# Ephemeris manager

`EphemerisManager` is the Rust module that owns all BSP file lifecycle concerns: what files exist, where they live, which one to load, how to download a missing file, and how to hand multiple files to `anise` as a single chained `Almanac`.

Source: [src-tauri/src/ephemeris_manager.rs](../../../src-tauri/src/ephemeris_manager.rs)

---

## Why it exists

The original `JplAstronomyBackend` held a single `bsp_path: PathBuf` and loaded one BSP file per compute call. That approach had three problems:

1. **No asteroid bodies.** `de421.bsp` contains only the 10 standard planets and the Moon. Ceres, Pallas, Vesta, Juno — bodies present in DE440 — were simply unavailable.
2. **No upgrade path.** Switching from `de421` to `de440s` required changing code, not config.
3. **No user control.** There was no way for a user to download a larger / longer ephemeris file without replacing the bundled binary.

`EphemerisManager` solves all three by separating catalog knowledge, file resolution, and download from the backend computation.

---

## Architecture

```
ephemeris_manager.rs
│
├── CATALOG: &[EphemerisEntry]        static catalog of known BSP files
│
└── EphemerisManager { cache_dir }
    ├── available_bsp_paths()         → Vec<PathBuf>  (primary + supplements)
    ├── build_almanac()               → Almanac        (chained .load() calls)
    ├── catalog_status()              → Vec<EphemerisInfo>  (for Tauri command)
    └── download(id, app)             async, streams progress events
```

`JplAstronomyBackend` now holds `bsp_paths: Vec<PathBuf>` (resolved at construction time from `available_bsp_paths()`) and calls its own `build_almanac()` from those paths on every compute call.

A global `OnceLock<PathBuf>` stores the cache directory. It is initialised once during Tauri app setup from `app.path().app_data_dir()`:

```rust
// lib.rs setup closure
if let Ok(data_dir) = app.path().app_data_dir() {
    ephemeris_manager::init_cache_dir(data_dir.join("ephemeris"));
}
```

Anywhere else in the Rust backend: `EphemerisManager::from_global()` returns a manager pointed at that directory.

---

## BSP catalog

The static catalog, runtime fallback set, and documented extension paths together define the BSP files Kefer can currently use or could adopt next. The table below includes active catalog entries, the bundled `de421` fallback, and additional candidate kernels already discussed in this repo.

| id / source | filename | size | date range | queryable bodies | current status |
|----|----------|------|------------|-----------------|-----------------|
| `de440s` *(default)* | `de440s.bsp` | 32 MB | 1900–2050 | 10 planets + Moon | active catalog entry; bundled primary default |
| `de440` | `de440.bsp` | 115 MB | 1550–2650 | 10 planets + Moon | active catalog entry; downloadable upgrade |
| `de441_part1` | `de441_part-1.bsp` | ~1.5 GB | −13 200 to 0 | 10 planets + Moon | active catalog entry; downloadable supplementary kernel |
| `de441_part2` | `de441_part-2.bsp` | ~1.5 GB | 0 to +17 191 | 10 planets + Moon | active catalog entry; downloadable supplementary kernel |
| `de421` *(bundled fallback)* | `de421.bsp` | ~17 MB | ~1900–2050 | 10 planets + Moon | runtime fallback only; not part of `CATALOG` |
| NAIF single-asteroid kernels | `ceres_1900_2100.bsp`, `vesta_1900_2100.bsp`, etc. | varies | typically 200-year windows | one asteroid per file | potentially usable; not yet wired into `CATALOG` |
| NAIF asteroid set | `codes_300ast_20100725.bsp` | ~59 MB | solution-dependent | hundreds of asteroid bodies | potentially usable; not yet wired into `CATALOG` |

Current status:

- `de440s`, `de440`, `de441_part1`, and `de441_part2` are the active catalog/download entries in `CATALOG`.
- `de421` is not part of the download catalog; it remains a bundled runtime fallback considered during primary-kernel resolution.
- The asteroid kernels listed above are not yet part of the runtime catalog, but they fit the current JPL/SPICE direction and are the clearest next BSP additions if asteroid queries should become first-class.

All files are served from the public NASA/JPL NAIF FTP over HTTPS:
`https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/`

### Important: asteroids are NOT in these files

The 343 asteroids integrated alongside the planets in DE440/441 (Ceres, Pallas, Vesta, Juno, etc.) are **integration perturbers only**. They improve planetary accuracy but their positions are **not stored as queryable SPK segments** in any of the DE planetary files. Querying `NAIF 2000001` (Ceres) from `de440s.bsp` will fail.

To get asteroid positions, a **separate dedicated asteroid SPK kernel** is required:

| source | what it provides | notes |
|--------|-----------------|-------|
| Individual NAIF files (`ceres_1900_2100.bsp` etc.) | single-body, 200-year window | publicly archived on NAIF |
| `codes_300ast_20100725.bsp` (59 MB) | 300 asteroids, Baer 2010 solution | one download covers most |
| JPL Horizons REST API | any NAIF body, on demand | no file to bundle; query at compute time |

These are planned additions to the catalog. For now, asteroid body IDs (`ceres`, `pallas`, `juno`, `vesta`) are registered in `jpl_backend.rs`'s `body_frames()` table with the correct NAIF frames so they will resolve automatically once any matching asteroid kernel is loaded — the backend emits a graceful warning if the body is not found rather than failing the chart.

### NAIF body IDs

Standard planets use named constants from `anise::constants::frames`. Asteroid frames are defined as `pub const` in `ephemeris_manager.rs`:

| Kefer ID | NAIF ID | Kernel needed |
|----------|---------|---------------|
| `ceres` | 2 000 001 | dedicated asteroid SPK |
| `pallas` | 2 000 002 | dedicated asteroid SPK |
| `juno` | 2 000 003 | dedicated asteroid SPK |
| `vesta` | 2 000 004 | dedicated asteroid SPK |
| `chiron` | 2 000 060 | not in any standard file — JPL Horizons API planned |

---

## File resolution

`available_bsp_paths()` implements a two-level selection:

### 1 — Primary BSP (exactly one)

The first match in this ordered list is used; the rest are skipped:

```
cache/de440s.bsp   (user downloaded)
cache/de440.bsp    (user downloaded)
bundled de440s.bsp (src-tauri/resources/ or exe-adjacent)
bundled de440.bsp
bundled de421.bsp  (legacy fallback)
```

`de440s.bsp` is bundled with the app in `src-tauri/resources/`. `de421.bsp` remains bundled as a fallback for installs that have not yet received the update.

Exactly one primary is selected because all three files cover overlapping date ranges for the same bodies (see below). Loading two of them simultaneously would produce duplicate SPICE segments and undefined behaviour.

### 2 — Supplementary BSPs (de441 parts)

Each `de441` part found in the cache directory is appended **after** the primary. These extend coverage into dates the primary cannot reach.

---

## Date range overlaps

Understanding which files overlap matters both for the primary-selection logic and for deciding when a de441 download actually adds value.

### Coverage map

```
                    -13200        0       1550  1900   2050  2650        17191
                       │          │         │     │      │     │            │
de441_part1   ─────────────────────┤         │     │      │     │            │
de441_part2             │          ├─────────────────────────────────────────┤
de440                   │          │         ├─────────────────────┤         │
de440s                  │          │         │     ├────────┤       │         │
de421 (~)               │          │         │     ├────────┤       │         │
```

### Overlap pairs

| Pair | Overlap range | Consequence |
|------|--------------|-------------|
| de440s ∩ de441_part2 | 1900–2050 | de440s is entirely inside de441_part2 |
| de440 ∩ de441_part2 | 1550–2650 | de440 is entirely inside de441_part2 |
| de440s ∩ de440 | 1900–2050 | de440s is entirely inside de440 |
| de441_part1 ∩ de440 | none | de441_part1 ends at year 0; de440 starts at 1550 |
| de441_part1 ∩ de440s | none | same reason |
| de441_part1 ∩ de441_part2 | year 0 only | one-epoch boundary; negligible |

### What happens when overlapping files are loaded together

SPICE (and `anise` following the same convention) resolves duplicate segments using **last-loaded wins**: when two loaded BSP files both have a segment for the same body at the same epoch, the segment from the file loaded most recently takes effect.

`available_bsp_paths()` appends de441 parts **after** the primary:

```
paths = [de440s, de441_part2]   ← de441_part2 loaded last
```

This means for a chart dated in 1900–2050 when both files are loaded:

- **de441_part2 takes effect** (it was loaded last)
- de440s data is present but shadowed for that epoch

For normal astrological use (1900–2050), this is acceptable: DE441 was derived from the same initial conditions as DE440 and the accuracy difference in the modern range is sub-arcsecond. A future optimisation could detect the chart's date and skip the de441 supplement when the primary already covers it — but this is not currently implemented.

### When to download de441 parts

| Intended use | File needed |
|---|---|
| Modern charts (1900–2050) | de440s (bundled, no download) |
| Renaissance / medieval (1550–1899 or 2051–2650) | de440 |
| Ancient charts (before 1550 / before 1 AD) | de441_part1 |
| Far-future charts (after 2650) | de441_part2 |

You do **not** need to download de441 if all your charts fall inside de440s's 1900–2050 window.

### Per-chart override

Setting `chart.config.override_ephemeris` to a valid `.bsp` path bypasses the manager entirely — only that single file is loaded. This is useful for testing, for comparing DE solutions, or for charts that require a specific ephemeris version.

---

## Cache directory

Downloaded files are stored in the platform app-data directory:

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/kefer/ephemeris/` |
| macOS | `~/Library/Application Support/dev.kefer.astrology/ephemeris/` |
| Windows | `%APPDATA%\dev.kefer.astrology\ephemeris\` |

Downloads use a `.partial` suffix while in progress and are atomically renamed on completion. A partially downloaded file is never loaded.

---

## Download mechanism

```rust
EphemerisManager::download(id: &str, app: &AppHandle) -> Result<(), String>
```

1. Looks up the entry in `CATALOG` by `id`.
2. Opens the NAIF HTTPS URL with `reqwest` (streaming, no full-file buffer in memory).
3. Writes chunks to `<cache>/<filename>.partial` using `std::fs::File`.
4. Emits `ephemeris-progress` to the frontend every 512 KB:
   ```json
   { "id": "de440s", "bytes_done": 5242880, "bytes_total": 31971808 }
   ```
5. On completion, renames `.partial` → final filename and emits `ephemeris-ready`:
   ```json
   { "id": "de440s" }
   ```

On the next chart compute after download completes, `available_bsp_paths()` will find the new file and include it automatically — no restart required.

---

## Tauri commands

Three new commands are registered in `lib.rs`:

### `list_ephemeris_catalog`

Returns the full catalog with per-entry download status.

```typescript
const catalog = await invoke<EphemerisInfo[]>('list_ephemeris_catalog')
```

```typescript
interface EphemerisInfo {
  id: string
  filename: string
  url: string
  size_bytes: number
  bodies: string[]
  year_start: number
  year_end: number
  is_default: boolean
  is_downloaded: boolean
  local_path: string | null   // null when not yet downloaded
}
```

### `download_ephemeris`

Starts a background download. Returns `Ok(())` immediately on network failure (error returned as `Err(string)`). Progress is reported via events.

```typescript
// Start download
await invoke('download_ephemeris', { id: 'de440' })

// Listen for progress
const unlisten = await listen<{ id: string; bytes_done: number; bytes_total: number }>(
  'ephemeris-progress',
  ({ payload }) => {
    const pct = Math.round((payload.bytes_done / payload.bytes_total) * 100)
    console.log(`${payload.id}: ${pct}%`)
  }
)

// Listen for completion
await listen<{ id: string }>('ephemeris-ready', ({ payload }) => {
  console.log(`${payload.id} ready`)
  unlisten()
})
```

### `get_available_bodies`

Returns the union of body IDs queryable given currently available BSP files.

```typescript
const bodies = await invoke<string[]>('get_available_bodies')
// e.g. ["sun","moon","mercury","venus","mars","jupiter","saturn",
//       "uranus","neptune","pluto","ceres","pallas","juno","vesta"]
```

---

## Python sidecar

`backend-python/module/utils.py` exposes `default_ephemeris_path()` which now prefers `de440s.bsp` when present in `source/`:

```python
def default_ephemeris_path() -> str:
    source_dir = Path(__file__).resolve().parent.parent / 'source'
    de440s = source_dir / 'de440s.bsp'
    if de440s.exists():
        return str(de440s)
    return str(source_dir / 'de421.bsp')
```

The `is_de421` flag in `services.py` (which controls whether outer-planet barycenters are used instead of direct names) works correctly for `de440s.bsp` without changes — it checks the filename and de440s passes the non-de421 path, which uses direct planet names as expected.

---

## Remaining gaps

| Body / Feature | Status | Notes |
|----------------|--------|-------|
| Ceres, Pallas, Juno, Vesta | pending | NAIF frames registered; need a dedicated asteroid SPK kernel |
| South Node | ✅ done | Mean Node + 180° |
| True Node | pending | iterative osculation; needs Moon ephemeris sampling |
| Part of Fortune | pending | pure formula: ASC + Moon − Sun; no BSP needed |
| Chiron (2060) | pending | not in any standard DE file; JPL Horizons API planned |
| Eris, Sedna | out of scope | TNOs not in standard NAIF kernels |
| Black Moon Lilith | pending | mean lunar apogee formula; no BSP needed |
| Minor aspects (Sesquisquare 135°, Semisquare 45°, Semisextile 30°) | pending | pure angle constants |
