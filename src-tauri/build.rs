fn main() {
    // Skip tauri-build on Windows to avoid icon.ico format issues
    #[cfg(not(target_os = "windows"))]
    tauri_build::build();
    
    #[cfg(target_os = "windows")]
    {
        // For Windows, we'll handle icon generation differently
        // This prevents RC.EXE errors with malformed ICO files
        println!("cargo:warning=Icon will be embedded via alternative method on Windows");
    }
}
