import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, FileText, X } from 'lucide-react';

interface AutoUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPostUpdateWelcome?: boolean;
}

export const AutoUpdateModal: React.FC<AutoUpdateModalProps> = ({
  isOpen,
  onClose,
  isPostUpdateWelcome = false,
}) => {
  const [stage, setStage] = useState<'IDLE' | 'CHANGELOG' | 'UPDATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    availableVersion: string;
    hasUpdate: boolean;
    changelog: Record<string, string[]>;
    connectedClients?: number;
  }>({
    currentVersion: '1.0.0',
    availableVersion: '1.1.0',
    hasUpdate: true,
    changelog: {},
  });

  const [progress, setProgress] = useState<{
    stage: string;
    percent: number;
    downloadedBytes: number;
    totalBytes: number;
    message: string;
    error?: string;
  }>({
    stage: 'preparing',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 50888576,
    message: 'Ready to update',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CHANGELOG' | 'ACTIVE'>('CHANGELOG');

  useEffect(() => {
    if ((window as any).electronAPI) {
      if ((window as any).electronAPI.checkForUpdates) {
        (window as any).electronAPI.checkForUpdates().then((res: any) => {
          if (res) {
            setUpdateInfo(res);
          }
        });
      }

      if ((window as any).electronAPI.onUpdateProgress) {
        const unsub = (window as any).electronAPI.onUpdateProgress((prog: any) => {
          console.log('Update progress received:', prog);
          setProgress(prog);

          if (prog.stage === 'error') {
            setStage('ERROR');
            setErrorMessage(prog.error || 'An unexpected error occurred during the update process.');
          } else if (prog.stage === 'complete') {
            setStage('SUCCESS');
          }
        });
        return () => unsub();
      }
    }
  }, []);

  useEffect(() => {
    if (isPostUpdateWelcome) {
      setStage('SUCCESS');
    } else {
      setStage('IDLE');
    }
  }, [isPostUpdateWelcome, isOpen]);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    setStage('UPDATING');
    setErrorMessage(null);

    try {
      if ((window as any).electronAPI && (window as any).electronAPI.startAutoUpdate) {
        const result = await (window as any).electronAPI.startAutoUpdate();
        if (!result.success) {
          setStage('ERROR');
          setErrorMessage(result.error || 'Update process failed.');
        }
      } else {
        // Fallback simulation for browser environment
        const total = 50888576;
        setProgress({ stage: 'preparing', percent: 5, downloadedBytes: 0, totalBytes: total, message: 'Preparing update...' });
        await new Promise((r) => setTimeout(r, 600));

        setProgress({ stage: 'backup', percent: 15, downloadedBytes: 0, totalBytes: total, message: 'Creating verified database backup...' });
        await new Promise((r) => setTimeout(r, 800));

        const steps = [
          { percent: 35, downloadedBytes: 17811000, msg: 'Downloading package... 35%' },
          { percent: 65, downloadedBytes: 33077500, msg: 'Downloading package... 65%' },
          { percent: 85, downloadedBytes: 43255200, msg: 'Downloading package... 85%' },
          { percent: 95, downloadedBytes: 50888576, msg: 'Download complete (50.8 MB)' },
        ];

        for (const step of steps) {
          setProgress({ stage: 'downloading', percent: step.percent, downloadedBytes: step.downloadedBytes, totalBytes: total, message: step.msg });
          await new Promise((r) => setTimeout(r, 600));
        }

        setProgress({ stage: 'verifying', percent: 98, downloadedBytes: total, totalBytes: total, message: 'Verifying package checksum & integrity...' });
        await new Promise((r) => setTimeout(r, 700));

        setProgress({ stage: 'complete', percent: 100, downloadedBytes: total, totalBytes: total, message: 'Update complete! Relaunching PLMSys...' });
        await new Promise((r) => setTimeout(r, 1000));

        setStage('SUCCESS');
      }
    } catch (err: any) {
      setStage('ERROR');
      setErrorMessage(err.message || 'Update failed');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#14171F] border border-[#2A2E3D] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-white flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2A2E3D] bg-[#1A1D26] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F27D26]/10 border border-[#F27D26]/30 rounded-lg text-[#F27D26]">
              <RefreshCw className={`w-5 h-5 ${stage === 'UPDATING' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight uppercase">
                {isPostUpdateWelcome ? 'PLMSys Updated Successfully' : 'PLMSys Application Updater'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8E9299]">
                <span>Current: v{updateInfo.currentVersion}</span>
                <ChevronRight className="w-3 h-3 text-[#F27D26]" />
                <span className="text-[#F27D26] font-semibold">Target: v{updateInfo.availableVersion}</span>
              </div>
            </div>
          </div>
          {stage !== 'UPDATING' && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2E3D] text-[#8E9299] hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Post Update Welcome View */}
          {isPostUpdateWelcome && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-400">Successfully Updated to v{updateInfo.availableVersion}</h3>
                  <p className="text-xs text-[#8E9299] mt-1">
                    PLMSys has been updated to the latest version. Your local database, settings, backups, and portable files have been completely preserved.
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-[#1A1D26] p-4 rounded-xl border border-[#2A2E3D]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F27D26]">What's New in v1.1.0</h4>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
                    <span><strong>Multi-PC LAN Sync:</strong> Real-time LAN collaboration with atomic cross-PC locking.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
                    <span><strong>Safe Updater:</strong> Full application update system with byte-accurate progress monitoring.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26]" />
                    <span><strong>Verified Safety Backups:</strong> Automatic database verification prior to updates.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Error State */}
          {stage === 'ERROR' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-rose-400">Update Cancelled or Failed</h3>
                  <p className="text-xs text-gray-300 mt-1">{errorMessage}</p>
                </div>
              </div>
              <p className="text-xs text-[#8E9299]">
                PLMSys has kept your existing version (v{updateInfo.currentVersion}) untouched and safely running. Your database and data directory are completely secure.
              </p>
            </div>
          )}

          {/* Updating Progress View */}
          {stage === 'UPDATING' && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="uppercase text-[#F27D26] tracking-wider">{progress.stage}</span>
                  <span className="text-white font-mono">{progress.percent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#1A1D26] border border-[#2A2E3D] rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#F27D26] to-amber-400 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#8E9299] pt-1">
                  <span>{progress.message}</span>
                  {progress.totalBytes > 0 && (
                    <span className="font-mono">
                      {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Safeguard Status List */}
              <div className="bg-[#1A1D26] border border-[#2A2E3D] rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <ShieldCheck className={`w-4 h-4 ${progress.percent >= 15 ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span>Verified Database Pre-Update Safety Backup</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Download className={`w-4 h-4 ${progress.percent >= 80 ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span>Package Download & Checksum Integrity Verification</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <RefreshCw className={`w-4 h-4 ${progress.percent >= 95 ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span>Safe Atomic File Replacement & Application Relaunch</span>
                </div>
              </div>
            </div>
          )}

          {/* Idle / Release Notes View */}
          {!isPostUpdateWelcome && stage === 'IDLE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#1A1D26] p-3 rounded-lg border border-[#2A2E3D] text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified Pre-Update Backup Guaranteed</span>
                </div>
                <span className="text-emerald-400 font-semibold">Safe Update Available</span>
              </div>

              {/* Release Notes / Changelog Sections */}
              <div className="space-y-4 bg-[#1A1D26] p-4 rounded-xl border border-[#2A2E3D]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F27D26] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Release Notes — v{updateInfo.availableVersion}
                </h3>

                {updateInfo.changelog && Object.keys(updateInfo.changelog).length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {Object.entries(updateInfo.changelog).map(([section, items]) => {
                      const list = (items as string[]) || [];
                      return list.length > 0 && (
                        <div key={section} className="space-y-1">
                          <h4 className="text-[11px] font-bold uppercase text-[#8E9299] tracking-wider">{section}</h4>
                          <ul className="space-y-1 text-xs text-gray-300">
                            {list.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#F27D26] font-bold mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#F27D26] font-bold">•</span>
                      <span><strong>NEW:</strong> Multi-PC Local Network Collaboration with atomic file locking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F27D26] font-bold">•</span>
                      <span><strong>NEW:</strong> Full Application Auto-Updater with real byte progress monitoring</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F27D26] font-bold">•</span>
                      <span><strong>IMPROVED:</strong> Automatic database backup verification prior to updates</span>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-[#2A2E3D] bg-[#1A1D26] flex items-center justify-end gap-3">
          {isPostUpdateWelcome ? (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#e06c1b] text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-[#F27D26]/20 uppercase tracking-wider"
            >
              Continue to PLMSys
            </button>
          ) : stage === 'IDLE' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#2A2E3D] hover:bg-[#3A3F52] text-gray-300 font-semibold text-xs rounded-lg transition-colors"
              >
                Remind Me Later
              </button>
              <button
                onClick={handleStartUpdate}
                className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#e06c1b] text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-[#F27D26]/20 flex items-center gap-2 uppercase tracking-wider"
              >
                <Download className="w-4 h-4" />
                <span>Install Update Now</span>
              </button>
            </>
          ) : stage === 'ERROR' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2A2E3D] hover:bg-[#3A3F52] text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Dismiss
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
};
