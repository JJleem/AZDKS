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

#[tauri::command]
fn check_file_exists(path: String) -> bool {
    let p = expand_tilde(&path);
    std::path::Path::new(&p).exists()
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

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct FileAnalysis {
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub path: String,
    pub is_dir: bool,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    // 이미지
    pub image_width: Option<u64>,
    pub image_height: Option<u64>,
    // 카메라/촬영
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub has_gps: bool,
    // 문서
    pub doc_title: Option<String>,
    pub doc_author: Option<String>,
    pub doc_creator: Option<String>,
    // 스크린샷
    pub is_screen_capture: bool,
    pub screen_capture_type: Option<String>,
    // 콘텐츠 타입
    pub content_type: Option<String>,
    // 음악
    pub duration_seconds: Option<f64>,
    pub audio_bit_rate: Option<u64>,
    pub musical_genre: Option<String>,
    pub album: Option<String>,
    pub artist: Option<String>,
    // 문서
    pub number_of_pages: Option<i64>,
    pub languages: Vec<String>,
    // 영상
    pub video_frame_rate: Option<f64>,
    // 이미지
    pub color_space: Option<String>,
    // 다운로드 출처 URL
    pub where_froms: Vec<String>,
    // 파일 크기 (Spotlight)
    pub file_size: Option<i64>,
    // 오디오 비트레이트 (f64 for precision)
    pub audio_bitrate: Option<f64>,
    // 영상 프레임레이트
    pub video_framerate: Option<f64>,
    // 페이지 수
    pub page_count: Option<i64>,
}

#[tauri::command]
async fn analyze_file(path: String) -> Result<FileAnalysis, String> {
    let expanded = expand_tilde(&path);
    let p = Path::new(&expanded);

    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }

    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
    let extension = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

    let mut analysis = FileAnalysis {
        name,
        extension,
        size: meta.len(),
        path: expanded.clone(),
        is_dir: meta.is_dir(),
        created_at: meta.created().ok().and_then(system_time_to_iso),
        modified_at: meta.modified().ok().and_then(system_time_to_iso),
        ..Default::default()
    };

    #[cfg(target_os = "macos")]
    enrich_with_spotlight(&mut analysis, &expanded);

    Ok(analysis)
}

/// Parse mdls array format:
/// kMDItemXxx = (
///     "value1",
///     "value2"
/// )
/// Returns Vec<String> with the unquoted values.
fn parse_mdls_string_array(raw: &str) -> Vec<String> {
    let mut results = Vec::new();
    // The raw value may be a single-line or multi-line parenthesised list.
    // We extract all double-quoted substrings from within the parentheses.
    let inner = raw.trim();
    // Walk through looking for quoted strings
    let mut chars = inner.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '"' {
            let mut s = String::new();
            let mut escaped = false;
            for nc in chars.by_ref() {
                if escaped {
                    s.push(nc);
                    escaped = false;
                } else if nc == '\\' {
                    escaped = true;
                } else if nc == '"' {
                    break;
                } else {
                    s.push(nc);
                }
            }
            if !s.is_empty() {
                results.push(s);
            }
        }
    }
    results
}

#[cfg(target_os = "macos")]
fn enrich_with_spotlight(analysis: &mut FileAnalysis, path: &str) {
    let output = std::process::Command::new("mdls")
        .args(&[
            "-name", "kMDItemPixelWidth",
            "-name", "kMDItemPixelHeight",
            "-name", "kMDItemAcquisitionMake",
            "-name", "kMDItemAcquisitionModel",
            "-name", "kMDItemCreator",
            "-name", "kMDItemAuthors",
            "-name", "kMDItemTitle",
            "-name", "kMDItemIsScreenCapture",
            "-name", "kMDItemScreenCaptureType",
            "-name", "kMDItemLatitude",
            "-name", "kMDItemContentType",
            "-name", "kMDItemDurationSeconds",
            "-name", "kMDItemNumberOfPages",
            "-name", "kMDItemLanguages",
            "-name", "kMDItemAudioBitRate",
            "-name", "kMDItemVideoFrameRate",
            "-name", "kMDItemColorSpace",
            "-name", "kMDItemFSSize",
            "-name", "kMDItemAlbum",
            "-name", "kMDItemMusicalGenre",
            "-name", "kMDItemArtist",
            "-name", "kMDItemWhereFroms",
            path,
        ])
        .output();

    let output = match output {
        Ok(o) if o.status.success() => o,
        _ => return,
    };

    let text = match std::str::from_utf8(&output.stdout) {
        Ok(t) => t,
        Err(_) => return,
    };

    // mdls can output multi-line values for array types.
    // We accumulate lines so that array values spanning multiple lines are handled.
    // Strategy: collect the full text and split on known key patterns.
    // Simple approach: build a map of key -> raw_value by scanning line by line,
    // and when we detect an opening "(" without a closing ")", collect continuation lines.

    let mut key_values: Vec<(String, String)> = Vec::new();
    let mut current_key: Option<String> = None;
    let mut current_val: String = String::new();

    for line in text.lines() {
        if let Some(ref key) = current_key.clone() {
            // Check if this line closes the parenthesis
            current_val.push('\n');
            current_val.push_str(line);
            if line.trim() == ")" || line.contains(')') {
                key_values.push((key.clone(), current_val.clone()));
                current_key = None;
                current_val = String::new();
            }
        } else {
            let parts: Vec<&str> = line.splitn(2, " = ").collect();
            if parts.len() != 2 { continue; }
            let key = parts[0].trim().to_string();
            let val = parts[1].trim().to_string();
            if val == "(null)" { continue; }
            // Check if this is the start of a multi-line array
            let trimmed_val = val.trim_end();
            if trimmed_val == "(" || (trimmed_val.starts_with('(') && !trimmed_val.contains(')')) {
                current_key = Some(key);
                current_val = val.clone();
            } else {
                key_values.push((key, val));
            }
        }
    }
    // If a multi-line value was never closed, flush it anyway
    if let Some(key) = current_key {
        key_values.push((key, current_val));
    }

    for (key, val) in key_values {
        let val = val.trim();
        match key.as_str() {
            "kMDItemPixelWidth"       => { analysis.image_width  = val.parse().ok(); }
            "kMDItemPixelHeight"      => { analysis.image_height = val.parse().ok(); }
            "kMDItemAcquisitionMake"  => { analysis.camera_make  = Some(val.trim_matches('"').to_string()); }
            "kMDItemAcquisitionModel" => { analysis.camera_model = Some(val.trim_matches('"').to_string()); }
            "kMDItemCreator"          => { analysis.doc_creator  = Some(val.trim_matches('"').to_string()); }
            "kMDItemTitle"            => { analysis.doc_title    = Some(val.trim_matches('"').to_string()); }
            "kMDItemIsScreenCapture"  => { analysis.is_screen_capture = val.trim() == "1"; }
            "kMDItemScreenCaptureType"=> { analysis.screen_capture_type = Some(val.trim_matches('"').to_string()); }
            "kMDItemLatitude"         => { analysis.has_gps = true; }
            "kMDItemContentType"      => { analysis.content_type = Some(val.trim_matches('"').to_string()); }
            "kMDItemAuthors"          => {
                let parsed = parse_mdls_string_array(val);
                if let Some(first) = parsed.into_iter().next() {
                    analysis.doc_author = Some(first);
                }
            }
            "kMDItemDurationSeconds"  => {
                analysis.duration_seconds = val.parse().ok();
            }
            "kMDItemNumberOfPages"    => {
                let v: Option<i64> = val.parse().ok();
                analysis.number_of_pages = v;
                analysis.page_count = v;
            }
            "kMDItemAudioBitRate"     => {
                let v: Option<f64> = val.parse().ok();
                analysis.audio_bit_rate = v.map(|f| f as u64);
                analysis.audio_bitrate = v;
            }
            "kMDItemVideoFrameRate"   => {
                let v: Option<f64> = val.parse().ok();
                analysis.video_frame_rate = v;
                analysis.video_framerate = v;
            }
            "kMDItemColorSpace"       => { analysis.color_space = Some(val.trim_matches('"').to_string()); }
            "kMDItemAlbum"            => { analysis.album = Some(val.trim_matches('"').to_string()); }
            "kMDItemMusicalGenre"     => { analysis.musical_genre = Some(val.trim_matches('"').to_string()); }
            "kMDItemArtist"           => { analysis.artist = Some(val.trim_matches('"').to_string()); }
            "kMDItemFSSize"           => { analysis.file_size = val.parse().ok(); }
            "kMDItemLanguages"        => {
                analysis.languages = parse_mdls_string_array(val);
            }
            "kMDItemWhereFroms"       => {
                analysis.where_froms = parse_mdls_string_array(val);
            }
            _ => {}
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub ext: String,
    pub size: u64,
    pub children: Vec<TreeNode>,
}

#[tauri::command]
async fn read_tree(path: String, depth: u32) -> Result<TreeNode, String> {
    let expanded = expand_tilde(&path);
    let p = Path::new(&expanded);

    if !p.exists() {
        return Ok(TreeNode {
            name: p.file_name().and_then(|n| n.to_str()).unwrap_or("AZDKS").to_string(),
            path: expanded,
            is_dir: true,
            ext: String::new(),
            size: 0,
            children: vec![],
        });
    }

    build_tree(p, depth)
}

fn build_tree(p: &Path, depth: u32) -> Result<TreeNode, String> {
    let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
    let path_str = p.to_str().unwrap_or("").to_string();
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    let is_dir = meta.is_dir();
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

    let mut children = vec![];
    if is_dir && depth > 0 {
        if let Ok(entries) = fs::read_dir(p) {
            let mut dirs: Vec<_> = vec![];
            let mut files: Vec<_> = vec![];
            for entry in entries.flatten() {
                let ep = entry.path();
                if ep.file_name().and_then(|n| n.to_str()).map(|s| s.starts_with('.')).unwrap_or(false) {
                    continue;
                }
                if ep.is_dir() { dirs.push(ep); } else { files.push(ep); }
            }
            dirs.sort();
            files.sort();
            for d in dirs {
                if let Ok(node) = build_tree(&d, depth - 1) {
                    children.push(node);
                }
            }
            for f in files {
                if let Ok(node) = build_tree(&f, 0) {
                    children.push(node);
                }
            }
        }
    }

    Ok(TreeNode {
        name,
        path: path_str,
        is_dir,
        ext,
        size: if is_dir { 0 } else { meta.len() },
        children,
    })
}

#[tauri::command]
async fn search_files(root: String, query: String) -> Result<Vec<TreeNode>, String> {
    let expanded = expand_tilde(&root);
    let p = Path::new(&expanded);
    if !p.exists() {
        return Ok(vec![]);
    }
    let query_lower = query.to_lowercase();
    let mut results = vec![];
    search_recursive(p, &query_lower, &mut results);
    results.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(results)
}

fn search_recursive(dir: &Path, query: &str, results: &mut Vec<TreeNode>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let ep = entry.path();
        let name = ep.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if name.starts_with('.') { continue; }
        if ep.is_dir() {
            search_recursive(&ep, query, results);
        } else {
            if name.to_lowercase().contains(query) {
                let meta = fs::metadata(&ep).ok();
                let ext = ep.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                results.push(TreeNode {
                    name: name.clone(),
                    path: ep.to_str().unwrap_or("").to_string(),
                    is_dir: false,
                    ext,
                    size: meta.map(|m| m.len()).unwrap_or(0),
                    children: vec![],
                });
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            analyze_file,
            read_tree,
            search_files,
            check_file_exists,
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
        .tooltip("AZDKS — 알잘딱깔센")
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
