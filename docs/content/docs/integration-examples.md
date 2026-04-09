---
title: "Integration examples"
description: "Examples for Tauri command usage and Python-side integration."
weight: 80
---

# Integration Examples

> **Note:** Some sections show Svelte; `invoke()` usage is identical from React (`@tauri-apps/api/core`). See [frontend-react](./frontend-react/).

## Python Sidecar Integration

### 1. Python Command Interface

Create a CLI interface in the Python package:

```python
# external_package/module/cli.py
import sys
import json
from pathlib import Path
from module.services import compute_positions, build_chart_instance
from module.workspace import load_workspace, add_or_update_chart, save_workspace_modular
from module.models import ChartMode, EngineType

def cmd_compute_positions(args):
    """Compute positions for a chart.

    Args:
        args: dict with keys: chart_id, workspace_path, datetime, location, engine, ephemeris_path
    """
    workspace_path = args.get('workspace_path')
    chart_id = args.get('chart_id')

    # Load workspace
    ws = load_workspace(workspace_path)

    # Find chart
    chart = None
    for c in ws.charts:
        if getattr(c, 'id', '') == chart_id:
            chart = c
            break

    if not chart:
        return {'error': f'Chart {chart_id} not found'}

    # Compute positions
    from module.services import compute_positions_for_chart
    positions = compute_positions_for_chart(chart, ws=ws)

    return {'positions': positions, 'chart_id': chart_id}

def cmd_compute_transit_series(args):
    """Compute transit series for a time range.

    Args:
        args: dict with keys:
            - source_chart_id: Base chart ID
            - workspace_path: Path to workspace
            - start_datetime: Start time (ISO format, supports microseconds)
            - end_datetime: End time (ISO format, supports microseconds)
            - time_step: Step size (e.g., '1 second', '1 minute', '1 hour', '1 day')
            - objects: List of objects to compute
            - aspects: List of aspects to compute
            - engine: Engine type
            - ephemeris_path: Optional ephemeris file
            - include_physical: Whether to include all physical properties (JPL only)
              (distance, declination, RA are always included for JPL)
            - include_topocentric: Whether to include altitude/azimuth (JPL with location)
            - include_extended: Whether to include magnitude/phase/elongation (JPL for planets)
    """
    from datetime import datetime, timedelta
    from dateutil.parser import parse
    import pandas as pd

    workspace_path = args.get('workspace_path')
    source_chart_id = args.get('source_chart_id')
    start_str = args.get('start_datetime')
    end_str = args.get('end_datetime')
    time_step = args.get('time_step', '1 hour')  # Default to 1 hour
    objects = args.get('objects', [])
    aspects = args.get('aspects', [])
    include_physical = args.get('include_physical', True)  # Default: include all physical data
    include_topocentric = args.get('include_topocentric', True)  # Default: include alt/az if location available
    include_extended = args.get('include_extended', False)  # Default: don't include magnitude/phase (can be heavy)

    # Load workspace and source chart
    ws = load_workspace(workspace_path)
    source_chart = None
    for c in ws.charts:
        if getattr(c, 'id', '') == source_chart_id:
            source_chart = c
            break

    if not source_chart:
        return {'error': f'Source chart {source_chart_id} not found'}

    # Parse time range (supports microseconds for high precision)
    start_dt = parse(start_str)
    end_dt = parse(end_str)

    # Generate time points with high precision support
    time_points = []
    current = start_dt

    # Parse time_step with support for seconds, minutes, hours, days
    def parse_time_step(step_str):
        """Parse time step string like '1 second', '30 seconds', '1 minute', etc."""
        parts = step_str.lower().strip().split()
        if len(parts) < 2:
            return timedelta(hours=1)  # Default to 1 hour

        value = int(parts[0])
        unit = parts[1]

        if 'second' in unit:
            return timedelta(seconds=value)
        elif 'minute' in unit:
            return timedelta(minutes=value)
        elif 'hour' in unit:
            return timedelta(hours=value)
        elif 'day' in unit:
            return timedelta(days=value)
        else:
            return timedelta(hours=1)  # Default

    step_delta = parse_time_step(time_step)

    while current <= end_dt:
        time_points.append(current)
        current += step_delta

    # Compute positions for each timepoint
    results = []
    for tp in time_points:
        # Create temporary transit chart
        transit_chart = build_chart_instance(
            name=f"transit_{source_chart_id}",
            dt_str=tp.isoformat(),
            loc_text=getattr(getattr(source_chart, 'subject', None), 'location', {}).get('name', ''),
            mode=ChartMode.EVENT,
            ws=ws
        )

        # Compute positions (JPL always includes distance, declination, RA)
        transit_positions = compute_positions_for_chart(transit_chart, ws=ws)
        source_positions = compute_positions_for_chart(source_chart, ws=ws)

        # For JPL engine, compute all physical properties
        transit_physical = {}
        source_physical = {}

        if getattr(transit_chart.config, 'engine', None) == EngineType.JPL:
            # Extended computation: distance, declination, RA are always computed
            # Optionally compute: altitude, azimuth, magnitude, phase, elongation
            # This requires extending compute_positions to return extended dict
            # Structure: {
            #   'longitude': float,
            #   'distance': float,  # Always present for JPL
            #   'declination': float,  # Always present for JPL
            #   'right_ascension': float,  # Always present for JPL
            #   'altitude': float,  # If include_topocentric
            #   'azimuth': float,  # If include_topocentric
            #   'apparent_magnitude': float,  # If include_extended
            #   'phase_angle': float,  # If include_extended
            #   'elongation': float,  # If include_extended
            # }
            pass

        # Compute aspects (simplified - you'd use your aspect computation logic)
        aspects_found = []
        for obj1 in objects:
            if obj1 not in source_positions:
                continue
            for obj2 in objects:
                if obj2 not in transit_positions:
                    continue
                # Compute angle between objects
                angle = abs(transit_positions[obj2] - source_positions[obj1])
                if angle > 180:
                    angle = 360 - angle

                # Check for aspects
                for aspect_type, aspect_angle in [('conjunction', 0), ('opposition', 180), ('trine', 120), ('square', 90)]:
                    orb = abs(angle - aspect_angle)
                    if orb < 8.0:  # 8 degree orb
                        aspects_found.append({
                            'source': obj1,
                            'target': obj2,
                            'type': aspect_type,
                            'angle': angle,
                            'orb': orb
                        })

        result_entry = {
            'datetime': tp.isoformat(),  # ISO format with microseconds
            'positions': transit_positions,  # Always includes longitude
            'aspects': aspects_found
        }

        # For JPL engine, physical properties are always included in positions dict
        # Structure: positions[object_id] = {
        #   'longitude': float,
        #   'distance': float,  # Always present for JPL
        #   'declination': float,  # Always present for JPL
        #   'right_ascension': float,  # Always present for JPL
        #   'altitude': float,  # If include_topocentric and location available
        #   'azimuth': float,  # If include_topocentric and location available
        #   'apparent_magnitude': float,  # If include_extended
        #   'phase_angle': float,  # If include_extended
        #   'elongation': float,  # If include_extended
        # }

        results.append(result_entry)

    return {
        'source_chart_id': source_chart_id,
        'time_range': {'start': start_str, 'end': end_str},
        'results': results
    }

def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command specified'}), file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]
    args_json = sys.argv[2] if len(sys.argv) > 2 else '{}'
    args = json.loads(args_json)

    try:
        if command == 'compute_positions':
            result = cmd_compute_positions(args)
        elif command == 'compute_transit_series':
            result = cmd_compute_transit_series(args)
        else:
            result = {'error': f'Unknown command: {command}'}

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e), 'type': type(e).__name__}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### 2. Rust Tauri Command

```rust
// src-tauri/src/commands/compute.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct ComputePositionsArgs {
    chart_id: String,
    workspace_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ComputeTransitSeriesArgs {
    source_chart_id: String,
    workspace_path: String,
    start_datetime: String,
    end_datetime: String,
    time_step: Option<String>,
    objects: Option<Vec<String>>,
    aspects: Option<Vec<String>>,
}

#[tauri::command]
pub async fn compute_chart_positions(
    args: ComputePositionsArgs,
) -> Result<HashMap<String, f64>, String> {
    // Get Python executable path
    let python_exe = find_python_executable()?;

    // Get module path
    let module_path = get_module_path()?;

    // Build command
    let args_json = serde_json::to_string(&args)
        .map_err(|e| format!("Failed to serialize args: {}", e))?;

    let output = Command::new(python_exe)
        .arg("-m")
        .arg("module.cli")
        .arg("compute_positions")
        .arg(&args_json)
        .current_dir(&module_path)
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python error: {}", error));
    }

    let result: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;

    if let Some(error) = result.get("error") {
        return Err(error.as_str().unwrap().to_string());
    }

    let positions: HashMap<String, f64> = serde_json::from_value(
        result.get("positions").ok_or("No positions in response")?.clone()
    ).map_err(|e| format!("Failed to parse positions: {}", e))?;

    Ok(positions)
}

#[tauri::command]
pub async fn compute_transit_series(
    args: ComputeTransitSeriesArgs,
) -> Result<String, String> {
    // Similar implementation for transit series
    // Returns relation_id for tracking
    todo!()
}

fn find_python_executable() -> Result<PathBuf, String> {
    // Try common Python paths
    let candidates = vec!["python3", "python", "py"];

    for cmd in candidates {
        if Command::new(cmd)
            .arg("--version")
            .output()
            .is_ok()
        {
            return Ok(PathBuf::from(cmd));
        }
    }

    Err("Python executable not found".to_string())
}

fn get_module_path() -> Result<PathBuf, String> {
    // Get path to external_package/module
    // In production, this would be relative to the Tauri app
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;

    Ok(current_dir.join("external_package"))
}
```

### 3. DuckDB Storage Integration

```rust
// src-tauri/src/storage/duckdb.rs
use duckdb::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct DuckDBStorage {
    conn: Connection,
}

impl DuckDBStorage {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // Initialize schema
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS computed_positions (
                chart_id TEXT NOT NULL,
                datetime TIMESTAMP NOT NULL,
                object_id TEXT NOT NULL,
                longitude REAL NOT NULL,
                latitude REAL,
                distance REAL,
                speed REAL,
                retrograde BOOLEAN,
                engine TEXT,
                ephemeris_file TEXT,
                PRIMARY KEY (chart_id, datetime, object_id)
            );

            CREATE INDEX IF NOT EXISTS idx_positions_chart_datetime
                ON computed_positions(chart_id, datetime);
            "#,
        )?;

        Ok(Self { conn })
    }

    pub fn store_positions(
        &self,
        chart_id: &str,
        datetime: &str,
        positions: &HashMap<String, PositionData>,
        engine: &str,
    ) -> Result<()> {
        // PositionData is a struct containing all physical properties
        // For JPL: distance, declination, RA are always present
        // For other engines: only longitude may be present

        let mut stmt = self.conn.prepare(
            "INSERT OR REPLACE INTO computed_positions
             (chart_id, datetime, object_id, longitude, latitude,
              declination, right_ascension, distance,
              altitude, azimuth,
              apparent_magnitude, phase_angle, elongation, light_time,
              speed, retrograde,
              has_equatorial, has_topocentric, has_physical, engine)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )?;

        for (object_id, pos_data) in positions {
            let has_equatorial = pos_data.declination.is_some()
                              && pos_data.right_ascension.is_some()
                              && pos_data.distance.is_some();
            let has_topocentric = pos_data.altitude.is_some()
                               && pos_data.azimuth.is_some();
            let has_physical = pos_data.apparent_magnitude.is_some()
                           || pos_data.phase_angle.is_some()
                           || pos_data.elongation.is_some();

            stmt.execute(params![
                chart_id,
                datetime,
                object_id,
                pos_data.longitude,
                pos_data.latitude,
                pos_data.declination,
                pos_data.right_ascension,
                pos_data.distance,  // Always Some(f64) for JPL, None for others
                pos_data.altitude,
                pos_data.azimuth,
                pos_data.apparent_magnitude,
                pos_data.phase_angle,
                pos_data.elongation,
                pos_data.light_time,
                pos_data.speed,
                pos_data.retrograde,
                has_equatorial,
                has_topocentric,
                has_physical,
                engine
            ])?;
        }

        Ok(())
    }

    pub fn query_positions(
        &self,
        chart_id: &str,
        start: &str,
        end: &str,
    ) -> Result<Vec<PositionRow>> {
        let mut stmt = self.conn.prepare(
            "SELECT datetime, object_id, longitude
             FROM computed_positions
             WHERE chart_id = ? AND datetime >= ? AND datetime <= ?
             ORDER BY datetime, object_id"
        )?;

        let rows = stmt.query_map(params![chart_id, start, end], |row| {
            Ok(PositionRow {
                datetime: row.get(0)?,
                object_id: row.get(1)?,
                longitude: row.get(2)?,
            })
        })?;

        rows.collect()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PositionData {
    pub longitude: f64,
    pub latitude: Option<f64>,

    // Equatorial coordinates (always present for JPL)
    pub declination: Option<f64>,      // Always Some for JPL
    pub right_ascension: Option<f64>, // Always Some for JPL
    pub distance: Option<f64>,        // Always Some for JPL (NOT optional - always computed)

    // Topocentric coordinates (JPL with location)
    pub altitude: Option<f64>,
    pub azimuth: Option<f64>,

    // Physical properties (JPL for planets)
    pub apparent_magnitude: Option<f64>,
    pub phase_angle: Option<f64>,
    pub elongation: Option<f64>,
    pub light_time: Option<f64>,  // Light time in seconds

    // Motion properties
    pub speed: Option<f64>,
    pub retrograde: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PositionRow {
    pub datetime: String,
    pub object_id: String,
    pub data: PositionData,
}
```

### 4. Svelte Frontend Integration

```typescript
// src/lib/stores/computations.ts
import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

export interface ComputationJob {
	job_id: string;
	relation_id: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	progress: number;
}

export const computationJobs = writable<ComputationJob[]>([]);

export async function computeChartPositions(
	chartId: string,
	workspacePath: string
): Promise<Record<string, number>> {
	const positions = await invoke<Record<string, number>>('compute_chart_positions', {
		args: {
			chart_id: chartId,
			workspace_path: workspacePath
		}
	});
	return positions;
}

export async function computeTransitSeries(
	sourceChartId: string,
	workspacePath: string,
	startDatetime: string,
	endDatetime: string,
	timeStep: string = '1 day'
): Promise<string> {
	const relationId = await invoke<string>('compute_transit_series', {
		args: {
			source_chart_id: sourceChartId,
			workspace_path: workspacePath,
			start_datetime: startDatetime,
			end_datetime: endDatetime,
			time_step: timeStep
		}
	});
	return relationId;
}
```

```svelte
<!-- src/lib/components/TransitComputation.svelte -->
<script lang="ts">
    import { computeTransitSeries } from '$lib/stores/computations';
    import { workspace } from '$lib/stores/workspace';

    let sourceChartId = $state('');
    let startDate = $state('');
    let endDate = $state('');
    let computing = $state(false);
    let relationId = $state<string | null>(null);

    async function handleCompute() {
        if (!sourceChartId || !startDate || !endDate) return;

        computing = true;
        try {
            const ws = $workspace;
            if (!ws) throw new Error('No workspace loaded');

            relationId = await computeTransitSeries(
                sourceChartId,
                ws.path,
                startDate,
                endDate
            );
        } catch (error) {
            console.error('Computation failed:', error);
        } finally {
            computing = false;
        }
    }
</script>

<div class="p-4 space-y-4">
    <h3 class="text-lg font-semibold">Compute Transit Series</h3>

    <div class="space-y-2">
        <label class="block text-sm">Source Chart</label>
        <select bind:value={sourceChartId} class="w-full p-2 border rounded">
            <!-- Populate from workspace charts -->
        </select>
    </div>

    <div class="grid grid-cols-2 gap-2">
        <div>
            <label class="block text-sm">Start Date</label>
            <input type="datetime-local" bind:value={startDate} class="w-full p-2 border rounded" />
        </div>
        <div>
            <label class="block text-sm">End Date</label>
            <input type="datetime-local" bind:value={endDate} class="w-full p-2 border rounded" />
        </div>
    </div>

    <button
        onclick={handleCompute}
        disabled={computing}
        class="w-full p-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
    >
        {computing ? 'Computing...' : 'Compute Transit Series'}
    </button>

    {#if relationId}
        <div class="p-2 bg-success/10 text-success rounded">
            Computation started. Relation ID: {relationId}
        </div>
    {/if}
</div>
```
