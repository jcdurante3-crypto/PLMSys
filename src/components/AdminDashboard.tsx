import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Shield, Database, Clock, Activity, AlertCircle, HardDrive, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../db/db';
import { FactoryResetModal } from './FactoryResetModal';

interface AdminDashboardProps {
  onExportBackup: () => Promise<void>;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRestoreFactory: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExportBackup, onImportBackup, onRestoreFactory }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbInfo, setDbInfo] = useState<{ dbPath: string; appDir: string; isInsideAppFolder: boolean; backend: string } | null>(null);
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [stats, setStats] = useState({ sets: 0, plates: 0, productionLogs: 0, auditLogs: 0, personnel: 0 });

  useEffect(() => {
    db.getDbInfo().then(setDbInfo);
    Promise.all([
      db.sets.count(),
      db.plates.count(),
      db.dailyProduction.count(),
      db.auditLogs.count(),
      db.personnel.count(),
    ]).then(([sets, plates, productionLogs, auditLogs, personnel]) => {
      setStats({ sets, plates, productionLogs, auditLogs, personnel });
    });
  }, []);

  const handleRestoreClick = () => {
    setShowFactoryModal(true);
  };

  const handleConfirmReset = async () => {
    await onRestoreFactory();
    setShowFactoryModal(false);
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
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
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
                    onChange={onImportBackup} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
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
                    onClick={handleRestoreClick}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-rose-500/20"
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

              {dbInfo && (
                <div className="space-y-2 p-3 bg-[#0A0B0E] rounded-lg border border-[#1E222A]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-[#E0E2E5]">Database Engine</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">{dbInfo.backend}</span>
                  </div>
                  {dbInfo.dbPath && (
                    <div className="text-xs text-[#8E9299] break-all pt-1 border-t border-[#1E222A]">
                      <span className="text-[#E0E2E5] font-semibold">Location:</span> {dbInfo.dbPath}
                    </div>
                  )}
                  {dbInfo.isInsideAppFolder && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Portable Mode Active (DB stored inside application folder)
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4 bg-[#0A0B0E] rounded-lg border border-[#1E222A] mt-2">
                <p className="text-xs text-[#8E9299] leading-relaxed">
                  The system automatically persists all session data to localized storage. 
                  Automatic backups are triggered periodically to ensure data integrity during long-running sessions.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <FactoryResetModal
        isOpen={showFactoryModal}
        onClose={() => setShowFactoryModal(false)}
        onConfirm={handleConfirmReset}
        onExport={onExportBackup}
        stats={stats}
      />
    </div>
  );
};
