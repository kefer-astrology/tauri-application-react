---
title: "Python package"
description: "Notes on the Python backend package, CLI, and app integration."
weight: 50
---

# Python Package Integration

Consolidated reference for implementing the Python functions called from the Tauri app.

## Overview

The Python package is the computation engine for astrological calculations. Tauri calls
Python via a subprocess and expects JSON on stdout.

## Current Integration Status

### ✅ Implemented

- `compute_positions_for_chart(chart: ChartInstance, ws: Optional[Workspace] = None) -> Dict[str, float]`
  - Called from Rust: `compute_chart` command
  - Returns: object IDs mapped to longitude values (degrees)

### ⚠️ Needs Enhancement

- Aspect computation (currently returns empty list)
- JPL-specific properties (declination, RA, distance) computed but not returned

### ❌ Not Yet Implemented

- Transit series computation
- Revolution computation
- Extended physical properties (magnitude, phase, elongation)
- Topocentric coordinates (altitude, azimuth)

## Required Functions

### 1. Enhanced `compute_positions_for_chart`

```python
def compute_positions_for_chart(
    chart: ChartInstance,
    ws: Optional[Workspace] = None,
    include_physical: bool = False,
    include_topocentric: bool = False
) -> Dict[str, Union[float, Dict[str, float]]]:
    """
    Returns:
        - Non-JPL: float (longitude in degrees)
        - JPL: dict with extended properties
    """
```

**JPL Required Keys (always present):**

- `distance` (AU)
- `declination` (degrees)
- `right_ascension` (degrees)

**Non-JPL Behavior:**

- Return only longitude as float for backward compatibility.

### 2. `compute_aspects_for_chart`

```python
def compute_aspects_for_chart(
    chart: ChartInstance,
    aspect_definitions: Optional[List[AspectDefinition]] = None,
    ws: Optional[Workspace] = None
) -> List[Dict[str, Any]]:
    """Returns list of aspect dictionaries."""
```

**Implementation Notes:**

- Use existing `compute_aspects` logic.
- Convert `Aspect` objects to dictionaries.
- Include applying/separating flags.

### 3. `compute_transit_series`

```python
def compute_transit_series(
    source_chart: ChartInstance,
    start_datetime: datetime,
    end_datetime: datetime,
    time_step: timedelta,
    transiting_objects: Optional[List[str]] = None,
    transited_objects: Optional[List[str]] = None,
    aspect_types: Optional[List[str]] = None,
    ws: Optional[Workspace] = None,
    include_physical: bool = False,
    include_topocentric: bool = False
) -> Dict[str, Any]:
    """Returns transit series results."""
```

### 4. `compute_revolution_series`

```python
def compute_revolution_series(
    source_chart: ChartInstance,
    start_year: int,
    end_year: int,
    revolution_type: str = 'solar',
    ws: Optional[Workspace] = None
) -> Dict[str, Any]:
    """Returns revolution charts with computed positions/aspects."""
```

## Return Format Standards

### Positions (Non-JPL)

```python
{
    'sun': 45.5,
    'moon': 120.3,
    'mars': 200.7
}
```

### Positions (JPL)

```python
{
    'sun': {
        'longitude': 45.5,
        'latitude': 0.0,
        'distance': 0.985,
        'declination': 15.2,
        'right_ascension': 45.8,
        'speed': 0.985,
        'retrograde': False
    }
}
```

### Aspects

```python
[
    {
        'from': 'sun',
        'to': 'moon',
        'type': 'trine',
        'angle': 119.5,
        'orb': 0.5,
        'exact_angle': 120.0,
        'applying': True,
        'separating': False
    }
]
```

## Data Format Standards

### Object IDs

Use frontend-compatible IDs:

```python
STANDARD_OBJECTS = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
    'asc', 'desc', 'mc', 'ic',
    'north_node', 'south_node',
    'true_north_node', 'true_south_node',
    'lilith', 'chiron'
]
```

### Units

- Angles in degrees (0-360 longitude, -90 to +90 latitude/declination)
- Right ascension in degrees (not hours)
- Distance in AU
- Light time in seconds

### Datetime

- Input: ISO 8601 or datetime objects (timezone-aware)
- Output: ISO 8601 with microseconds

## Rust ↔ Python Integration

### Call Pattern

Python must:

1. Print JSON to stdout
2. Print errors to stderr
3. Exit with code 0 on success

```python
try:
    result = compute_positions_for_chart(chart)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
```

### JSON Serialization

- Convert datetime to ISO strings
- Convert numpy types to native Python types
- Ensure all outputs are JSON-serializable

## Error Handling

Recommended error types:

- `ChartNotFound`
- `InvalidDatetime`
- `InvalidLocation`
- `EngineNotAvailable`
- `EphemerisNotFound`
- `ComputationError`

## Testing

### Quick Test Script

```python
from module.workspace import load_workspace
from module.services import compute_positions_for_chart, compute_aspects_for_chart

ws = load_workspace('path/to/workspace')
chart = ws.charts[0]

positions = compute_positions_for_chart(chart, ws=ws)
aspects = compute_aspects_for_chart(chart, ws=ws)
```

### Unit Tests

- Validate swisseph (float positions)
- Validate JPL (dict positions with required keys)
- Validate aspects shape and required keys

## Performance Notes

- Cache repeated computations where possible.
- Batch transit series computations to avoid memory spikes.

## Implementation Checklist

### Phase 1: Core Fixes

- [ ] Implement `compute_aspects_for_chart`
- [ ] Update Rust to call aspect computation
- [ ] Enhance `compute_positions_for_chart` for JPL
- [ ] Test swisseph + JPL formats

### Phase 2: Transit Computation

- [ ] Implement `compute_transit_series`
- [ ] Add Rust command for transit computation

### Phase 3: Extended Features

- [ ] Add topocentric coordinates
- [ ] Add extended physical properties
- [ ] Implement `compute_revolution_series`
- [ ] Add caching for performance
