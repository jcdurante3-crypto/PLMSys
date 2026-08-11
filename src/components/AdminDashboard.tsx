import React, { useRef, useState } from 'react';
import { Download, Upload, Shield, Database, Clock, Activity, AlertCircle, RefreshCw, CheckCircle2, X } from 'lucide-react';
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
            <p className="text-sm text-[#8E9299]">System maintenance and data management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Recovery Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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

        {/* System Health Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
                    This will permanently erase ALL PLMSys data,
including personnel, plates, job orders,
production records, history, and settings.

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
    </div>
  );
};
