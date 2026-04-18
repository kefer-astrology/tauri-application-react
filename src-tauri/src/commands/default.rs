use std::fs;

#[tauri::command]
pub fn read(path: String) -> Result<String, String> {
    let data = fs::read(path).map_err(|err| err.to_string())?;
    let string = String::from_utf8(data).map_err(|err| err.to_string())?;
    Ok(string)
}

#[tauri::command]
pub fn write(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|err| err.to_string())?;
    Ok(())
}
