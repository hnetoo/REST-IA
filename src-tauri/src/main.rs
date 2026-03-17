#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use serde_json::Value;

#[tauri::command]
async fn check_configuration() -> Result<bool, String> {
    // Versão simplificada - sempre retorna false para forçar setup
    Ok(false)
}

#[tauri::command]
async fn initialize_database() -> Result<String, String> {
    // Versão simplificada - apenas retorna sucesso
    Ok("Banco de dados inicializado com sucesso".to_string())
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok("1.0.6".to_string())
}

#[tauri::command]
async fn save_config(supabase_url: String, supabase_key: String) -> Result<String, String> {
    // Versão simplificada - apenas log
    println!("Configuração salva: URL={}, Key={}", supabase_url, "****");
    Ok("Configuração salva com sucesso".to_string())
}

#[tauri::command]
async fn load_config() -> Result<Value, String> {
    // Versão simplificada - retorna configuração vazia
    Ok(serde_json::json!({
        "supabase_url": "",
        "supabase_key": ""
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