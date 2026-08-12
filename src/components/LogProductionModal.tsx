import React, { useState, useEffect } from 'react';
import { X, Activity, CheckCircle, ArrowRight, Edit3, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { SetRecord, Personnel } from '../types';
import { formatJobOrder, isValidJobOrder } from '../utils';

interface LogProductionModalProps {
  sets: SetRecord[];
  personnel: Personnel[];
  onClose: () => void;
  onAddProductionRange: (
    fromSetNum: number,
    toSetNum: number,
    cycles: number,
    jobOrderNumber: string,
    operatorName: string,
    checkedBy: string,
    remarks: string
  ) => Promise<void>;
}

export const LogProductionModal: React.FC<LogProductionModalProps> = ({
  sets,
  personnel,
  onClose,
  onAddProductionRange,
}) => {
  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);

  const [fromSetId, setFromSetId] = useState<string>(() => localStorage.getItem('draft_log_fromSetId') || sortedSets[0]?.id || '');
  const [toSetId, setToSetId] = useState<string>(() => localStorage.getItem('draft_log_toSetId') || sortedSets[sortedSets.length - 1]?.id || '');
  const [cyclesInput, setCyclesInput] = useState(() => localStorage.getItem('draft_log_cyclesInput') || '');
  const [jobOrderNumber, setJobOrderNumber] = useState(() => localStorage.getItem('draft_log_jobOrderNumber') || '');
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('draft_log_operatorName') || '');
  const [checkedBy, setCheckedBy] = useState('');
  const [isCheckedByVerified, setIsCheckedByVerified] = useState(false);
  const [remarks, setRemarks] = useState(() => localStorage.getItem('draft_log_remarks') || 'Routine daily production logging');

  useEffect(() => {
    localStorage.setItem('draft_log_fromSetId', fromSetId);
    localStorage.setItem('draft_log_toSetId', toSetId);
    localStorage.setItem('draft_log_cyclesInput', cyclesInput);
    localStorage.setItem('draft_log_jobOrderNumber', jobOrderNumber);
    localStorage.setItem('draft_log_operatorName', operatorName);
    localStorage.setItem('draft_log_remarks', remarks);
  }, [fromSetId, toSetId, cyclesInput, jobOrderNumber, operatorName, remarks]);

  const clearDrafts = () => {
    localStorage.removeItem('draft_log_fromSetId');
    localStorage.removeItem('draft_log_toSetId');
    localStorage.removeItem('draft_log_cyclesInput');
    localStorage.removeItem('draft_log_jobOrderNumber');
    localStorage.removeItem('draft_log_operatorName');
    localStorage.removeItem('draft_log_remarks');
  };
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Authorization Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const renderPersonnelDatalist = (personnelList: Personnel[]) => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    personnelList.forEach(p => {
      const name = p.shortName || p.fullName;
      const norm = name.toUpperCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        options.push({ value: name, label: `${p.fullName} (${p.position})` });
      }
    });

    return options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ));
  };

  const handleOpenAuthModal = () => {
    setAuthError('');
    setAuthPassword('');
    setShowAuthModal(true);
  };

  const handleConfirmAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authPassword.trim()) {
      setAuthError('Please enter authorization password.');
      return;
    }

    const matched = personnel.find(p => p.password && p.password === authPassword);
    if (matched) {
      setCheckedBy(matched.shortName || matched.fullName);
      setIsCheckedByVerified(true);
      setShowAuthModal(false);
      return;
    }

    setAuthError('Invalid password. Enter a valid authorization password.');
  };

  const fromSet = sets.find(s => s.id === fromSetId);
  const toSet = sets.find(s => s.id === toSetId);

  const fromSetNum = fromSet ? fromSet.setNumber : 1;
  const toSetNum = toSet ? toSet.setNumber : 1;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!isCheckedByVerified || !checkedBy.trim()) {
      setFormError('Checked By requires password sign-off from an authorized person.');
      handleOpenAuthModal();
      return;
    }
    
    if (!isValidJobOrder(jobOrderNumber)) {
      setFormError('Job Order Number must be 4 numbers followed by dash and 2 numbers (e.g., 0000-00).');
      return;
    }
    
    const cycles = parseInt(cyclesInput, 10);
    if (isNaN(cycles) || cycles <= 0) {
      setFormError('Please enter a positive cycle count.');
      return;
    }
    if (fromSetNum > toSetNum) {
      setFormError('From Set number cannot be greater than To Set number. Please adjust your range.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    const cycles = parseInt(cyclesInput, 10);
    setLoading(true);
    try {
      await onAddProductionRange(
        fromSetNum,
        toSetNum,
        cycles,
        jobOrderNumber,
        operatorName,
        checkedBy,
        remarks
      );
      clearDrafts();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter sets that are within the selected range
  const affectedSets = sortedSets.filter(s => s.setNumber >= fromSetNum && s.setNumber <= toSetNum);
  const matchedSetsCount = affectedSets.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-lg overflow-hidden flex flex-col text-[#E0E2E5]">
        {/* Header */}
        <div className="bg-[#191D28] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E222A]">
          <div className="flex items-center gap-3">
            <div className="bg-[#F27D26] p-2 rounded-lg text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Log Daily Production Cycle</h3>
              <p className="text-xs text-[#8E9299]">Select master set range and increment cycle counters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#2D333E] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Step View */}
        {!showConfirm ? (
          /* STEP 1: FILL FORM */
          <form onSubmit={handlePreSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1.5">Set Range (From & To)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-[#8E9299] mb-1 uppercase tracking-wider block">From Set</span>
                  <select
                    value={fromSetId}
                    onChange={(e) => setFromSetId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#191D28] border border-[#1E222A] rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                  >
                    {sortedSets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} (Set {s.setNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E9299] mb-1 uppercase tracking-wider block">To Set</span>
                  <select
                    value={toSetId}
                    onChange={(e) => setToSetId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#191D28] border border-[#1E222A] rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                  >
                    {sortedSets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} (Set {s.setNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="text-xs text-[#8E9299] mt-2 block">
                Will apply production to <strong className="text-[#F27D26]">{matchedSetsCount}</strong> sets in range [Set {fromSetNum} - Set {toSetNum}].
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Production Cycles to Add</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="e.g. 2500"
                value={cyclesInput}
                onChange={(e) => setCyclesInput(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Job Order Number *</label>
              <input
                type="text"
                required
                maxLength={7}
                placeholder="0000-00"
                value={jobOrderNumber}
                onChange={(e) => setJobOrderNumber(formatJobOrder(e.target.value))}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono tracking-wider text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
              <span className="text-[11px] text-[#8E9299] mt-1 block">
                Format: 4 digits - 2 digits (e.g. <strong className="text-white">0000-00</strong>)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Operator *</label>
                <input
                  type="text"
                  list="operator-list-log"
                  required
                  placeholder="Enter operator name..."
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
                <datalist id="operator-list-log">
                  {renderPersonnelDatalist(personnel)}
                </datalist>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Checked By *</label>
                  {isCheckedByVerified && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Password Verified
                    </span>
                  )}
                </div>
                {!isCheckedByVerified ? (
                  <div className="p-3 bg-[#191D28] border border-amber-500/30 rounded-xl flex flex-col gap-3 shadow-inner">
                    <div className="flex items-start gap-2 text-amber-400 text-xs">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">Password Required.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAuthModal}
                      className="w-full px-3.5 py-2 bg-[#F27D26] hover:bg-[#d96a1a] text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Sign Off & Authorize
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-start gap-2 text-emerald-400 text-xs font-semibold">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      <span className="leading-relaxed">Checked & Verified By: <strong className="text-white text-sm ml-1 underline">{checkedBy}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAuthModal}
                      className="text-xs text-[#8E9299] hover:text-white underline cursor-pointer shrink-0 font-medium self-end"
                    >
                      Change Sign-Off
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Remarks / Notes</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-semibold">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E222A]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#191D28] text-[#8E9299] text-sm font-medium border border-[#1E222A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: CONFIRMATION VIEW */
          <div className="p-6 space-y-6">
            <div className="bg-[#F27D26]/10 border border-[#F27D26]/30 p-4 rounded-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#F27D26]" /> Confirm Daily Production Batch Log
              </h4>
              <p className="text-xs text-[#8E9299] mt-1">
                Please double check all values. This will update the Master Cycle counts for multiple sets.
              </p>
            </div>

            <div className="bg-[#191D28] rounded-xl border border-[#1E222A] p-4 divide-y divide-[#1E222A] text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">Set Range:</span>
                <span className="font-bold text-white font-mono">
                  {fromSet?.displayName} ({fromSet?.shortCode}) → {toSet?.displayName} ({toSet?.shortCode})
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">Total Sets Affected:</span>
                <span className="font-bold text-[#F27D26]">{matchedSetsCount} Sets</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">Cycles per Set:</span>
                <span className="font-mono font-bold text-emerald-400">+{parseInt(cyclesInput).toLocaleString()} cycles</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">Job Order:</span>
                <span className="font-mono font-bold text-white">{jobOrderNumber}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">Operator:</span>
                <span className="text-white font-medium">{operatorName}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">QC Verifier:</span>
                <span className="text-white font-medium">{checkedBy}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#8E9299]">Remarks:</span>
                <span className="text-[#8E9299] max-w-[200px] truncate">{remarks || '—'}</span>
              </div>
            </div>

            {/* Affected Sets Preview Scroll */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-[#8E9299] uppercase tracking-wider block">Affected Sets & New Cycles preview</span>
              <div className="max-h-[120px] overflow-y-auto bg-[#141721] rounded-lg border border-[#1E222A] p-2 space-y-1 divide-y divide-[#1E222A]/40">
                {affectedSets.map(s => (
                  <div key={s.id} className="text-xs flex justify-between py-1 text-[#8E9299]">
                    <span>{s.displayName} ({s.shortCode})</span>
                    <span>
                      {s.currentTotalCycle.toLocaleString()} <span className="text-emerald-400">→</span> <strong className="text-white">{(s.currentTotalCycle + parseInt(cyclesInput)).toLocaleString()}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E222A]">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[#191D28] text-white text-sm font-medium border border-[#1E222A]"
              >
                <Edit3 className="w-4 h-4 text-[#8E9299]" /> Edit Details
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmSubmit}
                className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Log Production Cycle'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUTHORIZATION MODAL DIALOG */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0F1117] border border-[#1E222A] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E222A] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F27D26]" />
                <h3 className="text-base font-bold text-white">Authorization</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-[#8E9299] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAuth} className="space-y-4">
              <div className="p-3 bg-[#191D28] border border-[#1E222A] rounded-xl text-xs text-[#8E9299]">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#F27D26]" /> Double-Check Details Verification
                </p>
                By authorizing this sign-off, you confirm that you have inspected and verified the set range, cycles, job order, operator, and production parameters for this run.
              </div>



              <div>
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">
                  Authorization Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter authorization password..."
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E222A]">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-[#8E9299] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#d96a1f] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Authorization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
