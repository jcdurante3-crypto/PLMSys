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

export function isElectronEnv(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

export interface ITable<T extends { id: string }, Key = string> {
  toArray(): Promise<T[]>;
  put(item: T): Promise<Key>;
  bulkPut(items: T[]): Promise<Key[]>;
  update(key: Key, changes: Partial<T>): Promise<number>;
  delete(key: Key): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

class DexieTableWrapper<T extends { id: string }> implements ITable<T, string> {
  constructor(private dexieTable: Table<T, string>) {}

  async toArray(): Promise<T[]> {
    return this.dexieTable.toArray();
  }
  async put(item: T): Promise<string> {
    return this.dexieTable.put(item);
  }
  async bulkPut(items: T[]): Promise<string[]> {
    return this.dexieTable.bulkPut(items) as unknown as Promise<string[]>;
  }
  async update(key: string, changes: Partial<T>): Promise<number> {
    return this.dexieTable.update(key, changes as any);
  }
  async delete(key: string): Promise<void> {
    return this.dexieTable.delete(key);
  }
  async clear(): Promise<void> {
    return this.dexieTable.clear();
  }
  async count(): Promise<number> {
    return this.dexieTable.count();
  }
}

export class PlateDatabaseDexie extends Dexie {
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

export class AppDatabaseWrapper {
  sets: ITable<SetRecord, string>;
  positions: ITable<PositionRecord, string>;
  plates: ITable<PlateRecord, string>;
  plateInstallations: ITable<PlateInstallationRecord, string>;
  plateRemovals: ITable<PlateRemovalRecord, string>;
  dailyProduction: ITable<DailyProductionRecord, string>;
  replacements: ITable<ReplacementRecord, string>;
  jobOrders: ITable<JobOrderRecord, string>;
  auditLogs: ITable<AuditRecord, string>;
  personnel: ITable<Personnel, string>;

  private dexieDb?: PlateDatabaseDexie;

  constructor() {
    this.dexieDb = new PlateDatabaseDexie();
    this.sets = new DexieTableWrapper<SetRecord>(this.dexieDb.sets);
    this.positions = new DexieTableWrapper<PositionRecord>(this.dexieDb.positions);
    this.plates = new DexieTableWrapper<PlateRecord>(this.dexieDb.plates);
    this.plateInstallations = new DexieTableWrapper<PlateInstallationRecord>(this.dexieDb.plateInstallations);
    this.plateRemovals = new DexieTableWrapper<PlateRemovalRecord>(this.dexieDb.plateRemovals);
    this.dailyProduction = new DexieTableWrapper<DailyProductionRecord>(this.dexieDb.dailyProduction);
    this.replacements = new DexieTableWrapper<ReplacementRecord>(this.dexieDb.replacements);
    this.jobOrders = new DexieTableWrapper<JobOrderRecord>(this.dexieDb.jobOrders);
    this.auditLogs = new DexieTableWrapper<AuditRecord>(this.dexieDb.auditLogs);
    this.personnel = new DexieTableWrapper<Personnel>(this.dexieDb.personnel);
  }

  async getDbInfo(): Promise<{ dbPath: string; appDir: string; isInsideAppFolder: boolean; backend: string }> {
    if (isElectronEnv()) {
      return {
        dbPath: 'IndexedDB (Electron Profile)',
        appDir: 'Electron Application Container',
        isInsideAppFolder: true,
        backend: 'Dexie.js / IndexedDB (Electron Desktop)'
      };
    }
    return {
      dbPath: 'IndexedDB (Browser)',
      appDir: 'N/A (Browser)',
      isInsideAppFolder: false,
      backend: 'Dexie.js / IndexedDB'
    };
  }
}

export const db = new AppDatabaseWrapper();

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
export async function seedDatabase(setCount: number = 2, force: boolean = false) {
  if (isSeeding) return;
  isSeeding = true;
  
  try {
    const existingSetsCount = await db.sets.count();
    
    // If not forcing, check if we already have sets. If setCount is 0 and we have 0 sets, we're done.
    if (!force && existingSetsCount === setCount) {
      isSeeding = false;
      return;
    }

    // Always clear all tables first to ensure a clean state if data is incorrect or forced
    await Promise.all([
      db.sets.clear(),
      db.positions.clear(),
      db.plates.clear(),
      db.plateInstallations.clear(),
      db.plateRemovals.clear(),
      db.dailyProduction.clear(),
      db.replacements.clear(),
      db.jobOrders.clear(),
      db.auditLogs.clear(),
      db.personnel.clear()
    ]);

    // Seed default personnel
    await db.personnel.bulkPut([
      { id: 'pers-1', fullName: 'Jane Smith', shortName: 'JS', position: 'Supervisor', isAuthorized: true, password: 'password123' },
      { id: 'pers-2', fullName: 'Admin User', shortName: 'ADMIN', position: 'Admin', isAuthorized: true, password: 'JADB1994' }
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    // Default job orders
    const jo1Id = 'jo-1';
    const jo2Id = 'jo-2';
    await db.jobOrders.bulkPut([
      { id: jo1Id, jobOrderNumber: 'JO-2026-001', description: 'Heavy Production Run Q3', date: todayStr, status: 'IN_PROGRESS' },
      { id: jo2Id, jobOrderNumber: 'JO-2026-002', description: 'High Speed Strip Rollout', date: todayStr, status: 'OPEN' }
    ]);

    const setsToCreate: SetRecord[] = [];
    const positionsToCreate: PositionRecord[] = [];

    // Skip automatic set creation to allow user to start fresh
    // Only seed sets if specifically requested via setCount > 0
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

      // Create 11 positions per set
      for (let p = 1; p <= 11; p++) {
        const posId = `pos-${i}-${p}`;
        const pNumStr = p < 10 ? `0${p}` : `${p}`;
        const positionCode = `P${pNumStr}`;
        const fullCode = `${shortCode}-${positionCode}`;

        positionsToCreate.push({
          id: posId,
          setId,
          setNumber: i,
          positionNumber: p,
          positionCode,
          fullCode,
          status: 'EMPTY',
          currentPlateId: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    if (setsToCreate.length) {
      await db.sets.bulkPut(setsToCreate);
    }
    if (positionsToCreate.length) {
      await db.positions.bulkPut(positionsToCreate);
    }
  } finally {
    isSeeding = false;
  }
}
