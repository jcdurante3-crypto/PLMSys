import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onExport: () => Promise<void>;
  stats: {
    sets: number;
    plates: number;
    productionLogs: number;
    auditLogs: number;
    personnel: number;
  };
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onExport,
  stats,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [exportedFirst, setExportedFirst] = useState(false);

  if (!isOpen) return null;

  const handleExportClick = async () => {
    await onExport();
    setExportedFirst(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'RESET') return;

    setIsResetting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsResetting(false);
      setConfirmText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#12151C] border border-[#2B3240] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-[#E0E2E5] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#212630] bg-[#191D28]/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Restore Factory Settings</h3>
              <p className="text-xs text-[#8E9299]">Permanent system data wipe and reset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E9299] hover:text-white p-1 rounded-lg hover:bg-[#1E222A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200/90 leading-relaxed">
                <span className="font-bold text-rose-400">WARNING:</span> This action will permanently erase all custom data, equipment sets, production records, and audit logs currently stored in the system. The database will return to its initial seeded state.
              </div>
            </div>
          </div>

          {/* Current Data Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Current System Data Snapshot</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-[#191D28] border border-[#262B35] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{stats.sets}</div>
                <div className="text-[11px] text-[#8E9299]">Equipment Sets</div>
              </div>
              <div className="bg-[#191D28] border border-[#262B35] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{stats.plates}</div>
                <div className="text-[11px] text-[#8E9299]">Master Plates</div>
              </div>
              <div className="bg-[#191D28] border border-[#262B35] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{stats.productionLogs}</div>
                <div className="text-[11px] text-[#8E9299]">Production Logs</div>
              </div>
              <div className="bg-[#191D28] border border-[#262B35] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{stats.auditLogs}</div>
                <div className="text-[11px] text-[#8E9299]">Audit Records</div>
              </div>
              <div className="bg-[#191D28] border border-[#262B35] rounded-xl p-3 text-center col-span-2 sm:col-span-2">
                <div className="text-lg font-bold text-white">{stats.personnel}</div>
                <div className="text-[11px] text-[#8E9299]">Registered Personnel</div>
              </div>
            </div>
          </div>

          {/* Recommendation to Backup */}
          <div className="p-4 bg-[#191D28] border border-[#262B35] rounded-xl flex items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-bold text-white mb-1">Recommended Safety Step</h5>
              <p className="text-xs text-[#8E9299]">Export your current database backup before performing a factory reset.</p>
            </div>
            <button
              type="button"
              onClick={handleExportClick}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                exportedFirst
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
              }`}
            >
              {exportedFirst ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Backup Downloaded
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Backup First
                </>
              )}
            </button>
          </div>

          {/* Confirmation Input Form */}
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8E9299] mb-1.5">
                Type <span className="font-mono font-bold text-rose-400">RESET</span> to confirm factory restore:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full bg-[#0A0D14] border border-[#2B3240] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#4A5160] focus:outline-none focus:border-rose-500 font-mono tracking-widest"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#8E9299] hover:text-white bg-[#191D28] hover:bg-[#212630] rounded-xl transition-colors border border-[#2B3240]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={confirmText !== 'RESET' || isResetting}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                  confirmText === 'RESET' && !isResetting
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20 cursor-pointer'
                    : 'bg-rose-950/40 text-rose-400/40 border border-rose-900/40 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {isResetting ? 'Restoring Factory Settings...' : 'Confirm Factory Reset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
