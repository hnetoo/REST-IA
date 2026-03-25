// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  println!("🍺 Tasca do Vereda Desktop Iniciada");
  println!("🪟 Sistema POS Windows Nativo");
  println!("🔧 Versão: 1.0.0");
  app_lib::run();
}
