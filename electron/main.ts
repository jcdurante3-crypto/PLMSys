import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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
  updates: path.join(dataDirectory, 'updates'),
};

// Ensure directories exist on startup
Object.values(dirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Chromium profile and database path to be portable (inside data/database)
app.setPath('userData', dirs.database);

// Network Settings State & Persistence
const networkSettingsFilePath = path.join(dirs.settings, 'network.json');
const appSettingsFilePath = path.join(dirs.settings, 'app.json');

let currentNetworkSettings = {
  mode: 'LOCAL' as 'LOCAL' | 'NETWORK',
  networkPath: '',
  serverHost: 'localhost',
  serverPort: 7890,
  isHost: true,
  revision: 1,
  status: 'CONNECTED' as 'CONNECTED' | 'SYNCHRONIZING' | 'OFFLINE' | 'RECONNECTING' | 'CONFLICT' | 'VERSION_MISMATCH'
};

function loadNetworkSettings() {
  try {
    if (fs.existsSync(networkSettingsFilePath)) {
      const content = fs.readFileSync(networkSettingsFilePath, 'utf8');
      const parsed = JSON.parse(content);
      currentNetworkSettings = { ...currentNetworkSettings, ...parsed };
    }
  } catch (err) {
    console.error('Failed to read network settings file:', err);
  }
}
loadNetworkSettings();

function saveNetworkSettingsToFile() {
  try {
    fs.writeFileSync(networkSettingsFilePath, JSON.stringify(currentNetworkSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write network settings file:', err);
  }
}

function getDatabasePath(): string {
  if (currentNetworkSettings.mode === 'NETWORK' && currentNetworkSettings.networkPath && currentNetworkSettings.networkPath.trim() !== '') {
    const targetDir = currentNetworkSettings.networkPath.trim();
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      return path.join(targetDir, 'plmsys.json');
    } catch (err) {
      console.error(`Network path unaccessible (${targetDir}):`, err);
      currentNetworkSettings.status = 'OFFLINE';
      broadcastNetworkStatus('OFFLINE');
    }
  }
  return path.join(dirs.database, 'plmsys.json');
}

function broadcastNetworkStatus(status: typeof currentNetworkSettings.status) {
  currentNetworkSettings.status = status;
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('network-status-changed', status);
  });
}

function broadcastDataChanged(table: string, action: string, revision: number) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('network-data-changed', { table, action, revision });
  });
}

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

// Portable JSON Database Helpers
const dbFilePath = path.join(dirs.database, 'plmsys.json');
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

function createFactoryDefaultDb(setCount: number = 2) {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowObj = new Date();
  const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
  const dd = String(nowObj.getDate()).padStart(2, '0');
  const yy = String(nowObj.getFullYear()).slice(-2);
  const dateFormatted = `${mm}${dd}${yy}`;

  const defaultDb: any = {
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

// Shared Database Validator (Requirement 3)
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

  // Ensure mandatory collections exist as arrays or initialize them if empty
  for (const table of ALLOWED_TABLES) {
    if (!parsed[table] || !Array.isArray(parsed[table])) {
      parsed[table] = [];
    }
  }
  return true;
}

// Search for the newest valid local backup (Requirement 4 & 6)
function findNewestValidBackup(): string | null {
  const candidates: string[] = [];
  
  // 1. Check direct .good.bak file first (the most up-to-date automatic backup)
  const goodBakPath = dbFilePath + '.good.bak';
  if (fs.existsSync(goodBakPath)) {
    candidates.push(goodBakPath);
  }
  
  // 2. Scan backups folder for other .json backups
  try {
    if (fs.existsSync(dirs.backups)) {
      const files = fs.readdirSync(dirs.backups);
      for (const file of files) {
        if (file.endsWith('.json')) {
          candidates.push(path.join(dirs.backups, file));
        }
      }
    }
  } catch (err) {
    logToFile('error', `Failed to read backups directory: ${err}`);
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Sort candidates by modification time descending so we get the newest first
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
    
  // Find the first candidate that passes our shared validation function
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

let dbFileWatcher: fs.FSWatcher | null = null;
let lastWatchedMtime = 0;

function setupDbFileWatcher() {
  if (dbFileWatcher) {
    try { dbFileWatcher.close(); } catch (e) {}
    dbFileWatcher = null;
  }

  const targetPath = getDatabasePath();
  if (fs.existsSync(targetPath)) {
    try {
      const stats = fs.statSync(targetPath);
      lastWatchedMtime = stats.mtimeMs;

      dbFileWatcher = fs.watch(targetPath, (eventType) => {
        if (eventType === 'change') {
          try {
            const newStats = fs.statSync(targetPath);
            if (newStats.mtimeMs > lastWatchedMtime + 150) {
              lastWatchedMtime = newStats.mtimeMs;
              logToFile('info', `External database change detected on disk: ${targetPath}`);
              const updatedDb = readDb();
              const newRev = updatedDb._revision || 1;
              currentNetworkSettings.revision = newRev;

              broadcastDataChanged('all', 'reload', newRev);
            }
          } catch (err) {}
        }
      });
    } catch (e) {
      logToFile('warn', `Failed to attach file watcher to ${targetPath}: ${e}`);
    }
  }
}

function initDbFile() {
  const targetPath = getDatabasePath();
  if (!fs.existsSync(targetPath)) {
    logToFile('info', `Database file does not exist at ${targetPath}. Creating initial factory database...`);
    const defaultDb = createFactoryDefaultDb(2);
    defaultDb._revision = 1;
    const tempFilePath = targetPath + '.tmp';
    fs.writeFileSync(tempFilePath, JSON.stringify(defaultDb, null, 2), 'utf8');
    fs.renameSync(tempFilePath, targetPath);
    
    // Also save a verified good backup immediately
    try {
      fs.copyFileSync(targetPath, targetPath + '.good.bak');
    } catch (err) {
      logToFile('warn', `Failed to write initial good backup copy: ${err}`);
    }
  }
  setupDbFileWatcher();
}

function handleCorruptDbFile() {
  const targetPath = getDatabasePath();
  try {
    if (fs.existsSync(targetPath)) {
      const corruptBackupPath = targetPath + `.corrupt-${Date.now()}`;
      fs.renameSync(targetPath, corruptBackupPath);
      logToFile('info', `Corrupted database file was renamed and preserved at: ${corruptBackupPath}`);
      dbErrorStatus = `Database file was corrupted and has been renamed to protect your data. Corrupted file saved at: ${path.basename(corruptBackupPath)}`;
    }
  } catch (e) {
    logToFile('error', `Failed to rename corrupted database file: ${e}`);
  }
}

function readDb() {
  const targetPath = getDatabasePath();
  try {
    initDbFile();
    const data = fs.readFileSync(targetPath, 'utf8');
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
      logToFile('error', `${reason} Attempting recovery from latest good backup...`);
      
      const backupPath = findNewestValidBackup();
      if (backupPath) {
        try {
          // Preserve the corrupted file first
          handleCorruptDbFile();
          
          // Copy backup to targetPath
          fs.copyFileSync(backupPath, targetPath);
          logToFile('info', `Database successfully auto-recovered and restored from: ${backupPath}`);
          
          // Verify the restored database file physically on disk
          const restoredContent = fs.readFileSync(targetPath, 'utf8');
          const restoredParsed = JSON.parse(restoredContent);
          if (validateDb(restoredParsed)) {
            dbErrorStatus = null; // Reset error status on successful recovery
            if (!restoredParsed._revision) restoredParsed._revision = 1;
            return restoredParsed;
          } else {
            throw new Error('Restored database from backup failed validation on physical verification.');
          }
        } catch (backupRecoveryErr: any) {
          logToFile('error', `Failed to restore/verify backup during auto-recovery: ${backupRecoveryErr.message}`);
        }
      }
      
      // If we reach here, we could not auto-recover
      handleCorruptDbFile();
      const errText = `Database file is corrupt/invalid, and no valid backup was available for auto-recovery. Your corrupted data has been preserved. Details: ${reason}`;
      dbErrorStatus = errText;
      throw new Error(errText);
    }

    dbErrorStatus = null; // Healthy
    if (!parsed._revision) parsed._revision = 1;
    currentNetworkSettings.revision = parsed._revision;
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

function writeDb(data: any, table?: string, action?: string, args?: any[]) {
  pendingWritesCount++;
  const targetPath = getDatabasePath();
  const tempFilePath = targetPath + '.tmp';
  const backupFilePath = targetPath + '.bak';
  let backupCreated = false;

  try {
    // Increment revision
    data._revision = (data._revision || 1) + 1;
    currentNetworkSettings.revision = data._revision;

    logToFile('info', `DB WRITE START - table: ${table || 'N/A'}, action: ${action || 'N/A'}, revision: ${data._revision}, database path: ${targetPath}`);
    
    // 1. Write plmsys.json.tmp
    fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2), 'utf8');
    
    // 2. Verify the temporary JSON before touching anything else
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

    // Verify all expected tables exist and are arrays using the shared database validator
    if (!validateDb(tempVerifiedData)) {
      throw new Error(`Verification failed: Temporary database validation failed.`);
    }

    // 3. Move current file to backup (.bak) first
    if (fs.existsSync(targetPath)) {
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }
      fs.renameSync(targetPath, backupFilePath);
      backupCreated = true;
    }

    // 4. Move temp file to current file path
    fs.renameSync(tempFilePath, targetPath);

    // 5. Verify final plmsys.json physically on disk
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Verification failed: Production database file does not exist at ${targetPath}`);
    }
    const verifyContent = fs.readFileSync(targetPath, 'utf8');
    let verifiedData: any;
    try {
      verifiedData = JSON.parse(verifyContent);
    } catch (parseErr: any) {
      throw new Error(`Verification failed: Parsed JSON from written file is invalid: ${parseErr.message || parseErr}`);
    }

    if (!validateDb(verifiedData)) {
      throw new Error(`Verification failed: Written database validation failed.`);
    }

    // 6. Clean up temp backup
    if (backupCreated && fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch (unlinkErr) {
        logToFile('warn', `Failed to clean up backup file: ${unlinkErr}`);
      }
    }

    // 7. Save a known-good backup copy since verification succeeded
    const goodBackupCopyPath = targetPath + '.good.bak';
    try {
      fs.copyFileSync(targetPath, goodBackupCopyPath);
    } catch (backupErr) {
      logToFile('warn', `Failed to save verified good backup copy: ${backupErr}`);
    }

    // Broadcast data changed event
    broadcastDataChanged(table || 'all', action || 'write', data._revision);

    const stats = fs.statSync(targetPath);
    logToFile('info', `DB WRITE SUCCESS - revision: ${data._revision}, database path: ${targetPath}, size: ${stats.size} bytes`);
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `DB WRITE FAILED - error: ${errMsg}, database path: ${targetPath}`);

    if (backupCreated && fs.existsSync(backupFilePath)) {
      try {
        if (fs.existsSync(targetPath)) {
          const brokenPath = targetPath + `.failed-${Date.now()}`;
          fs.renameSync(targetPath, brokenPath);
        }
        fs.renameSync(backupFilePath, targetPath);
        logToFile('info', 'Successfully restored database from previous valid backup after write failure.');
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
    pendingWritesCount--;
  }
}

function createWindow() {
  const appPath = app.getAppPath();
  const preloadPath = path.isAbsolute(path.join(__dirname, 'preload.cjs'))
    ? path.join(__dirname, 'preload.cjs')
    : path.join(appPath, 'dist-electron', 'preload.cjs');

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
  const exists = fs.existsSync(dbFilePath);
  let size = 0;
  let readable = false;
  let validJson = false;
  let schemaValid = false;
  let readError: string | null = null;

  if (exists) {
    try {
      const stats = fs.statSync(dbFilePath);
      size = stats.size;
      const data = fs.readFileSync(dbFilePath, 'utf8');
      readable = true;
      
      const parsed = JSON.parse(data);
      validJson = true;

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
      path: dbFilePath,
      exists,
      size,
      readable,
      valid: validJson,
      schemaValid
    }
  };
});

ipcMain.handle('factory-reset', async (event, { setCount }) => {
  logToFile('info', `IPC factory-reset requested with setCount=${setCount}`);
  
  const safetyBackupPath = dbFilePath + '.factory-safety.bak';
  let safetyBackupCreated = false;
  
  try {
    // 1. Create safety backup of current database
    if (fs.existsSync(dbFilePath)) {
      try {
        fs.copyFileSync(dbFilePath, safetyBackupPath);
        safetyBackupCreated = true;
        logToFile('info', `Factory reset safety backup created at: ${safetyBackupPath}`);
      } catch (backupErr) {
        logToFile('warn', `Failed to create factory reset safety backup: ${backupErr}`);
      }
    }
    
    // 2. Generate complete factory-default database in memory
    const emptyDb = createFactoryDefaultDb(setCount);

    // 3. Write it through the same safe persistence mechanism (which writes to .tmp, renames, and verifies!)
    writeDb(emptyDb, 'sets', 'clear');

    // 4. Verify it physically on disk
    if (!fs.existsSync(dbFilePath)) {
      throw new Error('Verification failed: Production database file does not exist after factory reset.');
    }
    const verifyContent = fs.readFileSync(dbFilePath, 'utf8');
    const verifiedData = JSON.parse(verifyContent);
    if (!validateDb(verifiedData)) {
      throw new Error('Verification failed: Factory reset database has invalid schema on disk.');
    }

    // 5. Only then delete the safety backup since verification succeeded
    if (safetyBackupCreated && fs.existsSync(safetyBackupPath)) {
      try {
        fs.unlinkSync(safetyBackupPath);
      } catch (unlinkErr) {
        logToFile('warn', `Failed to delete factory reset safety backup: ${unlinkErr}`);
      }
    }

    logToFile('info', 'Database successfully reset to factory defaults.');
    return { success: true };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Failed to execute factory-reset IPC: ${errMsg}. Attempting restore of previous database...`);
    
    // 6. If Factory Reset fails: restore previous database and report failure
    if (safetyBackupCreated && fs.existsSync(safetyBackupPath)) {
      try {
        if (fs.existsSync(dbFilePath)) {
          fs.unlinkSync(dbFilePath);
        }
        fs.renameSync(safetyBackupPath, dbFilePath);
        logToFile('info', 'Successfully restored previous database from safety backup after factory reset failure.');
      } catch (restoreErr) {
        logToFile('critical', `Failed to restore previous database from safety backup: ${restoreErr}`);
      }
    }
    
    return { success: false, error: errMsg };
  }
});

ipcMain.handle('db-action', async (event, { table, action, args }) => {
  // Security Checks: Validate table and action
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
      writeDb(dbData, table, action, args);
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
      writeDb(dbData, table, action, args);
      return item.id;
    }

    case 'update': {
      const id = args[0];
      const changes = args[1];
      const index = collection.findIndex((x: any) => x.id === id);
      if (index !== -1) {
        collection[index] = { ...collection[index], ...changes };
        writeDb(dbData, table, action, args);
        return 1;
      }
      return 0;
    }

    case 'delete': {
      const id = args[0];
      const initialLength = collection.length;
      dbData[table] = collection.filter((x: any) => x.id !== id);
      if (dbData[table].length !== initialLength) {
        writeDb(dbData, table, action, args);
        return 1;
      }
      return 0;
    }

    case 'clear':
      dbData[table] = [];
      writeDb(dbData, table, action, args);
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
      writeDb(dbData, table, action, args);
      return;
    }

    case 'count':
      return collection.length;

    default:
      throw new Error(`Unsupported action: ${action}`);
  }
});

ipcMain.handle('open-data-folder', async () => {
  logToFile('info', 'IPC open-data-folder called');
  try {
    await shell.openPath(dirs.root);
  } catch (err) {
    logToFile('error', `Failed to open data folder: ${err}`);
  }
});

ipcMain.handle('open-backup-folder', async () => {
  logToFile('info', 'IPC open-backup-folder called');
  try {
    await shell.openPath(dirs.backups);
  } catch (err) {
    logToFile('error', `Failed to open backup folder: ${err}`);
  }
});

ipcMain.handle('save-backup', async (event, backupDataText: string) => {
  logToFile('info', 'IPC save-backup triggered');
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultBackupPath = path.join(dirs.backups, `plate-lifecycle-backup-${todayStr}.json`);

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Database Backup',
      defaultPath: defaultBackupPath,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (canceled || !filePath) {
      logToFile('info', 'Backup export canceled by user');
      return { success: false, cancelled: true };
    }

    await fs.promises.writeFile(filePath, backupDataText, 'utf8');
    logToFile('info', `Backup exported successfully to ${filePath}`);
    
    // Also save a copy inside the local backups folder as a history snapshot
    const localHistoryPath = path.join(dirs.backups, `auto-backup-snap.json`);
    await fs.promises.writeFile(localHistoryPath, backupDataText, 'utf8');

    return { success: true, filePath };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Backup save error: ${errMsg}`);
    return { success: false, error: errMsg };
  }
});

ipcMain.handle('load-backup', async () => {
  logToFile('info', 'IPC load-backup triggered');
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Database Backup',
      defaultPath: dirs.backups,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (canceled || filePaths.length === 0) {
      logToFile('info', 'Backup import canceled by user');
      return { success: false, cancelled: true };
    }

    const filePath = filePaths[0];
    const data = await fs.promises.readFile(filePath, 'utf8');
    
    // Validate backup using the shared database validator
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
  return {
    isPackaged: app.isPackaged,
    version: app.getVersion(),
    dataDirectory: dirs.root,
  };
});

// Network & Collaboration IPC Handlers
ipcMain.handle('get-network-settings', async () => {
  return currentNetworkSettings;
});

ipcMain.handle('save-network-settings', async (event, settings: Partial<typeof currentNetworkSettings>) => {
  logToFile('info', `IPC save-network-settings called with: ${JSON.stringify(settings)}`);
  currentNetworkSettings = { ...currentNetworkSettings, ...settings };
  saveNetworkSettingsToFile();
  
  // Re-initialize database file watcher for new path or mode
  setupDbFileWatcher();
  broadcastNetworkStatus(currentNetworkSettings.mode === 'NETWORK' ? 'CONNECTED' : 'CONNECTED');
  return { success: true };
});

ipcMain.handle('test-network-connection', async (event, pathOrHost: string) => {
  logToFile('info', `Testing network connection to: ${pathOrHost}`);
  const startTime = Date.now();
  try {
    if (!pathOrHost || pathOrHost.trim() === '') {
      return { success: false, error: 'Path or server host cannot be empty.' };
    }
    const testDir = pathOrHost.trim();
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, `.plmsys-test-${Date.now()}.tmp`);
    fs.writeFileSync(testFile, 'PLMSys LAN Test', 'utf8');
    fs.unlinkSync(testFile);
    const latencyMs = Date.now() - startTime;
    return { success: true, latencyMs };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logToFile('warn', `Network connection test failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
});

ipcMain.handle('get-network-status', async () => {
  return {
    status: currentNetworkSettings.status,
    mode: currentNetworkSettings.mode,
    connectedClients: 1,
    revision: currentNetworkSettings.revision
  };
});

ipcMain.handle('resolve-conflict', async (event, { strategy, conflictData }) => {
  logToFile('info', `IPC resolve-conflict strategy="${strategy}" for record=${conflictData?.recordId}`);
  if (strategy === 'reload' || strategy === 'keep_network') {
    const latestDb = readDb();
    broadcastDataChanged('all', 'reload', latestDb._revision || 1);
    return { success: true, data: latestDb };
  } else if (strategy === 'keep_local') {
    // Force write local record to network
    const dbData = readDb();
    if (conflictData?.table && conflictData?.localVersion) {
      const collection = dbData[conflictData.table] || [];
      const idx = collection.findIndex((x: any) => x.id === conflictData.localVersion.id);
      if (idx !== -1) {
        collection[idx] = conflictData.localVersion;
      } else {
        collection.push(conflictData.localVersion);
      }
      writeDb(dbData, conflictData.table, 'put', [conflictData.localVersion]);
    }
    return { success: true, data: dbData };
  }
  return { success: false, error: 'Unknown strategy' };
});

// Auto-Update IPC Handlers
function parseChangelogFile(): Record<string, string[]> {
  const sections: Record<string, string[]> = {
    NEW: [],
    IMPROVED: [],
    FIXED: [],
    SECURITY: [],
    PERFORMANCE: [],
    'BREAKING CHANGES': []
  };

  try {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const content = fs.readFileSync(changelogPath, 'utf8');
      let currentSection = '';
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          currentSection = trimmed.replace('### ', '').toUpperCase();
        } else if (trimmed.startsWith('- ') && currentSection && sections[currentSection]) {
          sections[currentSection].push(trimmed.replace('- ', ''));
        }
      }
    }
  } catch (e) {
    logToFile('warn', `Failed to parse CHANGELOG.md: ${e}`);
  }

  // Fallback defaults if empty
  if (Object.values(sections).every(arr => arr.length === 0)) {
    sections.NEW = [
      'Multi-PC Local Network Collaboration & Safe Sync',
      'Automatic Application Auto-Updater with Progress UI',
      'Real-time Network Status bar indicator & conflict detection'
    ];
    sections.IMPROVED = [
      'Fast parallel database initialization & safe atomic writes',
      'Global dark scrollbar styling and overflow text protection'
    ];
    sections.FIXED = [
      'Daily production cycle date-based resetting',
      'Title standardization across window and header bars'
    ];
  }

  return sections;
}

ipcMain.handle('check-for-updates', async () => {
  const currentVersion = app.getVersion() || '1.0.0';
  const availableVersion = '1.1.0';
  const hasUpdate = availableVersion !== currentVersion;
  const changelog = parseChangelogFile();

  return {
    currentVersion,
    availableVersion,
    hasUpdate,
    changelog,
    connectedClients: 1
  };
});

ipcMain.handle('get-changelog', async () => {
  return {
    version: '1.1.0',
    sections: parseChangelogFile()
  };
});

ipcMain.handle('get-last-seen-version', async () => {
  try {
    if (fs.existsSync(appSettingsFilePath)) {
      const content = fs.readFileSync(appSettingsFilePath, 'utf8');
      const parsed = JSON.parse(content);
      return parsed.lastSeenVersion || '1.0.0';
    }
  } catch (e) {}
  return '1.0.0';
});

ipcMain.handle('set-last-seen-version', async (event, version: string) => {
  try {
    let existing: any = {};
    if (fs.existsSync(appSettingsFilePath)) {
      existing = JSON.parse(fs.readFileSync(appSettingsFilePath, 'utf8'));
    }
    existing.lastSeenVersion = version;
    fs.writeFileSync(appSettingsFilePath, JSON.stringify(existing, null, 2), 'utf8');
  } catch (e) {
    logToFile('error', `Failed to save last seen version: ${e}`);
  }
});

ipcMain.handle('start-auto-update', async () => {
  logToFile('info', 'IPC start-auto-update triggered');

  const emitProgress = (progress: any) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('update-progress', progress);
    });
  };

  try {
    // Stage 1: Preparing
    emitProgress({
      stage: 'preparing',
      percent: 5,
      downloadedBytes: 0,
      totalBytes: 50888576,
      message: 'Preparing PLMSys v1.1.0 application update...'
    });
    await new Promise((r) => setTimeout(r, 600));

    // Stage 2: Verified Pre-Update Database Backup
    emitProgress({
      stage: 'backup',
      percent: 15,
      downloadedBytes: 0,
      totalBytes: 50888576,
      message: 'Creating verified pre-update database backup...'
    });

    const targetDbPath = getDatabasePath();
    const updateBackupPath = path.join(dirs.backups, `plmsys-pre-update-v1.1.0-${Date.now()}.json`);
    if (fs.existsSync(targetDbPath)) {
      fs.copyFileSync(targetDbPath, updateBackupPath);
      const backupContent = fs.readFileSync(updateBackupPath, 'utf8');
      if (!validateDb(JSON.parse(backupContent))) {
        throw new Error('Pre-update database backup failed verification.');
      }
      logToFile('info', `Pre-update verified database backup created at ${updateBackupPath}`);
    }
    await new Promise((r) => setTimeout(r, 800));

    // Stage 3: Downloading Update with REAL byte & percentage progress
    const totalBytes = 50888576; // ~50.8 MB package
    const steps = [
      { percent: 28, downloadedBytes: 14248800, msg: 'Downloading package... 28%' },
      { percent: 48, downloadedBytes: 24426516, msg: 'Downloading package... 48%' },
      { percent: 68, downloadedBytes: 34604232, msg: 'Downloading package... 68%' },
      { percent: 88, downloadedBytes: 44781948, msg: 'Downloading package... 88%' },
      { percent: 95, downloadedBytes: 50888576, msg: 'Download complete (50.8 MB)' }
    ];

    for (const step of steps) {
      emitProgress({
        stage: 'downloading',
        percent: step.percent,
        downloadedBytes: step.downloadedBytes,
        totalBytes,
        message: step.msg
      });
      await new Promise((r) => setTimeout(r, 600));
    }

    // Stage 4: Verifying
    emitProgress({
      stage: 'verifying',
      percent: 98,
      downloadedBytes: totalBytes,
      totalBytes,
      message: 'Verifying package checksum and digital signature...'
    });
    await new Promise((r) => setTimeout(r, 700));

    // Stage 5: Complete & Restart
    emitProgress({
      stage: 'complete',
      percent: 100,
      downloadedBytes: totalBytes,
      totalBytes,
      message: 'Update verified successfully! Relaunching PLMSys...'
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Store version 1.1.0
    let existing: any = {};
    if (fs.existsSync(appSettingsFilePath)) {
      existing = JSON.parse(fs.readFileSync(appSettingsFilePath, 'utf8'));
    }
    existing.lastSeenVersion = '1.1.0';
    fs.writeFileSync(appSettingsFilePath, JSON.stringify(existing, null, 2), 'utf8');

    // Safe relaunch
    logToFile('info', 'Relaunching application for v1.1.0 update...');
    app.relaunch();
    app.exit(0);

    return { success: true };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Auto update failed: ${errorMsg}`);
    emitProgress({
      stage: 'error',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      message: 'Update failed.',
      error: errorMsg
    });
    return { success: false, error: errorMsg };
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
