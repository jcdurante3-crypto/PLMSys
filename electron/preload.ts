import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openDataFolder: () => Promise<void>;
  openBackupFolder: () => Promise<void>;
  saveBackup: (backupDataText: string) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  loadBackup: () => Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }>;
  writeLog: (level: string, message: string) => Promise<void>;
  getAppInfo: () => Promise<{ isPackaged: boolean; version: string; dataDirectory: string }>;
  dbAction: (table: string, action: string, args: any[]) => Promise<any>;
  factoryReset: (setCount: number) => Promise<{ success: boolean; error?: string }>;
  getDbStatus: () => Promise<{ success: boolean; error: string | null }>;
  getNetworkStorageConfig: () => Promise<any>;
  setNetworkStorageConfig: (config: any) => Promise<any>;
  checkForUpdates: () => Promise<any>;
}

const electronAPI: ElectronAPI = {
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  saveBackup: (backupDataText) => ipcRenderer.invoke('save-backup', backupDataText),
  loadBackup: () => ipcRenderer.invoke('load-backup'),
  writeLog: (level, message) => ipcRenderer.invoke('write-log', level, message),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  dbAction: (table, action, args) => ipcRenderer.invoke('db-action', { table, action, args }),
  factoryReset: (setCount) => ipcRenderer.invoke('factory-reset', { setCount }),
  getDbStatus: () => ipcRenderer.invoke('get-db-status'),
  getNetworkStorageConfig: () => ipcRenderer.invoke('get-network-config'),
  setNetworkStorageConfig: (config) => ipcRenderer.invoke('set-network-config', config),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
