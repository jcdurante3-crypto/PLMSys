import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openDataFolder: () => Promise<void>;
  openBackupFolder: () => Promise<void>;
  saveBackup: (backupDataText: string) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
  loadBackup: () => Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }>;
  writeLog: (level: string, message: string) => Promise<void>;
  getAppInfo: () => Promise<{ isPackaged: boolean; version: string; dataDirectory: string; mode?: string; stationName?: string }>;
  dbAction: (table: string, action: string, args: any[]) => Promise<any>;
  factoryReset: (setCount: number) => Promise<{ success: boolean; error?: string }>;
  getDbStatus: () => Promise<{ success: boolean; error: string | null; isOffline?: boolean; details?: any }>;
  getNetworkStorageConfig: () => Promise<any>;
  setNetworkStorageConfig: (config: any) => Promise<any>;
  testNetworkConnection: (args: { networkPath: string }) => Promise<{ success: boolean; error?: string }>;
  migrateStorageMode: (args: { targetMode: 'LOCAL' | 'NETWORK'; networkPath?: string; stationName?: string; overwriteChoice?: string }) => Promise<{ success: boolean; conflict?: boolean; message?: string }>;
  authenticateUser: (args: { userId: string; password?: string }) => Promise<{ success: boolean; user?: any; error?: string }>;
  getPersonnelList: () => Promise<any[]>;
  atomicCreateSet: (args: { setCount: number; initialCycle?: number; operatorId?: string }) => Promise<{ success: boolean }>;
  atomicDeleteSet: (args: { setId: string; operatorId?: string }) => Promise<{ success: boolean }>;
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
  testNetworkConnection: (args) => ipcRenderer.invoke('test-network-connection', args),
  migrateStorageMode: (args) => ipcRenderer.invoke('migrate-storage-mode', args),
  authenticateUser: (args) => ipcRenderer.invoke('authenticate-user', args),
  getPersonnelList: () => ipcRenderer.invoke('get-personnel-list'),
  atomicCreateSet: (args) => ipcRenderer.invoke('atomic-create-set', args),
  atomicDeleteSet: (args) => ipcRenderer.invoke('atomic-delete-set', args),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
