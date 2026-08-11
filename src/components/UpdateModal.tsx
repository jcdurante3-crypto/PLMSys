import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Zap,
  Clock,
  RotateCcw,
  X,
  FileText
} from 'lucide-react';
import { UpdateRelease } from '../types';

interface UpdateModalProps {
  release: UpdateRelease;
  onComplete: () => void;
  onClose: () => void;
  onViewChangelog: () => void;
  autoStart?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  release,
  onComplete,
  onClose,
  onViewChangelog,
  autoStart = true
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'IDLE' | 'DOWNLOADING' | 'VERIFYING' | 'MIGRATING' | 'RELOAD' | 'COMPLETED'>(
    autoStart ? 'DOWNLOADING' : 'IDLE'
  );
  const [secondsRemaining, setSecondsRemaining] = useState(8);
  const [downloadedMb, setDownloadedMb] = useState(0);
  const totalMb = release.downloadSizeMb || 28.4;

  useEffect(() => {
    if (stage === 'DOWNLOADING' || stage === 'VERIFYING' || stage === 'MIGRATING') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('COMPLETED');
            return 100;
          }
          const next = prev + 2.5;
          setDownloadedMb(Number(((next / 100) * totalMb).toFixed(1)));
          setSecondsRemaining(Math.max(0, Math.ceil((100 - next) / 12.5)));

          if (next >= 40 && stage === 'DOWNLOADING') {
            setStage('VERIFYING');
          } else if (next >= 75 && stage === 'VERIFYING') {
            setStage('MIGRATING');
          }

          return next;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [stage, totalMb]);

  const handleStartUpdate = () => {
    setProgress(0);
    setDownloadedMb(0);
    setStage('DOWNLOADING');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#12151C] border border-[#1E222A] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 border-t-4 border-t-[#F27D26]">
        {/* Top Branding Header */}
        <div className="p-6 bg-[#161B26] border-b border-[#1E222A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F27D26]/10 rounded-xl text-[#F27D26] border border-[#F27D26]/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 uppercase tracking-wider">
                  System Update
                </span>
                <span className="text-xs text-[#8E9299]">v{release.version} Available</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">Software Update Engine</h3>
            </div>
          </div>
          {stage === 'COMPLETED' || stage === 'IDLE' ? (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#1E222A] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        <div className="p-6 space-y-6">
          {/* Version Header Card */}
          <div className="bg-[#191D28] border border-[#1E222A] p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8E9299]">
              <span>Release Version: <strong className="text-white">v{release.version}</strong></span>
              <span>Size: <strong className="text-white">{release.downloadSizeMb} MB</strong></span>
            </div>
            <p className="text-xs text-white font-medium leading-relaxed">{release.summary}</p>
          </div>

          {/* Download & Installation Progress Bar Area */}
          {(stage === 'DOWNLOADING' || stage === 'VERIFYING' || stage === 'MIGRATING' || stage === 'COMPLETED') && (
            <div className="space-y-3 bg-[#161B26] p-4 rounded-xl border border-[#1E222A]">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  {stage === 'DOWNLOADING' && <Download className="w-4 h-4 text-[#F27D26] animate-bounce" />}
                  {stage === 'VERIFYING' && <Shield className="w-4 h-4 text-amber-400 animate-pulse" />}
                  {stage === 'MIGRATING' && <Layers className="w-4 h-4 text-blue-400 animate-spin" />}
                  {stage === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}

                  {stage === 'DOWNLOADING' && 'Downloading System Update Package...'}
                  {stage === 'VERIFYING' && 'Verifying Digital Checksums & Signatures...'}
                  {stage === 'MIGRATING' && 'Applying Database Migrations & Sync Drivers...'}
                  {stage === 'COMPLETED' && 'Update Successfully Applied! Version 2.4.0 Live.'}
                </span>

                <span className="font-mono text-[#F27D26] text-sm font-bold">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="h-3 w-full bg-[#12151C] rounded-full overflow-hidden border border-[#1E222A] p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#F27D26] via-amber-500 to-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Speed & Stats */}
              <div className="flex items-center justify-between text-[11px] text-[#8E9299]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {stage === 'COMPLETED' ? 'Completed in 8s' : `Estimated time remaining: ${secondsRemaining}s`}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-white">{downloadedMb} MB</span> / {totalMb} MB
                </div>
              </div>
            </div>
          )}

          {/* Highlights of Changes Included */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>What's Included in Version {release.version}</span>
              <button
                type="button"
                onClick={onViewChangelog}
                className="text-[11px] text-[#F27D26] hover:underline flex items-center gap-1 font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                View Full Release History
              </button>
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {release.changes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#191D28] border border-[#1E222A] rounded-xl text-xs flex items-start gap-2.5"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase tracking-wider ${
                      item.category === 'FEATURE'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : item.category === 'ENHANCEMENT'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : item.category === 'SECURITY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.category}
                  </span>
                  <span className="text-[#E0E2E5] leading-relaxed">{item.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1E222A]">
            <button
              type="button"
              onClick={onViewChangelog}
              className="px-3.5 py-2 rounded-lg bg-[#191D28] hover:bg-[#2D333E] text-[#8E9299] hover:text-white text-xs font-semibold border border-[#1E222A] transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Detailed Release Notes
            </button>

            {stage === 'IDLE' ? (
              <button
                type="button"
                onClick={handleStartUpdate}
                className="px-5 py-2.5 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-xs font-bold shadow-lg shadow-[#F27D26]/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Start Auto-Update Now
              </button>
            ) : stage === 'COMPLETED' ? (
              <button
                type="button"
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Application Runtime (v2.4.0)
              </button>
            ) : (
              <div className="text-xs text-[#8E9299] italic flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F27D26] animate-ping" />
                Applying updates... Please do not close application.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
