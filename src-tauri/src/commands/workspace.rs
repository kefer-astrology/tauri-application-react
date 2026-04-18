use crate::workspace::loader::load_chart;
use crate::workspace::{
    chart_to_summary, load_all_charts, load_workspace_manifest, ChartSummary, WorkspaceInfo,
};
use chrono::{DateTime, Duration, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, State};

const DEFAULT_GEOCODER_SEARCH_URL: &str = "https://nominatim.openstreetmap.org/search";
const GEOCODER_USER_AGENT: &str = "KeferAstrology/2.0 (desktop geocoding)";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeocodedLocation {
    pub query: String,
    pub display_name: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct NominatimSearchResult {
    display_name: String,
    lat: String,
    lon: String,
}

/// Open a folder dialog and return the selected path
#[tauri::command]
pub async fn open_folder_dialog() -> Result<Option<String>, String> {
    // Use native file dialog via system command
    // This is a simple cross-platform approach
    #[cfg(target_os = "windows")]
    {
        // Windows: use PowerShell
        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-Command",
                "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath }"
            ])
            .output();

        match output {
            Ok(out) if out.status.success() => {
                let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if path.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(path))
                }
            }
            _ => Ok(None),
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: use osascript
        let script = r#"tell application "System Events"
    activate
    set folderPath to choose folder with prompt "Select Workspace Folder"
    return POSIX path of folderPath
end tell"#;

        let output = Command::new("osascript").arg("-e").arg(script).output();

        match output {
            Ok(out) if out.status.success() => {
                let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if path.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(path))
                }
            }
            _ => Ok(None),
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux: try zenity, kdialog, or yad
        let commands = vec![
            (
                "zenity",
                vec![
                    "--file-selection",
                    "--directory",
                    "--title=Select Workspace Folder",
                ],
            ),
            (
                "kdialog",
                vec![
                    "--getexistingdirectory",
                    ".",
                    "--title",
                    "Select Workspace Folder",
                ],
            ),
            (
                "yad",
                vec!["--file", "--directory", "--title=Select Workspace Folder"],
            ),
        ];

        for (cmd, args) in commands {
            if let Ok(output) = Command::new(cmd).args(args).output() {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() {
                        return Ok(Some(path));
                    }
                }
            }
        }

        Ok(None)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}

/// Resolve a free-form place string into coordinates using a configurable geocoder endpoint.
#[tauri::command]
pub async fn resolve_location(query: String) -> Result<GeocodedLocation, String> {
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() {
        return Err("Location query is required".to_string());
    }

    let endpoint = std::env::var("KEFER_GEOCODER_SEARCH_URL")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_GEOCODER_SEARCH_URL.to_string());

    let client = reqwest::Client::builder()
        .user_agent(GEOCODER_USER_AGENT)
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|err| format!("Failed to initialize geocoder client: {err}"))?;

    let response = client
        .get(&endpoint)
        .query(&[
            ("q", trimmed_query),
            ("format", "jsonv2"),
            ("limit", "1"),
            ("addressdetails", "0"),
        ])
        .send()
        .await
        .map_err(|err| format!("Location lookup failed: {err}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Location lookup failed with status {}",
            response.status()
        ));
    }

    let candidates = response
        .json::<Vec<NominatimSearchResult>>()
        .await
        .map_err(|err| format!("Failed to decode location lookup response: {err}"))?;

    select_nominatim_result(trimmed_query, &candidates)
}

/// Save current charts to a workspace folder (creates workspace.yaml and chart YAMLs).
/// Implemented in Rust only — no Python required.
#[tauri::command]
pub async fn save_workspace(
    workspace_path: String,
    owner: String,
    charts: Vec<serde_json::Value>,
) -> Result<String, String> {
    use crate::workspace::models::{WorkspaceDefaults, WorkspaceManifest};
    use std::fs;
    use std::path::Path;

    let base = Path::new(&workspace_path);
    let charts_dir = base.join("charts");
    fs::create_dir_all(&charts_dir).map_err(|e| format!("Failed to create charts dir: {}", e))?;

    let mut chart_refs = Vec::new();
    for chart in &charts {
        let id = chart.get("id").and_then(|v| v.as_str()).unwrap_or("chart");
        let safe_name: String = id
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        let name = if safe_name.is_empty() {
            "chart"
        } else {
            safe_name.as_str()
        };
        let rel = format!("charts/{}.yml", name);
        let path = base.join(&rel);
        let yaml =
            serde_yaml::to_string(chart).map_err(|e| format!("Chart YAML serialization: {}", e))?;
        fs::write(&path, yaml).map_err(|e| format!("Write {}: {}", path.display(), e))?;
        chart_refs.push(rel);
    }

    let default = WorkspaceDefaults {
        ephemeris_engine: Some(crate::workspace::models::EngineType::Swisseph),
        ephemeris_backend: None,
        element_colors: None,
        radix_point_colors: None,
        default_location: None,
        language: None,
        theme: None,
        default_house_system: None,
        default_bodies: None,
        default_aspects: None,
        time_system: None,
    };
    let manifest = WorkspaceManifest {
        owner: if owner.is_empty() {
            "User".to_string()
        } else {
            owner
        },
        active_model: None,
        aspects: vec![],
        bodies: vec![],
        models: HashMap::new(),
        model_overrides: None,
        default,
        chart_presets: vec![],
        subjects: vec![],
        charts: chart_refs,
        layouts: vec![],
        annotations: vec![],
    };
    let manifest_yaml =
        serde_yaml::to_string(&manifest).map_err(|e| format!("Manifest YAML: {}", e))?;
    let manifest_path = base.join("workspace.yaml");
    fs::write(&manifest_path, manifest_yaml).map_err(|e| format!("Write workspace.yaml: {}", e))?;

    Ok(workspace_path)
}

/// Create a new workspace with an empty manifest and charts directory.
#[tauri::command]
pub async fn create_workspace(workspace_path: String, owner: String) -> Result<String, String> {
    use std::fs;

    let base = Path::new(&workspace_path);
    fs::create_dir_all(base).map_err(|e| format!("Failed to create workspace dir: {}", e))?;
    fs::create_dir_all(base.join("charts"))
        .map_err(|e| format!("Failed to create charts dir: {}", e))?;

    let manifest_path = base.join("workspace.yaml");
    if manifest_path.exists() {
        return Err(format!(
            "Workspace already exists: {}",
            manifest_path.display()
        ));
    }

    let manifest = empty_workspace_manifest(&owner);
    write_workspace_manifest(base, &manifest)?;
    Ok(workspace_path)
}

/// Delete a workspace directory recursively.
#[tauri::command]
pub async fn delete_workspace(workspace_path: String) -> Result<bool, String> {
    use std::fs;

    let base = Path::new(&workspace_path);
    if !base.exists() {
        return Ok(false);
    }

    fs::remove_dir_all(base)
        .map_err(|e| format!("Failed to delete workspace {}: {}", base.display(), e))?;
    Ok(true)
}

/// Create a chart YAML file and register it in workspace.yaml.
#[tauri::command]
pub async fn create_chart(
    workspace_path: String,
    mut chart: serde_json::Value,
) -> Result<String, String> {
    let base = Path::new(&workspace_path);
    let mut manifest = load_workspace_manifest(base)?;

    let chart_id = extract_chart_id(&chart)?.to_string();
    if find_chart_ref_by_id(base, &manifest, &chart_id)?.is_some() {
        return Err(format!("Chart {} already exists", chart_id));
    }

    upsert_chart_id(&mut chart, &chart_id)?;
    let rel = chart_relative_path(&chart_id);
    write_chart_yaml(base, &rel, &chart)?;

    manifest.charts.push(rel);
    write_workspace_manifest(base, &manifest)?;
    Ok(chart_id)
}

/// Import an existing chart file into the active workspace.
#[tauri::command]
pub async fn import_chart(workspace_path: String, source_path: String) -> Result<String, String> {
    let base = Path::new(&workspace_path);
    let mut manifest = load_workspace_manifest(base)?;
    let source = Path::new(&source_path);

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().to_ascii_lowercase());

    let chart = match extension.as_deref() {
        Some("yml" | "yaml") => read_importable_chart_yaml(source)?,
        Some("sfs") => {
            return Err(
                "StarFisher/SFS import is not implemented in Rust yet. Use the Python-backed import path once available."
                    .to_string(),
            )
        }
        Some(other) => {
            return Err(format!(
                "Unsupported chart import format: .{other}. Supported formats: .yml, .yaml"
            ))
        }
        None => {
            return Err(
                "Imported chart file must have a supported extension (.yml, .yaml, .sfs)"
                    .to_string(),
            )
        }
    };

    let chart_id = chart.id.clone();
    if find_chart_ref_by_id(base, &manifest, &chart_id)?.is_some() {
        return Err(format!("Chart {} already exists", chart_id));
    }

    let rel = chart_relative_path(&chart_id);
    let chart_json =
        serde_json::to_value(&chart).map_err(|e| format!("Chart JSON serialization failed: {e}"))?;
    write_chart_yaml(base, &rel, &chart_json)?;

    manifest.charts.push(rel);
    write_workspace_manifest(base, &manifest)?;
    Ok(chart_id)
}

/// Update chart YAML by chart id. The chart id is enforced in written content.
#[tauri::command]
pub async fn update_chart(
    workspace_path: String,
    chart_id: String,
    mut chart: serde_json::Value,
) -> Result<String, String> {
    let base = Path::new(&workspace_path);
    let manifest = load_workspace_manifest(base)?;

    let rel = find_chart_ref_by_id(base, &manifest, &chart_id)?
        .ok_or_else(|| format!("Chart {} not found", chart_id))?;

    upsert_chart_id(&mut chart, &chart_id)?;
    write_chart_yaml(base, &rel, &chart)?;
    Ok(chart_id)
}

/// Delete chart YAML by chart id and remove it from workspace.yaml.
#[tauri::command]
pub async fn delete_chart(workspace_path: String, chart_id: String) -> Result<bool, String> {
    use std::fs;

    let base = Path::new(&workspace_path);
    let mut manifest = load_workspace_manifest(base)?;

    let rel = match find_chart_ref_by_id(base, &manifest, &chart_id)? {
        Some(path) => path,
        None => return Ok(false),
    };

    manifest.charts.retain(|p| p != &rel);
    write_workspace_manifest(base, &manifest)?;

    let chart_path = base.join(&rel);
    if chart_path.exists() {
        fs::remove_file(&chart_path).map_err(|e| {
            format!(
                "Failed to delete chart file {}: {}",
                chart_path.display(),
                e
            )
        })?;
    }

    Ok(true)
}

/// Load workspace from a directory containing workspace.yaml
#[tauri::command]
pub async fn load_workspace(workspace_path: String) -> Result<WorkspaceInfo, String> {
    let workspace_dir = Path::new(&workspace_path);

    // Load manifest using Rust YAML parser
    let manifest = load_workspace_manifest(workspace_dir)?;

    // Load all charts
    let charts = load_all_charts(workspace_dir, &manifest)?;

    // Convert to summaries
    let chart_summaries: Vec<ChartSummary> = charts.iter().map(chart_to_summary).collect();

    Ok(WorkspaceInfo {
        path: workspace_path,
        owner: manifest.owner,
        active_model: manifest.active_model,
        charts: chart_summaries,
    })
}

/// Load workspace default settings from workspace.yaml.
#[tauri::command]
pub async fn get_workspace_defaults(workspace_path: String) -> Result<serde_json::Value, String> {
    use serde_json::json;

    let workspace_dir = Path::new(&workspace_path);
    let manifest = load_workspace_manifest(workspace_dir)?;
    let defaults = manifest.default;

    let default_house_system = defaults.default_house_system.map(|h| match h {
        crate::workspace::models::HouseSystem::Placidus => "Placidus",
        crate::workspace::models::HouseSystem::WholeSign => "Whole Sign",
        crate::workspace::models::HouseSystem::Campanus => "Campanus",
        crate::workspace::models::HouseSystem::Koch => "Koch",
        crate::workspace::models::HouseSystem::Equal => "Equal",
        crate::workspace::models::HouseSystem::Regiomontanus => "Regiomontanus",
        crate::workspace::models::HouseSystem::Vehlow => "Vehlow",
        crate::workspace::models::HouseSystem::Porphyry => "Porphyry",
        crate::workspace::models::HouseSystem::Alcabitius => "Alcabitius",
    });

    let default_engine = defaults.ephemeris_engine.map(|e| match e {
        crate::workspace::models::EngineType::Swisseph => "swisseph",
        crate::workspace::models::EngineType::Jyotish => "jyotish",
        crate::workspace::models::EngineType::Jpl => "jpl",
        crate::workspace::models::EngineType::Custom => "custom",
    });

    let default_location_name = defaults
        .default_location
        .as_ref()
        .map(|location| location.name.clone());

    let default_location_latitude = defaults
        .default_location
        .as_ref()
        .map(|location| location.latitude);

    let default_location_longitude = defaults
        .default_location
        .as_ref()
        .map(|location| location.longitude);

    let default_timezone = defaults
        .default_location
        .as_ref()
        .map(|location| location.timezone.clone());

    Ok(json!({
        "default_house_system": default_house_system,
        "default_engine": default_engine,
        "default_location_name": default_location_name,
        "default_location_latitude": default_location_latitude,
        "default_location_longitude": default_location_longitude,
        "default_timezone": default_timezone,
        "default_bodies": defaults.default_bodies,
        "default_aspects": defaults.default_aspects,
        "time_system": defaults.time_system,
    }))
}

/// Get full chart details including all settings
#[tauri::command]
pub async fn get_chart_details(
    workspace_path: String,
    chart_id: String,
) -> Result<serde_json::Value, String> {
    use serde_json::json;

    let workspace_dir = Path::new(&workspace_path);

    let manifest = load_workspace_manifest(workspace_dir)?;
    let charts = load_all_charts(workspace_dir, &manifest)?;
    let chart = charts
        .into_iter()
        .find(|ch| ch.id == chart_id)
        .ok_or_else(|| format!("Chart {} not found in workspace", chart_id))?;

    // Serialize to JSON

    let mode_str = match chart.config.mode {
        crate::workspace::models::ChartMode::NATAL => "NATAL",
        crate::workspace::models::ChartMode::EVENT => "EVENT",
        crate::workspace::models::ChartMode::HORARY => "HORARY",
        crate::workspace::models::ChartMode::COMPOSITE => "COMPOSITE",
    };

    let house_system_str = chart.config.house_system.as_ref().map(|h| match h {
        crate::workspace::models::HouseSystem::Placidus => "Placidus",
        crate::workspace::models::HouseSystem::WholeSign => "Whole Sign",
        crate::workspace::models::HouseSystem::Campanus => "Campanus",
        crate::workspace::models::HouseSystem::Koch => "Koch",
        crate::workspace::models::HouseSystem::Equal => "Equal",
        crate::workspace::models::HouseSystem::Regiomontanus => "Regiomontanus",
        crate::workspace::models::HouseSystem::Vehlow => "Vehlow",
        crate::workspace::models::HouseSystem::Porphyry => "Porphyry",
        crate::workspace::models::HouseSystem::Alcabitius => "Alcabitius",
    });

    let zodiac_type_str = match chart.config.zodiac_type {
        crate::workspace::models::ZodiacType::Tropical => "Tropical",
        crate::workspace::models::ZodiacType::Sidereal => "Sidereal",
    };

    let engine_str = chart.config.engine.as_ref().map(|e| match e {
        crate::workspace::models::EngineType::Swisseph => "swisseph",
        crate::workspace::models::EngineType::Jyotish => "jyotish",
        crate::workspace::models::EngineType::Jpl => "jpl",
        crate::workspace::models::EngineType::Custom => "custom",
    });

    Ok(json!({
        "id": chart.id,
        "subject": {
            "id": chart.subject.id,
            "name": chart.subject.name,
            "event_time": chart.subject.event_time.map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
            "location": {
                "name": chart.subject.location.name,
                "latitude": chart.subject.location.latitude,
                "longitude": chart.subject.location.longitude,
                "timezone": chart.subject.location.timezone,
            }
        },
        "config": {
            "mode": mode_str,
            "house_system": house_system_str,
            "zodiac_type": zodiac_type_str,
            "engine": engine_str,
            "model": chart.config.model,
            "override_ephemeris": chart.config.override_ephemeris,
        },
        "tags": chart.tags,
    }))
}

/// Compute chart positions and aspects from in-memory chart data (no workspace on disk).
#[tauri::command]
pub async fn compute_chart_from_data(
    app: AppHandle,
    backend_state: State<'_, crate::backend::BackendState>,
    chart_json: serde_json::Value,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let backend = selected_compute_backend();
    let fallback_to_python = python_fallback_enabled();
    let force_python = chart_json_requires_python_precision(&chart_json);
    let backend_available = matches!(
        backend_state.availability()?,
        crate::backend::BackendAvailability::Available
    );
    match select_chart_compute_route(backend, backend_available, force_python)? {
        ComputeRoute::Rust => compute_chart_from_data_rust(chart_json),
        ComputeRoute::Python if matches!(backend, ComputeBackend::Auto) && !force_python => {
            match compute_chart_from_data_python(&app, &backend_state, chart_json.clone()).await {
                Ok(result) => Ok(result),
                Err(_err) if fallback_to_python => compute_chart_from_data_rust(chart_json),
                Err(err) => Err(err),
            }
        }
        ComputeRoute::Python => compute_chart_from_data_python(&app, &backend_state, chart_json).await,
    }
}

fn compute_chart_from_data_rust(
    chart_json: serde_json::Value,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let chart: crate::workspace::models::ChartInstance =
        serde_json::from_value(chart_json).map_err(|e| format!("Invalid chart payload: {}", e))?;
    build_chart_result(&chart, None)
}

async fn compute_chart_from_data_python(
    app: &AppHandle,
    backend_state: &crate::backend::BackendState,
    chart_json: serde_json::Value,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let payload = serde_json::json!({
        "chart_json": chart_json,
    });
    let response =
        crate::backend::post_json(app, backend_state, "/charts/compute-from-data", &payload).await?;
    serde_json::from_value(response)
        .map_err(|err| format!("Failed to parse backend chart-from-data response: {err}"))
}

/// Compute chart positions and aspects using Python
#[tauri::command]
pub async fn compute_chart(
    app: AppHandle,
    backend_state: State<'_, crate::backend::BackendState>,
    workspace_path: String,
    chart_id: String,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let backend = selected_compute_backend();
    let fallback_to_python = python_fallback_enabled();
    let force_python = chart_requires_python_precision(&workspace_path, &chart_id).unwrap_or(false);
    let backend_available = matches!(
        backend_state.availability()?,
        crate::backend::BackendAvailability::Available
    );
    match select_chart_compute_route(backend, backend_available, force_python)? {
        ComputeRoute::Rust => compute_chart_rust(&workspace_path, &chart_id),
        ComputeRoute::Python if matches!(backend, ComputeBackend::Auto) && !force_python => {
            match compute_chart_python(&app, &backend_state, &workspace_path, &chart_id).await {
                Ok(result) => Ok(result),
                Err(_err) if fallback_to_python => compute_chart_rust(&workspace_path, &chart_id),
                Err(err) => Err(err),
            }
        }
        ComputeRoute::Python => {
            compute_chart_python(&app, &backend_state, &workspace_path, &chart_id).await
        }
    }
}

fn compute_chart_rust(
    workspace_path: &str,
    chart_id: &str,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let base = Path::new(workspace_path);
    let manifest = load_workspace_manifest(base)?;
    let chart_rel = find_chart_ref_by_id(base, &manifest, chart_id)?
        .ok_or_else(|| format!("Chart {} not found", chart_id))?;
    let chart = load_chart(base, &chart_rel)?;
    build_chart_result(&chart, None)
}

async fn compute_chart_python(
    app: &AppHandle,
    backend_state: &crate::backend::BackendState,
    workspace_path: &str,
    chart_id: &str,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let payload = serde_json::json!({
        "workspace_path": Path::new(workspace_path)
            .join("workspace.yaml")
            .to_str()
            .ok_or("Invalid workspace manifest path")?,
        "chart_id": chart_id,
    });
    let response =
        crate::backend::post_json(app, backend_state, "/charts/compute", &payload).await?;
    serde_json::from_value(response)
        .map_err(|err| format!("Failed to parse backend chart response: {err}"))
}

/// Compute transit series using Python
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn compute_transit_series(
    app: AppHandle,
    backend_state: State<'_, crate::backend::BackendState>,
    workspace_path: String,
    chart_id: String,
    start_datetime: String,
    end_datetime: String,
    time_step_seconds: i64,
    transiting_objects: Vec<String>,
    transited_objects: Vec<String>,
    aspect_types: Vec<String>,
) -> Result<serde_json::Value, String> {
    let backend = selected_compute_backend();
    let fallback_to_python = python_fallback_enabled();
    let backend_available = matches!(
        backend_state.availability()?,
        crate::backend::BackendAvailability::Available
    );

    match select_transit_compute_route(backend, backend_available)? {
        ComputeRoute::Rust => compute_transit_series_rust(
            &workspace_path,
            &chart_id,
            &start_datetime,
            &end_datetime,
            time_step_seconds,
            &transiting_objects,
            &transited_objects,
            &aspect_types,
        ),
        ComputeRoute::Python if matches!(backend, ComputeBackend::Auto) => {
            match compute_transit_series_python(
                &app,
                &backend_state,
                &workspace_path,
                &chart_id,
                &start_datetime,
                &end_datetime,
                time_step_seconds,
                transiting_objects.clone(),
                transited_objects.clone(),
                aspect_types.clone(),
            )
            .await
            {
                Ok(result) => Ok(result),
                Err(_err) if fallback_to_python => compute_transit_series_rust(
                    &workspace_path,
                    &chart_id,
                    &start_datetime,
                    &end_datetime,
                    time_step_seconds,
                    &transiting_objects,
                    &transited_objects,
                    &aspect_types,
                ),
                Err(err) => Err(err),
            }
        }
        ComputeRoute::Python => {
            compute_transit_series_python(
                &app,
                &backend_state,
                &workspace_path,
                &chart_id,
                &start_datetime,
                &end_datetime,
                time_step_seconds,
                transiting_objects,
                transited_objects,
                aspect_types,
            )
            .await
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn compute_transit_series_rust(
    workspace_path: &str,
    chart_id: &str,
    start_datetime: &str,
    end_datetime: &str,
    time_step_seconds: i64,
    transiting_objects: &[String],
    transited_objects: &[String],
    aspect_types: &[String],
) -> Result<serde_json::Value, String> {
    if time_step_seconds <= 0 {
        return Err("time_step_seconds must be > 0".to_string());
    }

    let start_dt = parse_datetime_input(start_datetime)?;
    let end_dt = parse_datetime_input(end_datetime)?;
    if end_dt < start_dt {
        return Err("end_datetime must be greater than or equal to start_datetime".to_string());
    }

    let base = Path::new(workspace_path);
    let manifest = load_workspace_manifest(base)?;
    let chart_rel = find_chart_ref_by_id(base, &manifest, chart_id)?
        .ok_or_else(|| format!("Chart {} not found", chart_id))?;
    let source_chart = load_chart(base, &chart_rel)?;

    let transited_filter = if transited_objects.is_empty() {
        source_chart.config.observable_objects.clone()
    } else {
        Some(transited_objects.to_vec())
    };
    let radix_positions =
        compute_positions_for_chart_rust(&source_chart, transited_filter.as_ref())?;

    let mut current = start_dt;
    let step = Duration::seconds(time_step_seconds);
    let max_steps = 50_000_i64;
    let mut step_count = 0_i64;
    let mut results = Vec::new();
    while current <= end_dt {
        step_count += 1;
        if step_count > max_steps {
            return Err(format!(
                "Transit range too large (>{max_steps} steps). Increase time step or reduce range."
            ));
        }

        let mut transit_chart = source_chart.clone();
        transit_chart.subject.event_time = Some(current);
        let transiting_filter = if transiting_objects.is_empty() {
            transit_chart.config.observable_objects.clone()
        } else {
            Some(transiting_objects.to_vec())
        };
        let transit_positions =
            compute_positions_for_chart_rust(&transit_chart, transiting_filter.as_ref())?;
        let aspects = compute_cross_aspects(
            &transit_positions,
            &radix_positions,
            &source_chart.config.aspect_orbs,
            aspect_types,
        );

        results.push(serde_json::json!({
            "datetime": current.to_rfc3339(),
            "transit_positions": transit_positions,
            "aspects": aspects,
        }));

        current += step;
    }

    Ok(serde_json::json!({
        "source_chart_id": chart_id,
        "time_range": {
            "start": start_dt.to_rfc3339(),
            "end": end_dt.to_rfc3339(),
        },
        "time_step": format!("{}s", time_step_seconds),
        "results": results,
    }))
}

#[allow(clippy::too_many_arguments)]
async fn compute_transit_series_python(
    app: &AppHandle,
    backend_state: &crate::backend::BackendState,
    workspace_path: &str,
    chart_id: &str,
    start_datetime: &str,
    end_datetime: &str,
    time_step_seconds: i64,
    transiting_objects: Vec<String>,
    transited_objects: Vec<String>,
    aspect_types: Vec<String>,
) -> Result<serde_json::Value, String> {
    let payload = serde_json::json!({
        "workspace_path": Path::new(workspace_path)
            .join("workspace.yaml")
            .to_str()
            .ok_or("Invalid workspace manifest path")?,
        "source_chart_id": chart_id,
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
        "time_step": format!("{time_step_seconds} seconds"),
        "transiting_objects": transiting_objects,
        "transited_objects": transited_objects,
        "aspect_types": aspect_types,
    });
    crate::backend::post_json(app, backend_state, "/transits/compute-series", &payload).await
}

#[derive(Clone, Copy)]
struct OrbitalBody {
    id: &'static str,
    semi_major_axis_au: f64,
    mean_longitude_j2000_deg: f64,
    orbital_period_days: f64,
}

#[derive(Clone, Copy)]
struct AspectSpec {
    id: &'static str,
    angle: f64,
    default_orb: f64,
}

const EARTH_HELIO_LONGITUDE_J2000: f64 = 100.466_457;
const OBLIQUITY_DEGREES: f64 = 23.439_291_1;
const ORBITAL_BODIES: [OrbitalBody; 8] = [
    OrbitalBody {
        id: "mercury",
        semi_major_axis_au: 0.387_098,
        mean_longitude_j2000_deg: 252.250_84,
        orbital_period_days: 87.969,
    },
    OrbitalBody {
        id: "venus",
        semi_major_axis_au: 0.723_332,
        mean_longitude_j2000_deg: 181.979_73,
        orbital_period_days: 224.701,
    },
    OrbitalBody {
        id: "mars",
        semi_major_axis_au: 1.523_679,
        mean_longitude_j2000_deg: 355.433,
        orbital_period_days: 686.980,
    },
    OrbitalBody {
        id: "jupiter",
        semi_major_axis_au: 5.203_8,
        mean_longitude_j2000_deg: 34.351,
        orbital_period_days: 4_332.589,
    },
    OrbitalBody {
        id: "saturn",
        semi_major_axis_au: 9.537,
        mean_longitude_j2000_deg: 50.077,
        orbital_period_days: 10_759.22,
    },
    OrbitalBody {
        id: "uranus",
        semi_major_axis_au: 19.191,
        mean_longitude_j2000_deg: 314.055,
        orbital_period_days: 30_688.5,
    },
    OrbitalBody {
        id: "neptune",
        semi_major_axis_au: 30.07,
        mean_longitude_j2000_deg: 304.348,
        orbital_period_days: 60_182.0,
    },
    OrbitalBody {
        id: "pluto",
        semi_major_axis_au: 39.482,
        mean_longitude_j2000_deg: 238.929,
        orbital_period_days: 90_560.0,
    },
];
const MAJOR_ASPECTS: [AspectSpec; 5] = [
    AspectSpec {
        id: "conjunction",
        angle: 0.0,
        default_orb: 8.0,
    },
    AspectSpec {
        id: "sextile",
        angle: 60.0,
        default_orb: 6.0,
    },
    AspectSpec {
        id: "square",
        angle: 90.0,
        default_orb: 8.0,
    },
    AspectSpec {
        id: "trine",
        angle: 120.0,
        default_orb: 8.0,
    },
    AspectSpec {
        id: "opposition",
        angle: 180.0,
        default_orb: 8.0,
    },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RadixAxes {
    asc: f64,
    desc: f64,
    mc: f64,
    ic: f64,
}

fn build_chart_result(
    chart: &crate::workspace::models::ChartInstance,
    aspect_types: Option<&[String]>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let axes = compute_radix_axes(chart)?;
    let house_cusps = compute_house_cusps(chart, &axes);
    let positions =
        compute_positions_for_chart_rust(chart, chart.config.observable_objects.as_ref())?;
    let aspects = compute_chart_aspects(&positions, &chart.config.aspect_orbs, aspect_types);

    Ok(HashMap::from([
        ("positions".to_string(), serde_json::json!(positions)),
        ("aspects".to_string(), serde_json::json!(aspects)),
        ("axes".to_string(), serde_json::json!(axes)),
        ("house_cusps".to_string(), serde_json::json!(house_cusps)),
        ("chart_id".to_string(), serde_json::json!(chart.id)),
    ]))
}

fn compute_radix_axes(
    chart: &crate::workspace::models::ChartInstance,
) -> Result<RadixAxes, String> {
    let event_time = chart
        .subject
        .event_time
        .ok_or_else(|| "Chart has no subject.event_time".to_string())?;
    let jd = julian_day(event_time);
    let (asc, mc) = asc_mc_longitudes(
        jd,
        chart.subject.location.latitude,
        chart.subject.location.longitude,
    );

    Ok(RadixAxes {
        asc,
        desc: normalize_deg(asc + 180.0),
        mc,
        ic: normalize_deg(mc + 180.0),
    })
}

fn compute_house_cusps(
    chart: &crate::workspace::models::ChartInstance,
    axes: &RadixAxes,
) -> Vec<f64> {
    let start = match chart.config.house_system {
        Some(crate::workspace::models::HouseSystem::WholeSign) => {
            normalize_deg((axes.asc / 30.0).floor() * 30.0)
        }
        _ => axes.asc,
    };

    (0..12)
        .map(|offset| normalize_deg(start + 30.0 * offset as f64))
        .collect()
}

fn compute_positions_for_chart_rust(
    chart: &crate::workspace::models::ChartInstance,
    requested_objects: Option<&Vec<String>>,
) -> Result<HashMap<String, f64>, String> {
    let event_time = chart
        .subject
        .event_time
        .ok_or_else(|| "Chart has no subject.event_time".to_string())?;
    let jd = julian_day(event_time);
    let d = jd - 2_451_545.0;

    let mut positions = HashMap::new();

    let sun = sun_longitude_deg(d);
    let moon = moon_longitude_deg(d);
    positions.insert("sun".to_string(), sun);
    positions.insert("moon".to_string(), moon);

    let earth_helio = normalize_deg(EARTH_HELIO_LONGITUDE_J2000 + (360.0 / 365.256_363_004) * d);
    for body in ORBITAL_BODIES {
        let longitude = geocentric_longitude_deg(body, d, earth_helio);
        positions.insert(body.id.to_string(), longitude);
    }

    let axes = compute_radix_axes(chart)?;
    positions.insert("asc".to_string(), axes.asc);
    positions.insert("desc".to_string(), axes.desc);
    positions.insert("mc".to_string(), axes.mc);
    positions.insert("ic".to_string(), axes.ic);

    if let Some(requested) = requested_objects {
        if !requested.is_empty() {
            let requested_norm: HashSet<String> =
                requested.iter().map(|id| normalize_object_id(id)).collect();
            positions.retain(|key, _| requested_norm.contains(&normalize_object_id(key)));
        }
    }

    Ok(positions)
}

fn compute_chart_aspects(
    positions: &HashMap<String, f64>,
    aspect_orbs: &HashMap<String, f64>,
    aspect_types: Option<&[String]>,
) -> Vec<serde_json::Value> {
    let specs = selected_aspects(aspect_orbs, aspect_types);
    let mut ids: Vec<&String> = positions.keys().collect();
    ids.sort();

    let mut out = Vec::new();
    for i in 0..ids.len() {
        for j in (i + 1)..ids.len() {
            let from = ids[i];
            let to = ids[j];
            let angle = shortest_arc_deg(
                *positions.get(from).unwrap_or(&0.0),
                *positions.get(to).unwrap_or(&0.0),
            );

            if let Some((aspect_id, exact_angle, orb)) = detect_aspect(angle, &specs) {
                out.push(serde_json::json!({
                    "from": from,
                    "to": to,
                    "type": aspect_id,
                    "angle": angle,
                    "orb": orb,
                    "exact_angle": exact_angle,
                    "applying": false,
                    "separating": false,
                }));
            }
        }
    }
    out
}

fn compute_cross_aspects(
    transiting_positions: &HashMap<String, f64>,
    transited_positions: &HashMap<String, f64>,
    aspect_orbs: &HashMap<String, f64>,
    aspect_types: &[String],
) -> Vec<serde_json::Value> {
    let specs = selected_aspects(aspect_orbs, Some(aspect_types));
    let mut transiting_ids: Vec<&String> = transiting_positions.keys().collect();
    let mut transited_ids: Vec<&String> = transited_positions.keys().collect();
    transiting_ids.sort();
    transited_ids.sort();

    let mut out = Vec::new();
    for from in transiting_ids {
        let from_lon = *transiting_positions.get(from).unwrap_or(&0.0);
        for to in &transited_ids {
            let to_lon = *transited_positions.get(*to).unwrap_or(&0.0);
            let angle = shortest_arc_deg(from_lon, to_lon);
            if let Some((aspect_id, exact_angle, orb)) = detect_aspect(angle, &specs) {
                out.push(serde_json::json!({
                    "from": from,
                    "to": to,
                    "type": aspect_id,
                    "angle": angle,
                    "orb": orb,
                    "exact_angle": exact_angle,
                    "applying": false,
                    "separating": false,
                }));
            }
        }
    }
    out
}

fn selected_aspects(
    aspect_orbs: &HashMap<String, f64>,
    selected_types: Option<&[String]>,
) -> Vec<(String, f64, f64)> {
    let selected: Option<HashSet<String>> = selected_types.map(|types| {
        types
            .iter()
            .map(|t| t.trim().to_ascii_lowercase())
            .collect()
    });

    MAJOR_ASPECTS
        .iter()
        .filter_map(|spec| {
            let id = spec.id.to_string();
            if let Some(filter) = &selected {
                if !filter.contains(&id) {
                    return None;
                }
            }
            let orb = aspect_orbs
                .get(spec.id)
                .copied()
                .unwrap_or(spec.default_orb)
                .max(0.0);
            Some((id, spec.angle, orb))
        })
        .collect()
}

fn detect_aspect(angle: f64, specs: &[(String, f64, f64)]) -> Option<(String, f64, f64)> {
    for (id, exact_angle, allowed_orb) in specs {
        let normalized_exact = if *exact_angle > 180.0 {
            360.0 - *exact_angle
        } else {
            *exact_angle
        };
        let orb = (angle - normalized_exact).abs();
        if orb <= *allowed_orb {
            return Some((id.clone(), *exact_angle, orb));
        }
    }
    None
}

fn parse_datetime_input(value: &str) -> Result<DateTime<Utc>, String> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
        return Ok(dt.with_timezone(&Utc));
    }

    let naive_formats = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M"];
    for fmt in naive_formats {
        if let Ok(dt) = NaiveDateTime::parse_from_str(value, fmt) {
            return Ok(dt.and_utc());
        }
    }

    if let Ok(date) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
        if let Some(dt) = date.and_hms_opt(0, 0, 0) {
            return Ok(dt.and_utc());
        }
    }

    Err(format!("Invalid datetime format: {}", value))
}

fn normalize_object_id(id: &str) -> String {
    match id.trim().to_ascii_lowercase().as_str() {
        "ascendant" => "asc".to_string(),
        "descendant" => "desc".to_string(),
        "midheaven" | "medium_coeli" => "mc".to_string(),
        "imum_coeli" => "ic".to_string(),
        other => other.to_string(),
    }
}

fn julian_day(dt: DateTime<Utc>) -> f64 {
    2_440_587.5
        + (dt.timestamp() as f64 / 86_400.0)
        + (f64::from(dt.timestamp_subsec_nanos()) / 86_400_000_000_000.0)
}

fn geocentric_longitude_deg(body: OrbitalBody, d: f64, earth_helio_longitude: f64) -> f64 {
    let mean_motion = 360.0 / body.orbital_period_days;
    let planet_helio = normalize_deg(body.mean_longitude_j2000_deg + mean_motion * d);
    let px = body.semi_major_axis_au * cos_deg(planet_helio);
    let py = body.semi_major_axis_au * sin_deg(planet_helio);
    let ex = cos_deg(earth_helio_longitude);
    let ey = sin_deg(earth_helio_longitude);
    normalize_deg(rad_to_deg((py - ey).atan2(px - ex)))
}

fn sun_longitude_deg(d: f64) -> f64 {
    let m = normalize_deg(357.529_11 + 0.985_600_28 * d);
    normalize_deg(
        280.466_46
            + 0.985_647_36 * d
            + 1.914_602 * sin_deg(m)
            + 0.019_993 * sin_deg(2.0 * m)
            + 0.000_289 * sin_deg(3.0 * m),
    )
}

fn moon_longitude_deg(d: f64) -> f64 {
    let l0 = normalize_deg(218.316 + 13.176_396 * d);
    let mm = normalize_deg(134.963 + 13.064_993 * d);
    let ms = normalize_deg(357.529 + 0.985_600_28 * d);
    let dd = normalize_deg(297.850 + 12.190_749 * d);
    let ff = normalize_deg(93.272 + 13.229_350 * d);

    normalize_deg(
        l0 + 6.289 * sin_deg(mm)
            + 1.274 * sin_deg(2.0 * dd - mm)
            + 0.658 * sin_deg(2.0 * dd)
            + 0.214 * sin_deg(2.0 * mm)
            - 0.186 * sin_deg(ms)
            - 0.059 * sin_deg(2.0 * dd - 2.0 * mm)
            - 0.057 * sin_deg(2.0 * dd - ms - mm)
            + 0.053 * sin_deg(2.0 * dd + mm)
            + 0.046 * sin_deg(2.0 * dd - ms)
            + 0.041 * sin_deg(ms - mm)
            - 0.035 * sin_deg(dd)
            - 0.031 * sin_deg(ms + mm)
            - 0.015 * sin_deg(2.0 * ff - 2.0 * dd)
            + 0.011 * sin_deg(2.0 * dd - 4.0 * mm),
    )
}

fn asc_mc_longitudes(jd: f64, latitude_deg: f64, longitude_deg: f64) -> (f64, f64) {
    let t = (jd - 2_451_545.0) / 36_525.0;
    let gmst = normalize_deg(
        280.460_618_37 + 360.985_647_366_29 * (jd - 2_451_545.0) + 0.000_387_933 * t * t
            - (t * t * t) / 38_710_000.0,
    );
    let lst = normalize_deg(gmst + longitude_deg);
    let theta = deg_to_rad(lst);
    let eps = deg_to_rad(OBLIQUITY_DEGREES);
    let phi = deg_to_rad(latitude_deg);

    let mc = normalize_deg(rad_to_deg((theta.sin() / eps.cos()).atan2(theta.cos())));
    let asc = normalize_deg(rad_to_deg(
        (-theta.cos()).atan2(theta.sin() * eps.cos() + phi.tan() * eps.sin()),
    ));
    (asc, mc)
}

fn shortest_arc_deg(a: f64, b: f64) -> f64 {
    let mut diff = (normalize_deg(a) - normalize_deg(b)).abs();
    if diff > 180.0 {
        diff = 360.0 - diff;
    }
    diff
}

fn normalize_deg(value: f64) -> f64 {
    let mut out = value % 360.0;
    if out < 0.0 {
        out += 360.0;
    }
    out
}

fn sin_deg(value: f64) -> f64 {
    deg_to_rad(value).sin()
}

fn cos_deg(value: f64) -> f64 {
    deg_to_rad(value).cos()
}

fn deg_to_rad(value: f64) -> f64 {
    value * std::f64::consts::PI / 180.0
}

fn rad_to_deg(value: f64) -> f64 {
    value * 180.0 / std::f64::consts::PI
}

/// Only JPL, Jyotish and Custom require Python; Swisseph can use Python (preferred) with Rust fallback.
fn chart_json_requires_python_precision(chart_json: &serde_json::Value) -> bool {
    let cfg = chart_json.get("config").and_then(|v| v.as_object());
    let engine = cfg
        .and_then(|c| c.get("engine"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_ascii_lowercase());
    let has_override_ephemeris = cfg
        .and_then(|c| c.get("override_ephemeris"))
        .and_then(|v| v.as_str())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    matches!(engine.as_deref(), Some("jpl" | "jyotish" | "custom")) || has_override_ephemeris
}

fn chart_requires_python_precision(workspace_path: &str, chart_id: &str) -> Result<bool, String> {
    let base = Path::new(workspace_path);
    let manifest = load_workspace_manifest(base)?;
    let chart_rel = find_chart_ref_by_id(base, &manifest, chart_id)?
        .ok_or_else(|| format!("Chart {} not found", chart_id))?;
    let chart = load_chart(base, &chart_rel)?;

    // Only JPL, Jyotish, Custom require Python; Swisseph can use Rust fallback.
    let requires = matches!(
        chart.config.engine,
        Some(
            crate::workspace::models::EngineType::Jpl
                | crate::workspace::models::EngineType::Jyotish
                | crate::workspace::models::EngineType::Custom
        )
    ) || chart
        .config
        .override_ephemeris
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    Ok(requires)
}

#[derive(Clone, Copy, Debug)]
enum ComputeBackend {
    Auto,
    Rust,
    Python,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ComputeRoute {
    Rust,
    Python,
}

fn selected_compute_backend() -> ComputeBackend {
    match std::env::var("KEFER_COMPUTE_BACKEND")
        .ok()
        .as_deref()
        .map(|value| value.trim().to_ascii_lowercase())
        .as_deref()
    {
        Some("rust") => ComputeBackend::Rust,
        Some("python") => ComputeBackend::Python,
        _ => ComputeBackend::Auto,
    }
}

fn python_fallback_enabled() -> bool {
    !matches!(
        std::env::var("KEFER_PYTHON_FALLBACK")
        .ok()
        .as_deref()
        .map(|value| value.trim().to_ascii_lowercase())
        .as_deref(),
        Some("0" | "false" | "no" | "off")
    )
}

fn select_chart_compute_route(
    backend: ComputeBackend,
    backend_available: bool,
    force_python: bool,
) -> Result<ComputeRoute, String> {
    if force_python {
        return match backend {
            ComputeBackend::Rust => Err("Rust backend does not support precise Swiss Ephemeris/JPL chart computation yet. Use Python backend.".to_string()),
            _ if backend_available => Ok(ComputeRoute::Python),
            _ => Err("Python backend unavailable. This chart requires Python-backed computation.".to_string()),
        };
    }

    match backend {
        ComputeBackend::Rust => Ok(ComputeRoute::Rust),
        ComputeBackend::Python => {
            if backend_available {
                Ok(ComputeRoute::Python)
            } else {
                Err("Python backend unavailable; use Rust fallback where supported".to_string())
            }
        }
        ComputeBackend::Auto => {
            if backend_available {
                Ok(ComputeRoute::Python)
            } else {
                Ok(ComputeRoute::Rust)
            }
        }
    }
}

fn select_transit_compute_route(
    backend: ComputeBackend,
    backend_available: bool,
) -> Result<ComputeRoute, String> {
    match backend {
        ComputeBackend::Rust => Ok(ComputeRoute::Rust),
        ComputeBackend::Python => {
            if backend_available {
                Ok(ComputeRoute::Python)
            } else {
                Err("Python backend unavailable; use Rust fallback where supported".to_string())
            }
        }
        ComputeBackend::Auto => {
            if backend_available {
                Ok(ComputeRoute::Python)
            } else {
                Ok(ComputeRoute::Rust)
            }
        }
    }
}

fn empty_workspace_manifest(owner: &str) -> crate::workspace::models::WorkspaceManifest {
    let owner_value = if owner.is_empty() {
        "User".to_string()
    } else {
        owner.to_string()
    };
    crate::workspace::models::WorkspaceManifest {
        owner: owner_value,
        active_model: None,
        aspects: vec![],
        bodies: vec![],
        models: HashMap::new(),
        model_overrides: None,
        default: crate::workspace::models::WorkspaceDefaults {
            ephemeris_engine: Some(crate::workspace::models::EngineType::Swisseph),
            ephemeris_backend: None,
            element_colors: None,
            radix_point_colors: None,
            default_location: None,
            language: None,
            theme: None,
            default_house_system: None,
            default_bodies: None,
            default_aspects: None,
            time_system: None,
        },
        chart_presets: vec![],
        subjects: vec![],
        charts: vec![],
        layouts: vec![],
        annotations: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use serde_json::Value;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestWorkspaceDir {
        path: PathBuf,
    }

    impl TestWorkspaceDir {
        fn new(prefix: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system time should be after unix epoch")
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "kefer-{prefix}-{}-{unique}",
                std::process::id()
            ));
            fs::create_dir_all(&path).expect("temporary test directory should be creatable");
            Self { path }
        }
    }

    impl Drop for TestWorkspaceDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn sample_workspace_path() -> String {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../backend-python-tests/sample")
            .canonicalize()
            .expect("sample workspace should exist")
            .to_string_lossy()
            .into_owned()
    }

    fn sample_chart_source_path() -> String {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../backend-python-tests/sample/charts/base-chart.yml")
            .canonicalize()
            .expect("sample chart should exist")
            .to_string_lossy()
            .into_owned()
    }

    fn sample_chart_payload(chart_id: &str) -> serde_json::Value {
        serde_json::json!({
            "id": chart_id,
            "subject": {
                "id": chart_id,
                "name": chart_id,
                "event_time": "2024-01-01T12:00:00+01:00",
                "location": {
                    "name": "Prague, CZ",
                    "latitude": 50.0875,
                    "longitude": 14.4214,
                    "timezone": "Europe/Prague"
                }
            },
            "config": {
                "mode": "NATAL",
                "house_system": "Placidus",
                "zodiac_type": "Tropical",
                "included_points": [],
                "aspect_orbs": {
                    "conjunction": 8.0,
                    "square": 6.0
                },
                "display_style": "",
                "color_theme": "",
                "override_ephemeris": null,
                "model": null,
                "engine": "swisseph",
                "ayanamsa": null,
                "observable_objects": ["sun", "moon", "asc"],
                "time_system": null
            },
            "computed_chart": null,
            "tags": ["test"]
        })
    }

    #[test]
    fn chart_route_uses_rust_when_backend_unavailable_in_auto_mode() {
        let route = select_chart_compute_route(ComputeBackend::Auto, false, false)
            .expect("auto mode should fall back to rust");
        assert_eq!(route, ComputeRoute::Rust);
    }

    #[test]
    fn chart_route_requires_python_when_precision_is_forced() {
        let err = select_chart_compute_route(ComputeBackend::Auto, false, true)
            .expect_err("forced precision should fail without python");
        assert!(err.contains("Python backend unavailable"));
    }

    #[test]
    fn chart_route_honors_python_when_available() {
        let route = select_chart_compute_route(ComputeBackend::Auto, true, true)
            .expect("python should be selected when available");
        assert_eq!(route, ComputeRoute::Python);
    }

    #[test]
    fn transit_route_uses_rust_when_backend_unavailable_in_auto_mode() {
        let route = select_transit_compute_route(ComputeBackend::Auto, false)
            .expect("auto transit mode should fall back to rust");
        assert_eq!(route, ComputeRoute::Rust);
    }

    #[test]
    fn compute_chart_rust_reads_sample_workspace() {
        let result = compute_chart_rust(&sample_workspace_path(), "Base Chart")
            .expect("sample workspace chart should compute");

        assert_eq!(result.get("chart_id"), Some(&serde_json::json!("Base Chart")));

        let positions = result
            .get("positions")
            .and_then(Value::as_object)
            .expect("positions should be an object");
        assert!(positions.contains_key("sun"));
        assert!(positions.contains_key("moon"));
        assert!(positions.contains_key("asc"));

        let axes = result
            .get("axes")
            .and_then(Value::as_object)
            .expect("axes should be an object");
        assert!(axes.contains_key("asc"));
        assert!(axes.contains_key("mc"));

        let house_cusps = result
            .get("house_cusps")
            .and_then(Value::as_array)
            .expect("house_cusps should be an array");
        assert_eq!(house_cusps.len(), 12);

        let aspects = result
            .get("aspects")
            .and_then(Value::as_array)
            .expect("aspects should be an array");
        assert!(aspects.iter().all(Value::is_object));
    }

    #[test]
    fn compute_house_cusps_uses_whole_sign_boundaries() {
        let chart = load_chart(
            std::path::Path::new(&sample_workspace_path()),
            "charts/base-chart.yml",
        )
        .expect("sample chart should load");
        let mut whole_sign_chart = chart.clone();
        whole_sign_chart.config.house_system = Some(crate::workspace::models::HouseSystem::WholeSign);

        let axes = compute_radix_axes(&whole_sign_chart).expect("axes should compute");
        let cusps = compute_house_cusps(&whole_sign_chart, &axes);

        assert_eq!(cusps.len(), 12);
        let expected_first = (axes.asc / 30.0).floor() * 30.0;
        assert!((cusps[0] - expected_first).abs() < 0.000_1);
        assert!((normalize_deg(cusps[1] - cusps[0]) - 30.0).abs() < 0.000_1);
    }

    #[test]
    fn compute_transit_series_rust_applies_requested_filters() {
        let transiting_objects = vec!["sun".to_string()];
        let transited_objects = vec!["moon".to_string()];
        let aspect_types = vec!["square".to_string()];

        let result = compute_transit_series_rust(
            &sample_workspace_path(),
            "Base Chart",
            "2024-01-01T00:00:00Z",
            "2024-01-01T02:00:00Z",
            3600,
            &transiting_objects,
            &transited_objects,
            &aspect_types,
        )
        .expect("sample transit series should compute");

        let results = result
            .get("results")
            .and_then(Value::as_array)
            .expect("results should be an array");
        assert_eq!(results.len(), 3);

        for entry in results {
            let positions = entry
                .get("transit_positions")
                .and_then(Value::as_object)
                .expect("transit_positions should be an object");
            assert_eq!(positions.len(), 1);
            assert!(positions.contains_key("sun"));

            let aspects = entry
                .get("aspects")
                .and_then(Value::as_array)
                .expect("aspects should be an array");
            for aspect in aspects {
                assert_eq!(aspect.get("type"), Some(&serde_json::json!("square")));
                assert_eq!(aspect.get("from"), Some(&serde_json::json!("sun")));
                assert_eq!(aspect.get("to"), Some(&serde_json::json!("moon")));
            }
        }
    }

    #[test]
    fn create_workspace_writes_manifest_and_charts_dir() {
        let temp = TestWorkspaceDir::new("workspace-create");
        let workspace_path = temp.path.join("project");

        let result = tauri::async_runtime::block_on(create_workspace(
            workspace_path.to_string_lossy().into_owned(),
            "Tester".to_string(),
        ))
        .expect("workspace should be created");

        assert_eq!(result, workspace_path.to_string_lossy());
        assert!(workspace_path.join("charts").is_dir());
        assert!(workspace_path.join("workspace.yaml").is_file());

        let manifest = load_workspace_manifest(&workspace_path).expect("manifest should load");
        assert_eq!(manifest.owner, "Tester");
        assert!(manifest.charts.is_empty());
    }

    #[test]
    fn get_workspace_defaults_reads_sample_workspace_defaults() {
        let defaults = tauri::async_runtime::block_on(get_workspace_defaults(sample_workspace_path()))
            .expect("sample defaults should load");

        assert_eq!(defaults.get("default_engine"), Some(&serde_json::json!("swisseph")));
        assert_eq!(defaults.get("default_bodies"), Some(&serde_json::Value::Null));
        assert_eq!(defaults.get("default_aspects"), Some(&serde_json::Value::Null));
    }

    #[test]
    fn create_chart_registers_chart_and_loads_in_workspace_summary() {
        let temp = TestWorkspaceDir::new("chart-create");
        let workspace_path = temp.path.join("project");
        tauri::async_runtime::block_on(create_workspace(
            workspace_path.to_string_lossy().into_owned(),
            "Tester".to_string(),
        ))
        .expect("workspace should be created");

        let chart_id = tauri::async_runtime::block_on(create_chart(
            workspace_path.to_string_lossy().into_owned(),
            sample_chart_payload("Test Chart"),
        ))
        .expect("chart should be created");

        assert_eq!(chart_id, "Test Chart");
        assert!(workspace_path.join("charts/Test_Chart.yml").is_file());

        let info = tauri::async_runtime::block_on(load_workspace(
            workspace_path.to_string_lossy().into_owned(),
        ))
        .expect("workspace should load");

        assert_eq!(info.charts.len(), 1);
        assert_eq!(info.charts[0].id, "Test Chart");
        assert_eq!(info.charts[0].name, "Test Chart");
    }

    #[test]
    fn update_chart_rewrites_existing_chart_and_preserves_target_id() {
        let temp = TestWorkspaceDir::new("chart-update");
        let workspace_path = temp.path.join("project");
        let workspace_path_str = workspace_path.to_string_lossy().into_owned();

        tauri::async_runtime::block_on(create_workspace(
            workspace_path_str.clone(),
            "Tester".to_string(),
        ))
        .expect("workspace should be created");
        tauri::async_runtime::block_on(create_chart(
            workspace_path_str.clone(),
            sample_chart_payload("Original Chart"),
        ))
        .expect("chart should be created");

        let mut updated_chart = sample_chart_payload("Different Incoming Id");
        updated_chart["subject"]["name"] = serde_json::json!("Updated Name");
        updated_chart["subject"]["location"]["name"] = serde_json::json!("Brno, CZ");

        let updated_id = tauri::async_runtime::block_on(update_chart(
            workspace_path_str.clone(),
            "Original Chart".to_string(),
            updated_chart,
        ))
        .expect("chart should be updated");

        assert_eq!(updated_id, "Original Chart");

        let details = tauri::async_runtime::block_on(get_chart_details(
            workspace_path_str,
            "Original Chart".to_string(),
        ))
        .expect("updated chart details should load");

        assert_eq!(details.get("id"), Some(&serde_json::json!("Original Chart")));
        assert_eq!(
            details.pointer("/subject/name"),
            Some(&serde_json::json!("Updated Name"))
        );
        assert_eq!(
            details.pointer("/subject/location/name"),
            Some(&serde_json::json!("Brno, CZ"))
        );
    }

    #[test]
    fn import_chart_adds_external_yaml_chart_to_workspace() {
        let temp = TestWorkspaceDir::new("chart-import");
        let workspace_path = temp.path.join("project");
        let workspace_path_str = workspace_path.to_string_lossy().into_owned();

        tauri::async_runtime::block_on(create_workspace(
            workspace_path_str.clone(),
            "Tester".to_string(),
        ))
        .expect("workspace should be created");

        let imported_id = tauri::async_runtime::block_on(import_chart(
            workspace_path_str.clone(),
            sample_chart_source_path(),
        ))
        .expect("yaml chart should import");

        assert_eq!(imported_id, "Base Chart");
        assert!(workspace_path.join("charts/Base_Chart.yml").is_file());

        let info = tauri::async_runtime::block_on(load_workspace(workspace_path_str))
            .expect("workspace should load after import");
        assert_eq!(info.charts.len(), 1);
        assert_eq!(info.charts[0].id, "Base Chart");
    }

    #[test]
    fn import_chart_rejects_duplicate_chart_ids() {
        let temp = TestWorkspaceDir::new("chart-import-duplicate");
        let workspace_path = temp.path.join("project");
        let workspace_path_str = workspace_path.to_string_lossy().into_owned();

        tauri::async_runtime::block_on(create_workspace(
            workspace_path_str.clone(),
            "Tester".to_string(),
        ))
        .expect("workspace should be created");

        tauri::async_runtime::block_on(import_chart(
            workspace_path_str.clone(),
            sample_chart_source_path(),
        ))
        .expect("first import should succeed");

        let err = tauri::async_runtime::block_on(import_chart(
            workspace_path_str,
            sample_chart_source_path(),
        ))
        .expect_err("duplicate import should fail");

        assert!(err.contains("already exists"));
    }

    #[test]
    fn import_chart_rejects_unsupported_sfs_until_backend_path_exists() {
        let temp = TestWorkspaceDir::new("chart-import-sfs");
        let workspace_path = temp.path.join("project");
        let workspace_path_str = workspace_path.to_string_lossy().into_owned();
        let source_path = temp.path.join("sample.sfs");
        fs::write(&source_path, "_settings.Model.DefaultHouseSystem = \"Placidus\";\n")
            .expect("temporary sfs file should be writable");

        tauri::async_runtime::block_on(create_workspace(
            workspace_path_str.clone(),
            "Tester".to_string(),
        ))
        .expect("workspace should be created");

        let err = tauri::async_runtime::block_on(import_chart(
            workspace_path_str,
            source_path.to_string_lossy().into_owned(),
        ))
        .expect_err("sfs import should remain staged");

        assert!(err.contains("StarFisher/SFS import is not implemented in Rust yet"));
    }

    #[test]
    fn select_nominatim_result_returns_first_candidate() {
        let candidates = vec![NominatimSearchResult {
            display_name: "Prague, Czechia".to_string(),
            lat: "50.0875".to_string(),
            lon: "14.4214".to_string(),
        }];

        let result = select_nominatim_result("Prague", &candidates)
            .expect("candidate should resolve");

        assert_eq!(result.display_name, "Prague, Czechia");
        assert_eq!(result.latitude, 50.0875);
        assert_eq!(result.longitude, 14.4214);
    }

    #[test]
    fn select_nominatim_result_rejects_empty_candidate_list() {
        let err = select_nominatim_result("Unknown", &[])
            .expect_err("empty result list should fail");
        assert!(err.contains("No location results found"));
    }
}

fn write_workspace_manifest(
    base: &Path,
    manifest: &crate::workspace::models::WorkspaceManifest,
) -> Result<(), String> {
    use std::fs;

    let manifest_yaml = serde_yaml::to_string(manifest)
        .map_err(|e| format!("Manifest YAML serialization failed: {}", e))?;
    let manifest_path = base.join("workspace.yaml");
    fs::write(&manifest_path, manifest_yaml)
        .map_err(|e| format!("Write workspace.yaml failed: {}", e))
}

fn extract_chart_id(chart: &serde_json::Value) -> Result<&str, String> {
    chart
        .get("id")
        .and_then(|v| v.as_str())
        .filter(|v| !v.trim().is_empty())
        .ok_or_else(|| "Chart id is required".to_string())
}

fn read_importable_chart_yaml(path: &Path) -> Result<crate::workspace::models::ChartInstance, String> {
    use std::fs;

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read import file {}: {}", path.display(), e))?;
    serde_yaml::from_str(&content)
        .map_err(|e| format!("Failed to parse chart YAML {}: {}", path.display(), e))
}

fn select_nominatim_result(
    query: &str,
    candidates: &[NominatimSearchResult],
) -> Result<GeocodedLocation, String> {
    let best = candidates
        .first()
        .ok_or_else(|| format!("No location results found for '{query}'"))?;

    let latitude = best
        .lat
        .parse::<f64>()
        .map_err(|err| format!("Invalid latitude returned by geocoder: {err}"))?;
    let longitude = best
        .lon
        .parse::<f64>()
        .map_err(|err| format!("Invalid longitude returned by geocoder: {err}"))?;

    Ok(GeocodedLocation {
        query: query.to_string(),
        display_name: best.display_name.clone(),
        latitude,
        longitude,
    })
}

fn upsert_chart_id(chart: &mut serde_json::Value, chart_id: &str) -> Result<(), String> {
    let obj = chart
        .as_object_mut()
        .ok_or_else(|| "Chart payload must be a JSON object".to_string())?;
    obj.insert("id".to_string(), serde_json::json!(chart_id));
    Ok(())
}

fn sanitize_chart_filename(chart_id: &str) -> String {
    let safe: String = chart_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if safe.is_empty() {
        "chart".to_string()
    } else {
        safe
    }
}

fn chart_relative_path(chart_id: &str) -> String {
    format!("charts/{}.yml", sanitize_chart_filename(chart_id))
}

fn write_chart_yaml(
    base: &Path,
    relative_path: &str,
    chart: &serde_json::Value,
) -> Result<(), String> {
    use std::fs;

    let full_path = base.join(relative_path);
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create chart directory: {}", e))?;
    }

    let chart_yaml = serde_yaml::to_string(chart)
        .map_err(|e| format!("Chart YAML serialization failed: {}", e))?;
    fs::write(&full_path, chart_yaml)
        .map_err(|e| format!("Write chart file {} failed: {}", full_path.display(), e))
}

fn find_chart_ref_by_id(
    base: &Path,
    manifest: &crate::workspace::models::WorkspaceManifest,
    chart_id: &str,
) -> Result<Option<String>, String> {
    for chart_ref in &manifest.charts {
        match load_chart(base, chart_ref) {
            Ok(chart) if chart.id == chart_id => return Ok(Some(chart_ref.clone())),
            Ok(_) => {}
            Err(err) => {
                eprintln!(
                    "Warning: Failed to load chart {} while searching id {}: {}",
                    chart_ref, chart_id, err
                );
            }
        }
    }
    Ok(None)
}
