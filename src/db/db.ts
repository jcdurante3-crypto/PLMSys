import Dexie, { type Table } from 'dexie';
import {
  SetRecord,
  PositionRecord,
  PlateRecord,
  PlateInstallationRecord,
  PlateRemovalRecord,
  DailyProductionRecord,
  ReplacementRecord,
  JobOrderRecord,
  AuditRecord,
  Personnel
} from '../types';

export class PlateDatabase extends Dexie {
  sets!: Table<SetRecord, string>;
  positions!: Table<PositionRecord, string>;
  plates!: Table<PlateRecord, string>;
  plateInstallations!: Table<PlateInstallationRecord, string>;
  plateRemovals!: Table<PlateRemovalRecord, string>;
  dailyProduction!: Table<DailyProductionRecord, string>;
  replacements!: Table<ReplacementRecord, string>;
  jobOrders!: Table<JobOrderRecord, string>;
  auditLogs!: Table<AuditRecord, string>;
  personnel!: Table<Personnel, string>;

  constructor() {
    super('PlateLifecycleDB');
    this.version(1).stores({
      sets: 'id, setNumber, shortCode, status',
      positions: 'id, setId, setNumber, positionNumber, fullCode, status, currentPlateId',
      plates: 'id, plateSerialNumber, status',
      plateInstallations: 'id, plateId, setId, positionId, installationDate',
      plateRemovals: 'id, plateId, setId, positionId, removalDate, status',
      dailyProduction: 'id, setId, date, jobOrderId',
      replacements: 'id, setId, positionId, oldPlateId, newPlateId',
      jobOrders: 'id, jobOrderNumber, status',
      auditLogs: 'id, auditCode, action, timestamp',
      personnel: 'id, fullName, shortName, isAuthorized'
    });
  }
}

export const db = new PlateDatabase();

// IPC-based database proxy for physical portable database file in Electron
if (typeof window !== 'undefined' && (window as any).electronAPI) {
  const tableNames = [
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
  ];

  tableNames.forEach((tableName) => {
    const proxyTable = {
      toArray: () => (window as any).electronAPI.dbAction(tableName, 'toArray', []),
      get: (id: any) => (window as any).electronAPI.dbAction(tableName, 'get', [id]),
      put: (item: any) => (window as any).electronAPI.dbAction(tableName, 'put', [item]),
      add: (item: any) => (window as any).electronAPI.dbAction(tableName, 'add', [item]),
      update: (id: any, changes: any) => (window as any).electronAPI.dbAction(tableName, 'update', [id, changes]),
      delete: (id: any) => (window as any).electronAPI.dbAction(tableName, 'delete', [id]),
      clear: () => (window as any).electronAPI.dbAction(tableName, 'clear', []),
      bulkPut: (items: any) => (window as any).electronAPI.dbAction(tableName, 'bulkPut', [items]),
      count: () => (window as any).electronAPI.dbAction(tableName, 'count', [])
    };
    Object.defineProperty(db, tableName, {
      get: () => proxyTable,
      configurable: true,
      enumerable: true
    });
  });

  // IMPORTANT DEVELOPMENT NOTE (Requirement 9):
  // This is a dummy Dexie-compatible transaction proxy to support compatibility with
  // the existing Dexie API usage in the application without requiring a full refactor.
  // DO NOT assume or rely on this as a real database transaction!
  // It immediately executes the callback. There is NO database roll-back or multi-table locking.
  // For multi-table operations requiring true atomicity, always use a dedicated Electron IPC operation
  // on the Electron main process layer instead (such as 'factory-reset').
  (db as any).transaction = (mode: any, tables: any, callback: any) => {
    return callback();
  };
}

// Helper to generate UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Seed initial database if empty or force reset
let isSeeding = false;
export async function seedDatabase(setCount: number = 0, force: boolean = false) {
  if (isSeeding && !force) return;
  isSeeding = true;
  
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      if (force) {
        const res = await (window as any).electronAPI.factoryReset(setCount);
        if (!res.success) {
          throw new Error(res.error || 'Failed to factory reset database');
        }
        return;
      } else {
        // Normal startup inside Electron: NEVER automatically factory reset.
        // The main process handles creating the initial factory database if the file plmsys.json did not exist.
        // Therefore, we return immediately and DO NOT call factoryReset.
        return;
      }
    }

    // Inside browser fallback:
    if (!force) {
      // 1. Check IndexedDB counts FIRST. If there is data in any key table, we must NEVER clear/overwrite it!
      try {
        const existingSetsCount = await db.sets.count();
        const existingPersonnelCount = await db.personnel.count();
        const existingPlatesCount = await db.plates.count();
        if (existingSetsCount > 0 || existingPersonnelCount > 0 || existingPlatesCount > 0) {
          localStorage.setItem('plmsys_browser_initialized', 'true');
          return;
        }
      } catch (dbCheckErr) {
        console.warn('Failed to check database counts, proceeding with fallback check:', dbCheckErr);
      }

      // 2. Fallback to localStorage flag check
      const hasInitialized = localStorage.getItem('plmsys_browser_initialized');
      if (hasInitialized) {
        return;
      }
      
      localStorage.setItem('plmsys_browser_initialized', 'true');
    }

    // Always clear all tables first inside an atomic transaction to prevent IndexedDB lockups
    await db.transaction('rw', [
      db.sets,
      db.positions,
      db.plates,
      db.plateInstallations,
      db.plateRemovals,
      db.dailyProduction,
      db.replacements,
      db.jobOrders,
      db.auditLogs,
      db.personnel
    ], async () => {
      await db.sets.clear();
      await db.positions.clear();
      await db.plates.clear();
      await db.plateInstallations.clear();
      await db.plateRemovals.clear();
      await db.dailyProduction.clear();
      await db.replacements.clear();
      await db.jobOrders.clear();
      await db.auditLogs.clear();
      await db.personnel.clear();
    });

    // Seed default personnel
    await db.personnel.bulkPut([
      { id: 'pers-1', fullName: 'Jane Smith', shortName: 'JS', position: 'Supervisor', isAuthorized: true, password: 'password123' },
      { id: 'pers-2', fullName: 'John Doe', shortName: 'JD', position: 'Operator', isAuthorized: false, password: '' },
      { id: 'pers-3', fullName: 'Administrator', shortName: 'Admin', position: 'Admin', isAuthorized: true, password: 'JADB1994' }
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    // Default job orders
    const jo1Id = 'jo-1';
    const jo2Id = 'jo-2';
    await db.jobOrders.bulkPut([
      { id: jo1Id, jobOrderNumber: '0626-26', description: 'Heavy Production Run Q3', date: todayStr, status: 'IN_PROGRESS' },
      { id: jo2Id, jobOrderNumber: '0712-26', description: 'High Speed Strip Rollout', date: todayStr, status: 'OPEN' }
    ]);

    const setsToCreate: SetRecord[] = [];
    const positionsToCreate: PositionRecord[] = [];
    const platesToCreate: PlateRecord[] = [];
    const installationsToCreate: PlateInstallationRecord[] = [];

    const nowObj = new Date();
    const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nowObj.getDate()).padStart(2, '0');
    const yy = String(nowObj.getFullYear()).slice(-2);
    const dateFormatted = `${mm}${dd}${yy}`;

    // Seed sets (e.g. SET 01 and SET 02) when requested
    for (let i = 1; i <= setCount; i++) {
      const setId = `set-${i}`;
      const displayName = `SET ${i < 10 ? '0' + i : i}`;
      const shortCode = `S${i < 10 ? '0' + i : i}`;

      setsToCreate.push({
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

      // Create 11 positions per set with active plates installed
      for (let p = 1; p <= 11; p++) {
        const posId = `pos-${i}-${p}`;
        const pNumStr = p < 10 ? `0${p}` : `${p}`;
        const positionCode = `P${pNumStr}`;
        const fullCode = `${shortCode}-${positionCode}`;
        const plateId = `plate-${i}-${p}`;
        const serialNumber = `${dateFormatted}-${i < 10 ? '0' + i : i}-${pNumStr}`;

        platesToCreate.push({
          id: plateId,
          plateSerialNumber: serialNumber,
          manufacturingDate: todayStr,
          status: 'ACTIVE',
          currentSetId: setId,
          currentPositionId: posId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        positionsToCreate.push({
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

        installationsToCreate.push({
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

    await db.sets.bulkPut(setsToCreate);
    await db.positions.bulkPut(positionsToCreate);
    await db.plates.bulkPut(platesToCreate);
    await db.plateInstallations.bulkPut(installationsToCreate);
  } finally {
    isSeeding = false;
  }
}
