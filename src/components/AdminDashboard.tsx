import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Shield, Database, Clock, Activity, AlertCircle, RefreshCw, CheckCircle2, X, Wifi, Server, HardDrive, Folder, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  onExportBackup: () => Promise<void>;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRestoreFactory: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExportBackup, onImportBackup, onRestoreFactory }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  // Network Settings State
  const [storageMode, setStorageMode] = useState<'LOCAL' | 'NETWORK'>('LOCAL');
  const [networkPath, setNetworkPath] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [isSavingNet, setIsSavingNet] = useState(false);
  const [saveNetMessage, setSaveNetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Software Updates State
  const [updateVersion, setUpdateVersion] = useState('1.1.0');
  const [updatePlatform, setUpdatePlatform] = useState('Windows Portable / Linux AppImage');
  const [updateFileName, setUpdateFileName] = useState('PLMSys-v1.1.0-update.pkg');
  const [updateNewNotes, setUpdateNewNotes] = useState('Multi-PC LAN Sync with atomic cross-PC locking, Centralized Administrator-Controlled Updates');
  const [updateImprovedNotes, setUpdateImprovedNotes] = useState('Verified pre-update database safety backups');
  const [updateFixedNotes, setUpdateFixedNotes] = useState('Concurrent LAN edit conflict protection');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [publishedManifest, setPublishedManifest] = useState<any>(null);
  
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [isInitiatingUpdate, setIsInitiatingUpdate] = useState(false);
  const [updateTriggerMessage, setUpdateTriggerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clientStatuses, setClientStatuses] = useState<Record<string, any>>({});

  // Database Lock Release State & Diagnostics
  const [isReleasingLock, setIsReleasingLock] = useState(false);
  const [lockReleaseResult, setLockReleaseResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [lockDiag, setLockDiag] = useState<{
    locked: boolean;
    owner: string;
    operation: string;
    started: string;
    heartbeat: string;
    status: string;
  } | null>(null);

  const handleForceReleaseLock = async () => {
    const confirmed = window.confirm(
      "Only release this lock if the owning computer is no longer performing a database operation.\n\nAre you absolutely sure you want to force unlock the database?"
    );
    if (!confirmed) return;

    setIsReleasingLock(true);
    setLockReleaseResult(null);
    try {
      if ((window as any).electronAPI?.forceReleaseDatabaseLock) {
        const res = await (window as any).electronAPI.forceReleaseDatabaseLock();
        if (res.success) {
          setLockReleaseResult({ success: true, message: res.message || 'Database lock has been successfully cleared. All PCs can write now.' });
          if ((window as any).electronAPI?.getDbStatus) {
            const status = await (window as any).electronAPI.getDbStatus();
            if (status?.lockDiagnostics) {
              setLockDiag(status.lockDiagnostics);
            }
          }
        } else {
          setLockReleaseResult({ success: false, error: res.error || 'Failed to clear database lock.' });
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setLockReleaseResult({ success: true, message: 'Database lock has been successfully cleared (Preview Mode).' });
      }
    } catch (err: any) {
      setLockReleaseResult({ success: false, error: err.message || 'Error releasing lock.' });
    } finally {
      setIsReleasingLock(false);
    }
  };

  useEffect(() => {
    const fetchNetSettings = async () => {
      if ((window as any).electronAPI?.getNetworkSettings) {
        try {
          const net = await (window as any).electronAPI.getNetworkSettings();
          if (net) {
            setStorageMode(net.mode || 'LOCAL');
            setNetworkPath(net.networkPath || '');
          }
        } catch (err) {
          console.error('Failed to load network settings:', err);
        }
      }
      if ((window as any).electronAPI?.getDbStatus) {
        try {
          const status = await (window as any).electronAPI.getDbStatus();
          if (status?.lockDiagnostics) {
            setLockDiag(status.lockDiagnostics);
          }
        } catch (e) {}
      }
      if ((window as any).electronAPI?.getUpdatePackageInfo) {
        try {
          const res = await (window as any).electronAPI.getUpdatePackageInfo();
          if (res?.manifest) {
            setPublishedManifest(res.manifest);
          }
        } catch (e) {}
      }
      if ((window as any).electronAPI?.getClientUpdateStatuses) {
        try {
          const statuses = await (window as any).electronAPI.getClientUpdateStatuses();
          if (statuses) setClientStatuses(statuses);
        } catch (e) {}
      }
    };
    fetchNetSettings();

    const interval = setInterval(async () => {
      if ((window as any).electronAPI?.getClientUpdateStatuses) {
        try {
          const statuses = await (window as any).electronAPI.getClientUpdateStatuses();
          if (statuses) setClientStatuses(statuses);
        } catch (e) {}
      }
      if ((window as any).electronAPI?.getDbStatus) {
        try {
          const status = await (window as any).electronAPI.getDbStatus();
          if (status?.lockDiagnostics) {
            setLockDiag(status.lockDiagnostics);
          }
        } catch (e) {}
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handlePublishPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPublishMessage(null);
    try {
      if ((window as any).electronAPI?.publishUpdatePackage) {
        const res = await (window as any).electronAPI.publishUpdatePackage({
          userRole: 'ADMIN',
          version: updateVersion.trim(),
          platform: updatePlatform.trim(),
          fileName: updateFileName.trim(),
          changelog: {
            new: updateNewNotes.split(',').map((s) => s.trim()).filter(Boolean),
            improved: updateImprovedNotes.split(',').map((s) => s.trim()).filter(Boolean),
            fixed: updateFixedNotes.split(',').map((s) => s.trim()).filter(Boolean)
          }
        });

        if (res.success) {
          setPublishMessage({ type: 'success', text: `Update package v${updateVersion} published successfully to shared network location.` });
          setPublishedManifest(res.manifest);
        } else {
          setPublishMessage({ type: 'error', text: res.error || 'Failed to publish update package.' });
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setPublishMessage({ type: 'success', text: `Update package v${updateVersion} published successfully (Preview Mode).` });
      }
    } catch (err: any) {
      setPublishMessage({ type: 'error', text: err.message || 'Error publishing package.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTriggerUpdateAll = async () => {
    setIsInitiatingUpdate(true);
    setUpdateTriggerMessage(null);
    try {
      if ((window as any).electronAPI?.adminInitiateUpdateAll) {
        const res = await (window as any).electronAPI.adminInitiateUpdateAll('ADMIN');
        if (res.success) {
          setUpdateTriggerMessage({ type: 'success', text: 'System update broadcasted to all connected clients! 1-minute countdown active.' });
          setShowUpdateConfirmModal(false);
        } else {
          setUpdateTriggerMessage({ type: 'error', text: res.error || 'Failed to initiate update.' });
        }
      } else {
        await new Promise((r) => setTimeout(r, 400));
        setUpdateTriggerMessage({ type: 'success', text: 'System update initiated (Preview Mode).' });
        setShowUpdateConfirmModal(false);
      }
    } catch (err: any) {
      setUpdateTriggerMessage({ type: 'error', text: err.message || 'Error triggering update.' });
    } finally {
      setIsInitiatingUpdate(false);
    }
  };

  const handleTestConnection = async () => {
    if (!networkPath.trim()) {
      setTestResult({ success: false, error: 'Network storage path cannot be empty.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      if ((window as any).electronAPI?.testNetworkConnection) {
        const res = await (window as any).electronAPI.testNetworkConnection(networkPath);
        setTestResult(res);
      } else {
        await new Promise((r) => setTimeout(r, 400));
        setTestResult({ success: true, latencyMs: 4 });
      }
    } catch (err) {
      setTestResult({ success: false, error: err instanceof Error ? err.message : 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveNetworkSettings = async () => {
    if (storageMode === 'NETWORK' && !networkPath.trim()) {
      setSaveNetMessage({ type: 'error', text: 'Network storage path is required when NETWORK mode is enabled.' });
      return;
    }
    setIsSavingNet(true);
    setSaveNetMessage(null);
    try {
      if ((window as any).electronAPI?.saveNetworkSettings) {
        const res = await (window as any).electronAPI.saveNetworkSettings({
          mode: storageMode,
          networkPath: networkPath.trim(),
        });
        if (res.success) {
          setSaveNetMessage({ type: 'success', text: `Storage mode updated to ${storageMode} successfully.` });
        } else {
          setSaveNetMessage({ type: 'error', text: res.error || 'Failed to update network settings.' });
        }
      } else {
        setSaveNetMessage({ type: 'success', text: `Storage mode updated to ${storageMode} (Preview Mode).` });
      }
    } catch (err) {
      setSaveNetMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save network settings.' });
    } finally {
      setIsSavingNet(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (confirmationText.trim().toUpperCase() !== 'RESET') {
      setRestoreError('Please type "RESET" exactly to confirm.');
      return;
    }
    setIsRestoring(true);
    setRestoreError('');
    try {
      await onRestoreFactory();
      setRestoreSuccess(true);
      setConfirmationText('');
      setTimeout(() => {
        setRestoreSuccess(false);
        setShowRestoreModal(false);
      }, 2000);
    } catch (err) {
      console.error('Error during factory reset:', err);
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore factory settings.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#F27D26]/10 p-2 rounded-lg border border-[#F27D26]/20">
            <Shield className="w-6 h-6 text-[#F27D26]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Admin Dashboard</h2>
            <p className="text-sm text-[#8E9299]">System maintenance, network collaboration, and data management</p>
          </div>
        </div>
      </div>

      {/* Network Settings Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
      >
        <div className="p-6 border-b border-[#1E222A] bg-[#191D28]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-white uppercase text-sm tracking-wider">Multi-PC Network & Shared Storage Settings</h3>
              <p className="text-xs text-[#8E9299] mt-0.5">Configure storage mode for standalone PC or multi-user LAN collaboration</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${storageMode === 'NETWORK' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
            Storage Mode: {storageMode}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Storage Mode Selector */}
          <div>
            <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider block mb-3">
              Select Storage Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStorageMode('LOCAL')}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  storageMode === 'LOCAL'
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-[#0A0B0E] border-[#1E222A] hover:border-gray-700'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${storageMode === 'LOCAL' ? 'bg-emerald-500 text-white' : 'bg-[#191D28] text-gray-400'}`}>
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">LOCAL MODE</span>
                    {storageMode === 'LOCAL' && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Active</span>}
                  </div>
                  <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
                    Uses the portable <code className="text-gray-300 bg-[#191D28] px-1 py-0.5 rounded">data/</code> directory on this computer. Recommended for standalone installations.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStorageMode('NETWORK')}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  storageMode === 'NETWORK'
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/5'
                    : 'bg-[#0A0B0E] border-[#1E222A] hover:border-gray-700'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${storageMode === 'NETWORK' ? 'bg-sky-500 text-white' : 'bg-[#191D28] text-gray-400'}`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">NETWORK MODE</span>
                    {storageMode === 'NETWORK' && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-bold uppercase">Active</span>}
                  </div>
                  <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
                    Uses a shared network storage folder over LAN (e.g., <code className="text-gray-300 bg-[#191D28] px-1 py-0.5 rounded">\\SERVER\PLMSysData\</code>). Enables real-time multi-PC collaboration.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Network Path Configuration */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider flex items-center justify-between">
              <span>Shared Network Storage Path</span>
              <span className="text-[11px] font-normal text-gray-400">UNC path or mapped network drive</span>
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Folder className="w-4 h-4 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={networkPath}
                  onChange={(e) => setNetworkPath(e.target.value)}
                  placeholder="e.g. \\SERVER\PLMSysData\ or Z:\PLMSysData\"
                  className="w-full pl-9 pr-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs font-mono focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !networkPath.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-sky-400 disabled:opacity-50 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                Test Connection
              </button>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.success ? 'Shared network path is accessible and write-verified.' : `Network test failed: ${testResult.error}`}</span>
                </div>
                {testResult.latencyMs !== undefined && (
                  <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    {testResult.latencyMs} ms
                  </span>
                )}
              </div>
            )}
          </div>

          {/* LAN Write Lock Recovery / Override Section */}
          <div className="space-y-3 pt-4 border-t border-[#1E222A]/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-500" /> LAN Write Lock Recovery
                </span>
                <p className="text-[11px] text-[#8E9299] mt-0.5 leading-relaxed">
                  If another client computer crashes or disconnects while writing, the database write lock can get stuck, preventing others from writing. Press below to clear it.
                </p>
              </div>
              <button
                type="button"
                onClick={handleForceReleaseLock}
                disabled={isReleasingLock}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 disabled:opacity-50 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                {isReleasingLock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Force Unlock DB
              </button>
            </div>

            {/* Lock Diagnostics Panel */}
            <div className="bg-[#191D28]/30 border border-[#1E222A]/80 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#1E222A]/30 pb-2 text-xs">
                <span className="text-xs font-semibold text-[#8E9299]">Database Lock Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  lockDiag?.locked 
                    ? lockDiag.status === 'ACTIVE' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                }`}>
                  {lockDiag?.locked ? `HELD (${lockDiag.status})` : 'FREE'}
                </span>
              </div>
              
              {lockDiag?.locked ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono leading-relaxed pt-1">
                  <div>
                    <span className="text-[#8E9299] block text-[10px] uppercase font-sans font-medium">Lock Owner:</span>
                    <span className="text-white font-semibold">{lockDiag.owner || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block text-[10px] uppercase font-sans font-medium">Operation:</span>
                    <span className="text-amber-400 font-semibold">{lockDiag.operation || 'Writing'}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block text-[10px] uppercase font-sans font-medium">Acquired At:</span>
                    <span className="text-white">{lockDiag.started ? new Date(lockDiag.started).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#8E9299] block text-[10px] uppercase font-sans font-medium">Last Heartbeat:</span>
                    <span className="text-white">{lockDiag.heartbeat ? new Date(lockDiag.heartbeat).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#8E9299] italic">
                  No active lock detected. Database is ready for concurrent client operations.
                </p>
              )}
            </div>

            {lockReleaseResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${lockReleaseResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                <div className="flex items-center gap-2">
                  {lockReleaseResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{lockReleaseResult.success ? lockReleaseResult.message : `Failed to clear lock: ${lockReleaseResult.error}`}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer for Network Settings */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1E222A]">
            <div>
              {saveNetMessage && (
                <span className={`text-xs font-semibold ${saveNetMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {saveNetMessage.text}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveNetworkSettings}
              disabled={isSavingNet}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingNet ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Network Settings
            </button>
          </div>
        </div>
      </motion.div>

      {/* Centralized Software Updates Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
      >
        <div className="p-6 border-b border-[#1E222A] bg-[#191D28]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#F27D26]" />
            <div>
              <h3 className="font-bold text-white uppercase text-sm tracking-wider">Centralized Software Updates & Network Deployment</h3>
              <p className="text-xs text-[#8E9299] mt-0.5">Upload, stage, and trigger network-wide client software updates with live progress monitoring</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/20">
            Admin Controlled
          </span>
        </div>

        <div className="p-6 space-y-6">
          {updateTriggerMessage && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${updateTriggerMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
              {updateTriggerMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{updateTriggerMessage.text}</span>
            </div>
          )}

          {/* Published Package Banner & UPDATE ALL SOFTWARE Trigger */}
          <div className="bg-[#0A0B0E] p-5 rounded-xl border border-[#1E222A] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E222A] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Published Update Package</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded uppercase">
                    Ready for Deployment
                  </span>
                </div>
                <p className="text-xs text-[#8E9299] mt-1 font-mono">
                  Version: <span className="text-white font-bold">{publishedManifest?.version || '1.1.0'}</span> | Platform: <span className="text-gray-300">{publishedManifest?.platform || 'Windows Portable / Linux AppImage'}</span>
                </p>
                <p className="text-[11px] text-[#8E9299] mt-0.5 font-mono">
                  Checksum: <span className="text-amber-400">{publishedManifest?.checksum || 'sha256:e3b0c44298fc1c149afbf4c8...'}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUpdateConfirmModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#F27D26] hover:bg-[#d66a1a] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#F27D26]/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                UPDATE ALL SOFTWARE
              </button>
            </div>

            {/* Live Client Status Table */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  Live Network PC Deployment Status
                </span>
                {(() => {
                  const hosts = Object.keys(clientStatuses);
                  const total = Math.max(hosts.length, 1);
                  const updatedCount = hosts.filter((h) => clientStatuses[h]?.status === 'UPDATED').length;
                  const pendingCount = total - updatedCount;
                  return (
                    <span className="text-[11px] font-mono text-[#8E9299]">
                      <span className="text-emerald-400 font-bold">{updatedCount} of {total}</span> computers updated
                      {pendingCount > 0 && <span className="text-amber-400 ml-1">({pendingCount} pending/offline)</span>}
                    </span>
                  );
                })()}
              </div>

              <div className="overflow-x-auto border border-[#1E222A] rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#14171F] border-b border-[#1E222A] text-[10px] uppercase font-bold text-[#8E9299]">
                      <th className="p-2.5">Host Computer</th>
                      <th className="p-2.5">Current Version</th>
                      <th className="p-2.5">Deployment Status</th>
                      <th className="p-2.5 text-right">Last Heartbeat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222A] text-xs font-mono">
                    {Object.keys(clientStatuses).length === 0 ? (
                      <tr>
                        <td className="p-3 text-white font-semibold">PC1 (This Computer)</td>
                        <td className="p-3 text-gray-400">v1.1.0</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> UPDATED ✓
                          </span>
                        </td>
                        <td className="p-3 text-right text-[#8E9299]">Just now</td>
                      </tr>
                    ) : (
                      Object.entries(clientStatuses).map(([hostKey, info]: [string, any]) => (
                        <tr key={hostKey} className="hover:bg-[#14171F]/50">
                          <td className="p-2.5 text-white font-semibold flex items-center gap-2">
                            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                            {hostKey}
                          </td>
                          <td className="p-2.5 text-gray-300">v{info.version || '1.1.0'}</td>
                          <td className="p-2.5">
                            {info.status === 'UPDATED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> UPDATED ✓
                              </span>
                            )}
                            {info.status === 'DOWNLOADING' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">
                                <RefreshCw className="w-3 h-3 animate-spin" /> DOWNLOADING {info.percent}%
                              </span>
                            )}
                            {info.status === 'RESTARTING' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                                <RefreshCw className="w-3 h-3 animate-spin" /> RESTARTING
                              </span>
                            )}
                            {info.status !== 'UPDATED' && info.status !== 'DOWNLOADING' && info.status !== 'RESTARTING' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                                UPDATE PENDING / OFFLINE
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right text-[#8E9299] text-[11px]">
                            {info.updatedAt ? new Date(info.updatedAt).toLocaleTimeString() : 'Recent'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Upload New Package Form */}
          <form onSubmit={handlePublishPackage} className="space-y-4 pt-2 border-t border-[#1E222A]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#F27D26]" />
              Publish New Update Package
            </h4>

            {publishMessage && (
              <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${publishMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                {publishMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{publishMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1">
                  Target Version
                </label>
                <input
                  type="text"
                  value={updateVersion}
                  onChange={(e) => setUpdateVersion(e.target.value)}
                  placeholder="1.1.0"
                  className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs font-mono focus:outline-none focus:border-[#F27D26]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1">
                  Target Platform
                </label>
                <input
                  type="text"
                  value={updatePlatform}
                  onChange={(e) => setUpdatePlatform(e.target.value)}
                  placeholder="Windows Portable / Linux AppImage"
                  className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs focus:outline-none focus:border-[#F27D26]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1">
                  Package Filename
                </label>
                <input
                  type="text"
                  value={updateFileName}
                  onChange={(e) => setUpdateFileName(e.target.value)}
                  placeholder="PLMSys-v1.1.0-update.pkg"
                  className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs font-mono focus:outline-none focus:border-[#F27D26]"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1">
                  Changelog: NEW Features (comma separated)
                </label>
                <input
                  type="text"
                  value={updateNewNotes}
                  onChange={(e) => setUpdateNewNotes(e.target.value)}
                  placeholder="Feature 1, Feature 2"
                  className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1">
                  Changelog: IMPROVED Features (comma separated)
                </label>
                <input
                  type="text"
                  value={updateImprovedNotes}
                  onChange={(e) => setUpdateImprovedNotes(e.target.value)}
                  placeholder="Improvement 1, Improvement 2"
                  className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1">
                  Changelog: FIXED Features (comma separated)
                </label>
                <input
                  type="text"
                  value={updateFixedNotes}
                  onChange={(e) => setUpdateFixedNotes(e.target.value)}
                  placeholder="Fix 1, Fix 2"
                  className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs focus:outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPublishing}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-[#F27D26]" />
                    Publish Update Package to Network Storage
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Recovery Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
        >
          <div className="p-6 border-b border-[#1E222A] bg-[#191D28]/50">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white uppercase text-sm tracking-wider">Database Maintenance</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                <div className="p-2 bg-indigo-500/10 rounded text-indigo-400">
                  <Download className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Manual Export Backup</h4>
                  <p className="text-xs text-[#8E9299] mb-3">Download a complete snapshot of the database in JSON format for external storage.</p>
                  <button 
                    onClick={onExportBackup}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Export Backup
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <div className="p-2 bg-amber-500/10 rounded text-amber-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Restore from Backup</h4>
                  <p className="text-xs text-[#8E9299] mb-3 leading-relaxed">Restore database from a previously exported JSON file. <span className="text-amber-500 font-bold">WARNING: This will overwrite all current data.</span></p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={async (e) => {
                      try {
                        await onImportBackup(e);
                      } finally {
                        if (e.target) e.target.value = '';
                      }
                    }} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Import Backup
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-rose-500/5 rounded-lg border border-rose-500/10">
                <div className="p-2 bg-rose-500/10 rounded text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-1">Factory Reset</h4>
                  <p className="text-xs text-[#8E9299] mb-3 leading-relaxed">Wipe all data and return the system to its original state. <span className="text-rose-500 font-bold underline">THIS CANNOT BE UNDONE.</span></p>
                  <button 
                    onClick={() => {
                      setRestoreSuccess(false);
                      setRestoreError('');
                      setConfirmationText('');
                      setShowRestoreModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Restore Factory Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Auto-Monitoring Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
        >
          <div className="p-6 border-b border-[#1E222A] bg-[#191D28]/50">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white uppercase text-sm tracking-wider">System Auto-Monitoring</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0A0B0E] rounded-lg border border-[#1E222A]">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#8E9299]" />
                  <span className="text-sm text-[#E0E2E5]">Auto-Backup Frequency</span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Daily at Midnight</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0A0B0E] rounded-lg border border-[#1E222A]">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-[#8E9299]" />
                  <span className="text-sm text-[#E0E2E5]">Activity Trigger Threshold</span>
                </div>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">50 New Logs</span>
              </div>
              
              <div className="p-4 bg-[#0A0B0E] rounded-lg border border-[#1E222A] mt-2">
                <p className="text-xs text-[#8E9299] leading-relaxed">
                  The system automatically persists all session data to localized storage. 
                  Automatic backups are triggered periodically to ensure data integrity during long-running sessions.
                </p>
              </div>

              {typeof window !== 'undefined' && (window as any).electronAPI && (
                <div className="p-4 bg-[#0A0B0E] rounded-lg border border-[#1E222A] space-y-3 mt-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Portable File Locations</h4>
                  <p className="text-xs text-[#8E9299] leading-relaxed">
                    View or copy your local persistent data files, backups, and logs stored beside the application executable.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await (window as any).electronAPI.openDataFolder();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Open Data Folder
                    </button>
                    <button
                      onClick={async () => {
                        await (window as any).electronAPI.openBackupFolder();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Open Backup Folder
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* RESTORE FACTORY CONFIRMATION MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0F1117] border border-[#1E222A] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E222A] pb-3">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Factory Reset</h3>
              </div>
              {!isRestoring && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationText('');
                    setShowRestoreModal(false);
                  }}
                  className="text-[#8E9299] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {restoreSuccess ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-white">Factory Reset Complete</h4>
                <p className="text-xs text-[#8E9299]">System has been restored to default factory settings.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-xs text-rose-400 uppercase font-bold tracking-wider">Warning: Critical Action</p>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    This will permanently erase ALL PLMSys data, including personnel, plates, job orders, production records, history, and settings.

This action cannot be undone.

Do you want to continue?
                  </p>
                  
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block">
                      Type <span className="text-rose-400">RESET</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="RESET"
                      disabled={isRestoring}
                      className="w-full px-3 py-2 bg-[#0A0B0E] border border-[#1E222A] text-white rounded-lg text-xs focus:outline-none focus:border-rose-500 transition-colors uppercase font-mono tracking-widest text-center"
                    />
                  </div>
                </div>

                {restoreError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-semibold">
                    {restoreError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E222A]">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => {
                      setConfirmationText('');
                      setShowRestoreModal(false);
                    }}
                    className="px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRestoring || confirmationText.trim().toUpperCase() !== 'RESET'}
                    onClick={handleConfirmRestore}
                    className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/30 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      'Yes, Restore Factory Settings'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Trigger Update Confirmation Modal */}
      {showUpdateConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#14171F] border border-[#F27D26]/40 rounded-xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-[#1E222A] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-lg text-[#F27D26]">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">Initiate System-Wide Update</h3>
                  <p className="text-xs text-[#8E9299]">Broadcast software update to all network client computers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateConfirmModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#0A0B0E] rounded-lg border border-[#1E222A] space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notice to Administrator</span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed font-sans">
                All connected PLMSys users will be notified and disconnected after a 1-minute warning.
              </p>
              <div className="pt-2 text-[11px] text-[#8E9299] font-mono border-t border-[#1E222A] space-y-1">
                <div>• Target Package Version: <span className="text-white font-bold">{publishedManifest?.version || '1.1.0'}</span></div>
                <div>• Maintenance Mode: Enforced at countdown expiration</div>
                <div>• Verified Pre-Update Backup: Automated prior to update execution</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E222A]">
              <button
                type="button"
                disabled={isInitiatingUpdate}
                onClick={() => setShowUpdateConfirmModal(false)}
                className="px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isInitiatingUpdate}
                onClick={handleTriggerUpdateAll}
                className="flex items-center gap-2 px-5 py-2 bg-[#F27D26] hover:bg-[#d66a1a] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isInitiatingUpdate ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Broadcasting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Confirm & Trigger Update All Software
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
