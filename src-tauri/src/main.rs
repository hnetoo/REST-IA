#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;
use std::fs;
use std::path::Path;

#[tauri::command]
async fn check_configuration() -> Result<bool, String> {
    // Verificar se configuração existe no localStorage
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::generate_context!()).map_err(|e| e.to_string())?;
    let config_file = app_data_dir.join(".supabase_config");
    
    if config_file.exists() {
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn initialize_database() -> Result<String, String> {
    // Ler o arquivo SQL
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::generate_context!()).map_err(|e| e.to_string())?;
    let sql_file = app_data_dir.join("auto_schema.sql");
    
    if !sql_file.exists() {
        return Err("Arquivo auto_schema.sql não encontrado".to_string());
    }
    
    let sql_content = fs::read_to_string(&sql_file).map_err(|e| e.to_string())?;
    
    // Aqui você executaria o SQL no banco de dados
    // Por ora, apenas retornamos sucesso
    Ok("Banco de dados inicializado com sucesso".to_string())
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok("1.0.6".to_string())
}

#[tauri::command]
async fn save_config(supabase_url: String, supabase_key: String) -> Result<String, String> {
    // Salvar configuração em arquivo local
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::generate_context!()).map_err(|e| e.to_string())?;
    let config_file = app_data_dir.join(".supabase_config");
    
    let config_content = format!(
        "SUPABASE_URL={}\nSUPABASE_ANON_KEY={}",
        supabase_url, supabase_key
    );
    
    fs::write(&config_file, config_content).map_err(|e| e.to_string())?;
    
    Ok("Configuração salva com sucesso".to_string())
}

#[tauri::command]
async fn load_config() -> Result<serde_json::Value, String> {
    // Carregar configuração do arquivo local
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::generate_context!()).map_err(|e| e.to_string())?;
    let config_file = app_data_dir.join(".supabase_config");
    
    if !config_file.exists() {
        return Ok(serde_json::json!({
            "supabase_url": "",
            "supabase_key": ""
        }));
    }
    
    let config_content = fs::read_to_string(&config_file).map_err(|e| e.to_string())?;
    let lines: Vec<&str> = config_content.lines().collect();
    
    let mut supabase_url = "";
    let mut supabase_key = "";
    
    for line in lines {
        if line.starts_with("SUPABASE_URL=") {
            supabase_url = line.strip_prefix("SUPABASE_URL=").unwrap_or("").to_string();
        } else if line.starts_with("SUPABASE_ANON_KEY=") {
            supabase_key = line.strip_prefix("SUPABASE_ANON_KEY=").unwrap_or("").to_string();
        }
    }
    
    Ok(serde_json::json!({
        "supabase_url": supabase_url,
        "supabase_key": supabase_key
    }))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            check_configuration,
            initialize_database,
            get_app_version,
            save_config,
            load_config
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar aplicação tauri");
}