import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminUpdateNotificationModalProps {
  isOpen: boolean;
  secondsLeft: number;
  version: string;
  onSaveAndReady?: () => void;
  isExecutingUpdate?: boolean;
}

export const AdminUpdateNotificationModal: React.FC<AdminUpdateNotificationModalProps> = ({
  isOpen,
  secondsLeft,
  version,
  onSaveAndReady,
  isExecutingUpdate = false,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0F1117] border border-[#F27D26]/40 rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F27D26] via-amber-400 to-[#F27D26]" />

        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-xl text-[#F27D26] shrink-0">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#F27D26] uppercase bg-[#F27D26]/10 px-2 py-0.5 rounded border border-[#F27D26]/20">
              System Announcement
            </span>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight mt-1">
              PLMSys System Update
            </h2>
            <p className="text-xs text-[#8E9299] mt-0.5">
              Target Version: <span className="text-white font-mono font-bold">v{version || '1.1.0'}</span>
            </p>
          </div>
        </div>

        {isExecutingUpdate ? (
          <div className="py-8 text-center space-y-4 bg-[#0A0B0E] p-6 rounded-xl border border-[#1E222A]">
            <RefreshCw className="w-12 h-12 text-[#F27D26] mx-auto animate-spin" />
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Maintenance Mode Active
              </h3>
              <p className="text-xs text-[#8E9299] mt-1">
                Disconnecting safely, verifying backup, and staging application update package...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 bg-[#0A0B0E] p-5 rounded-xl border border-[#1E222A]">
            <div className="space-y-2 text-sm text-gray-200 leading-relaxed font-sans">
              <p className="font-semibold text-white">An administrator has initiated a system update.</p>
              <p className="text-amber-400/90 text-xs font-medium">Please save your work immediately.</p>
            </div>

            <div className="pt-2 pb-1 text-center border-t border-[#1E222A]">
              <span className="text-xs text-[#8E9299] uppercase font-bold tracking-wider block mb-2">
                You will be disconnected in:
              </span>
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#14171F] border border-[#F27D26]/30 rounded-xl shadow-inner">
                <Clock className="w-6 h-6 text-[#F27D26] animate-bounce" />
                <span className="font-mono text-3xl font-extrabold text-[#F27D26] tracking-widest">
                  {timeFormatted}
                </span>
              </div>
            </div>
          </div>
        )}

        {!isExecutingUpdate && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onSaveAndReady}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#F27D26] hover:bg-[#d66a1a] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#F27D26]/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Work & Prepare for Update
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
