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

function initDbFile() {
  if (!fs.existsSync(dbFilePath)) {
    logToFile('info', 'Database file does not exist. Creating initial factory database...');
    const defaultDb = createFactoryDefaultDb(2);
    const tempFilePath = dbFilePath + '.tmp';
    fs.writeFileSync(tempFilePath, JSON.stringify(defaultDb, null, 2), 'utf8');
    fs.renameSync(tempFilePath, dbFilePath);
    
    // Also save a verified good backup immediately
    try {
      fs.copyFileSync(dbFilePath, dbFilePath + '.good.bak');
    } catch (err) {
      logToFile('warn', `Failed to write initial good backup copy: ${err}`);
    }
  }
}

function handleCorruptDbFile() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const corruptBackupPath = dbFilePath + `.corrupt-${Date.now()}`;
      fs.renameSync(dbFilePath, corruptBackupPath);
      logToFile('info', `Corrupted database file was renamed and preserved at: ${corruptBackupPath}`);
      dbErrorStatus = `Database file was corrupted and has been renamed to protect your data. Corrupted file saved at: ${path.basename(corruptBackupPath)}`;
    }
  } catch (e) {
    logToFile('error', `Failed to rename corrupted database file: ${e}`);
  }
}

function readDb() {
  try {
    initDbFile();
    const data = fs.readFileSync(dbFilePath, 'utf8');
    let parsed: any;
    let parseFailed = false;
    let parseErrorMsg = '';
    try {
      parsed = JSON.parse(data);
    } catch (parseErr: any) {
      parseFailed = true;
      parseErrorMsg = parseErr.message;
    }

    // Verify all expected collections exist as arrays
    let isInvalid = false;
    if (!parseFailed) {
      for (const table of ALLOWED_TABLES) {
        if (!parsed || !Array.isArray(parsed[table])) {
          isInvalid = true;
          break;
        }
      }
    }

    if (parseFailed || isInvalid) {
      const reason = parseFailed 
        ? `Database JSON parsing failed: ${parseErrorMsg}`
        : 'Database validation failed: Expected collections are missing or invalid.';
      logToFile('error', `${reason} Attempting recovery from latest good backup...`);
      
      const backupCopyPath = dbFilePath + '.good.bak';
      if (fs.existsSync(backupCopyPath)) {
        try {
          const backupData = fs.readFileSync(backupCopyPath, 'utf8');
          const backupParsed = JSON.parse(backupData);
          
          // Verify backup is valid
          let backupInvalid = false;
          for (const table of ALLOWED_TABLES) {
            if (!backupParsed || !Array.isArray(backupParsed[table])) {
              backupInvalid = true;
              break;
            }
          }
          
          if (!backupInvalid) {
            // Preserve the corrupted file first
            handleCorruptDbFile();
            // Copy backup to dbFilePath
            fs.copyFileSync(backupCopyPath, dbFilePath);
            logToFile('info', 'Database successfully auto-recovered and restored from latest known-good backup.');
            return backupParsed;
          }
        } catch (backupRecoveryErr) {
          logToFile('error', `Failed to restore from backup during auto-recovery: ${backupRecoveryErr}`);
        }
      }
      
      // If we reach here, we could not auto-recover
      handleCorruptDbFile();
      throw new Error(`Database file is corrupt/invalid, and no valid backup was available for auto-recovery. Your corrupted data has been preserved. Details: ${reason}`);
    }

    return parsed;
  } catch (err) {
    logToFile('error', `Failed to read database: ${err}`);
    throw err; // Crucial: throw/report error, DO NOT silently swallow and return empty DB!
  }
}

let pendingWritesCount = 0;
let isQuitting = false;

function writeDb(data: any, table?: string, action?: string, args?: any[]) {
  pendingWritesCount++;
  try {
    logToFile('info', `DB WRITE START - table: ${table || 'N/A'}, action: ${action || 'N/A'}, database path: ${dbFilePath}`);
    
    // 1. Write to temp file first to verify it writes successfully
    const tempFilePath = dbFilePath + '.tmp';
    fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2), 'utf8');
    
    // 2. Perform the atomic, Windows-safe replacement with backup safety
    const backupFilePath = dbFilePath + '.bak';
    let backupCreated = false;
    
    try {
      if (fs.existsSync(dbFilePath)) {
        if (fs.existsSync(backupFilePath)) {
          fs.unlinkSync(backupFilePath);
        }
        // Move current file to backup
        fs.renameSync(dbFilePath, backupFilePath);
        backupCreated = true;
      }
      
      // Move temp file to current file path
      fs.renameSync(tempFilePath, dbFilePath);
      
      // Clean up backup now that we successfully replaced it
      if (backupCreated && fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }
    } catch (renameErr) {
      logToFile('error', `Atomic rename failed, attempting backup/fallback recovery: ${renameErr}`);
      
      // Restore the backup if we successfully renamed it
      if (backupCreated && fs.existsSync(backupFilePath)) {
        try {
          if (fs.existsSync(dbFilePath)) {
            fs.unlinkSync(dbFilePath);
          }
          fs.renameSync(backupFilePath, dbFilePath);
          logToFile('info', 'Successfully restored database from backup after rename failure');
        } catch (restoreErr) {
          logToFile('critical', `Failed to restore database from backup: ${restoreErr}`);
        }
      } else {
        // If no backup was created but temp file exists, try a direct write fallback
        try {
          fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
          logToFile('info', 'Fallback write direct to dbFilePath succeeded');
        } catch (writeErr) {
          logToFile('critical', `Fallback direct write failed: ${writeErr}`);
        }
      }
      
      // Clean up temp file if still exists
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanErr) {}
      
      throw renameErr; // Propagate rename error
    }

    // 3. Verify written file immediately
    if (!fs.existsSync(dbFilePath)) {
      throw new Error(`Verification failed: Database file does not exist at ${dbFilePath}`);
    }
    const verifyContent = fs.readFileSync(dbFilePath, 'utf8');
    let verifiedData: any;
    try {
      verifiedData = JSON.parse(verifyContent);
    } catch (parseErr) {
      throw new Error(`Verification failed: Parsed JSON from written file is invalid: ${parseErr}`);
    }

    // Verify all expected tables exist
    for (const allowedTable of ALLOWED_TABLES) {
      if (!verifiedData[allowedTable] || !Array.isArray(verifiedData[allowedTable])) {
        throw new Error(`Verification failed: Table "${allowedTable}" is missing or invalid in verified database.`);
      }
    }

    // If a specific table and action were requested, verify that change is present
    if (table) {
      const collection = verifiedData[table];
      if (action === 'put' || action === 'add') {
        const item = args && args[0];
        const targetId = item ? item.id : null;
        if (targetId) {
          const exists = collection.some((x: any) => x.id === targetId);
          if (!exists) {
            throw new Error(`Verification failed: Record with ID "${targetId}" was not found in table "${table}" after write.`);
          }
        }
      } else if (action === 'update') {
        const targetId = args && args[0];
        if (targetId) {
          const exists = collection.some((x: any) => x.id === targetId);
          if (!exists) {
            throw new Error(`Verification failed: Record with ID "${targetId}" was not found in table "${table}" after update.`);
          }
        }
      } else if (action === 'delete') {
        const targetId = args && args[0];
        if (targetId) {
          const exists = collection.some((x: any) => x.id === targetId);
          if (exists) {
            throw new Error(`Verification failed: Record with ID "${targetId}" should have been deleted but still exists in table "${table}".`);
          }
        }
      } else if (action === 'bulkPut') {
        const items = args && args[0];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id) {
              const exists = collection.some((x: any) => x.id === item.id);
              if (!exists) {
                throw new Error(`Verification failed: Bulk-put record with ID "${item.id}" was not found in table "${table}" after write.`);
              }
            }
          }
        }
      } else if (action === 'clear') {
        if (collection.length !== 0) {
          throw new Error(`Verification failed: Table "${table}" was cleared but still contains ${collection.length} records.`);
        }
      }
    }

    // 4. Save a known-good backup copy since verification succeeded
    const goodBackupCopyPath = dbFilePath + '.good.bak';
    try {
      fs.copyFileSync(dbFilePath, goodBackupCopyPath);
    } catch (backupErr) {
      logToFile('warn', `Failed to save verified good backup copy: ${backupErr}`);
    }

    const stats = fs.statSync(dbFilePath);
    logToFile('info', `DB WRITE SUCCESS - database path: ${dbFilePath}, file size: ${stats.size} bytes`);
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `DB WRITE FAILED - error: ${errMsg}, database path: ${dbFilePath}`);
    throw err; // Propagate error so IPC fails visible to UI
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
  return {
    success: dbErrorStatus === null,
    error: dbErrorStatus
  };
});

ipcMain.handle('factory-reset', async (event, { setCount }) => {
  logToFile('info', `IPC factory-reset requested with setCount=${setCount}`);
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowObj = new Date();
    const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nowObj.getDate()).padStart(2, '0');
    const yy = String(nowObj.getFullYear()).slice(-2);
    const dateFormatted = `${mm}${dd}${yy}`;

    const emptyDb: any = {
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

        emptyDb.sets.push({
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

          emptyDb.plates.push({
            id: plateId,
            plateSerialNumber: serialNumber,
            manufacturingDate: todayStr,
            status: 'ACTIVE',
            currentSetId: setId,
            currentPositionId: posId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          emptyDb.positions.push({
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

          emptyDb.plateInstallations.push({
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

    writeDb(emptyDb);
    logToFile('info', 'Database successfully reset to factory defaults.');
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logToFile('error', `Failed to execute factory-reset IPC: ${errMsg}`);
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
  if (!dbData[table]) {
    dbData[table] = [];
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
    
    // Quick validation
    const parsed = JSON.parse(data);
    if (!parsed.sets || !parsed.positions) {
      logToFile('error', `Backup validation failed for file: ${filePath}`);
      return { success: false, error: 'Invalid backup format: Missing required collections.' };
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
