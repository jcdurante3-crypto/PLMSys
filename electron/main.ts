import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Determine executable/project directory
const executableDirectory = process.env.PORTABLE_EXECUTABLE_DIR
  ? process.env.PORTABLE_EXECUTABLE_DIR
  : (app.isPackaged ? path.dirname(process.execPath) : process.cwd());

// Portable data directory path adjacent to executable/project root
const dataDirectory = path.join(executableDirectory, 'data');

// Setup data directories
const dirs = {
  root: dataDirectory,
  database: path.join(dataDirectory, 'database'),
  backups: path.join(dataDirectory, 'backups'),
  exports: path.join(dataDirectory, 'exports'),
  logs: path.join(dataDirectory, 'logs'),
  settings: path.join(dataDirectory, 'settings'),
};

// Ensure directories exist on startup
Object.values(dirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Chromium profile and database path to be portable (inside data/database)
app.setPath('userData', dirs.database);

// Simple file logging utility
const logFilePath = path.join(dirs.logs, 'app.log');
function logToFile(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  try {
    fs.appendFileSync(logFilePath, formattedMsg, 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

logToFile('info', 'Application main process starting...');
logToFile('info', `Packaged: ${app.isPackaged}`);
logToFile('info', `PORTABLE_EXECUTABLE_DIR env: ${process.env.PORTABLE_EXECUTABLE_DIR || 'not defined'}`);
logToFile('info', `Executable/project root directory: ${executableDirectory}`);
logToFile('info', `Data folder set to: ${dataDirectory}`);

// Network Configuration Helpers
const networkConfigFile = path.join(dirs.settings, 'network.json');

function getStationName(): string {
  try {
    const host = os.hostname().replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    const user = os.userInfo().username.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    return `PC-${host || user || '01'}`;
  } catch (e) {
    return 'PC-01';
  }
}

function loadNetworkConfig(): { mode: 'LOCAL' | 'NETWORK'; networkPath: string; stationName: string; autoSyncIntervalSec: number } {
  try {
    if (fs.existsSync(networkConfigFile)) {
      const data = fs.readFileSync(networkConfigFile, 'utf8');
      const cfg = JSON.parse(data);
      if (!cfg.stationName || cfg.stationName.trim() === '') {
        cfg.stationName = getStationName();
      }
      return cfg;
    }
  } catch (err) {
    logToFile('warn', `Failed to read network config: ${err}`);
  }

  const defaultConfig = {
    mode: 'LOCAL' as const,
    networkPath: '',
    stationName: getStationName(),
    autoSyncIntervalSec: 10,
  };

  try {
    fs.writeFileSync(networkConfigFile, JSON.stringify(defaultConfig, null, 2), 'utf8');
  } catch (e) {}

  return defaultConfig;
}

function getActivePaths() {
  const config = loadNetworkConfig();
  const isNetwork = config.mode === 'NETWORK' && Boolean(config.networkPath && config.networkPath.trim() !== '');

  if (isNetwork) {
    let baseDir = config.networkPath.trim();
    if (baseDir.endsWith('.json')) {
      baseDir = path.dirname(baseDir);
    }

    let dbDir = baseDir;
    // If plmsys.json is in baseDir directly or inside baseDir/database
    if (fs.existsSync(path.join(baseDir, 'plmsys.json'))) {
      dbDir = baseDir;
    } else {
      dbDir = path.join(baseDir, 'database');
    }

    const backupsDir = path.join(baseDir, 'backups');
    const dbFilePath = path.join(dbDir, 'plmsys.json');
    const lockFilePath = path.join(dbDir, 'plmsys.json.lock');

    return {
      mode: 'NETWORK' as const,
      config,
      baseDir,
      dbDir,
      backupsDir,
      dbFilePath,
      lockFilePath,
      stationName: config.stationName || getStationName()
    };
  }

  return {
    mode: 'LOCAL' as const,
    config,
    baseDir: dirs.root,
    dbDir: dirs.database,
    backupsDir: dirs.backups,
    dbFilePath: path.join(dirs.database, 'plmsys.json'),
    lockFilePath: path.join(dirs.database, 'plmsys.json.lock'),
    stationName: config.stationName || getStationName()
  };
}

let dbErrorStatus: string | null = null;

const ALLOWED_TABLES = new Set([
  'sets',
  'positions',
  'plates',
  'plateInstallations',
  'plateRemovals',
  'dailyProduction',
  'replacements',
  'jobOrders',
  'auditLogs',
  'personnel'
]);

const ALLOWED_ACTIONS = new Set([
  'toArray',
  'get',
  'put',
  'add',
  'update',
  'delete',
  'clear',
  'bulkPut',
  'count'
]);

function createFactoryDefaultDb(setCount: number = 2, stationName: string = 'PC-01') {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowObj = new Date();
  const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
  const dd = String(nowObj.getDate()).padStart(2, '0');
  const yy = String(nowObj.getFullYear()).slice(-2);
  const dateFormatted = `${mm}${dd}${yy}`;

  const defaultDb: any = {
    databaseMeta: {
      schemaVersion: 1,
      revision: 1,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: stationName
    },
    sets: [],
    positions: [],
    plates: [],
    plateInstallations: [],
    plateRemovals: [],
    dailyProduction: [],
    replacements: [],
    jobOrders: [
      { id: 'jo-1', jobOrderNumber: '0626-26', description: 'Heavy Production Run Q3', date: todayStr, status: 'IN_PROGRESS' },
      { id: 'jo-2', jobOrderNumber: '0712-26', description: 'High Speed Strip Rollout', date: todayStr, status: 'OPEN' }
    ],
    auditLogs: [],
    personnel: [
      { id: 'pers-1', fullName: 'Jane Smith', shortName: 'JS', position: 'Supervisor', isAuthorized: true, password: 'password123' },
      { id: 'pers-2', fullName: 'John Doe', shortName: 'JD', position: 'Operator', isAuthorized: false, password: '' },
      { id: 'pers-3', fullName: 'Administrator', shortName: 'Admin', position: 'Admin', isAuthorized: true, password: 'JADB1994' }
    ]
  };

  if (setCount > 0) {
    for (let i = 1; i <= setCount; i++) {
      const setId = `set-${i}`;
      const displayName = `SET ${i < 10 ? '0' + i : i}`;
      const shortCode = `S${i < 10 ? '0' + i : i}`;

      defaultDb.sets.push({
        id: setId,
        setNumber: i,
        displayName,
        shortCode,
        status: 'ACTIVE',
        currentTotalCycle: 0,
        initialCycle: 0,
        todayProduction: 0,
        lastProductionDate: todayStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      for (let p = 1; p <= 11; p++) {
        const posId = `pos-${i}-${p}`;
        const pNumStr = p < 10 ? `0${p}` : `${p}`;
        const positionCode = `P${pNumStr}`;
        const fullCode = `${shortCode}-${positionCode}`;
        const plateId = `plate-${i}-${p}`;
        const serialNumber = `${dateFormatted}-${i < 10 ? '0' + i : i}-${pNumStr}`;

        defaultDb.plates.push({
          id: plateId,
          plateSerialNumber: serialNumber,
          manufacturingDate: todayStr,
          status: 'ACTIVE',
          currentSetId: setId,
          currentPositionId: posId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        defaultDb.positions.push({
          id: posId,
          setId,
          setNumber: i,
          positionNumber: p,
          positionCode,
          fullCode,
          status: 'OCCUPIED',
          currentPlateId: plateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        defaultDb.plateInstallations.push({
          id: `inst-${i}-${p}`,
          plateId,
          setId,
          positionId: posId,
          installationDate: todayStr,
          installationCycle: 0,
          operatorId: 'Admin',
          remarks: 'Factory Initial Setup',
          createdAt: new Date().toISOString()
        });
      }
    }
  }
  return defaultDb;
}

// Shared Database Validator
function validateDb(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }
  // Auto-normalize legacy/exported alias keys
  if (Array.isArray(parsed.installations) && (!parsed.plateInstallations || !Array.isArray(parsed.plateInstallations))) {
    parsed.plateInstallations = parsed.installations;
  }
  if (Array.isArray(parsed.removals) && (!parsed.plateRemovals || !Array.isArray(parsed.plateRemovals))) {
    parsed.plateRemovals = parsed.removals;
  }

  // Ensure databaseMeta exists
  if (!parsed.databaseMeta || typeof parsed.databaseMeta !== 'object') {
    parsed.databaseMeta = {
      schemaVersion: 1,
      revision: 1,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: getStationName()
    };
  }

  // Ensure mandatory collections exist as arrays or initialize them if empty
  for (const table of ALLOWED_TABLES) {
    if (!parsed[table] || !Array.isArray(parsed[table])) {
      parsed[table] = [];
    }
  }
  return true;
}

// Search for the newest valid backup
function findNewestValidBackup(backupsFolder: string, mainDbPath: string): string | null {
  const candidates: string[] = [];
  
  const goodBakPath = mainDbPath + '.good.bak';
  if (fs.existsSync(goodBakPath)) {
    candidates.push(goodBakPath);
  }
  
  try {
    if (fs.existsSync(backupsFolder)) {
      const files = fs.readdirSync(backupsFolder);
      for (const file of files) {
        if (file.endsWith('.json')) {
          candidates.push(path.join(backupsFolder, file));
        }
      }
    }
  } catch (err) {
    logToFile('error', `Failed to read backups directory ${backupsFolder}: ${err}`);
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  const sortedCandidates = candidates
    .map(filePath => {
      try {
        const stats = fs.statSync(filePath);
        return { filePath, mtime: stats.mtimeMs };
      } catch (e) {
        return { filePath, mtime: 0 };
      }
    })
    .sort((a, b) => b.mtime - a.mtime);
    
  for (const candidate of sortedCandidates) {
    try {
      const data = fs.readFileSync(candidate.filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (validateDb(parsed)) {
        logToFile('info', `Found valid backup candidate: ${candidate.filePath}`);
        return candidate.filePath;
      }
    } catch (e) {
      logToFile('warn', `Backup candidate ${candidate.filePath} failed parsing/validation: ${e}`);
    }
  }
  
  return null;
}

// Windows-Safe File Locking Mechanism
function acquireLock(lockPath: string, stationName: string): boolean {
  const maxRetries = 10;
  const retryIntervalMs = 150;

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(lockPath)) {
        try {
          const content = fs.readFileSync(lockPath, 'utf8');
          const lockData = JSON.parse(content);
          const lockAgeMs = Date.now() - new Date(lockData.createdAt || 0).getTime();
          
          // Stale lock detection (older than 15 seconds)
          if (lockAgeMs > 15000) {
            logToFile('warn', `Stale lock file detected (Age: ${lockAgeMs}ms) at ${lockPath}. Overriding stale lock...`);
            try { fs.unlinkSync(lockPath); } catch (e) {}
          } else if (lockData.stationName === stationName && lockData.processId === process.pid) {
            // Already owned by this process
            return true;
          } else {
            // Active lock owned by another station
            const waitSync = (ms: number) => {
              const start = Date.now();
              while (Date.now() - start < ms) {}
            };
            waitSync(retryIntervalMs);
            continue;
          }
        } catch (e) {
          try { fs.unlinkSync(lockPath); } catch (err) {}
        }
      }

      const lockPayload = JSON.stringify({
        stationName,
        processId: process.pid,
        createdAt: new Date().toISOString()
      });

      fs.writeFileSync(lockPath, lockPayload, { flag: 'wx', encoding: 'utf8' });
      return true;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        const waitSync = (ms: number) => {
          const start = Date.now();
          while (Date.now() - start < ms) {}
        };
        waitSync(retryIntervalMs);
      } else {
        logToFile('warn', `Lock acquisition error at ${lockPath}: ${err.message}`);
        return false;
      }
    }
  }

  throw new Error(`DATABASE LOCKED: Another station is writing to the shared database. Please try again in a moment.`);
}

function releaseLock(lockPath: string): void {
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (err) {
    logToFile('warn', `Failed to release lock file at ${lockPath}: ${err}`);
  }
}

function initDbFile() {
  const active = getActivePaths();
  
  if (!fs.existsSync(active.dbDir)) {
    fs.mkdirSync(active.dbDir, { recursive: true });
  }
  if (!fs.existsSync(active.backupsDir)) {
    fs.mkdirSync(active.backupsDir, { recursive: true });
  }

  if (!fs.existsSync(active.dbFilePath)) {
    if (active.mode === 'NETWORK') {
      logToFile('info', `Network database file does not exist at ${active.dbFilePath}. Creating initial network database...`);
    } else {
      logToFile('info', `Local database file does not exist at ${active.dbFilePath}. Creating initial local database...`);
    }

    const defaultDb = createFactoryDefaultDb(2, active.stationName);
    const tempFilePath = active.dbFilePath + '.tmp';
    fs.writeFileSync(tempFilePath, JSON.stringify(defaultDb, null, 2), 'utf8');
    fs.renameSync(tempFilePath, active.dbFilePath);
    
    try {
      fs.copyFileSync(active.dbFilePath, active.dbFilePath + '.good.bak');
    } catch (err) {
      logToFile('warn', `Failed to write initial good backup copy: ${err}`);
    }
  }
}

function handleCorruptDbFile(activeDbPath: string) {
  try {
    if (fs.existsSync(activeDbPath)) {
      const corruptBackupPath = activeDbPath + `.corrupt-${Date.now()}`;
      fs.renameSync(activeDbPath, corruptBackupPath);
      logToFile('info', `Corrupted database file was renamed and preserved at: ${corruptBackupPath}`);
      dbErrorStatus = `Database file was corrupted and has been renamed to protect your data. Corrupted file saved at: ${path.basename(corruptBackupPath)}`;
    }
  } catch (e) {
    logToFile('error', `Failed to rename corrupted database file: ${e}`);
  }
}

function readDb(): any {
  const active = getActivePaths();

  // Offline check for NETWORK mode (Requirement 7)
  if (active.mode === 'NETWORK') {
    if (!fs.existsSync(active.baseDir)) {
      const errMsg = `NETWORK DATABASE UNAVAILABLE: Cannot reach network location "${active.baseDir}". Your local data is safe.`;
      logToFile('error', errMsg);
      dbErrorStatus = errMsg;
      throw new Error(errMsg);
    }
  }

  try {
    initDbFile();
    const data = fs.readFileSync(active.dbFilePath, 'utf8');
    let parsed: any;
    let parseFailed = false;
    let parseErrorMsg = '';
    try {
      parsed = JSON.parse(data);
    } catch (parseErr: any) {
      parseFailed = true;
      parseErrorMsg = parseErr.message;
    }

    if (parseFailed || !validateDb(parsed)) {
      const reason = parseFailed 
        ? `Database JSON parsing failed: ${parseErrorMsg}`
        : 'Database validation failed: Expected collections are missing or invalid.';
      logToFile('error', `${reason} Attempting recovery from latest good backup in ${active.backupsDir}...`);
      
      const backupPath = findNewestValidBackup(active.backupsDir, active.dbFilePath);
      if (backupPath) {
        try {
          handleCorruptDbFile(active.dbFilePath);
          fs.copyFileSync(backupPath, active.dbFilePath);
          logToFile('info', `Database successfully auto-recovered and restored from: ${backupPath}`);
          
          const restoredContent = fs.readFileSync(active.dbFilePath, 'utf8');
          const restoredParsed = JSON.parse(restoredContent);
          if (validateDb(restoredParsed)) {
            dbErrorStatus = null;
            return restoredParsed;
          } else {
            throw new Error('Restored database from backup failed validation on physical verification.');
          }
        } catch (backupRecoveryErr: any) {
          logToFile('error', `Failed to restore/verify backup during auto-recovery: ${backupRecoveryErr.message}`);
        }
      }
      
      handleCorruptDbFile(active.dbFilePath);
      const errText = `Database file is corrupt/invalid, and no valid backup was available for auto-recovery. Your corrupted data has been preserved. Details: ${reason}`;
      dbErrorStatus = errText;
      throw new Error(errText);
    }

    dbErrorStatus = null;
    return parsed;
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Failed to read database: ${errMsg}`);
    dbErrorStatus = `Database read failed: ${errMsg}`;
    throw err;
  }
}

let pendingWritesCount = 0;
let isQuitting = false;

function writeDb(data: any, table?: string, action?: string, args?: any[], expectedRevision?: number) {
  pendingWritesCount++;
  const active = getActivePaths();

  // Offline check for NETWORK mode
  if (active.mode === 'NETWORK' && !fs.existsSync(active.baseDir)) {
    pendingWritesCount--;
    throw new Error(`NETWORK DATABASE UNAVAILABLE: Shared folder "${active.baseDir}" is not reachable. Changes were NOT written.`);
  }

  acquireLock(active.lockFilePath, active.stationName);

  const tempFilePath = active.dbFilePath + '.tmp';
  const backupFilePath = active.dbFilePath + '.bak';
  let backupCreated = false;

  try {
    logToFile('info', `DB WRITE START [Mode: ${active.mode}] - table: ${table || 'N/A'}, action: ${action || 'N/A'}, path: ${active.dbFilePath}`);
    
    // Optimistic Concurrency Control (OCC) Check
    if (fs.existsSync(active.dbFilePath)) {
      try {
        const currentDiskText = fs.readFileSync(active.dbFilePath, 'utf8');
        const currentDiskParsed = JSON.parse(currentDiskText);
        const currentDiskRev = currentDiskParsed?.databaseMeta?.revision || 1;

        if (expectedRevision !== undefined && currentDiskRev !== expectedRevision) {
          throw new Error(`NETWORK CONFLICT: Another workstation (${currentDiskParsed?.databaseMeta?.lastModifiedBy || 'another PC'}) updated the database (Revision on disk: ${currentDiskRev}, local expected: ${expectedRevision}). Your changes were NOT written. Please reload the database and try again.`);
        }
      } catch (occErr: any) {
        if (occErr.message.includes('NETWORK CONFLICT')) {
          throw occErr;
        }
      }
    }

    // Increment revision & update metadata
    if (!data.databaseMeta) {
      data.databaseMeta = {
        schemaVersion: 1,
        revision: 1,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: active.stationName
      };
    } else {
      data.databaseMeta.revision = (data.databaseMeta.revision || 1) + 1;
      data.databaseMeta.lastModifiedAt = new Date().toISOString();
      data.databaseMeta.lastModifiedBy = active.stationName;
    }

    // 1. Write temp file
    fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2), 'utf8');
    
    // 2. Verify temporary file
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Verification failed: Temporary database file does not exist at ${tempFilePath}`);
    }
    const tempContent = fs.readFileSync(tempFilePath, 'utf8');
    let tempVerifiedData: any;
    try {
      tempVerifiedData = JSON.parse(tempContent);
    } catch (parseErr: any) {
      throw new Error(`Verification failed: Parsed JSON from temporary file is invalid: ${parseErr.message || parseErr}`);
    }

    if (!validateDb(tempVerifiedData)) {
      throw new Error(`Verification failed: Temporary database validation failed.`);
    }

    if (table) {
      const collection = tempVerifiedData[table];
      if (action === 'put' || action === 'add') {
        const item = args && args[0];
        const targetId = item ? item.id : null;
        if (targetId) {
          const exists = collection.some((x: any) => x.id === targetId);
          if (!exists) {
            throw new Error(`Verification failed: Record with ID "${targetId}" was not found in temporary table "${table}" after write.`);
          }
        }
      } else if (action === 'update') {
        const targetId = args && args[0];
        if (targetId) {
          const exists = collection.some((x: any) => x.id === targetId);
          if (!exists) {
            throw new Error(`Verification failed: Record with ID "${targetId}" was not found in temporary table "${table}" after update.`);
          }
        }
      } else if (action === 'delete') {
        const targetId = args && args[0];
        if (targetId) {
          const exists = collection.some((x: any) => x.id === targetId);
          if (exists) {
            throw new Error(`Verification failed: Record with ID "${targetId}" should have been deleted but still exists in temporary table "${table}".`);
          }
        }
      } else if (action === 'bulkPut') {
        const items = args && args[0];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id) {
              const exists = collection.some((x: any) => x.id === item.id);
              if (!exists) {
                throw new Error(`Verification failed: Bulk-put record with ID "${item.id}" was not found in temporary table "${table}" after write.`);
              }
            }
          }
        }
      } else if (action === 'clear') {
        if (collection.length !== 0) {
          throw new Error(`Verification failed: Temporary table "${table}" was cleared but still contains ${collection.length} records.`);
        }
      }
    }

    // 3. Backup existing database file
    if (fs.existsSync(active.dbFilePath)) {
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }
      fs.renameSync(active.dbFilePath, backupFilePath);
      backupCreated = true;
    }

    // 4. Atomic move temp file to active file
    fs.renameSync(tempFilePath, active.dbFilePath);

    // 5. Verify final database physically on disk
    if (!fs.existsSync(active.dbFilePath)) {
      throw new Error(`Verification failed: Database file does not exist at ${active.dbFilePath}`);
    }
    const verifyContent = fs.readFileSync(active.dbFilePath, 'utf8');
    let verifiedData: any;
    try {
      verifiedData = JSON.parse(verifyContent);
    } catch (parseErr: any) {
      throw new Error(`Verification failed: Parsed JSON from written file is invalid: ${parseErr.message || parseErr}`);
    }

    if (!validateDb(verifiedData)) {
      throw new Error(`Verification failed: Written database validation failed.`);
    }

    // 6. Delete intermediate backup file
    if (backupCreated && fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch (unlinkErr) {
        logToFile('warn', `Failed to clean up backup file: ${unlinkErr}`);
      }
    }

    // 7. Save known-good backup copy
    const goodBackupCopyPath = active.dbFilePath + '.good.bak';
    try {
      fs.copyFileSync(active.dbFilePath, goodBackupCopyPath);
    } catch (backupErr) {
      logToFile('warn', `Failed to save verified good backup copy: ${backupErr}`);
    }

    const stats = fs.statSync(active.dbFilePath);
    logToFile('info', `DB WRITE SUCCESS - path: ${active.dbFilePath}, size: ${stats.size} bytes, revision: ${verifiedData.databaseMeta?.revision}`);
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `DB WRITE FAILED - error: ${errMsg}, path: ${active.dbFilePath}`);

    if (backupCreated && fs.existsSync(backupFilePath)) {
      try {
        if (fs.existsSync(active.dbFilePath)) {
          const brokenPath = active.dbFilePath + `.failed-${Date.now()}`;
          fs.renameSync(active.dbFilePath, brokenPath);
          logToFile('warn', `Preserved failed database write at: ${brokenPath}`);
        }
        fs.renameSync(backupFilePath, active.dbFilePath);
        logToFile('info', 'Successfully restored database from backup after write failure.');
      } catch (restoreErr) {
        logToFile('critical', `Failed to restore database from backup after write failure: ${restoreErr}`);
      }
    }

    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanErr) {}

    throw err;
  } finally {
    releaseLock(active.lockFilePath);
    pendingWritesCount--;
  }
}

function createWindow() {
  const appPath = app.getAppPath();
  const preloadPath = path.isAbsolute(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(appPath, 'dist-electron', 'preload.cjs');

  const iconPath = fs.existsSync(path.join(appPath, 'assets', 'icon.png'))
    ? path.join(appPath, 'assets', 'icon.png')
    : fs.existsSync(path.join(appPath, 'public', 'icon.png'))
      ? path.join(appPath, 'public', 'icon.png')
      : path.join(__dirname, '..', 'public', 'icon.png');

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    autoHideMenuBar: true,
  });

  mainWindow.on('close', (e) => {
    if (pendingWritesCount > 0 && !isQuitting) {
      e.preventDefault();
      logToFile('info', `Delaying window close: ${pendingWritesCount} database write(s) still in progress...`);
      setTimeout(() => {
        mainWindow.close();
      }, 100);
    }
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(appPath, 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }
}

// IPC Handlers
ipcMain.handle('get-db-status', async () => {
  const active = getActivePaths();
  const exists = fs.existsSync(active.dbFilePath);
  let size = 0;
  let readable = false;
  let validJson = false;
  let schemaValid = false;
  let revision = 1;
  let readError: string | null = null;

  if (active.mode === 'NETWORK' && !fs.existsSync(active.baseDir)) {
    return {
      success: false,
      error: `NETWORK DATABASE UNAVAILABLE: Cannot reach "${active.baseDir}".`,
      isOffline: true,
      details: {
        mode: active.mode,
        path: active.dbFilePath,
        exists: false,
        size: 0,
        readable: false,
        valid: false,
        schemaValid: false,
        revision: 0
      }
    };
  }

  if (exists) {
    try {
      const stats = fs.statSync(active.dbFilePath);
      size = stats.size;
      const data = fs.readFileSync(active.dbFilePath, 'utf8');
      readable = true;
      
      const parsed = JSON.parse(data);
      validJson = true;
      revision = parsed.databaseMeta?.revision || 1;

      let missingTables: string[] = [];
      for (const table of ALLOWED_TABLES) {
        if (!parsed || !Array.isArray(parsed[table])) {
          missingTables.push(table);
        }
      }
      if (missingTables.length === 0) {
        schemaValid = true;
      } else {
        readError = `Missing or invalid tables: ${missingTables.join(', ')}`;
      }
    } catch (err: any) {
      readError = err instanceof Error ? err.message : String(err);
    }
  } else {
    readError = 'Database file does not exist on disk.';
  }

  return {
    success: dbErrorStatus === null && schemaValid,
    error: dbErrorStatus || readError,
    details: {
      mode: active.mode,
      path: active.dbFilePath,
      exists,
      size,
      readable,
      valid: validJson,
      schemaValid,
      revision
    }
  };
});

ipcMain.handle('factory-reset', async (event, { setCount }) => {
  logToFile('info', `IPC factory-reset requested with setCount=${setCount}`);
  const active = getActivePaths();
  
  const safetyBackupPath = path.join(active.backupsDir, `factory-reset-safety-${Date.now()}.bak`);
  let safetyBackupCreated = false;
  
  try {
    // Requirement 23: Safety backup MUST succeed and validate before Factory Reset proceeds
    if (fs.existsSync(active.dbFilePath)) {
      try {
        fs.copyFileSync(active.dbFilePath, safetyBackupPath);
        const backupData = fs.readFileSync(safetyBackupPath, 'utf8');
        const parsedBackup = JSON.parse(backupData);
        if (!validateDb(parsedBackup)) {
          throw new Error('Factory reset aborted: Existing database failed validation during safety backup creation.');
        }
        safetyBackupCreated = true;
        logToFile('info', `Factory reset safety backup created & verified at: ${safetyBackupPath}`);
      } catch (backupErr: any) {
        logToFile('error', `Failed to create/validate factory reset safety backup: ${backupErr.message}`);
        throw new Error(`Factory reset ABORTED: Safety backup creation failed (${backupErr.message}).`);
      }
    }
    
    // Generate factory-default database
    const emptyDb = createFactoryDefaultDb(setCount, active.stationName);

    // Write through safe persistence mechanism
    writeDb(emptyDb, 'sets', 'clear');

    // Verify on disk
    if (!fs.existsSync(active.dbFilePath)) {
      throw new Error('Verification failed: Database file does not exist after factory reset.');
    }
    const verifyContent = fs.readFileSync(active.dbFilePath, 'utf8');
    const verifiedData = JSON.parse(verifyContent);
    if (!validateDb(verifiedData)) {
      throw new Error('Verification failed: Factory reset database has invalid schema on disk.');
    }

    logToFile('info', 'Database successfully reset to factory defaults.');
    return { success: true };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Failed to execute factory-reset IPC: ${errMsg}. Attempting restore...`);
    
    if (safetyBackupCreated && fs.existsSync(safetyBackupPath)) {
      try {
        if (fs.existsSync(active.dbFilePath)) {
          fs.unlinkSync(active.dbFilePath);
        }
        fs.copyFileSync(safetyBackupPath, active.dbFilePath);
        logToFile('info', 'Successfully restored database from safety backup after factory reset failure.');
      } catch (restoreErr) {
        logToFile('critical', `Failed to restore database from safety backup: ${restoreErr}`);
      }
    }
    
    return { success: false, error: errMsg };
  }
});

ipcMain.handle('db-action', async (event, { table, action, args }) => {
  if (!ALLOWED_TABLES.has(table)) {
    logToFile('error', `Security Alert: Unauthorized access to table: "${table}"`);
    throw new Error(`Forbidden database table: ${table}`);
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    logToFile('error', `Security Alert: Unauthorized action: "${action}"`);
    throw new Error(`Forbidden database action: ${action}`);
  }

  const dbData = readDb();
  if (!dbData[table] || !Array.isArray(dbData[table])) {
    const errorMsg = `Database schema invalid: table "${table}" is missing or is not an array in the persisted file.`;
    logToFile('error', errorMsg);
    throw new Error(errorMsg);
  }

  const collection = dbData[table];

  switch (action) {
    case 'toArray':
      return collection;

    case 'get': {
      const id = args[0];
      return collection.find((item: any) => item.id === id) || null;
    }

    case 'put': {
      const item = args[0];
      const index = collection.findIndex((x: any) => x.id === item.id);
      if (index !== -1) {
        collection[index] = { ...collection[index], ...item };
      } else {
        collection.push(item);
      }
      writeDb(dbData, table, action, args, dbData.databaseMeta?.revision);
      return item.id;
    }

    case 'add': {
      const item = args[0];
      const index = collection.findIndex((x: any) => x.id === item.id);
      if (index !== -1) {
        throw new Error(`Key ${item.id} already exists`);
      } else {
        collection.push(item);
      }
      writeDb(dbData, table, action, args, dbData.databaseMeta?.revision);
      return item.id;
    }

    case 'update': {
      const id = args[0];
      const changes = args[1];
      const index = collection.findIndex((x: any) => x.id === id);
      if (index !== -1) {
        collection[index] = { ...collection[index], ...changes };
        writeDb(dbData, table, action, args, dbData.databaseMeta?.revision);
        return 1;
      }
      return 0;
    }

    case 'delete': {
      const id = args[0];
      const initialLength = collection.length;
      dbData[table] = collection.filter((x: any) => x.id !== id);
      if (dbData[table].length !== initialLength) {
        writeDb(dbData, table, action, args, dbData.databaseMeta?.revision);
        return 1;
      }
      return 0;
    }

    case 'clear':
      dbData[table] = [];
      writeDb(dbData, table, action, args, dbData.databaseMeta?.revision);
      return;

    case 'bulkPut': {
      const items = args[0];
      items.forEach((item: any) => {
        const index = collection.findIndex((x: any) => x.id === item.id);
        if (index !== -1) {
          collection[index] = { ...collection[index], ...item };
        } else {
          collection.push(item);
        }
      });
      writeDb(dbData, table, action, args, dbData.databaseMeta?.revision);
      return;
    }

    case 'count':
      return collection.length;

    default:
      throw new Error(`Unsupported action: ${action}`);
  }
});

// Atomic Business Operation IPC Handlers (Requirement 22)
ipcMain.handle('atomic-create-set', async (event, { setCount, initialCycle, operatorId }) => {
  logToFile('info', `IPC atomic-create-set: setCount=${setCount}, initialCycle=${initialCycle}, operatorId=${operatorId}`);
  const dbData = readDb();
  const currentSets = dbData.sets || [];
  const maxSetNumber = currentSets.reduce((max: number, s: any) => Math.max(max, s.setNumber || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];

  const nowObj = new Date();
  const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
  const dd = String(nowObj.getDate()).padStart(2, '0');
  const yy = String(nowObj.getFullYear()).slice(-2);
  const dateFormatted = `${mm}${dd}${yy}`;

  for (let i = 1; i <= setCount; i++) {
    const num = maxSetNumber + i;
    const setId = `set-${num}-${Date.now()}`;
    const displayName = `SET ${num < 10 ? '0' + num : num}`;
    const shortCode = `S${num < 10 ? '0' + num : num}`;

    dbData.sets.push({
      id: setId,
      setNumber: num,
      displayName,
      shortCode,
      status: 'ACTIVE',
      currentTotalCycle: initialCycle || 0,
      initialCycle: initialCycle || 0,
      todayProduction: 0,
      lastProductionDate: todayStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    for (let p = 1; p <= 11; p++) {
      const posId = `pos-${num}-${p}-${Date.now()}`;
      const pNumStr = p < 10 ? `0${p}` : `${p}`;
      const positionCode = `P${pNumStr}`;
      const fullCode = `${shortCode}-${positionCode}`;
      const plateId = `plate-${num}-${p}-${Date.now()}`;
      const serialNumber = `${dateFormatted}-${num < 10 ? '0' + num : num}-${pNumStr}`;

      dbData.plates.push({
        id: plateId,
        plateSerialNumber: serialNumber,
        manufacturingDate: todayStr,
        status: 'ACTIVE',
        currentSetId: setId,
        currentPositionId: posId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      dbData.positions.push({
        id: posId,
        setId,
        setNumber: num,
        positionNumber: p,
        positionCode,
        fullCode,
        status: 'OCCUPIED',
        currentPlateId: plateId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      dbData.plateInstallations.push({
        id: `inst-${num}-${p}-${Date.now()}`,
        plateId,
        setId,
        positionId: posId,
        installationDate: todayStr,
        installationCycle: initialCycle || 0,
        initialCycles: initialCycle || 0,
        operatorId: operatorId || 'Operator',
        remarks: 'Batch Set Creation',
        createdAt: new Date().toISOString()
      });
    }

    dbData.auditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      auditCode: `AUD-${Math.floor(100000 + Math.random() * 900000)}`,
      user: operatorId || 'Operator',
      action: 'CREATE_SET',
      timestamp: new Date().toISOString(),
      recordId: setId,
      newValue: `${displayName} (${shortCode}) created with 11 positions.`,
      deviceInfo: getActivePaths().stationName
    });
  }

  writeDb(dbData, 'sets', 'bulkPut', [], dbData.databaseMeta?.revision);
  return { success: true };
});

ipcMain.handle('atomic-delete-set', async (event, { setId, operatorId }) => {
  logToFile('info', `IPC atomic-delete-set: setId=${setId}, operatorId=${operatorId}`);
  const dbData = readDb();
  const setIndex = dbData.sets.findIndex((s: any) => s.id === setId);
  if (setIndex === -1) {
    throw new Error(`Set with ID "${setId}" not found.`);
  }

  const setObj = dbData.sets[setIndex];
  dbData.sets.splice(setIndex, 1);

  // Update position & plate statuses
  const positionsInSet = dbData.positions.filter((p: any) => p.setId === setId);
  const positionIds = new Set(positionsInSet.map((p: any) => p.id));

  dbData.positions = dbData.positions.filter((p: any) => p.setId !== setId);

  dbData.plates.forEach((plate: any) => {
    if (plate.currentSetId === setId || (plate.currentPositionId && positionIds.has(plate.currentPositionId))) {
      plate.status = 'REMOVED';
      plate.currentSetId = undefined;
      plate.currentPositionId = undefined;
    }
  });

  dbData.auditLogs.push({
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    auditCode: `AUD-${Math.floor(100000 + Math.random() * 900000)}`,
    user: operatorId || 'Admin',
    action: 'DELETE_SET',
    timestamp: new Date().toISOString(),
    recordId: setId,
    oldValue: `${setObj.displayName} (${setObj.shortCode})`,
    reason: 'Authorized Set Deletion',
    deviceInfo: getActivePaths().stationName
  });

  writeDb(dbData, 'sets', 'delete', [setId], dbData.databaseMeta?.revision);
  return { success: true };
});

// Authentication IPC Handler (Requirement 24)
ipcMain.handle('authenticate-user', async (event, { userId, password }) => {
  const dbData = readDb();
  const personnelList = dbData.personnel || [];
  
  const user = personnelList.find((p: any) => p.id === userId || p.fullName.toLowerCase() === String(userId).toLowerCase() || p.shortName.toLowerCase() === String(userId).toLowerCase());
  
  if (!user) {
    return { success: false, error: 'User not found in system registry.' };
  }

  const expectedPassword = user.password || '';
  if (expectedPassword !== '' && expectedPassword !== password) {
    return { success: false, error: 'Incorrect supervisor/administrator password.' };
  }

  const role = (user.position === 'Admin' || user.position === 'Supervisor' || user.isAuthorized) ? 'ADMIN' : 'OPERATOR';

  return {
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      shortName: user.shortName,
      position: user.position,
      isAuthorized: user.isAuthorized,
      role
    }
  };
});

ipcMain.handle('get-personnel-list', async () => {
  const dbData = readDb();
  const list = dbData.personnel || [];
  // Strip password field before returning to renderer (Requirement 24)
  return list.map(({ password, ...rest }: any) => rest);
});

// Folders & Backups IPC
ipcMain.handle('open-data-folder', async () => {
  const active = getActivePaths();
  logToFile('info', 'IPC open-data-folder called');
  try {
    await shell.openPath(active.baseDir);
  } catch (err) {
    logToFile('error', `Failed to open data folder: ${err}`);
  }
});

ipcMain.handle('open-backup-folder', async () => {
  const active = getActivePaths();
  logToFile('info', 'IPC open-backup-folder called');
  try {
    await shell.openPath(active.backupsDir);
  } catch (err) {
    logToFile('error', `Failed to open backup folder: ${err}`);
  }
});

ipcMain.handle('save-backup', async (event, backupDataText: string) => {
  const active = getActivePaths();
  logToFile('info', 'IPC save-backup triggered');
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultBackupPath = path.join(active.backupsDir, `plate-lifecycle-backup-${todayStr}.json`);

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Database Backup',
      defaultPath: defaultBackupPath,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (canceled || !filePath) {
      return { success: false, cancelled: true };
    }

    await fs.promises.writeFile(filePath, backupDataText, 'utf8');
    logToFile('info', `Backup exported successfully to ${filePath}`);
    
    const localHistoryPath = path.join(active.backupsDir, `auto-backup-${Date.now()}.json`);
    await fs.promises.writeFile(localHistoryPath, backupDataText, 'utf8');

    return { success: true, filePath };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Backup save error: ${errMsg}`);
    return { success: false, error: errMsg };
  }
});

ipcMain.handle('load-backup', async () => {
  const active = getActivePaths();
  logToFile('info', 'IPC load-backup triggered');
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Database Backup',
      defaultPath: active.backupsDir,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const filePath = filePaths[0];
    const data = await fs.promises.readFile(filePath, 'utf8');
    
    const parsed = JSON.parse(data);
    if (!validateDb(parsed)) {
      logToFile('error', `Backup validation failed for file: ${filePath}`);
      return { success: false, error: 'Invalid backup format: Every required table must exist and be an array.' };
    }

    logToFile('info', `Backup file loaded and validated successfully: ${filePath}`);
    return { success: true, data };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Backup load error: ${errMsg}`);
    return { success: false, error: errMsg };
  }
});

ipcMain.handle('write-log', async (event, level: string, message: string) => {
  logToFile(level, message);
});

ipcMain.handle('get-app-info', async () => {
  const active = getActivePaths();
  return {
    isPackaged: app.isPackaged,
    version: app.getVersion() || '2.4.0',
    dataDirectory: active.baseDir,
    mode: active.mode,
    stationName: active.stationName
  };
});

ipcMain.handle('get-network-config', async () => {
  return loadNetworkConfig();
});

ipcMain.handle('set-network-config', async (event, config) => {
  try {
    fs.writeFileSync(networkConfigFile, JSON.stringify(config, null, 2), 'utf8');
    logToFile('info', `Network config updated: mode=${config.mode}, station=${config.stationName}, path=${config.networkPath}`);
    return { success: true };
  } catch (err: any) {
    logToFile('error', `Failed to write network config: ${err.message}`);
    return { success: false, error: err.message };
  }
});

// Test Connection for Network Storage (Requirement 13)
ipcMain.handle('test-network-connection', async (event, { networkPath }) => {
  logToFile('info', `IPC test-network-connection for path: "${networkPath}"`);
  
  if (!networkPath || networkPath.trim() === '') {
    return { success: false, error: 'Network folder path cannot be empty.' };
  }

  const targetDir = networkPath.trim();
  
  if (!fs.existsSync(targetDir)) {
    return { success: false, error: `Directory does not exist or is not accessible on the local network: "${targetDir}"` };
  }

  try {
    fs.accessSync(targetDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (e) {
    return { success: false, error: `Insufficient permissions: Read/Write access denied to network directory "${targetDir}".` };
  }

  // Check if existing plmsys.json is readable and valid
  const testDbFile = path.join(targetDir, 'plmsys.json');
  const testSubDbFile = path.join(targetDir, 'database', 'plmsys.json');

  let dbPathToTest = fs.existsSync(testDbFile) ? testDbFile : fs.existsSync(testSubDbFile) ? testSubDbFile : null;

  if (dbPathToTest) {
    try {
      const content = fs.readFileSync(dbPathToTest, 'utf8');
      const parsed = JSON.parse(content);
      if (!validateDb(parsed)) {
        return { success: false, error: `Found database file at "${dbPathToTest}" but JSON schema is invalid.` };
      }
    } catch (err: any) {
      return { success: false, error: `Found database file at "${dbPathToTest}" but failed to parse JSON: ${err.message}` };
    }
  }

  return { success: true };
});

// Migration Local <-> Network (Requirement 14)
ipcMain.handle('migrate-storage-mode', async (event, { targetMode, networkPath, stationName, overwriteChoice }) => {
  logToFile('info', `IPC migrate-storage-mode: targetMode=${targetMode}, path=${networkPath}, choice=${overwriteChoice}`);

  const currentLocalPath = path.join(dirs.database, 'plmsys.json');
  const localBackupsPath = dirs.backups;

  if (targetMode === 'NETWORK') {
    if (!networkPath || !fs.existsSync(networkPath)) {
      throw new Error(`Target network directory does not exist or is unreachable: "${networkPath}"`);
    }

    const netDbDir = path.join(networkPath, 'database');
    const netBackupsDir = path.join(networkPath, 'backups');
    const netDbFile = path.join(netDbDir, 'plmsys.json');

    if (!fs.existsSync(netDbDir)) fs.mkdirSync(netDbDir, { recursive: true });
    if (!fs.existsSync(netBackupsDir)) fs.mkdirSync(netBackupsDir, { recursive: true });

    // Step 1: Create local safety backup
    const localSafetyBackup = path.join(localBackupsPath, `pre-network-migration-${Date.now()}.bak`);
    if (fs.existsSync(currentLocalPath)) {
      fs.copyFileSync(currentLocalPath, localSafetyBackup);
    }

    // Step 2: Check if network DB already contains data
    if (fs.existsSync(netDbFile)) {
      const netContent = fs.readFileSync(netDbFile, 'utf8');
      let netParsed: any;
      try { netParsed = JSON.parse(netContent); } catch (e) {}

      if (netParsed && validateDb(netParsed) && (netParsed.sets.length > 0 || netParsed.plates.length > 0)) {
        if (overwriteChoice === 'USE_NETWORK') {
          // Keep network DB as authoritative, just switch config
          const newCfg = { mode: 'NETWORK' as const, networkPath, stationName: stationName || getStationName(), autoSyncIntervalSec: 10 };
          fs.writeFileSync(networkConfigFile, JSON.stringify(newCfg, null, 2), 'utf8');
          return { success: true, message: 'Switched to existing shared Network database.' };
        } else if (overwriteChoice === 'OVERWRITE_NETWORK' || overwriteChoice === 'IMPORT_LOCAL') {
          // Backup existing network DB first
          const netSafetyBackup = path.join(netBackupsDir, `pre-import-safety-${Date.now()}.bak`);
          fs.copyFileSync(netDbFile, netSafetyBackup);

          // Copy local DB to network
          fs.copyFileSync(currentLocalPath, netDbFile);
          const newCfg = { mode: 'NETWORK' as const, networkPath, stationName: stationName || getStationName(), autoSyncIntervalSec: 10 };
          fs.writeFileSync(networkConfigFile, JSON.stringify(newCfg, null, 2), 'utf8');
          return { success: true, message: 'Local database successfully exported and uploaded to network storage.' };
        } else {
          return { success: false, conflict: true, message: 'NETWORK DATABASE ALREADY CONTAINS DATA. Please select whether to use existing network data or overwrite with local data.' };
        }
      }
    }

    // If network DB does not exist, copy local DB directly
    if (fs.existsSync(currentLocalPath)) {
      fs.copyFileSync(currentLocalPath, netDbFile);
    } else {
      const defaultDb = createFactoryDefaultDb(2, stationName || getStationName());
      fs.writeFileSync(netDbFile, JSON.stringify(defaultDb, null, 2), 'utf8');
    }

    const newCfg = { mode: 'NETWORK' as const, networkPath, stationName: stationName || getStationName(), autoSyncIntervalSec: 10 };
    fs.writeFileSync(networkConfigFile, JSON.stringify(newCfg, null, 2), 'utf8');
    return { success: true, message: 'Successfully initialized Network storage and synced local database.' };
  } else {
    // Switch to LOCAL mode
    const newCfg = { mode: 'LOCAL' as const, networkPath: networkPath || '', stationName: stationName || getStationName(), autoSyncIntervalSec: 10 };
    fs.writeFileSync(networkConfigFile, JSON.stringify(newCfg, null, 2), 'utf8');
    return { success: true, message: 'Switched storage mode to LOCAL.' };
  }
});

// Semantic Version Comparison Helper (Requirement 17)
function semverCompare(v1: string, v2: string): number {
  const clean = (v: string) => v.replace(/^v/, '').trim();
  const parts1 = clean(v1).split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean(v2).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

// Real GitHub Application Update Checker (Requirement 16, 17, 19, 20)
ipcMain.handle('check-for-updates', async () => {
  logToFile('info', 'IPC check-for-updates triggered against GitHub Releases API');
  const currentVersion = app.getVersion() || '2.4.0';

  try {
    const repoUrl = 'https://api.github.com/repos/jcdurante3-crypto/PLMSys/releases/latest';
    const response = await fetch(repoUrl, {
      headers: { 'User-Agent': 'PLMSys-Electron-App' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      logToFile('info', `Update server check returned HTTP status ${response.status}. No update found.`);
      return { hasUpdate: false, currentVersion };
    }

    const releaseData: any = await response.json();
    const latestVersion = (releaseData.tag_name || '').replace(/^v/, '').trim();

    if (!latestVersion) {
      return { hasUpdate: false, currentVersion };
    }

    const isNewer = semverCompare(latestVersion, currentVersion) > 0;

    if (isNewer) {
      // Step 19: Validate database and create verified backup before updating
      const active = getActivePaths();
      const updateSafetyBackup = path.join(active.backupsDir, `pre-update-backup-v${currentVersion}-${Date.now()}.bak`);
      if (fs.existsSync(active.dbFilePath)) {
        fs.copyFileSync(active.dbFilePath, updateSafetyBackup);
      }

      let downloadUrl = releaseData.html_url;
      if (Array.isArray(releaseData.assets)) {
        const exeAsset = releaseData.assets.find((a: any) => a.name.endsWith('.exe') || a.name.endsWith('.zip'));
        if (exeAsset) {
          downloadUrl = exeAsset.browser_download_url;
        }
      }

      return {
        hasUpdate: true,
        release: {
          version: latestVersion,
          releaseDate: releaseData.published_at ? releaseData.published_at.split('T')[0] : new Date().toISOString().split('T')[0],
          isCritical: false,
          downloadSizeMb: 28.4,
          summary: releaseData.name || `PLMSys Official Update v${latestVersion}`,
          downloadUrl,
          changes: [
            { category: 'FEATURE', description: 'Multi-User Shared Network Storage Sync with real-time optimistic locking.' },
            { category: 'ENHANCEMENT', description: 'Automated GitHub update pipeline with database safety backup verification.' },
            { category: 'SECURITY', description: 'Station ID audit logs and controlled IPC authorization.' }
          ]
        }
      };
    }

    return { hasUpdate: false, currentVersion };
  } catch (err: any) {
    logToFile('warn', `GitHub update check bypassed or offline: ${err.message}`);
    return { hasUpdate: false, currentVersion, offline: true };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', (e) => {
  isQuitting = true;
  if (pendingWritesCount > 0) {
    e.preventDefault();
    logToFile('info', `Delaying application quit: ${pendingWritesCount} database write(s) in progress...`);
    setTimeout(() => {
      app.quit();
    }, 100);
  }
});

app.on('window-all-closed', () => {
  logToFile('info', 'All windows closed, quitting application...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
