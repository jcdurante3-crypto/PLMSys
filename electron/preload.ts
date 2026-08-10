import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openDataFolder: () => Promise<void>;
  openBackupFolder: () => Promise<void>;
  saveBackup: (backupDataText: string) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  loadBackup: () => Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }>;
  writeLog: (level: string, message: string) => Promise<void>;
  getAppInfo: () => Promise<{ isPackaged: boolean; version: string; dataDirectory: string }>;
}

const electronAPI: ElectronAPI = {
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  saveBackup: (backupDataText) => ipcRenderer.invoke('save-backup', backupDataText),
  loadBackup: () => ipcRenderer.invoke('load-backup'),
  writeLog: (level, message) => ipcRenderer.invoke('write-log', level, message),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
