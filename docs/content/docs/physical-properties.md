---
title: "Physical properties"
description: "Reference notes for JPL-derived physical fields and support."
weight: 70
---

# Physical Properties in Data Structure

## Overview

The data structure is designed to capture **all physical/astronomical properties** available from JPL/Skyfield computations, ensuring complete physical context for astrological analysis.

## Always Computed for JPL

These properties are **always** computed and stored when using JPL engine:

1. **Distance** (AU) - Distance from Earth
   - **NOT optional** - always computed for JPL
   - Essential for understanding planetary proximity
   - Used in various astrological calculations

2. **Declination** (degrees) - Celestial latitude
   - Always computed for JPL
   - Important for understanding planetary position relative to celestial equator
   - Used in declination aspects and parallel calculations

3. **Right Ascension** (degrees) - Celestial longitude
   - Always computed for JPL
   - Fundamental equatorial coordinate
   - Used in coordinate transformations

## Computed When Location Available

These properties require observer location (topocentric):

4. **Altitude** (degrees) - Height above horizon
   - Computed when location is provided
   - Important for visibility and house calculations
   - Used in local horizon-based astrology

5. **Azimuth** (degrees) - Direction from north
   - Computed when location is provided
   - Used in directional astrology
   - Important for house cusp calculations

## Optional Extended Properties

These can be computed for planets when requested:

6. **Apparent Magnitude** - Brightness as seen from Earth
   - Useful for understanding planetary visibility
   - Important for observational astrology

7. **Phase Angle** (degrees) - Angle between Sun, planet, and Earth
   - Important for understanding planetary phases
   - Used in planetary phase analysis

8. **Elongation** (degrees) - Angular distance from Sun
   - Important for understanding planetary visibility
   - Used in heliacal rise/set calculations

9. **Light Time** (seconds) - Time for light to travel from object to Earth
   - Important for understanding apparent vs. true positions
   - Used in high-precision calculations

## Data Structure

### Database Schema

```sql
CREATE TABLE computed_positions (
    -- Core identifiers
    chart_id TEXT NOT NULL,
    datetime TIMESTAMP NOT NULL,
    object_id TEXT NOT NULL,

    -- Ecliptic coordinates (always)
    longitude REAL NOT NULL,
    latitude REAL,

    -- Equatorial coordinates (JPL - always computed)
    declination REAL,           -- Always present for JPL
    right_ascension REAL,       -- Always present for JPL
    distance REAL NOT NULL,     -- Always present for JPL (NOT NULL constraint)

    -- Topocentric (JPL with location)
    altitude REAL,
    azimuth REAL,

    -- Physical properties (JPL optional)
    apparent_magnitude REAL,
    phase_angle REAL,
    elongation REAL,
    light_time REAL,

    -- Motion
    speed REAL,
    retrograde BOOLEAN,

    -- Flags
    has_equatorial BOOLEAN,     -- TRUE if RA/Dec/Distance available
    has_topocentric BOOLEAN,    -- TRUE if Alt/Az available
    has_physical BOOLEAN,       -- TRUE if magnitude/phase/elongation available
);
```

### Python Data Structure

```python
@dataclass
class PositionData:
    """Complete physical position data for an astronomical object."""
    # Ecliptic coordinates
    longitude: float
    latitude: Optional[float] = None

    # Equatorial coordinates (always for JPL)
    declination: Optional[float] = None      # Always Some for JPL
    right_ascension: Optional[float] = None   # Always Some for JPL
    distance: Optional[float] = None         # Always Some for JPL (NOT optional)

    # Topocentric (when location available)
    altitude: Optional[float] = None
    azimuth: Optional[float] = None

    # Physical properties (optional)
    apparent_magnitude: Optional[float] = None
    phase_angle: Optional[float] = None
    elongation: Optional[float] = None
    light_time: Optional[float] = None  # seconds

    # Motion
    speed: Optional[float] = None
    retrograde: Optional[bool] = None
```

## Query Patterns

### Get all physical properties for an object

```sql
SELECT
    datetime,
    longitude,
    latitude,
    declination,
    right_ascension,
    distance,
    altitude,
    azimuth,
    apparent_magnitude,
    phase_angle,
    elongation
FROM computed_positions
WHERE chart_id = 'chart_001'
  AND object_id = 'mars'
  AND datetime >= '2024-01-01'
ORDER BY datetime;
```

### Find objects by distance

```sql
SELECT object_id, datetime, distance
FROM computed_positions
WHERE chart_id = 'chart_001'
  AND distance IS NOT NULL
  AND distance < 1.0  -- Within 1 AU
ORDER BY distance;
```

### Find objects by declination

```sql
SELECT object_id, datetime, declination
FROM computed_positions
WHERE chart_id = 'chart_001'
  AND has_equatorial = TRUE
  AND ABS(declination) > 20  -- High declination
ORDER BY ABS(declination) DESC;
```

## Implementation Notes

1. **Distance is NOT optional for JPL** - Always compute and store
2. **Use NULL for missing values** - Efficient storage, clear semantics
3. **Use flags for querying** - `has_equatorial`, `has_topocentric`, `has_physical`
4. **Compute all available properties** - Don't skip physical data
5. **Store in structured format** - Makes querying and analysis easier

## Benefits

- **Complete physical context** - All astronomical data available
- **Flexible analysis** - Can analyze by distance, declination, magnitude, etc.
- **Future-proof** - Structure supports additional properties
- **Efficient storage** - NULL for missing values, flags for querying
- **Astrological accuracy** - Full physical context improves calculations
