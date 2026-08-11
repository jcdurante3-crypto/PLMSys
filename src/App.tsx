import React, { useState, useEffect } from 'react';
import { db, seedDatabase, generateUUID } from './db/db';
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
  Personnel,
  User,
  PlateStatus,
  RejectType
} from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SetDetail } from './components/SetDetail';
import { PositionModal } from './components/PositionModal';
import { DailyProductionView } from './components/DailyProductionView';
import { GlobalSearch } from './components/GlobalSearch';
import { AuditLogView } from './components/AuditLogView';
import { CreateSetModal } from './components/CreateSetModal';
import { LogProductionModal } from './components/LogProductionModal';
import { ManageSetView } from './components/ManageSetView';
import { LoginModal } from './components/LoginModal';
import { RegistryModal } from './components/RegistryModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { TutorialModal } from './components/TutorialModal';
import { NetworkSyncModal } from './components/NetworkSyncModal';
import { UpdateModal } from './components/UpdateModal';
import { ChangelogModal } from './components/ChangelogModal';
import { useAutoBackup } from './hooks/useAutoBackup';
import { Shield, RotateCcw, X, Clock } from 'lucide-react';
import { NetworkStorageConfig, UpdateRelease } from './types';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<SetRecord[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [plates, setPlates] = useState<PlateRecord[]>([]);
  const [installations, setInstallations] = useState<PlateInstallationRecord[]>([]);
  const [removals, setRemovals] = useState<PlateRemovalRecord[]>([]);
  const [dailyProductions, setDailyProductions] = useState<DailyProductionRecord[]>([]);
  const [replacements, setReplacements] = useState<ReplacementRecord[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrderRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);

  const [undoableBatch, setUndoableBatch] = useState<{
    ids: string[];
    timestamp: number;
    description: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin'>('dashboard');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User>({ name: 'Operator', role: 'OPERATOR' });
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showRegistryModal, setShowRegistryModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [showLogProductionModal, setShowLogProductionModal] = useState(false);
  const [showNetworkSyncModal, setShowNetworkSyncModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [isSyncingNetwork, setIsSyncingNetwork] = useState(false);

  const [networkConfig, setNetworkConfig] = useState<NetworkStorageConfig>({
    mode: 'LOCAL',
    networkPath: '\\\\PLM-NAS\\SharedData\\plmsys_shared.json',
    stationName: 'PC-01 (Line 1 Terminal)',
    autoSyncIntervalSec: 3,
    isOnline: true,
    lastSyncedAt: new Date().toLocaleTimeString()
  });

  const [currentRelease] = useState<UpdateRelease>({
    version: '2.4.0',
    releaseDate: '2026-08-11',
    isCritical: false,
    downloadSizeMb: 28.4,
    summary: 'Major Release: Multi-Platform Network Storage Real-Time Sync & Automated Update Engine',
    changes: [
      { category: 'FEATURE', description: 'Multi-User Local Network Storage Sync with real-time peer station detection across PC1 & PC2.' },
      { category: 'FEATURE', description: 'Automated Software Update System featuring real-time percentage countdowns & animated installation pipeline.' },
      { category: 'ENHANCEMENT', description: 'Interactive Release Notes & Categorized Version Changelog Viewer.' },
      { category: 'ENHANCEMENT', description: 'Contextual Plate Replacement Confirmation View with Outgoing vs Incoming Specs.' },
      { category: 'SECURITY', description: 'Station ID metadata attached directly to physical audit records.' }
    ]
  });

  const [selectedPosModal, setSelectedPosModal] = useState<{
    position: PositionRecord;
    action: 'install' | 'replace' | 'history';
  } | null>(null);

  useAutoBackup({
    onBackup: async () => {
      console.log('Performing scheduled/threshold auto-backup');
      await handleExportBackup();
    },
    logCount: auditLogs.length,
    activityThreshold: 50
  });

  const loadData = async () => {
    try {
      await seedDatabase(0, false);
      const [
        sData,
        pData,
        plData,
        iData,
        rData,
        dpData,
        repData,
        joData,
        aData,
        persData,
      ] = await Promise.all([
        db.sets.toArray(),
        db.positions.toArray(),
        db.plates.toArray(),
        db.plateInstallations.toArray(),
        db.plateRemovals.toArray(),
        db.dailyProduction.toArray(),
        db.replacements.toArray(),
        db.jobOrders.toArray(),
        db.auditLogs.toArray(),
        db.personnel.toArray(),
      ]);

      sData.sort((a, b) => b.setNumber - a.setNumber);
      setSets(sData);
      setPositions(pData);
      setPlates(plData);
      setInstallations(iData);
      setRemovals(rData);
      setDailyProductions(dpData);
      setReplacements(repData);
      setJobOrders(joData);
      setAuditLogs(aData);
      setPersonnel(persData);
    } catch (err) {
      console.error('Failed to load database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkDbStatus = async () => {
      if (window.electronAPI && window.electronAPI.getDbStatus) {
        try {
          const res = await window.electronAPI.getDbStatus();
          if (!res.success && res.error) {
            console.warn('DATABASE RESTORATION WARNING:', res.error);
          }
        } catch (e) {
          console.error('Failed to get database status:', e);
        }
      }
    };

    const loadNetworkSettings = async () => {
      if (window.electronAPI?.getNetworkStorageConfig) {
        try {
          const cfg = await window.electronAPI.getNetworkStorageConfig();
          if (cfg) {
            setNetworkConfig(cfg);
          }
        } catch (err) {
          console.warn('Could not load network config from Electron API:', err);
        }
      }
    };

    checkDbStatus();
    loadNetworkSettings();
    loadData();
  }, []);

  // Background Auto-Sync Effect for Shared Network Storage Mode
  useEffect(() => {
    if (networkConfig.mode !== 'NETWORK' || networkConfig.autoSyncIntervalSec <= 0) {
      return;
    }

    const intervalMs = networkConfig.autoSyncIntervalSec * 1000;
    const syncInterval = setInterval(async () => {
      try {
        await loadData();
        setNetworkConfig((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toLocaleTimeString()
        }));
      } catch (err) {
        console.error('Network auto-sync background poll error:', err);
      }
    }, intervalMs);

    return () => clearInterval(syncInterval);
  }, [networkConfig.mode, networkConfig.autoSyncIntervalSec]);

  const handleManualNetworkSync = async () => {
    setIsSyncingNetwork(true);
    try {
      await loadData();
      setNetworkConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toLocaleTimeString()
      }));
    } catch (err) {
      console.error('Manual network sync error:', err);
    } finally {
      setIsSyncingNetwork(false);
    }
  };

  const handleSaveNetworkConfig = async (newConfig: NetworkStorageConfig) => {
    setNetworkConfig(newConfig);
    if (window.electronAPI?.setNetworkStorageConfig) {
      await window.electronAPI.setNetworkStorageConfig(newConfig);
    }
    await handleManualNetworkSync();
  };

  // Handlers
  const handleUpdateSet = async (
    setId: string,
    displayName: string,
    shortCode: string,
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
    currentTotalCycle: number
  ) => {
    const originalSet = sets.find(s => s.id === setId);
    if (!originalSet) return;

    await db.sets.update(setId, {
      displayName,
      shortCode,
      status,
      currentTotalCycle,
      updatedAt: new Date().toISOString(),
    });

    // Add Audit Log
    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: currentUser.name,
      action: 'EDIT_SET',
      timestamp: new Date().toISOString(),
      recordId: setId,
      oldValue: `${originalSet.displayName} (${originalSet.shortCode}) - ${originalSet.status} - ${originalSet.currentTotalCycle}`,
      newValue: `${displayName} (${shortCode}) - ${status} - ${currentTotalCycle}`,
      reason: `Updated details of Set: ${displayName}`,
      deviceInfo: navigator.userAgent,

    });

    await loadData();
  };

  const handleAddProduction = async (
    setId: string,
    positionId: string | 'ALL',
    cycles: number,
    jobOrderId: string,
    operatorName: string,
    checkedBy: string,
    remarks: string
  ) => {
    const targetSet = sets.find(s => s.id === setId);
    if (!targetSet) return;
    
    const todayStr = new Date().toISOString().split('T')[0];

    if (positionId !== 'ALL') {
      const position = positions.find(p => p.id === positionId);
      if (position && position.currentPlateId) {
        const plateInst = installations.find(i => i.plateId === position.currentPlateId && i.positionId === position.id);
        if (plateInst) {
          const oldInitial = plateInst.initialCycles || 0;
          const newInitial = oldInitial + cycles;
          await db.plateInstallations.update(plateInst.id, {
            initialCycles: newInitial
          });

          const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
          await db.auditLogs.put({
            id: generateUUID(),
            auditCode,
            user: operatorName,
            action: 'ADD_PRODUCTION',
            timestamp: new Date().toISOString(),
            recordId: position.currentPlateId,
            oldValue: String(oldInitial),
            newValue: String(newInitial),
            reason: `Added +${cycles} cycles to plate in position ${position.fullCode} (JO: ${jobOrderId})`,
            deviceInfo: navigator.userAgent,
            checkedBy,
          });
          await loadData();
          return;
        }
      }
    }

    const prevCycle = targetSet.currentTotalCycle;
    const newCycle = prevCycle + cycles;

    // Update set
    await db.sets.update(setId, {
      currentTotalCycle: newCycle,
      todayProduction: targetSet.todayProduction + cycles,
      lastProductionDate: todayStr,
      updatedAt: new Date().toISOString(),
    });

    // Create daily production record
    const newProdId = generateUUID();
    const newProdRecord: DailyProductionRecord = {
      id: newProdId,
      setId,
      date: todayStr,
      jobOrderId,
      previousTotalCycle: prevCycle,
      productionCycles: cycles,
      currentTotalCycle: newCycle,
      operatorId: operatorName,
      checkedBy,
      remarks,
      createdAt: new Date().toISOString(),
    };
    await db.dailyProduction.put(newProdRecord);

    setUndoableBatch({
      ids: [newProdId],
      timestamp: Date.now(),
      description: `Added +${cycles.toLocaleString()} cycles to ${targetSet.displayName} (JO: ${jobOrderId})`
    });

    // Audit log
    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: operatorName,
      action: 'ADD_PRODUCTION',
      timestamp: new Date().toISOString(),
      recordId: setId,
      oldValue: String(prevCycle),
      newValue: String(newCycle),
      reason: `Added +${cycles} cycles to ${targetSet.displayName} (JO: ${jobOrderId})`,
      deviceInfo: navigator.userAgent,
      checkedBy,
    });

    await loadData();
  };

  const handleAddProductionRange = async (
    fromSetNum: number,
    toSetNum: number,
    cycles: number,
    jobOrderNumber: string,
    operatorName: string,
    checkedBy: string,
    remarks: string
  ) => {
    const targetSets = sets.filter(s => s.setNumber >= fromSetNum && s.setNumber <= toSetNum);
    if (targetSets.length === 0) {
      alert('No sets found in the specified range.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const createdIds: string[] = [];

    for (const targetSet of targetSets) {
      const prevCycle = targetSet.currentTotalCycle;
      const newCycle = prevCycle + cycles;

      await db.sets.update(targetSet.id, {
        currentTotalCycle: newCycle,
        todayProduction: targetSet.todayProduction + cycles,
        lastProductionDate: todayStr,
        updatedAt: new Date().toISOString(),
      });

      const newProdId = generateUUID();
      createdIds.push(newProdId);

      const newProdRecord: DailyProductionRecord = {
        id: newProdId,
        setId: targetSet.id,
        date: todayStr,
        jobOrderId: jobOrderNumber,
        previousTotalCycle: prevCycle,
        productionCycles: cycles,
        currentTotalCycle: newCycle,
        operatorId: operatorName,
        checkedBy,
        remarks,
        createdAt: new Date().toISOString(),
      };
      await db.dailyProduction.put(newProdRecord);
    }

    setUndoableBatch({
      ids: createdIds,
      timestamp: Date.now(),
      description: `Added +${cycles.toLocaleString()} cycles to ${targetSets.length} set(s) [Set ${fromSetNum}–${toSetNum}] (JO: ${jobOrderNumber})`
    });

    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: operatorName,
      action: 'ADD_PRODUCTION',
      timestamp: new Date().toISOString(),
      recordId: `range-${fromSetNum}-${toSetNum}`,
      reason: `Added +${cycles} cycles to sets range ${fromSetNum} - ${toSetNum} (JO: ${jobOrderNumber})`,
      deviceInfo: navigator.userAgent,
      checkedBy,
    });

    await loadData();
  };

  const handleUndoProductionBatch = async (prodIds: string[]) => {
    try {
      for (const prodId of prodIds) {
        const prod = dailyProductions.find(p => p.id === prodId);
        if (!prod) continue;

        const targetSet = sets.find(s => s.id === prod.setId);

        // 1. Delete from dailyProduction
        await db.dailyProduction.delete(prodId);

        // 2. Adjust Set current cycle counts if targetSet exists
        if (targetSet) {
          const prevCycle = targetSet.currentTotalCycle;
          const newCycle = Math.max(0, prevCycle - prod.productionCycles);

          const todayStr = new Date().toISOString().split('T')[0];
          let newTodayProd = targetSet.todayProduction;
          if (prod.date === todayStr) {
            newTodayProd = Math.max(0, targetSet.todayProduction - prod.productionCycles);
          }

          await db.sets.update(prod.setId, {
            currentTotalCycle: newCycle,
            todayProduction: newTodayProd,
            updatedAt: new Date().toISOString(),
          });
        }

        // 3. Log Audit Record
        const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
        await db.auditLogs.put({
          id: generateUUID(),
          auditCode,
          user: currentUser.name,
          action: 'UNDO_PRODUCTION',
          timestamp: new Date().toISOString(),
          recordId: prodId,
          oldValue: `Set ID: ${prod.setId}, +${prod.productionCycles} cycles`,
          newValue: 'REVERTED',
          reason: `Quick undo of daily production entry within 10-second grace period (+${prod.productionCycles} cycles for JO: ${prod.jobOrderId || 'N/A'}).`,
          deviceInfo: navigator.userAgent,
        });
      }

      setUndoableBatch(null);
      await loadData();
    } catch (err) {
      console.error('Failed to undo production batch:', err);
      alert(`Error undoing production log: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      const targetSet = sets.find(s => s.id === setId);
      if (!targetSet) return;
      if (!confirm(`Are you sure you want to delete ${targetSet.displayName} and all its positions/plates?`)) return;

      await db.sets.delete(setId);
      
      // In-memory filter positions to delete for 100% reliability
      const allPositions = await db.positions.toArray();
      for (const p of allPositions.filter(pos => pos.setId === setId)) {
        await db.positions.delete(p.id);
      }

      // In-memory filter plates to delete
      const allPlates = await db.plates.toArray();
      for (const pl of allPlates.filter(p => p.currentSetId === setId)) {
        await db.plates.delete(pl.id);
      }

      // In-memory filter installations to delete
      const allInstallations = await db.plateInstallations.toArray();
      for (const inst of allInstallations.filter(i => i.setId === setId)) {
        await db.plateInstallations.delete(inst.id);
      }

      // In-memory filter removals to delete
      const allRemovals = await db.plateRemovals.toArray();
      for (const rem of allRemovals.filter(r => r.setId === setId)) {
        await db.plateRemovals.delete(rem.id);
      }

      // In-memory filter production to delete
      const allDailyProds = await db.dailyProduction.toArray();
      for (const dp of allDailyProds.filter(d => d.setId === setId)) {
        await db.dailyProduction.delete(dp.id);
      }

      // In-memory filter replacements to delete
      const allReplacements = await db.replacements.toArray();
      for (const rep of allReplacements.filter(r => r.setId === setId)) {
        await db.replacements.delete(rep.id);
      }

      const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
      await db.auditLogs.put({
        id: generateUUID(),
        auditCode,
        user: currentUser.name,
        action: 'DELETE_SET',
        timestamp: new Date().toISOString(),
        recordId: setId,
        oldValue: targetSet.displayName,
        reason: `Permanently deleted master set ${targetSet.displayName} and all its positions, plates, and installations.`,
        deviceInfo: navigator.userAgent,

      });

      if (selectedSetId === setId) {
        setSelectedSetId(null);
      }
      await loadData();
    } catch (err) {
      console.error('Error deleting set:', err);
      alert(`Error deleting set: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteProduction = async (prodId: string) => {
    try {
      const prod = dailyProductions.find(p => p.id === prodId);
      if (!prod) return;

      const targetSet = sets.find(s => s.id === prod.setId);
      const setDisplayName = targetSet ? targetSet.displayName : 'Unknown Set';

      if (!confirm(`Are you sure you want to permanently delete this production log of +${prod.productionCycles.toLocaleString()} cycles for ${setDisplayName}? This action will permanently reverse the cycle count.`)) {
        return;
      }

      // 1. Permanently delete from dailyProduction
      await db.dailyProduction.delete(prodId);

      // 2. Adjust Set current cycle counts if the Set still exists
      if (targetSet) {
        const prevCycle = targetSet.currentTotalCycle;
        const newCycle = Math.max(0, prevCycle - prod.productionCycles);

        // Decrement today's production if the record is on the same day as today
        const todayStr = new Date().toISOString().split('T')[0];
        let newTodayProd = targetSet.todayProduction;
        if (prod.date === todayStr) {
          newTodayProd = Math.max(0, targetSet.todayProduction - prod.productionCycles);
        }

        await db.sets.update(prod.setId, {
          currentTotalCycle: newCycle,
          todayProduction: newTodayProd,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Log on audit log
      const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
      await db.auditLogs.put({
        id: generateUUID(),
        auditCode,
        user: currentUser.name,
        action: 'DELETE_PRODUCTION',
        timestamp: new Date().toISOString(),
        recordId: prodId,
        oldValue: `Set: ${setDisplayName}, Cycles: +${prod.productionCycles}`,
        reason: `Permanently deleted production log of +${prod.productionCycles} cycles for ${setDisplayName} (Job Order: ${prod.jobOrderId || 'N/A'}).`,
        deviceInfo: navigator.userAgent,

      });

      await loadData();
    } catch (err) {
      console.error('Error deleting production log:', err);
      alert(`Error deleting production log: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateSet = async (
    setNumber: number,
    displayName: string,
    shortCode: string,
    initialCycle: number,
    numPlates: number = 11,
    creationDate?: string
  ) => {
    const existingSetNum = sets.find(s => s.setNumber === setNumber);
    if (existingSetNum) {
      throw new Error(`Set Number ${setNumber} already exists (${existingSetNum.displayName}). Please use a unique Set Number.`);
    }

    const existingCode = sets.find(s => s.shortCode.trim().toLowerCase() === shortCode.trim().toLowerCase());
    if (existingCode) {
      throw new Error(`Short Code "${shortCode}" is already assigned to ${existingCode.displayName}. Please use a unique Short Code.`);
    }

    const setId = generateUUID();
    const setDateStr = creationDate || new Date().toISOString().split('T')[0];
    const dateParts = setDateStr.split('-');
    const dateObj = new Date(setDateStr + 'T00:00:00');
    const mm = String(dateParts[1] || dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateParts[2] || dateObj.getDate()).padStart(2, '0');
    const yy = String(dateParts[0] || dateObj.getFullYear()).slice(-2);
    const dateFormatted = `${mm}${dd}${yy}`;
    const setCreatedAt = new Date(setDateStr + 'T00:00:00').toISOString();

    const newSet: SetRecord = {
      id: setId,
      setNumber,
      displayName,
      shortCode,
      status: 'ACTIVE',
      currentTotalCycle: initialCycle,
      initialCycle,
      todayProduction: 0,
      lastProductionDate: setDateStr,
      createdAt: setCreatedAt,
      updatedAt: new Date().toISOString()
    };

    await db.sets.put(newSet);

    const positionsToCreate: PositionRecord[] = [];
    const platesToCreate: PlateRecord[] = [];
    const installationsToCreate: PlateInstallationRecord[] = [];

    for (let p = 1; p <= numPlates; p++) {
      const posId = generateUUID();
      const pNumStr = p < 10 ? `0${p}` : `${p}`;
      const positionCode = `P${pNumStr}`;
      const fullCode = `${shortCode}-${positionCode}`;
      const plateId = generateUUID();
      const serialNumber = `${dateFormatted}-${setNumber < 10 ? '0' + setNumber : setNumber}-${pNumStr}`;

      platesToCreate.push({
        id: plateId,
        plateSerialNumber: serialNumber,
        manufacturingDate: setDateStr,
        status: 'ACTIVE',
        currentSetId: setId,
        currentPositionId: posId,
        createdAt: setCreatedAt,
        updatedAt: new Date().toISOString()
      });

      positionsToCreate.push({
        id: posId,
        setId,
        setNumber,
        positionNumber: p,
        positionCode,
        fullCode,
        status: 'OCCUPIED',
        currentPlateId: plateId,
        createdAt: setCreatedAt,
        updatedAt: new Date().toISOString()
      });

      installationsToCreate.push({
        id: generateUUID(),
        plateId,
        setId,
        positionId: posId,
        installationDate: setDateStr,
        installationCycle: initialCycle,
        operatorId: currentUser.name,
        remarks: 'Initial installation on set creation',
        createdAt: setCreatedAt
      });
    }

    await db.positions.bulkPut(positionsToCreate);
    await db.plates.bulkPut(platesToCreate);
    await db.plateInstallations.bulkPut(installationsToCreate);

    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: currentUser.name,
      action: 'CREATE_SET',
      timestamp: new Date().toISOString(),
      recordId: setId,
      reason: `Created new master set ${displayName} (${shortCode}) with ${numPlates} positions`,
      deviceInfo: navigator.userAgent
    });

    await loadData();
    setSelectedSetId(setId);
  };

  const handleInstallPlate = async (
    positionId: string,
    setId: string,
    serialNumber: string,
    mfgDate: string,
    operatorId: string,
    remarks: string,
    initialCycles: number = 0
  ) => {
    // Check duplicates
    const existingPlate = plates.find(p => p.plateSerialNumber === serialNumber);
    if (existingPlate && existingPlate.status === 'ACTIVE') {
      alert(`Plate serial number ${serialNumber} is already active elsewhere!`);
      return;
    }

    const targetSet = sets.find(s => s.id === setId);
    if (!targetSet) return;

    const plateId = existingPlate ? existingPlate.id : generateUUID();
    const nowIso = new Date().toISOString();

    if (!existingPlate) {
      const newPlate: PlateRecord = {
        id: plateId,
        plateSerialNumber: serialNumber,
        manufacturingDate: mfgDate,
        status: 'ACTIVE',
        currentSetId: setId,
        currentPositionId: positionId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await db.plates.put(newPlate);
    } else {
      await db.plates.update(plateId, {
        status: 'ACTIVE',
        currentSetId: setId,
        currentPositionId: positionId,
        updatedAt: nowIso,
      });
    }

    // Update position
    await db.positions.update(positionId, {
      status: 'OCCUPIED',
      currentPlateId: plateId,
      updatedAt: nowIso,
    });

    // Create installation record
    const installation: PlateInstallationRecord = {
      id: generateUUID(),
      plateId,
      setId,
      positionId,
      installationDate: nowIso.split('T')[0],
      installationCycle: targetSet.currentTotalCycle,
      initialCycles,
      operatorId,
      remarks,
      createdAt: nowIso,
    };
    await db.plateInstallations.put(installation);

    // Audit log
    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: operatorId,
      action: 'INSTALL_PLATE',
      timestamp: nowIso,
      recordId: plateId,
      newValue: serialNumber,
      reason: `Installed plate at position`,
      deviceInfo: navigator.userAgent,

    });

    setSelectedPosModal(null);
    await loadData();
  };

  const handleRemovePlate = async (
    positionId: string,
    setId: string,
    plateId: string,
    status: PlateStatus,
    rejectType?: RejectType,
    rejectDesc?: string,
    source?: string,
    corrective?: string,
    remarks?: string
  ) => {
    const targetSet = sets.find(s => s.id === setId);
    const installation = installations.find(i => i.plateId === plateId && i.setId === setId && i.positionId === positionId);
    if (!targetSet) return;

    const removalCycle = targetSet.currentTotalCycle;
    const installationCycle = installation ? installation.installationCycle : removalCycle;
    const totalCyclesAchieved = removalCycle - installationCycle;
    const nowIso = new Date().toISOString();

    // Update plate status
    await db.plates.update(plateId, {
      status,
      currentSetId: undefined,
      currentPositionId: undefined,
      updatedAt: nowIso,
    });

    // Free up position
    await db.positions.update(positionId, {
      status: 'EMPTY',
      currentPlateId: undefined,
      updatedAt: nowIso,
    });

    // Create removal record
    const removal: PlateRemovalRecord = {
      id: generateUUID(),
      plateId,
      setId,
      positionId,
      removalDate: nowIso.split('T')[0],
      removalCycle,
      totalCyclesAchieved,
      status,
      rejectType,
      rejectDescription: rejectDesc,
      sourceOfReject: source,
      correctiveAction: corrective,
      operatorId: currentUser.name,
      createdAt: nowIso,
    };
    await db.plateRemovals.put(removal);

    // Audit log
    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: currentUser.name,
      action: status === 'REJECTED' ? 'REJECT_PLATE' : 'REMOVE_PLATE',
      timestamp: nowIso,
      recordId: plateId,
      newValue: status,
      reason: remarks || `Removed plate with achieved life ${totalCyclesAchieved} cycles`,
      deviceInfo: navigator.userAgent,

    });

    setSelectedPosModal(null);
    await loadData();
  };

  const handleReplacePlate = async (
    positionId: string,
    setId: string,
    oldPlateId: string,
    newSerialNumber: string,
    installDate: string,
    reason: string,
    operatorId: string,
    initialCycles: number = 0,
    evaluationStatus: 'RETIRED' | 'REJECTED' = 'REJECTED',
    rejectTypes: string[] = [],
    rejectDescription?: string,
    sourceOfReject?: string,
    correctiveAction?: string
  ) => {
    const targetSet = sets.find(s => s.id === setId);
    const installation = installations.find(i => i.plateId === oldPlateId && i.setId === setId && i.positionId === positionId);
    if (!targetSet) return;

    const removalCycle = targetSet.currentTotalCycle;
    const installationCycle = installation ? installation.installationCycle : removalCycle;
    const totalCyclesAchieved = removalCycle - installationCycle;
    const nowIso = new Date().toISOString();

    // Map reject types to primary RejectType enum
    let primaryRejectType: RejectType = 'WEAR';
    if (rejectTypes.some(t => t.includes('Surface'))) primaryRejectType = 'SURFACE';
    else if (rejectTypes.some(t => t.includes('Crack'))) primaryRejectType = 'CRACK';
    else if (rejectTypes.some(t => t.includes('Dimension'))) primaryRejectType = 'DIM';
    else if (rejectTypes.some(t => t.includes('Chipping'))) primaryRejectType = 'CHIP';
    else if (rejectTypes.some(t => t.includes('Dent'))) primaryRejectType = 'DENT';
    else if (rejectTypes.some(t => t.includes('Other'))) primaryRejectType = 'OTHER';

    const fullRejectDesc = rejectDescription || reason;

    // 1. Remove old plate and update status to RETIRED or REJECTED
    await db.plates.update(oldPlateId, {
      status: evaluationStatus,
      currentSetId: undefined,
      currentPositionId: undefined,
      updatedAt: nowIso,
    });

    const removal: PlateRemovalRecord = {
      id: generateUUID(),
      plateId: oldPlateId,
      setId,
      positionId,
      removalDate: installDate,
      removalCycle,
      totalCyclesAchieved,
      status: evaluationStatus,
      rejectType: primaryRejectType,
      rejectDescription: fullRejectDesc,
      sourceOfReject: sourceOfReject || 'QA Inspection',
      correctiveAction: correctiveAction || 'Plate swapped and replaced',
      operatorId,
      createdAt: nowIso,
    };
    await db.plateRemovals.put(removal);

    // 2. Create and install new plate
    const newPlateId = generateUUID();
    const newPlate: PlateRecord = {
      id: newPlateId,
      plateSerialNumber: newSerialNumber,
      manufacturingDate: installDate,
      status: 'ACTIVE',
      currentSetId: setId,
      currentPositionId: positionId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await db.plates.put(newPlate);

    await db.positions.update(positionId, {
      status: 'OCCUPIED',
      currentPlateId: newPlateId,
      updatedAt: nowIso,
    });

    const newInstallation: PlateInstallationRecord = {
      id: generateUUID(),
      plateId: newPlateId,
      setId,
      positionId,
      installationDate: installDate,
      installationCycle: removalCycle, // Set Total Cycle does not reset!
      initialCycles: 0,
      operatorId,
      remarks: `Replacement for plate (${evaluationStatus}). Reason: ${reason}`,
      createdAt: nowIso,
    };
    await db.plateInstallations.put(newInstallation);

    // Replacement record link
    const replacementRecord: ReplacementRecord = {
      id: generateUUID(),
      setId,
      positionId,
      oldPlateId,
      newPlateId: newPlateId,
      oldRemovalCycle: removalCycle,
      newInstallationCycle: removalCycle,
      reason,
      operatorId,
      createdAt: nowIso,
    };
    await db.replacements.put(replacementRecord);

    // Audit log
    const auditCode = `AUD-${String(auditLogs.length + 1).padStart(6, '0')}`;
    await db.auditLogs.put({
      id: generateUUID(),
      auditCode,
      user: operatorId,
      action: 'REPLACE_PLATE',
      timestamp: nowIso,
      recordId: positionId,
      oldValue: oldPlateId,
      newValue: newPlateId,
      reason,
      deviceInfo: navigator.userAgent,

    });

    setSelectedPosModal(null);
    await loadData();
  };

  const handleExportBackup = async () => {
    const insts = await db.plateInstallations.toArray();
    const rems = await db.plateRemovals.toArray();
    const backupData = {
      sets: await db.sets.toArray(),
      positions: await db.positions.toArray(),
      plates: await db.plates.toArray(),
      plateInstallations: insts,
      installations: insts,
      plateRemovals: rems,
      removals: rems,
      dailyProduction: await db.dailyProduction.toArray(),
      replacements: await db.replacements.toArray(),
      jobOrders: await db.jobOrders.toArray(),
      auditLogs: await db.auditLogs.toArray(),
      personnel: await db.personnel.toArray(),
    };

    const backupText = JSON.stringify(backupData, null, 2);

    if (window.electronAPI) {
      await window.electronAPI.writeLog('info', 'Starting database backup export via native save dialog...');
      const res = await window.electronAPI.saveBackup(backupText);
      if (res.success) {
        await window.electronAPI.writeLog('info', `Database backup successfully exported to: ${res.filePath}`);
        alert(`Database backup exported successfully to:\n${res.filePath}`);
      } else if (res.error) {
        await window.electronAPI.writeLog('error', `Database backup export failed: ${res.error}`);
        alert(`Failed to save database backup: ${res.error}`);
      } else {
        await window.electronAPI.writeLog('info', 'Database backup export was cancelled by the user.');
      }
      return;
    }

    const blob = new Blob([backupText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plate-lifecycle-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.writeLog('info', 'Starting database restore via native open dialog...');
        
        // Safety Auto-Backup before overwrite
        const currentInsts = await db.plateInstallations.toArray();
        const currentRems = await db.plateRemovals.toArray();
        const currentData = {
          sets: await db.sets.toArray(),
          positions: await db.positions.toArray(),
          plates: await db.plates.toArray(),
          plateInstallations: currentInsts,
          installations: currentInsts,
          plateRemovals: currentRems,
          removals: currentRems,
          dailyProduction: await db.dailyProduction.toArray(),
          replacements: await db.replacements.toArray(),
          jobOrders: await db.jobOrders.toArray(),
          auditLogs: await db.auditLogs.toArray(),
          personnel: await db.personnel.toArray(),
        };
        // Silently save snapshot to data/backups/auto-backup-snap.json
        await window.electronAPI.saveBackup(JSON.stringify(currentData, null, 2));

        const res = await window.electronAPI.loadBackup();
        if (res.success && res.data) {
          const json = JSON.parse(res.data);
          const instData = json.plateInstallations || json.installations || [];
          const remData = json.plateRemovals || json.removals || [];
          
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

            if (json.sets?.length) await db.sets.bulkPut(json.sets);
            if (json.positions?.length) await db.positions.bulkPut(json.positions);
            if (json.plates?.length) await db.plates.bulkPut(json.plates);
            if (instData.length) await db.plateInstallations.bulkPut(instData);
            if (remData.length) await db.plateRemovals.bulkPut(remData);
            if (json.dailyProduction?.length) await db.dailyProduction.bulkPut(json.dailyProduction);
            if (json.replacements?.length) await db.replacements.bulkPut(json.replacements);
            if (json.jobOrders?.length) await db.jobOrders.bulkPut(json.jobOrders);
            if (json.auditLogs?.length) await db.auditLogs.bulkPut(json.auditLogs);
            if (json.personnel?.length) await db.personnel.bulkPut(json.personnel);
          });

          await window.electronAPI.writeLog('info', 'Database backup successfully restored.');
          alert('Database backup restored successfully!');
          await loadData();
        } else if (res.error) {
          await window.electronAPI.writeLog('error', `Database restore failed: ${res.error}`);
          alert(`Database restore failed: ${res.error}`);
        } else {
          await window.electronAPI.writeLog('info', 'Database restore was cancelled by the user.');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await window.electronAPI.writeLog('error', `Failed to parse or apply backup: ${errMsg}`);
        alert(`Failed to restore backup: ${errMsg}`);
      }
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const instData = json.plateInstallations || json.installations || [];
        const remData = json.plateRemovals || json.removals || [];
        if (json.sets || json.positions) {
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

          if (json.sets?.length) await db.sets.bulkPut(json.sets);
          if (json.positions?.length) await db.positions.bulkPut(json.positions);
          if (json.plates?.length) await db.plates.bulkPut(json.plates);
          if (instData.length) await db.plateInstallations.bulkPut(instData);
          if (remData.length) await db.plateRemovals.bulkPut(remData);
          if (json.dailyProduction?.length) await db.dailyProduction.bulkPut(json.dailyProduction);
          if (json.replacements?.length) await db.replacements.bulkPut(json.replacements);
          if (json.jobOrders?.length) await db.jobOrders.bulkPut(json.jobOrders);
          if (json.auditLogs?.length) await db.auditLogs.bulkPut(json.auditLogs);
          if (json.personnel?.length) await db.personnel.bulkPut(json.personnel);

          alert('Database backup restored successfully!');
          await loadData();
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreFactory = async () => {
    setLoading(true);
    try {
      setSelectedSetId(null);
      setSelectedPosModal(null);
      await seedDatabase(0, true);
      await loadData();
    } catch (err) {
      console.error('Failed to restore factory settings:', err);
      alert('Failed to restore factory settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPersonnel = async (personnelData: Omit<Personnel, 'id'>) => {
    const id = generateUUID();
    await db.personnel.put({ id, ...personnelData });
    await loadData();
  };

  const handleRemovePersonnel = async (id: string) => {
    await db.personnel.delete(id);
    await loadData();
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
  };

  const handleAdminLogin = () => {
    setCurrentUser({ name: 'Admin', role: 'ADMIN' });
    setShowAdminLoginModal(false);
  };

  const handleOpenCreateSet = () => {
    setShowCreateSetModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-medium text-slate-300">Loading Plate Lifecycle Monitoring System...</div>
        </div>
      </div>
    );
  }

  const selectedSet = sets.find(s => s.id === selectedSetId);
  const totalPositionsCount = sets.length * 11;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0B0E] via-[#12151C] to-[#0A0B0E] bg-[length:400%_400%] animate-gradient-x text-[#E0E2E5] flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedSetId(null);
        }}
        totalPositions={totalPositionsCount}
        activeSetsCount={sets.length}
        currentUser={currentUser}
        networkConfig={networkConfig}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenTutorial={() => setShowTutorialModal(true)}
        onOpenNetworkSync={() => setShowNetworkSyncModal(true)}
        onOpenUpdateModal={() => setShowUpdateModal(true)}
        onOpenChangelog={() => setShowChangelogModal(true)}
      />

      <main className="flex-1 w-full max-w-full px-4 sm:px-6 lg:px-8 py-6">
        {selectedSetId && selectedSet ? (
          <SetDetail
            setRecord={selectedSet}
            sets={sets}
            positions={positions}
            plates={plates}
            installations={installations}
            jobOrders={jobOrders}
            dailyProductions={dailyProductions}
            personnel={personnel}
            onBack={() => setSelectedSetId(null)}
            onSelectSet={(id) => setSelectedSetId(id)}
            onAddProduction={handleAddProduction}
            onOpenPositionModal={(pos, action) => {
              const currentPlate = plates.find(p => p.id === pos.currentPlateId);
              const installation = currentPlate ? installations.find(i => i.plateId === currentPlate.id && i.setId === selectedSet.id) : undefined;
              setSelectedPosModal({ position: pos, action });
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                sets={sets}
                positions={positions}
                plates={plates}
                installations={installations}
                removals={removals}
                currentUser={currentUser}
                personnel={personnel}
                onOpenRegistry={() => setShowRegistryModal(true)}
                onSelectSet={(setId) => setSelectedSetId(setId)}
                onOpenCreateSet={handleOpenCreateSet}
                onOpenLogProduction={() => setShowLogProductionModal(true)}
                onUpdateSet={handleUpdateSet}
              />
            )}
            {activeTab === 'manage-set' && (
              <ManageSetView
                sets={sets}
                positions={positions}
                plates={plates}
                onSelectSet={(setId) => setSelectedSetId(setId)}
                onOpenCreateSet={handleOpenCreateSet}
                onUpdateSet={handleUpdateSet}
              />
            )}
            {activeTab === 'production' && (
              <DailyProductionView
                dailyProductions={dailyProductions}
                sets={sets}
                jobOrders={jobOrders}
                onOpenLogProduction={() => setShowLogProductionModal(true)}
                undoableBatch={undoableBatch}
                onUndoProductionBatch={handleUndoProductionBatch}
              />
            )}
            {activeTab === 'search' && (
              <GlobalSearch
                plates={plates}
                sets={sets}
                positions={positions}
                installations={installations}
                removals={removals}
                onSelectSet={(setId) => {
                  setSelectedSetId(setId);
                  setActiveTab('dashboard');
                }}
                onOpenPositionModal={(pos) => {
                  setSelectedPosModal({ position: pos, action: 'history' });
                }}
              />
            )}
            {activeTab === 'audit' && (
              <AuditLogView auditLogs={auditLogs} sets={sets} positions={positions} plates={plates} />
            )}
            {activeTab === 'admin' && (
              currentUser.role === 'ADMIN' ? (
                <AdminDashboard 
                  onExportBackup={handleExportBackup} 
                  onImportBackup={handleImportBackup} 
                  onRestoreFactory={handleRestoreFactory}
                />
              ) : (
                <div className="bg-[#12151C] border border-[#1E222A] rounded-xl p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
                  <Shield className="w-12 h-12 text-[#F27D26] mx-auto" />
                  <h3 className="text-lg font-bold text-white">Administrator Access Required</h3>
                  <p className="text-sm text-[#8E9299]">
                    The Admin Dashboard and system maintenance tools are restricted to authorized administrators. Log in as Administrator to access backups, system settings, and factory reset controls.
                  </p>
                  <button
                    onClick={() => setShowAdminLoginModal(true)}
                    className="px-4 py-2 bg-[#F27D26] hover:bg-[#d96a1f] text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Login as Administrator
                  </button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Position Modal (Install, Replace, History) */}
      {selectedPosModal && (
        <PositionModal
          position={selectedPosModal.position}
          setRecord={sets.find(s => s.id === selectedPosModal.position.setId)!}
          currentPlate={plates.find(p => p.id === selectedPosModal.position.currentPlateId)}
          installation={installations.find(i => i.positionId === selectedPosModal.position.id && i.plateId === selectedPosModal.position.currentPlateId)}
          removals={removals}
          personnel={personnel}
          onClose={() => setSelectedPosModal(null)}
          onInstallPlate={handleInstallPlate}
          onReplacePlate={handleReplacePlate}
          action={selectedPosModal.action}
          installations={installations}
          plates={plates}
        />
      )}

      {/* Create Set Modal */}
      {showCreateSetModal && (
        <CreateSetModal
          sets={sets}
          onClose={() => setShowCreateSetModal(false)}
          onCreateSet={handleCreateSet}
        />
      )}

      {/* Log Production Modal */}
      {showLogProductionModal && (
        <LogProductionModal
          sets={sets}
          personnel={personnel}
          onClose={() => setShowLogProductionModal(false)}
          onAddProductionRange={handleAddProductionRange}
        />
      )}

      {showLoginModal && (
        <LoginModal
          personnel={personnel}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}

      {showRegistryModal && (
        <RegistryModal
          personnel={personnel}
          onAdd={handleAddPersonnel}
          onRemove={handleRemovePersonnel}
          onClose={() => setShowRegistryModal(false)}
        />
      )}

      {showAdminLoginModal && (
        <AdminLoginModal
          personnel={personnel}
          onClose={() => setShowAdminLoginModal(false)}
          onLogin={handleAdminLogin}
        />
      )}

      <TutorialModal
        isOpen={showTutorialModal}
        onClose={() => {
          setShowTutorialModal(false);
          setActiveTab('dashboard');
          setSelectedSetId(null);
        }}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedSetId(null);
        }}
      />

      {/* Network Storage & Multi-User Sync Modal */}
      {showNetworkSyncModal && (
        <NetworkSyncModal
          config={networkConfig}
          onSaveConfig={handleSaveNetworkConfig}
          onManualSync={handleManualNetworkSync}
          onClose={() => setShowNetworkSyncModal(false)}
          isSyncing={isSyncingNetwork}
          lastSyncedAt={networkConfig.lastSyncedAt}
        />
      )}

      {/* Software Auto-Update Animated Modal */}
      {showUpdateModal && (
        <UpdateModal
          release={currentRelease}
          onComplete={async () => {
            await loadData();
            setShowUpdateModal(false);
            setShowChangelogModal(true);
          }}
          onClose={() => setShowUpdateModal(false)}
          onViewChangelog={() => {
            setShowUpdateModal(false);
            setShowChangelogModal(true);
          }}
        />
      )}

      {/* Version Changelog & Release History Modal */}
      {showChangelogModal && (
        <ChangelogModal
          onClose={() => setShowChangelogModal(false)}
          onCheckUpdate={() => {
            setShowChangelogModal(false);
            setShowUpdateModal(true);
          }}
        />
      )}

      {/* Global Toast Notification for 10-second Undo */}
      {undoableBatch && (Date.now() - undoableBatch.timestamp < 10000) && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12151C] border border-amber-500/50 rounded-2xl p-4 shadow-2xl max-w-md w-full text-white flex flex-col gap-2.5 backdrop-blur-md animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                <RotateCcw className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  Production Logged <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded text-[10px] font-extrabold flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.ceil((10000 - (Date.now() - undoableBatch.timestamp)) / 1000)}s</span>
                </h4>
                <p className="text-xs font-medium text-white mt-0.5">{undoableBatch.description}</p>
              </div>
            </div>
            <button
              onClick={() => setUndoableBatch(null)}
              className="text-[#8E9299] hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#1E222A]">
            <button
              onClick={() => {
                setActiveTab('production');
              }}
              className="px-3 py-1.5 bg-[#191D28] hover:bg-[#252A38] text-xs font-semibold text-[#8E9299] hover:text-white rounded-lg border border-[#1E222A] transition-colors cursor-pointer"
            >
              View in Log
            </button>
            <button
              onClick={() => handleUndoProductionBatch(undoableBatch.ids)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
