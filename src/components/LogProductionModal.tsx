import React, { useState } from 'react';
import { X, Activity, CheckCircle, ArrowRight, Edit3 } from 'lucide-react';
import { SetRecord, Personnel } from '../types';

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

  const [fromSetId, setFromSetId] = useState<string>(sortedSets[0]?.id || '');
  const [toSetId, setToSetId] = useState<string>(sortedSets[sortedSets.length - 1]?.id || '');
  const [cyclesInput, setCyclesInput] = useState('');
  const [jobOrderNumber, setJobOrderNumber] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [remarks, setRemarks] = useState('Routine daily production logging');
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCheckedByAuth = () => {
    const password = prompt('Enter Authorization Password for Checked By:');
    if (password === null) return;

    const adminPassword = 'JADB1994';
    const authPerson = personnel.find(p => p.isAuthorized && p.password === password);

    if (password === adminPassword) {
      setCheckedBy('Admin');
    } else if (authPerson) {
      setCheckedBy(authPerson.shortName);
    } else {
      alert('Unauthorized access. Invalid password.');
    }
  };

  const fromSet = sets.find(s => s.id === fromSetId);
  const toSet = sets.find(s => s.id === toSetId);

  const fromSetNum = fromSet ? fromSet.setNumber : 1;
  const toSetNum = toSet ? toSet.setNumber : 1;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!checkedBy) {
      setFormError('Please authorize "Checked By" field.');
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
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1.5">Master Set Range (From & To)</label>
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
                type="number"
                required
                min={1}
                value={cyclesInput}
                onChange={(e) => setCyclesInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Job Order Number</label>
              <input
                type="text"
                required
                placeholder="0123-26"
                value={jobOrderNumber}
                onChange={(e) => setJobOrderNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Operator</label>
                <input
                  type="text"
                  list="operator-list-log"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
                <datalist id="operator-list-log">
                  {personnel.map(p => (
                    <option key={p.id} value={p.shortName} />
                  ))}
                </datalist>
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Checked By</label>
                <input
                  type="text"
                  readOnly
                  placeholder="Click to authorize..."
                  required
                  value={checkedBy}
                  onClick={handleCheckedByAuth}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26] cursor-pointer"
                />
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
                <span className="font-bold text-[#F27D26]">{matchedSetsCount} Master Sets</span>
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
    </div>
  );
};
