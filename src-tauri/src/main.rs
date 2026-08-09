// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use rusqlite::{params, Connection, OptionalExtension, Result};
use serde_json::Value;

struct DbState {
    db_path: PathBuf,
    app_dir: PathBuf,
}

fn get_app_dir() -> PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            return parent.to_path_buf();
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn validate_table(table: &str) -> Result<&'static str, String> {
    match table {
        "sets" => Ok("sets"),
        "positions" => Ok("positions"),
        "plates" => Ok("plates"),
        "plateInstallations" => Ok("plateInstallations"),
        "plateRemovals" => Ok("plateRemovals"),
        "dailyProduction" => Ok("dailyProduction"),
        "replacements" => Ok("replacements"),
        "jobOrders" => Ok("jobOrders"),
        "auditLogs" => Ok("auditLogs"),
        "personnel" => Ok("personnel"),
        _ => Err(format!("Invalid table name: {}", table)),
    }
}

fn init_db(db_path: &Path) -> Result<(), String> {
    if let Some(parent) = db_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS sets (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS positions (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS plates (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS plateInstallations (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS plateRemovals (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS dailyProduction (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS replacements (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS jobOrders (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS auditLogs (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS personnel (id TEXT PRIMARY KEY, json TEXT NOT NULL);
        PRAGMA journal_mode=WAL;
        "
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn db_to_array(table: String, state: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let valid_table = validate_table(&table)?;
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    let query = format!("SELECT json FROM {}", valid_table);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        let json_str: String = row.get(0)?;
        Ok(json_str)
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        if let Ok(json_str) = row {
            if let Ok(val) = serde_json::from_str::<Value>(&json_str) {
                result.push(val);
            }
        }
    }
    Ok(result)
}

#[tauri::command]
fn db_put(table: String, item: Value, state: State<'_, DbState>) -> Result<String, String> {
    let valid_table = validate_table(&table)?;
    let id = item.get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Item must have string 'id' field".to_string())?
        .to_string();

    let json_str = serde_json::to_string(&item).map_err(|e| e.to_string())?;
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;

    let sql = format!("INSERT INTO {} (id, json) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET json = excluded.json", valid_table);
    conn.execute(&sql, params![id, json_str]).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
fn db_bulk_put(table: String, items: Vec<Value>, state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let valid_table = validate_table(&table)?;
    let mut conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let sql = format!("INSERT INTO {} (id, json) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET json = excluded.json", valid_table);
    let mut ids = Vec::new();

    {
        let mut stmt = tx.prepare(&sql).map_err(|e| e.to_string())?;
        for item in items {
            let id = item.get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Item must have string 'id' field".to_string())?
                .to_string();
            let json_str = serde_json::to_string(&item).map_err(|e| e.to_string())?;
            stmt.execute(params![id, json_str]).map_err(|e| e.to_string())?;
            ids.push(id);
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(ids)
}

#[tauri::command]
fn db_update(table: String, key: String, changes: Value, state: State<'_, DbState>) -> Result<u32, String> {
    let valid_table = validate_table(&table)?;
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;

    let select_sql = format!("SELECT json FROM {} WHERE id = ?1", valid_table);
    let existing_json: Option<String> = conn.query_row(&select_sql, params![key], |r| r.get(0)).optional().map_err(|e| e.to_string())?;

    if let Some(json_str) = existing_json {
        if let Ok(mut current_val) = serde_json::from_str::<Value>(&json_str) {
            if let (Some(current_obj), Some(changes_obj)) = (current_val.as_object_mut(), changes.as_object()) {
                for (k, v) in changes_obj {
                    current_obj.insert(k.clone(), v.clone());
                }
                let updated_str = serde_json::to_string(&current_val).map_err(|e| e.to_string())?;
                let update_sql = format!("UPDATE {} SET json = ?1 WHERE id = ?2", valid_table);
                conn.execute(&update_sql, params![updated_str, key]).map_err(|e| e.to_string())?;
                return Ok(1);
            }
        }
    }
    Ok(0)
}

#[tauri::command]
fn db_delete(table: String, key: String, state: State<'_, DbState>) -> Result<u32, String> {
    let valid_table = validate_table(&table)?;
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    let sql = format!("DELETE FROM {} WHERE id = ?1", valid_table);
    let count = conn.execute(&sql, params![key]).map_err(|e| e.to_string())?;
    Ok(count as u32)
}

#[tauri::command]
fn db_clear(table: String, state: State<'_, DbState>) -> Result<(), String> {
    let valid_table = validate_table(&table)?;
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    let sql = format!("DELETE FROM {}", valid_table);
    conn.execute(&sql, []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn db_count(table: String, state: State<'_, DbState>) -> Result<u32, String> {
    let valid_table = validate_table(&table)?;
    let conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    let sql = format!("SELECT COUNT(*) FROM {}", valid_table);
    let count: u32 = conn.query_row(&sql, [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
fn db_get_info(state: State<'_, DbState>) -> Result<Value, String> {
    let db_path_str = state.db_path.to_string_lossy().to_string();
    let app_dir_str = state.app_dir.to_string_lossy().to_string();
    let exists = state.db_path.exists();
    Ok(serde_json::json!({
        "dbPath": db_path_str,
        "appDir": app_dir_str,
        "isInsideAppFolder": true,
        "exists": exists,
        "backend": "SQLite"
    }))
}

fn main() {
    let app_dir = get_app_dir();
    let data_dir = app_dir.join("data");
    let backups_dir = app_dir.join("backups");
    let exports_dir = app_dir.join("exports");
    let logs_dir = app_dir.join("logs");

    let _ = fs::create_dir_all(&data_dir);
    let _ = fs::create_dir_all(&backups_dir);
    let _ = fs::create_dir_all(&exports_dir);
    let _ = fs::create_dir_all(&logs_dir);

    let db_path = data_dir.join("plate_lifecycle.db");
    let _ = init_db(&db_path);

    tauri::Builder::default()
        .manage(DbState {
            db_path,
            app_dir,
        })
        .invoke_handler(tauri::generate_handler![
            db_to_array,
            db_put,
            db_bulk_put,
            db_update,
            db_delete,
            db_clear,
            db_count,
            db_get_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
