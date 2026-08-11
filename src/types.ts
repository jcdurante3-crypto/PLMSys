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
    | 'UNDO_PRODUCTION'
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

export interface NetworkStorageConfig {
  mode: 'LOCAL' | 'NETWORK';
  networkPath: string;
  stationName: string;
  autoSyncIntervalSec: number;
  lastSyncedAt?: string;
  isOnline: boolean;
}

export interface UpdateRelease {
  version: string;
  releaseDate: string;
  isCritical: boolean;
  downloadSizeMb: number;
  summary: string;
  changes: {
    category: 'FEATURE' | 'ENHANCEMENT' | 'SECURITY' | 'FIX';
    description: string;
  }[];
}

declare global {
  interface Window {
    electronAPI?: {
      openDataFolder: () => Promise<void>;
      openBackupFolder: () => Promise<void>;
      saveBackup: (backupDataText: string) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
      loadBackup: () => Promise<{ success: boolean; data?: string; cancelled?: boolean; error?: string }>;
      writeLog: (level: string, message: string) => Promise<void>;
      getAppInfo: () => Promise<{ isPackaged: boolean; version: string; dataDirectory: string; mode?: string; stationName?: string }>;
      dbAction: (table: string, action: string, args: any[]) => Promise<any>;
      factoryReset: (setCount: number) => Promise<{ success: boolean; error?: string }>;
      getDbStatus: () => Promise<{ success: boolean; error: string | null; isOffline?: boolean; details?: any }>;
      getNetworkStorageConfig?: () => Promise<NetworkStorageConfig>;
      setNetworkStorageConfig?: (config: NetworkStorageConfig) => Promise<{ success: boolean; error?: string }>;
      testNetworkConnection?: (args: { networkPath: string }) => Promise<{ success: boolean; error?: string }>;
      migrateStorageMode?: (args: { targetMode: 'LOCAL' | 'NETWORK'; networkPath?: string; stationName?: string; overwriteChoice?: string }) => Promise<{ success: boolean; conflict?: boolean; message?: string }>;
      authenticateUser?: (args: { userId: string; password?: string }) => Promise<{ success: boolean; user?: Personnel; error?: string }>;
      getPersonnelList?: () => Promise<Personnel[]>;
      atomicCreateSet?: (args: { setCount: number; initialCycle?: number; operatorId?: string }) => Promise<{ success: boolean }>;
      atomicDeleteSet?: (args: { setId: string; operatorId?: string }) => Promise<{ success: boolean }>;
      checkForUpdates?: () => Promise<{ hasUpdate: boolean; release?: UpdateRelease; offline?: boolean; currentVersion?: string }>;
    };
  }
}

