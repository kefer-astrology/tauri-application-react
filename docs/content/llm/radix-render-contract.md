---
title: "Radix render contract"
weight: 43
---

# Radix render contract

This page defines the current Rust-side output contract for rendering a radix view without mock data.

## Goal

The frontend radix view should render from computed chart output, not from hardcoded fallback wheels, demo positions, or hand-authored house values.

## Current contract

`compute_chart` and `compute_chart_from_data` should expose:

- `chart_id`
- `positions`
- `aspects`
- `axes`
- `house_cusps`

## Field meanings

### `positions`

- Map of computed body/object ids to longitudes in degrees.
- Used for planets and any other computed objects that are currently supported.

### `axes`

- Object with:
  - `asc`
  - `desc`
  - `mc`
  - `ic`
- These values should always be available for supported Rust radix computation.

### `house_cusps`

- Array of 12 longitudes in degrees.
- Ordered from house 1 through house 12.

## Support rule

Current Rust house cusp support should be treated as:

- `Whole Sign`: supported directly
- `Equal`: supported directly
- other house systems: use a clearly documented equal-house fallback until dedicated Rust implementations exist

This is acceptable for the current no-sidecar baseline because it removes mocked frontend house structures while staying honest about the present Rust scope.

## Frontend rule

- React and Svelte should prefer `axes` and `house_cusps` from compute output over hand-authored fallback values.
- If those fields are absent, the frontend may show an explicit empty or partial state, but should not silently substitute mock horoscope geometry.

## Backlog

- dedicated Rust implementations for Placidus, Koch, Campanus, Regiomontanus, and other house systems
- richer computed points beyond the current baseline
- stronger normalized render payloads if the frontend needs more than longitudes
