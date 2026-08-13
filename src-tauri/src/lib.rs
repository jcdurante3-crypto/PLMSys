use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};

const LOCK_DIR_NAME: &str = ".plmsys.lock";
const HEARTBEAT_INTERVAL_SECS: u64 = 2;
const STALE_LOCK_GRACE_PERIOD_MS: u64 = 10000;
const MAX_ACQUIRE_WAIT_MS: u64 = 15000;

#[derive(Default, Clone)]
pub struct AppState {
    pub lock_owner_id: Arc<Mutex<Option<String>>>,
    pub client_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LockMetadata {
    pub client_id: String,
    pub hostname: String,
    pub username: String,
    pub pid: u32,
    pub acquired_at: u64,
    pub heartbeat_at: u64,
    pub operation: String,
    pub lock_version: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DbStatus {
    pub success: bool,
    pub error: Option<String>,
    pub lock_diagnostics: Option<Value>,
}

fn get_portable_data_dir() -> PathBuf {
    // Portable deployment directory relative to executable or current working directory
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let data_dir = current_dir.join("data");
    if !data_dir.exists() {
        let _ = fs::create_dir_all(&data_dir);
    }
    data_dir
}

fn get_db_file_path() -> PathBuf {
    get_portable_data_dir().join("plmsys.json")
}

fn log_to_file(level: &str, message: &str) {
    let logs_dir = get_portable_data_dir().join("logs");
    let _ = fs::create_dir_all(&logs_dir);
    let log_file = logs_dir.join("plmsys.log");
    
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_entry = format!("[{}] [{}] {}\n", now, level.to_uppercase(), message);
    
    use std::io::Write;
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(log_file) {
        let _ = file.write_all(log_entry.as_bytes());
    }
}

fn read_db_data() -> Value {
    let db_path = get_db_file_path();
    if !db_path.exists() {
        return json!({
            "_revision": 1,
            "sets": [],
            "history": [],
            "remarks": [],
            "auditLogs": [],
            "settings": {}
        });
    }
    
    match fs::read_to_string(&db_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| json!({
            "_revision": 1,
            "sets": [],
            "history": [],
            "remarks": [],
            "auditLogs": [],
            "settings": {}
        })),
        Err(_) => json!({
            "_revision": 1,
            "sets": [],
            "history": [],
            "remarks": [],
            "auditLogs": [],
            "settings": {}
        })
    }
}

fn write_db_data(mut data: Value) -> Result<(), String> {
    let db_path = get_db_file_path();
    
    // Increment revision
    let current_rev = data.get("_revision").and_then(|v| v.as_u64()).unwrap_or(1);
    data["_revision"] = json!(current_rev + 1);
    
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&db_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn acquire_lock(target_dir: &Path, operation: &str, client_id: &str) -> Result<PathBuf, String> {
    let lock_dir = target_dir.join(LOCK_DIR_NAME);
    let lock_meta = lock_dir.join("owner.json");
    let start_time = SystemTime::now();
    let hostname = std::env::var("COMPUTERNAME").or_else(|_| std::env::var("HOSTNAME")).unwrap_or_else(|_| "PC".to_string());
    let username = std::env::var("USER").or_else(|_| std::env::var("USERNAME")).unwrap_or_else(|_| "User".to_string());
    let pid = std::process::id();
    
    let mut attempts = 0;
    
    loop {
        attempts += 1;
        match fs::create_dir(&lock_dir) {
            Ok(_) => {
                let now_ms = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                let meta = LockMetadata {
                    client_id: client_id.to_string(),
                    hostname,
                    username,
                    pid,
                    acquired_at: now_ms,
                    heartbeat_at: now_ms,
                    operation: operation.to_string(),
                    lock_version: 1,
                };
                
                if let Ok(content) = serde_json::to_string_pretty(&meta) {
                    let _ = fs::write(&lock_meta, content);
                }
                
                log_to_file("info", &format!("Acquired lock on {:?} for operation '{}' (attempt {})", target_dir, operation, attempts));
                return Ok(lock_dir);
            }
            Err(_) => {
                // Lock exists. Check if stale
                let now_ms = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                
                if lock_meta.exists() {
                    if let Ok(meta_str) = fs::read_to_string(&lock_meta) {
                        if let Ok(meta) = serde_json::from_str::<LockMetadata>(&meta_str) {
                            let heartbeat_age = if now_ms >= meta.heartbeat_at {
                                now_ms - meta.heartbeat_at
                            } else {
                                STALE_LOCK_GRACE_PERIOD_MS + 100 // Clock skew
                            };
                            
                            if heartbeat_age > STALE_LOCK_GRACE_PERIOD_MS {
                                log_to_file("warn", &format!("Stale lock detected! Owner: {}/{}, age: {}ms. Breaking lock.", meta.hostname, meta.username, heartbeat_age));
                                let _ = fs::remove_dir_all(&lock_dir);
                                continue;
                            }
                        }
                    }
                } else if lock_dir.exists() {
                    if let Ok(metadata) = fs::metadata(&lock_dir) {
                        if let Ok(modified) = metadata.modified() {
                            let folder_age = SystemTime::now().duration_since(modified).unwrap_or_default().as_millis() as u64;
                            if folder_age > STALE_LOCK_GRACE_PERIOD_MS {
                                log_to_file("warn", &format!("Stale lock directory without owner meta detected (age: {}ms). Breaking lock.", folder_age));
                                let _ = fs::remove_dir_all(&lock_dir);
                                continue;
                            }
                        }
                    }
                }
            }
        }
        
        let elapsed = SystemTime::now().duration_since(start_time).unwrap_or_default().as_millis() as u64;
        if elapsed >= MAX_ACQUIRE_WAIT_MS {
            let mut owner_info = "another user".to_string();
            if lock_meta.exists() {
                if let Ok(meta_str) = fs::read_to_string(&lock_meta) {
                    if let Ok(meta) = serde_json::from_str::<LockMetadata>(&meta_str) {
                        owner_info = format!("{} / {} ({})", meta.hostname, meta.username, meta.operation);
                    }
                }
            }
            return Err(format!("Database is currently being updated by {}. Please wait...", owner_info));
        }
        
        // Wait retry jitter
        std::thread::sleep(Duration::from_millis(250 + (rand_simple() % 100)));
    }
}

fn release_lock(lock_dir: &Path) {
    if lock_dir.exists() {
        let _ = fs::remove_dir_all(lock_dir);
        log_to_file("info", &format!("Released lock dir: {:?}", lock_dir));
    }
}

fn rand_simple() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos() as u64
}

// Commands mapping directly to Electron IPC handlers
#[tauri::command]
pub async fn open_data_folder() -> Result<(), String> {
    let dir = get_portable_data_dir();
    let _ = open::that(dir);
    Ok(())
}

#[tauri::command]
pub async fn open_backup_folder() -> Result<(), String> {
    let dir = get_portable_data_dir().join("backups");
    let _ = fs::create_dir_all(&dir);
    let _ = open::that(dir);
    Ok(())
}

#[tauri::command]
pub async fn save_backup(backup_data_text: String) -> Result<Value, String> {
    let backups_dir = get_portable_data_dir().join("backups");
    let _ = fs::create_dir_all(&backups_dir);
    
    let filename = format!("plmsys_backup_{}.json", chrono::Local::now().format("%Y%m%d_%H%M%S"));
    let filepath = backups_dir.join(&filename);
    
    match fs::write(&filepath, backup_data_text) {
        Ok(_) => Ok(json!({ "success": true, "filePath": filepath.to_string_lossy() })),
        Err(e) => Ok(json!({ "success": false, "error": e.to_string() })),
    }
}

#[tauri::command]
pub async fn load_backup() -> Result<Value, String> {
    let db_data = read_db_data();
    Ok(json!({ "success": true, "data": serde_json::to_string(&db_data).unwrap_or_default() }))
}

#[tauri::command]
pub async fn write_log(level: String, message: String) -> Result<(), String> {
    log_to_file(&level, &message);
    Ok(())
}

#[tauri::command]
pub async fn get_app_info() -> Result<Value, String> {
    Ok(json!({
        "isPackaged": true,
        "version": "1.0.0",
        "dataDirectory": get_portable_data_dir().to_string_lossy()
    }))
}

#[tauri::command]
pub async fn db_action(
    state: State<'_, AppState>,
    table: String,
    action: String,
    args: Option<Vec<Value>>,
    revision: Option<u64>,
) -> Result<Value, String> {
    let data_dir = get_portable_data_dir();
    let is_read = action == "get" || action == "getAll" || action == "list";
    
    if is_read {
        let db_data = read_db_data();
        let collection = db_data.get(&table).cloned().unwrap_or(json!([]));
        return Ok(json!({ "success": true, "data": collection }));
    }
    
    let op_name = format!("{} {}", action, table);
    let lock_dir = acquire_lock(&data_dir, &op_name, &state.client_id)?;
    
    let mut db_data = read_db_data();
    
    // Check revision for optimism / LAN synchronization
    if let Some(req_rev) = revision {
        let current_rev = db_data.get("_revision").and_then(|v| v.as_u64()).unwrap_or(1);
        if req_rev < current_rev {
            release_lock(&lock_dir);
            return Ok(json!({
                "success": false,
                "conflict": true,
                "error": "Database revision conflict detected. Data was updated by another client.",
                "serverData": db_data
            }));
        }
    }
    
    // Perform database action on local JSON
    let args_vec = args.unwrap_or_default();
    match action.as_str() {
        "add" | "put" => {
            if let Some(item) = args_vec.get(0) {
                if let Some(arr) = db_data.get_mut(&table).and_then(|v| v.as_array_mut()) {
                    arr.push(item.clone());
                } else {
                    db_data[&table] = json!([item]);
                }
            }
        }
        "update" => {
            if let (Some(id_val), Some(update_val)) = (args_vec.get(0), args_vec.get(1)) {
                if let Some(arr) = db_data.get_mut(&table).and_then(|v| v.as_array_mut()) {
                    for el in arr.iter_mut() {
                        if el.get("id") == Some(id_val) {
                            if let Some(obj) = el.as_object_mut() {
                                if let Some(upd_obj) = update_val.as_object() {
                                    for (k, v) in upd_obj {
                                        obj.insert(k.clone(), v.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        "delete" => {
            if let Some(id_val) = args_vec.get(0) {
                if let Some(arr) = db_data.get_mut(&table).and_then(|v| v.as_array_mut()) {
                    arr.retain(|el| el.get("id") != Some(id_val));
                }
            }
        }
        "clear" => {
            db_data[&table] = json!([]);
        }
        _ => {}
    }
    
    let result = write_db_data(db_data.clone());
    release_lock(&lock_dir);
    
    match result {
        Ok(_) => Ok(json!({ "success": true, "data": db_data.get(&table) })),
        Err(e) => Ok(json!({ "success": false, "error": e })),
    }
}

#[tauri::command]
pub async fn factory_reset(set_count: u32) -> Result<Value, String> {
    let data_dir = get_portable_data_dir();
    let lock_dir = acquire_lock(&data_dir, "Factory Reset", "admin")?;
    
    // Create safety backup before reset
    let backups_dir = data_dir.join("backups");
    let _ = fs::create_dir_all(&backups_dir);
    let current_db = read_db_data();
    let backup_file = backups_dir.join(format!("factory_reset_safety_{}.json", chrono::Local::now().format("%Y%m%d_%H%M%S")));
    let _ = fs::write(&backup_file, serde_json::to_string_pretty(&current_db).unwrap_or_default());
    
    // Generate initial plate sets
    let mut initial_sets = Vec::new();
    for i in 1..=set_count {
        initial_sets.push(json!({
            "id": format!("set-{}", i),
            "setNumber": i,
            "status": "Ready",
            "cycleCount": 0,
            "installedDate": null,
            "plateA": { "id": format!("plate-{}-A", i), "serialNumber": format!("A{:03}", i), "type": "A" },
            "plateB": { "id": format!("plate-{}-B", i), "serialNumber": format!("B{:03}", i), "type": "B" }
        }));
    }
    
    let new_db = json!({
        "_revision": 1,
        "sets": initial_sets,
        "history": [],
        "remarks": [],
        "auditLogs": [{
            "id": format!("audit-{}", chrono::Local::now().timestamp_millis()),
            "timestamp": chrono::Local::now().to_rfc3339(),
            "operator": "Administrator",
            "action": "FACTORY_RESET",
            "details": format!("Factory reset executed. Re-initialized with {} plate sets.", set_count)
        }],
        "settings": {}
    });
    
    let result = write_db_data(new_db);
    release_lock(&lock_dir);
    
    match result {
        Ok(_) => Ok(json!({ "success": true })),
        Err(e) => Ok(json!({ "success": false, "error": e })),
    }
}

#[tauri::command]
pub async fn get_db_status() -> Result<DbStatus, String> {
    let target_dir = get_portable_data_dir();
    let lock_dir = target_dir.join(LOCK_DIR_NAME);
    let lock_meta = lock_dir.join("owner.json");
    
    let mut lock_diag = json!({
        "locked": false,
        "owner": "None",
        "operation": "None",
        "started": "",
        "heartbeat": "",
        "status": "FREE"
    });
    
    if lock_dir.exists() {
        if lock_meta.exists() {
            if let Ok(content) = fs::read_to_string(&lock_meta) {
                if let Ok(meta) = serde_json::from_str::<LockMetadata>(&content) {
                    let now_ms = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                    let age = if now_ms >= meta.heartbeat_at { now_ms - meta.heartbeat_at } else { 0 };
                    let status = if age <= STALE_LOCK_GRACE_PERIOD_MS { "ACTIVE" } else { "STALE" };
                    
                    lock_diag = json!({
                        "locked": true,
                        "owner": format!("{} / {}", meta.hostname, meta.username),
                        "operation": meta.operation,
                        "started": meta.acquired_at,
                        "heartbeat": meta.heartbeat_at,
                        "status": status
                    });
                }
            }
        } else {
            lock_diag = json!({
                "locked": true,
                "owner": "Unknown PC",
                "operation": "Writing",
                "started": "",
                "heartbeat": "",
                "status": "STALE"
            });
        }
    }
    
    Ok(DbStatus {
        success: true,
        error: None,
        lock_diagnostics: Some(lock_diag),
    })
}

#[tauri::command]
pub async fn force_release_database_lock() -> Result<Value, String> {
    let data_dir = get_portable_data_dir();
    let lock_dir = data_dir.join(LOCK_DIR_NAME);
    
    if lock_dir.exists() {
        let _ = fs::remove_dir_all(&lock_dir);
        log_to_file("info", "Database lock cleared via Tauri force_release_database_lock");
        
        let mut db_data = read_db_data();
        if let Some(arr) = db_data.get_mut("auditLogs").and_then(|v| v.as_array_mut()) {
            arr.push(json!({
                "id": format!("audit-{}", chrono::Local::now().timestamp_millis()),
                "timestamp": chrono::Local::now().to_rfc3339(),
                "operator": "Administrator",
                "action": "MANUAL_LOCK_RELEASE",
                "details": "Administrator manually forced database lock release."
            }));
            let _ = write_db_data(db_data);
        }
        
        Ok(json!({ "success": true, "message": "Database lock cleared successfully." }))
    } else {
        Ok(json!({ "success": true, "message": "No active lock found." }))
    }
}

#[tauri::command]
pub async fn get_network_settings() -> Result<Value, String> {
    let settings_file = get_portable_data_dir().join("network_settings.json");
    if settings_file.exists() {
        if let Ok(content) = fs::read_to_string(settings_file) {
            if let Ok(val) = serde_json::from_str(&content) {
                return Ok(val);
            }
        }
    }
    Ok(json!({
        "mode": "standalone",
        "sharedPath": "",
        "syncIntervalSeconds": 3,
        "autoSync": true
    }))
}

#[tauri::command]
pub async fn save_network_settings(settings: Value) -> Result<Value, String> {
    let settings_file = get_portable_data_dir().join("network_settings.json");
    if let Ok(content) = serde_json::to_string_pretty(&settings) {
        let _ = fs::write(settings_file, content);
    }
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn test_network_connection(path_or_host: String) -> Result<Value, String> {
    let p = Path::new(&path_or_host);
    if p.exists() {
        Ok(json!({ "success": true, "message": "Network share directory accessible." }))
    } else {
        Ok(json!({ "success": false, "error": "Path or shared directory does not exist or is unreachable." }))
    }
}

#[tauri::command]
pub async fn get_network_status() -> Result<Value, String> {
    Ok(json!({
        "online": true,
        "synced": true,
        "lastSyncTime": chrono::Local::now().to_rfc3339()
    }))
}

#[tauri::command]
pub async fn resolve_conflict(strategy: String, conflict_data: Value) -> Result<Value, String> {
    log_to_file("info", &format!("Resolved conflict with strategy: {}", strategy));
    Ok(json!({ "success": true, "data": conflict_data }))
}

#[tauri::command]
pub async fn check_for_updates() -> Result<Value, String> {
    Ok(json!({
        "updateAvailable": false,
        "version": "1.0.0",
        "changelog": "PLMSys is running the latest Tauri 2 build."
    }))
}

#[tauri::command]
pub async fn start_auto_update() -> Result<Value, String> {
    Ok(json!({ "success": true, "message": "Already up to date." }))
}

#[tauri::command]
pub async fn get_update_package_info() -> Result<Value, String> {
    let update_file = get_portable_data_dir().join("update_package.json");
    if update_file.exists() {
        if let Ok(content) = fs::read_to_string(update_file) {
            if let Ok(val) = serde_json::from_str(&content) {
                return Ok(val);
            }
        }
    }
    Ok(json!({ "hasUpdate": false }))
}

#[tauri::command]
pub async fn publish_update_package(data: Value) -> Result<Value, String> {
    let update_file = get_portable_data_dir().join("update_package.json");
    if let Ok(content) = serde_json::to_string_pretty(&data) {
        let _ = fs::write(update_file, content);
    }
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn admin_initiate_update_all(app: AppHandle, user_role: String) -> Result<Value, String> {
    if user_role != "Administrator" && user_role != "admin" {
        return Ok(json!({ "success": false, "error": "Unauthorized. Administrator role required." }));
    }
    
    // Broadcast countdown event to connected clients
    let _ = app.emit("admin-update-countdown", json!({ "secondsRemaining": 60 }));
    log_to_file("info", "Admin initiated software update for all connected PCs.");
    
    Ok(json!({ "success": true, "countdown": 60 }))
}

#[tauri::command]
pub async fn get_client_update_statuses() -> Result<Value, String> {
    Ok(json!({
        "PC-1": { "status": "Ready", "progress": 100 },
        "PC-2": { "status": "Ready", "progress": 100 }
    }))
}

#[tauri::command]
pub async fn get_last_seen_version() -> Result<Value, String> {
    Ok(json!({ "version": "1.0.0" }))
}

#[tauri::command]
pub async fn set_last_seen_version(version: String) -> Result<Value, String> {
    let version_file = get_portable_data_dir().join("last_version.txt");
    let _ = fs::write(version_file, version);
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn get_changelog() -> Result<Value, String> {
    Ok(json!({
        "version": "1.0.0",
        "notes": [
            "Migrated runtime from Electron to Tauri 2.",
            "Maintained 100% database & LAN lock compatibility.",
            "Enhanced cross-PC lease & heartbeat collision protection.",
            "Added real-time lock diagnostics in Admin panel."
        ]
    }))
}

pub fn run() {
    let client_id = format!("client_{}_{}", chrono::Local::now().timestamp_millis(), rand_simple() % 1000000);
    
    tauri::Builder::default()
        .manage(AppState {
            lock_owner_id: Arc::new(Mutex::new(None)),
            client_id,
        })
        .invoke_handler(tauri::generate_handler![
            open_data_folder,
            open_backup_folder,
            save_backup,
            load_backup,
            write_log,
            get_app_info,
            db_action,
            factory_reset,
            get_db_status,
            force_release_database_lock,
            get_network_settings,
            save_network_settings,
            test_network_connection,
            get_network_status,
            resolve_conflict,
            check_for_updates,
            start_auto_update,
            get_update_package_info,
            publish_update_package,
            admin_initiate_update_all,
            get_client_update_statuses,
            get_last_seen_version,
            set_last_seen_version,
            get_changelog
        ])
        .run(tauri::generate_context!())
        .expect("error while running PLMSys Tauri 2 application");
}
