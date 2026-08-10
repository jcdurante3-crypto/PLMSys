import { contextBridge, ipcRenderer } from 'electron';

export interface BackupInfo {
  filename: string;
  date: string;
  sizeMB: string;
  path: string;
}

export interface ElectronAPI {
  openDataFolder: () => Promise<void>;
  openBackupFolder: () => Promise<void>;
  createAutomaticBackup: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  createManualBackup: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  exportBackup: () => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  restoreBackup: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  getBackups: () => Promise<{ success: boolean; backups?: BackupInfo[]; error?: string }>;
  writeLog: (level: string, message: string) => Promise<void>;
  getAppInfo: () => Promise<{ isPackaged: boolean; version: string; dataDirectory: string }>;
  dbAction: (table: string, action: string, args: any[]) => Promise<any>;
  factoryReset: (setCount: number) => Promise<{ success: boolean; error?: string }>;
  getDbStatus: () => Promise<{ status: string; success: boolean; error: string | null; recoveryStatus?: string; details?: any }>;
}

const electronAPI: ElectronAPI = {
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  createAutomaticBackup: () => ipcRenderer.invoke('create-automatic-backup'),
  createManualBackup: () => ipcRenderer.invoke('create-manual-backup'),
  exportBackup: () => ipcRenderer.invoke('export-backup'),
  restoreBackup: () => ipcRenderer.invoke('restore-backup'),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  writeLog: (level, message) => ipcRenderer.invoke('write-log', level, message),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  dbAction: (table, action, args) => ipcRenderer.invoke('db-action', { table, action, args }),
  factoryReset: (setCount) => ipcRenderer.invoke('factory-reset', { setCount }),
  getDbStatus: () => ipcRenderer.invoke('get-db-status'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
