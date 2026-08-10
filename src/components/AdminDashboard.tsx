import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Shield, Database, Clock, Activity, AlertCircle, RefreshCw, CheckCircle2, X, HardDrive } from 'lucide-react';
import { motion } from 'motion/react';
import { BackupInfo } from '../types'; // I will add this to types.ts later if needed, or define it locally

interface AdminDashboardProps {
  onExportBackup?: () => Promise<void>; // Make optional since we will handle it internally
  onImportBackup?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRestoreFactory: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onRestoreFactory }) => {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showRestoreBackupModal, setShowRestoreBackupModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [actionMessage, setActionMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchStatusAndBackups = async () => {
    try {
      if (window.electronAPI) {
        const [statusRes, backupsRes] = await Promise.all([
          window.electronAPI.getDbStatus(),
          window.electronAPI.getBackups()
        ]);
        if (statusRes.success) {
          setDbStatus(statusRes);
        }
        if (backupsRes.success && backupsRes.backups) {
          setBackups(backupsRes.backups);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatusAndBackups();
  }, []);

  const handleBackupNow = async () => {
    setActionMessage(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createManualBackup();
        if (res.success) {
          setActionMessage({ type: 'success', text: 'Backup created successfully.' });
          fetchStatusAndBackups();
        } else {
          setActionMessage({ type: 'error', text: `Backup failed.\nYour current database was not modified.` });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Backup failed.\nYour current database was not modified.' });
    }
  };

  const handleExportBackup = async () => {
    setActionMessage(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.exportBackup();
        if (res.success) {
          setActionMessage({ type: 'success', text: 'Backup exported successfully.' });
        } else if (!res.cancelled) {
          setActionMessage({ type: 'error', text: `Export failed: ${res.error}` });
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Export failed: ${err.message}` });
    }
  };

  const handleConfirmRestoreFactory = async () => {
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
        fetchStatusAndBackups();
      }, 2000);
    } catch (err) {
      console.error('Error during factory reset:', err);
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore factory settings.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmRestoreBackup = async () => {
    setIsRestoring(true);
    setRestoreError('');
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.restoreBackup();
        if (res.success) {
          setRestoreSuccess(true);
          setTimeout(() => {
            setRestoreSuccess(false);
            setShowRestoreBackupModal(false);
            window.location.reload(); // Reload the app to reflect new data
          }, 2000);
        } else if (!res.cancelled) {
          setRestoreError(`Restore failed. The selected backup is invalid. Error: ${res.error}`);
        } else {
          // cancelled
          setShowRestoreBackupModal(false);
        }
      }
    } catch (err: any) {
      console.error('Error during backup restore:', err);
      setRestoreError(`Restore failed. The selected backup is invalid.`);
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
            <p className="text-sm text-[#8E9299]">System maintenance and data management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup & Restore Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
        >
          <div className="p-6 border-b border-[#1E222A] bg-[#191D28]/50">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white uppercase text-sm tracking-wider">Backup & Restore</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {actionMessage && (
              <div className={`p-4 rounded-lg border text-sm font-semibold whitespace-pre-wrap ${
                actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {actionMessage.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0A0B0E] rounded-lg border border-[#1E222A]">
                <p className="text-xs text-[#8E9299] mb-1 uppercase tracking-wider">Current database</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dbStatus?.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-sm font-bold text-white">{dbStatus?.status === 'healthy' ? 'Healthy' : 'Error'}</span>
                </div>
              </div>
              <div className="p-4 bg-[#0A0B0E] rounded-lg border border-[#1E222A]">
                <p className="text-xs text-[#8E9299] mb-1 uppercase tracking-wider">Database size</p>
                <p className="text-sm font-bold text-white">
                  {dbStatus?.details?.size ? (dbStatus.details.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#8E9299] mb-3 uppercase tracking-wider">Available backups</p>
              <div className="bg-[#0A0B0E] rounded-lg border border-[#1E222A] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#191D28] border-b border-[#1E222A]">
                    <tr>
                      <th className="px-4 py-2 font-bold text-[#8E9299] uppercase">Date</th>
                      <th className="px-4 py-2 font-bold text-[#8E9299] uppercase text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E222A]">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-[#8E9299]">No backups available</td>
                      </tr>
                    ) : (
                      backups.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#191D28]/50 transition-colors">
                          <td className="px-4 py-2 text-gray-300">{new Date(b.date).toLocaleString()}</td>
                          <td className="px-4 py-2 text-gray-300 text-right">{b.sizeMB} MB</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {backups.length > 0 && (
                <p className="text-xs text-[#8E9299] mt-2">
                  Last backup: {new Date(backups[0].date).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleBackupNow}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-md transition-all"
              >
                <Database className="w-4 h-4" />
                Backup Now
              </button>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                Export Backup
              </button>
              <button
                onClick={() => setShowRestoreBackupModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#191D28] hover:bg-rose-500/10 border border-[#1E222A] hover:border-rose-500/30 text-rose-400 rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                Restore Backup
              </button>
            </div>
          </div>
        </motion.div>

        {/* System & Portable Storage Section */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
          >
            <div className="p-6 border-b border-[#1E222A] bg-[#191D28]/50">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white uppercase text-sm tracking-wider">Portable Storage & File Locations</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#8E9299] leading-relaxed">
                All automatic backups and the production database remain beside the Portable EXE in the <code className="bg-[#0A0B0E] px-1 py-0.5 rounded text-indigo-400">data/</code> folder. Moving the entire PLMSys folder will safely move all backups with it.
              </p>
              {typeof window !== 'undefined' && (window as any).electronAPI && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={async () => await (window as any).electronAPI.openDataFolder()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                  >
                    Open Data Folder
                  </button>
                  <button
                    onClick={async () => await (window as any).electronAPI.openBackupFolder()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                  >
                    Open Backup Folder
                  </button>
                </div>
              )}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#14171F] border border-[#1E222A] rounded-xl overflow-hidden shadow-xl"
          >
            <div className="p-6 border-b border-[#1E222A] bg-rose-500/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-white uppercase text-sm tracking-wider">Danger Zone</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-4 bg-rose-500/5 rounded-lg border border-rose-500/10">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Factory Reset</h4>
                  <p className="text-xs text-[#8E9299]">Erase all data and restore to factory defaults.</p>
                </div>
                <button 
                  onClick={() => setShowRestoreModal(true)}
                  className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-600/20 hover:border-rose-600 text-rose-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                >
                  Factory Reset
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* RESTORE BACKUP CONFIRMATION MODAL */}
      {showRestoreBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0F1117] border border-[#1E222A] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E222A] pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Upload className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Restore Backup</h3>
              </div>
              {!isRestoring && (
                <button
                  type="button"
                  onClick={() => setShowRestoreBackupModal(false)}
                  className="text-[#8E9299] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {restoreSuccess ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-white">Restore Complete</h4>
                <p className="text-xs text-[#8E9299]">The application is reloading to apply changes...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">Restore this backup?</h4>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    Your current data will be replaced.
                    A safety backup will be created automatically before the restore happens.
                  </p>
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
                    onClick={() => setShowRestoreBackupModal(false)}
                    className="px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-gray-300 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleConfirmRestoreBackup}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      'Restore'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                  <h4 className="text-sm font-bold text-white">Factory Reset will permanently replace your current database.</h4>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    A safety backup will be created before continuing.
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
                    onClick={handleConfirmRestoreFactory}
                    className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/30 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      'Factory Reset'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
