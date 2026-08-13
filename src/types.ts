export type PlateStatus = 'ACTIVE' | 'REMOVED' | 'REJECTED' | 'RETIRED' | 'REPLACED';

export type RejectType = 'WEAR' | 'SURFACE' | 'CRACK' | 'DIM' | 'CHIP' | 'DENT' | 'OTHER';

export interface SetRecord {
  id: string; // UUID
  setNumber: number; // 1 to 100+
  displayName: string; // "SET 01"
  shortCode: string; // "S01"
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  currentTotalCycle: number;
  initialCycle?: number; // Starting cycle on creation
  todayProduction: number;
  lastProductionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionRecord {
  id: string; // UUID
  setId: string; // Set UUID
  setNumber: number;
  positionNumber: number; // 1 to 11
  positionCode: string; // "P01"
  fullCode: string; // "S01-P01"
  status: 'OCCUPIED' | 'EMPTY';
  currentPlateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlateRecord {
  id: string; // UUID
  plateSerialNumber: string; // MMDDYY-SET-POSITION (e.g. 080826-01-05)
  manufacturingDate: string; // YYYY-MM-DD
  status: PlateStatus;
  currentSetId?: string;
  currentPositionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlateInstallationRecord {
  id: string; // UUID
  plateId: string;
  setId: string;
  positionId: string;
  installationDate: string;
  installationCycle: number;
  initialCycles?: number; // Pre-existing cycles on the plate itself when installed
  operatorId: string;
  remarks?: string;
  createdAt: string;
}

export interface PlateRemovalRecord {
  id: string; // UUID
  plateId: string;
  setId: string;
  positionId: string;
  removalDate: string;
  removalCycle: number;
  totalCyclesAchieved: number;
  status: PlateStatus; // REMOVED, REJECTED, RETIRED, REPLACED
  rejectType?: RejectType;
  rejectDescription?: string;
  sourceOfReject?: string;
  correctiveAction?: string;
  operatorId: string;
  createdAt: string;
}

export interface DailyProductionRecord {
  id: string; // UUID
  setId: string;
  date: string; // YYYY-MM-DD
  jobOrderId: string;
  previousTotalCycle: number;
  productionCycles: number;
  currentTotalCycle: number;
  operatorId: string;
  checkedBy: string;
  remarks?: string;
  createdAt: string;
}

export interface ReplacementRecord {
  id: string; // UUID
  setId: string;
  positionId: string;
  oldPlateId: string;
  newPlateId: string;
  oldRemovalCycle: number;
  newInstallationCycle: number;
  reason: string;
  operatorId: string;
  createdAt: string;
}

export interface JobOrderRecord {
  id: string; // UUID
  jobOrderNumber: string;
  description: string;
  date: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface AuditRecord {
  id: string; // UUID
  auditCode: string; // "AUD-000001"
  user: string;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE_SET'
    | 'EDIT_SET'
    | 'CREATE_PLATE'
    | 'INSTALL_PLATE'
    | 'REMOVE_PLATE'
    | 'REPLACE_PLATE'
    | 'REJECT_PLATE'
    | 'RETIRE_PLATE'
    | 'ADD_PRODUCTION'
    | 'EDIT_PRODUCTION'
    | 'DELETE_PRODUCTION'
    | 'CORRECT_RECORD'
    | 'BACKUP'
    | 'RESTORE'
    | 'DELETE_ATTEMPT'
    | 'DELETE_SET'
    | 'SETTINGS_CHANGE';
  timestamp: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  deviceInfo: string;
  checkedBy?: string;
}

export type UserRole = 'ADMIN' | 'OPERATOR';

export interface User {
  name: string;
  role: UserRole;
}

export interface Personnel {
  id: string;
  fullName: string;
  shortName: string;
  position: string;
  isAuthorized: boolean;
  password?: string;
}

export type StorageMode = 'LOCAL' | 'NETWORK';

export type NetworkStatusType = 'CONNECTED' | 'SYNCHRONIZING' | 'OFFLINE' | 'RECONNECTING' | 'CONFLICT' | 'VERSION_MISMATCH';

export interface NetworkSettings {
  mode: StorageMode;
  networkPath: string;
  serverHost: string;
  serverPort: number;
  isHost: boolean;
  revision: number;
  status: NetworkStatusType;
}

export interface ConflictData {
  recordId: string;
  table: string;
  user: string;
  localVersion: any;
  networkVersion: any;
  revision: number;
}

export interface UpdateInfo {
  currentVersion: string;
  availableVersion: string;
  hasUpdate: boolean;
  changelog: Record<string, string[]>;
  mismatchDetected?: boolean;
  mismatchHostVersion?: string;
  connectedClients?: number;
}

export interface UpdateProgress {
  stage: 'idle' | 'checking' | 'preparing' | 'backup' | 'downloading' | 'verifying' | 'installing' | 'complete' | 'error';
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      openDataFolder: () => Promise<void>;
      openBackupFolder: () => Promise<void>;
      saveBackup: (backupDataText: string) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
      loadBackup: () => Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }>;
      writeLog: (level: string, message: string) => Promise<void>;
      getAppInfo: () => Promise<{ isPackaged: boolean; version: string; dataDirectory: string }>;
      dbAction: (table: string, action: string, args: any[], revision?: number) => Promise<any>;
      factoryReset: (setCount: number) => Promise<{ success: boolean; error?: string }>;
      getDbStatus: () => Promise<{ success: boolean; error: string | null }>;
      forceReleaseDatabaseLock: () => Promise<{ success: boolean; error?: string }>;
      
      // Network & Collaboration IPCs
      getNetworkSettings: () => Promise<NetworkSettings>;
      saveNetworkSettings: (settings: Partial<NetworkSettings>) => Promise<{ success: boolean; error?: string }>;
      testNetworkConnection: (pathOrHost: string) => Promise<{ success: boolean; latencyMs?: number; error?: string }>;
      getNetworkStatus: () => Promise<{ status: NetworkStatusType; mode: StorageMode; connectedClients: number; revision: number }>;
      resolveConflict: (strategy: 'keep_network' | 'keep_local' | 'reload', conflictData: ConflictData) => Promise<{ success: boolean; data?: any }>;
      onNetworkDataChanged: (callback: (payload: { table: string; action: string; revision: number }) => void) => () => void;
      onNetworkStatusChanged: (callback: (status: NetworkStatusType) => void) => () => void;
      
      // Auto-Update IPCs
      checkForUpdates: () => Promise<UpdateInfo>;
      startAutoUpdate: () => Promise<{ success: boolean; error?: string }>;
      getUpdatePackageInfo: () => Promise<{ hasUpdate: boolean; manifest: any }>;
      publishUpdatePackage: (data: any) => Promise<{ success: boolean; manifest?: any; error?: string }>;
      adminInitiateUpdateAll: (userRole: string) => Promise<{ success: boolean; secondsLeft?: number; error?: string }>;
      getClientUpdateStatuses: () => Promise<Record<string, any>>;
      onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
      onAdminUpdateInitiated: (callback: (payload: any) => void) => () => void;
      onAdminUpdateCountdown: (callback: (payload: any) => void) => () => void;
      onAdminUpdateCancelled: (callback: (payload: any) => void) => () => void;
      onExecuteAutoUpdateNow: (callback: (payload: any) => void) => () => void;
      getLastSeenVersion: () => Promise<string>;
      setLastSeenVersion: (version: string) => Promise<void>;
      getChangelog: () => Promise<{ version: string; sections: Record<string, string[]> }>;
    };
  }
}

