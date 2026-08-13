import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function createTauriBridge() {
  return {
    openDataFolder: async () => {
      return await invoke('open_data_folder');
    },
    openBackupFolder: async () => {
      return await invoke('open_backup_folder');
    },
    saveBackup: async (backupDataText: string) => {
      return await invoke('save_backup', { backupDataText });
    },
    loadBackup: async () => {
      return await invoke('load_backup');
    },
    writeLog: async (level: string, message: string) => {
      return await invoke('write_log', { level, message });
    },
    getAppInfo: async () => {
      return await invoke('get_app_info');
    },
    dbAction: async (table: string, action: string, args: any[], revision?: number) => {
      return await invoke('db_action', { table, action, args, revision });
    },
    factoryReset: async (setCount: number) => {
      return await invoke('factory_reset', { setCount });
    },
    getDbStatus: async () => {
      return await invoke('get_db_status');
    },
    forceReleaseDatabaseLock: async () => {
      return await invoke('force_release_database_lock');
    },

    // Network & Collaboration IPCs
    getNetworkSettings: async () => {
      return await invoke('get_network_settings');
    },
    saveNetworkSettings: async (settings: any) => {
      return await invoke('save_network_settings', { settings });
    },
    testNetworkConnection: async (pathOrHost: string) => {
      return await invoke('test_network_connection', { pathOrHost });
    },
    getNetworkStatus: async () => {
      return await invoke('get_network_status');
    },
    resolveConflict: async (strategy: string, conflictData: any) => {
      return await invoke('resolve_conflict', { strategy, conflictData });
    },
    onNetworkDataChanged: (callback: (payload: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('network-data-changed', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
    onNetworkStatusChanged: (callback: (status: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('network-status-changed', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },

    // Auto-Update IPCs
    checkForUpdates: async () => {
      return await invoke('check_for_updates');
    },
    startAutoUpdate: async () => {
      return await invoke('start_auto_update');
    },
    getUpdatePackageInfo: async () => {
      return await invoke('get_update_package_info');
    },
    publishUpdatePackage: async (data: any) => {
      return await invoke('publish_update_package', { data });
    },
    adminInitiateUpdateAll: async (userRole: string) => {
      return await invoke('admin_initiate_update_all', { userRole });
    },
    getClientUpdateStatuses: async () => {
      return await invoke('get_client_update_statuses');
    },
    onUpdateProgress: (callback: (progress: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('update-progress', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
    onAdminUpdateInitiated: (callback: (payload: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('admin-update-initiated', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
    onAdminUpdateCountdown: (callback: (payload: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('admin-update-countdown', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
    onAdminUpdateCancelled: (callback: (payload: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('admin-update-cancelled', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
    onExecuteAutoUpdateNow: (callback: (payload: any) => void) => {
      let unlisten: (() => void) | null = null;
      listen('execute-auto-update-now', (event) => callback(event.payload)).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    },
    getLastSeenVersion: async () => {
      return await invoke('get_last_seen_version');
    },
    setLastSeenVersion: async (version: string) => {
      return await invoke('set_last_seen_version', { version });
    },
    getChangelog: async () => {
      return await invoke('get_changelog');
    },
  };
}

export function initBridge() {
  if (typeof window === 'undefined') return;

  if (isTauriEnvironment()) {
    (window as any).electronAPI = createTauriBridge();
  }
}
