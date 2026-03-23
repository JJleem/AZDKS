use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

fn system_time_to_iso(t: SystemTime) -> Option<String> {
    let secs = t.duration_since(UNIX_EPOCH).ok()?.as_secs();
    Some(format_unix_timestamp(secs))
}

fn format_unix_timestamp(secs: u64) -> String {
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let mins = (time_secs % 3600) / 60;
    let secs_rem = time_secs % 60;
    let (year, month, day) = days_to_ymd(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, mins, secs_rem
    )
}

fn days_to_ymd(days: u64) -> (u64, u64, u64) {
    let mut d = days;
    let mut year = 1970u64;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if d < days_in_year {
            break;
        }
        d -= days_in_year;
        year += 1;
    }
    let leap = is_leap(year);
    let month_days: [u64; 12] = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 0u64;
    for (i, &md) in month_days.iter().enumerate() {
        if d < md {
            month = i as u64 + 1;
            break;
        }
        d -= md;
    }
    (year, month, d + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub path: String,
    pub is_dir: bool,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
}

#[tauri::command]
async fn move_file(src: String, dest: String) -> Result<(), String> {
    let src = expand_tilde(&src);
    let dest = expand_tilde(&dest);
    let src_path = Path::new(&src);
    let dest_path = Path::new(&dest);

    if !src_path.exists() {
        return Err(format!("Source file does not exist: {}", src));
    }

    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // If dest already exists, add a suffix to avoid overwriting
    let final_dest = if dest_path.exists() {
        let stem = dest_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = dest_path.extension().and_then(|s| s.to_str()).unwrap_or("");
        let parent = dest_path.parent().unwrap_or(Path::new("."));
        let new_name = if ext.is_empty() {
            format!("{}_{}", stem, chrono_timestamp())
        } else {
            format!("{}_{}.{}", stem, chrono_timestamp(), ext)
        };
        parent.join(new_name)
    } else {
        dest_path.to_path_buf()
    };

    fs::rename(&src_path, &final_dest)
        .map_err(|e| format!("Failed to move file: {}", e))?;

    Ok(())
}

fn chrono_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    ts.to_string()
}

#[tauri::command]
async fn read_file_metadata(path: String) -> Result<FileMetadata, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let meta = fs::metadata(p).map_err(|e| format!("Failed to read metadata: {}", e))?;

    let name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let extension = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    Ok(FileMetadata {
        name,
        extension,
        size: meta.len(),
        path: path.clone(),
        is_dir: meta.is_dir(),
        created_at: meta.created().ok().and_then(system_time_to_iso),
        modified_at: meta.modified().ok().and_then(system_time_to_iso),
    })
}

#[tauri::command]
async fn read_dir_files(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Ok(vec![path]);
    }

    let mut files = Vec::new();
    collect_files(p, &mut files).map_err(|e| format!("Failed to read directory: {}", e))?;
    Ok(files)
}

fn collect_files(dir: &Path, files: &mut Vec<String>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_files(&path, files)?;
        } else {
            if let Some(s) = path.to_str() {
                files.push(s.to_string());
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn save_rules(app: tauri::AppHandle, rules: Value) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app)?;
    let rules_path = data_dir.join("rules.json");
    let content = serde_json::to_string_pretty(&rules)
        .map_err(|e| format!("Failed to serialize rules: {}", e))?;
    fs::write(&rules_path, content).map_err(|e| format!("Failed to write rules: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn load_rules(app: tauri::AppHandle) -> Result<Value, String> {
    let data_dir = get_app_data_dir(&app)?;
    let rules_path = data_dir.join("rules.json");

    if !rules_path.exists() {
        return Ok(serde_json::json!({
            "version": 1,
            "rules": [],
            "defaultFolders": {
                "홈":    "~/AZDKS",
                "이미지": "~/AZDKS/이미지",
                "문서":   "~/AZDKS/문서",
                "코드":   "~/AZDKS/코드",
                "영상":   "~/AZDKS/영상",
                "음악":   "~/AZDKS/음악",
                "압축":   "~/AZDKS/압축",
                "폰트":   "~/AZDKS/폰트",
                "미분류": "~/AZDKS/미분류"
            }
        }));
    }

    let content = fs::read_to_string(&rules_path)
        .map_err(|e| format!("Failed to read rules: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse rules: {}", e))
}

#[tauri::command]
async fn save_history(app: tauri::AppHandle, history: Value) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app)?;
    let history_path = data_dir.join("history.json");
    let content = serde_json::to_string_pretty(&history)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    fs::write(&history_path, content).map_err(|e| format!("Failed to write history: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn load_history(app: tauri::AppHandle) -> Result<Value, String> {
    let data_dir = get_app_data_dir(&app)?;
    let history_path = data_dir.join("history.json");

    if !history_path.exists() {
        return Ok(serde_json::json!([]));
    }

    let content = fs::read_to_string(&history_path)
        .map_err(|e| format!("Failed to read history: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse history: {}", e))
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    let expanded = expand_tilde(&path);
    let p = Path::new(&expanded);
    if !p.exists() {
        fs::create_dir_all(p).map_err(|e| format!("Failed to create folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        // -R: 부모 폴더에서 해당 항목을 하이라이트해서 보여줌
        // → 상위 폴더 맥락이 바로 보임
        std::process::Command::new("open")
            .arg("-R")
            .arg(&expanded)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        // /select: 해당 항목을 선택해서 탐색기 열기
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&expanded)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&expanded)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn expand_path(path: String) -> Result<String, String> {
    Ok(expand_tilde(&path))
}

fn expand_tilde(path: &str) -> String {
    if path.starts_with("~/") {
        if let Some(home) = dirs_next::home_dir() {
            return format!("{}{}", home.display(), &path[1..]);
        }
    }
    path.to_string()
}

fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(data_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            move_file,
            read_file_metadata,
            read_dir_files,
            save_rules,
            load_rules,
            save_history,
            load_history,
            open_folder,
            expand_path,
        ])
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        image::Image,
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        Manager,
    };

    let show = MenuItem::with_id(app, "show", "AZDKS 열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
        Image::from_bytes(include_bytes!("../icons/32x32.png")).expect("icon load failed")
    });

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("AZDKS — 알잘딱깔쏀")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
