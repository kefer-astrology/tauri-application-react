---
title: "Implementation plan"
description: "Historical implementation notes and migration planning context."
weight: 100
---

# Implementation Plan - historical snapshot

> **Note:** This page is an archival planning snapshot from the earlier implementation phase.
> The desktop shell is now React-first, Svelte remains an alternate shell, and several file references below describe an older structure or an unrealized plan.
> For live implementation state, prefer [frontend-react](./frontend-react/), [frontend-svelte](./frontend-svelte/), [architecture](./architecture/), and [time-navigation](./time-navigation/).

## Status note

This document is still useful for understanding earlier design intent, especially around:

- preserving theming and i18n during architecture changes
- time navigation requirements
- optional richer astronomy fields

But it should not be used as a current step-by-step execution plan.

In particular:

- references to `MiddleContent.svelte` as the main future canvas strategy are historical
- DuckDB schema work described here is not the current live desktop persistence model
- several referenced files were proposal-era names rather than stable current docs or code paths

## Summary of Updates

Based on your requirements, I've updated the architecture to:

### ✅ Preserved Existing Functionality

- **i18n**: Kept existing i18n system (en, cz, es, fr) - no changes needed
- **Theming**: Kept existing theming system (light/dark, presets) - no changes needed
- **Canvas Rendering**: MiddleContent.svelte will support multiple views (radix, table, statistics, interpretations)

### ✅ Enhanced for JPL Precision

- **Microsecond Precision**: TIMESTAMP supports microseconds for exact timing
- **Optional Columns**: Declination, right ascension, distance stored when available (JPL only)
- **Storage Strategy**: NULL for missing columns, efficient queries with WHERE clauses

### ✅ Time Navigation

- **High Precision**: Seconds-level stepping (default: 1 hour, adjustable to minutes/seconds)
- **Quick Navigation**: First, Prev, Next, Last, Now buttons
- **Time Shift**: Astrolab-style shift (years, months, days, hours, minutes, seconds)
- **Time Range**: Start/end datetime pickers with presets

## Historical referenced files

These references describe the intent of the plan at the time. They are not a guaranteed map of the current repo:

1. **ARCHITECTURE_PROPOSAL.md** - Updated with:
   - Optional JPL columns (declination, RA, distance)
   - Microsecond precision support
   - Time granularity options

2. **TIME_NAVIGATION.md** - New document with:
   - Complete time navigation UI design
   - Svelte store implementation
   - Component code examples
   - Keyboard shortcuts

3. **INTEGRATION_EXAMPLES.md** - Updated with:
   - Python CLI supporting second-level precision
   - Rust storage with optional columns
   - Time step parsing (seconds to days)

4. **UPDATED_ARCHITECTURE.md** - Summary of all changes

## Historical next steps

### Step 1: Create Time Navigation Store

```bash
# Create the store file
touch src/lib/stores/timeNavigation.ts
```

### Step 2: Create Time Navigation Component

```bash
# Create the component
touch src/lib/components/TimeNavigationPanel.svelte
```

### Step 3: Integrate into Left Sidebar

- Add TimeNavigationPanel to App.svelte left column
- Connect to existing ExpandablePanel structure

### Step 4: Update DuckDB Schema

- Add optional columns to computed_positions table
- Update Rust storage functions

### Step 5: Extend Python CLI

- Add time step parsing (seconds support)
- Add optional column computation (declination, RA, distance)

### Step 6: Create Data Table Component

- Support optional columns (show/hide based on availability)
- Connect to time navigation store

## Key Design Decisions

1. **Time Precision**: Store at microsecond level, step at user-selected granularity
2. **Optional Columns**: Only compute/store when engine supports (JPL = declination/RA/distance)
3. **Backward Compatibility**: Existing data remains valid (NULL for optional columns)
4. **No Breaking Changes**: i18n/theming preserved exactly as-is

## Questions Resolved

✅ **i18n/Theming**: Preserved - no changes needed  
✅ **JPL Declination**: Supported as optional column  
✅ **Time Precision**: Microsecond storage, second-level stepping  
✅ **Time Navigation**: Full implementation with Astrolab-style shift  
✅ **Canvas Views**: Radix, Table, Statistics, Interpretations supported

## What remains useful today

The plan still captures a few ideas that remain relevant:

1. Time navigation deserves a dedicated state model and UI, not scattered ad hoc state.
2. Higher-precision astronomy fields should stay additive rather than shape-breaking.
3. i18n and theming should remain stable while internal compute/storage paths evolve.

## What is outdated today

- The “ready to start” framing is no longer accurate.
- The React/Svelte split has evolved substantially since this was written.
- The storage and transit implementation path described here is not the exact live runtime model.

## Original close-out

At the time of writing, the suggested path forward was:

1. **Phase 1**: Time navigation store + component (preserves existing UI)
2. **Phase 2**: DuckDB schema updates (adds optional columns)
3. **Phase 3**: Python CLI extensions (adds precision + optional columns)
4. **Phase 4**: Data table component (displays optional columns)
5. **Phase 5**: Integration and testing

That is preserved here for historical context only.
