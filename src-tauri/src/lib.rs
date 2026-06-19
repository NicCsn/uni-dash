use tauri::Manager;

#[tauri::command]
fn set_app_icon(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let img = image::open(&path).map_err(|e| e.to_string())?.into_rgba8();
    let (width, height) = img.dimensions();
    let rgba = img.into_raw();
    let icon = tauri::image::Image::new(&rgba, width, height);
    app.get_webview_window("main")
        .ok_or("main window not found".to_string())?
        .set_icon(icon)
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn autostart_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        Some(vec!["--autostart"]),
    )
}

#[cfg(target_os = "linux")]
fn autostart_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_autostart::Builder::new()
        .args(vec!["--autostart".to_string()])
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(autostart_plugin())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![set_app_icon])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
