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
  forceReleaseDatabaseLock: () => Promise<{ success: boolean; error?: string }>;
}

const electronAPI = {
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  saveBackup: (backupDataText: string) => ipcRenderer.invoke('save-backup', backupDataText),
  loadBackup: () => ipcRenderer.invoke('load-backup'),
  writeLog: (level: string, message: string) => ipcRenderer.invoke('write-log', level, message),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  dbAction: (table: string, action: string, args: any[], revision?: number) =>
    ipcRenderer.invoke('db-action', { table, action, args, revision }),
  factoryReset: (setCount: number) => ipcRenderer.invoke('factory-reset', { setCount }),
  getDbStatus: () => ipcRenderer.invoke('get-db-status'),
  forceReleaseDatabaseLock: () => ipcRenderer.invoke('force-release-database-lock'),

  // Network & Collaboration IPCs
  getNetworkSettings: () => ipcRenderer.invoke('get-network-settings'),
  saveNetworkSettings: (settings: any) => ipcRenderer.invoke('save-network-settings', settings),
  testNetworkConnection: (pathOrHost: string) => ipcRenderer.invoke('test-network-connection', pathOrHost),
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
  resolveConflict: (strategy: string, conflictData: any) => ipcRenderer.invoke('resolve-conflict', { strategy, conflictData }),
  onNetworkDataChanged: (callback: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('network-data-changed', handler);
    return () => ipcRenderer.removeListener('network-data-changed', handler);
  },
  onNetworkStatusChanged: (callback: (status: any) => void) => {
    const handler = (_event: any, status: any) => callback(status);
    ipcRenderer.on('network-status-changed', handler);
    return () => ipcRenderer.removeListener('network-status-changed', handler);
  },

  // Auto-Update IPCs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startAutoUpdate: () => ipcRenderer.invoke('start-auto-update'),
  getUpdatePackageInfo: () => ipcRenderer.invoke('get-update-package-info'),
  publishUpdatePackage: (data: any) => ipcRenderer.invoke('publish-update-package', data),
  adminInitiateUpdateAll: (userRole: string) => ipcRenderer.invoke('admin-initiate-update-all', { userRole }),
  getClientUpdateStatuses: () => ipcRenderer.invoke('get-client-update-statuses'),
  onUpdateProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onAdminUpdateInitiated: (callback: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('admin-update-initiated', handler);
    return () => ipcRenderer.removeListener('admin-update-initiated', handler);
  },
  onAdminUpdateCountdown: (callback: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('admin-update-countdown', handler);
    return () => ipcRenderer.removeListener('admin-update-countdown', handler);
  },
  onAdminUpdateCancelled: (callback: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('admin-update-cancelled', handler);
    return () => ipcRenderer.removeListener('admin-update-cancelled', handler);
  },
  onExecuteAutoUpdateNow: (callback: (payload: any) => void) => {
    const handler = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('execute-auto-update-now', handler);
    return () => ipcRenderer.removeListener('execute-auto-update-now', handler);
  },
  getLastSeenVersion: () => ipcRenderer.invoke('get-last-seen-version'),
  setLastSeenVersion: (version: string) => ipcRenderer.invoke('set-last-seen-version', version),
  getChangelog: () => ipcRenderer.invoke('get-changelog'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
