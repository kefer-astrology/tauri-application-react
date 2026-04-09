---
title: "Implementation plan"
description: "Historical implementation notes and migration planning context."
weight: 100
---

# Implementation Plan - Ready to Start

> **Note:** The desktop shell is now **React** (`../frontend-react/`). File paths and Svelte references below are historical planning notes.

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

## Architecture Files

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

## Next Steps - Ready to Iterate

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

## Ready to Start?

The architecture is now complete and ready for implementation. We can start with:

1. **Phase 1**: Time navigation store + component (preserves existing UI)
2. **Phase 2**: DuckDB schema updates (adds optional columns)
3. **Phase 3**: Python CLI extensions (adds precision + optional columns)
4. **Phase 4**: Data table component (displays optional columns)
5. **Phase 5**: Integration and testing

Would you like me to start implementing Phase 1 (time navigation)?
