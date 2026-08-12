import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, AlertCircle } from 'lucide-react';
import { SetRecord, Personnel } from '../types';

interface CreateSetModalProps {
  sets: SetRecord[];
  onClose: () => void;
  onCreateSet: (setNumber: number, displayName: string, shortCode: string, initialCycle: number, numPlates: number, creationDate?: string) => Promise<void>;
}

export const CreateSetModal: React.FC<CreateSetModalProps> = ({
  sets,
  onClose,
  onCreateSet,
}) => {
  const nextNum = sets.length > 0 ? Math.max(...sets.map(s => s.setNumber)) + 1 : 1;
  const todayStr = new Date().toISOString().split('T')[0];
  const [setNumber, setSetNumber] = useState(() => {
    const saved = localStorage.getItem('draft_set_number');
    return saved ? parseInt(saved, 10) : nextNum;
  });
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('draft_set_displayName') || `SET ${nextNum < 10 ? '0' + nextNum : nextNum}`;
  });
  const [shortCode, setShortCode] = useState(() => {
    return localStorage.getItem('draft_set_shortCode') || `S${nextNum < 10 ? '0' + nextNum : nextNum}`;
  });
  const [creationDate, setCreationDate] = useState(() => {
    return localStorage.getItem('draft_set_creationDate') || todayStr;
  });
  const [initialCycle, setInitialCycle] = useState(() => {
    const saved = localStorage.getItem('draft_set_initialCycle');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [numPlates, setNumPlates] = useState<number>(() => {
    const saved = localStorage.getItem('draft_set_numPlates');
    return saved ? parseInt(saved, 10) : 11;
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('draft_set_number', String(setNumber));
    localStorage.setItem('draft_set_displayName', displayName);
    localStorage.setItem('draft_set_shortCode', shortCode);
    localStorage.setItem('draft_set_creationDate', creationDate);
    localStorage.setItem('draft_set_initialCycle', String(initialCycle));
    localStorage.setItem('draft_set_numPlates', String(numPlates));
  }, [setNumber, displayName, shortCode, creationDate, initialCycle, numPlates]);

  const clearDrafts = () => {
    localStorage.removeItem('draft_set_number');
    localStorage.removeItem('draft_set_displayName');
    localStorage.removeItem('draft_set_shortCode');
    localStorage.removeItem('draft_set_creationDate');
    localStorage.removeItem('draft_set_initialCycle');
    localStorage.removeItem('draft_set_numPlates');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await onCreateSet(setNumber, displayName, shortCode, initialCycle, numPlates, creationDate);
      clearDrafts();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create set.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-md overflow-hidden flex flex-col text-[#E0E2E5]">
        {/* Header */}
        <div className="bg-[#191D28] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E222A]">
          <div className="flex items-center gap-3">
            <div className="bg-[#F27D26] p-2 rounded-lg text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create New Set</h3>
              <p className="text-xs text-[#8E9299]">Sets up {numPlates} fixed positions & initial plates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#2D333E] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs font-semibold animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Set Number</label>
            <input
              type="number"
              required
              min={1}
              value={setNumber}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSetNumber(val);
                const formatted = val < 10 ? '0' + val : `${val}`;
                setDisplayName(`SET ${formatted}`);
                setShortCode(`S${formatted}`);
              }}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Short Code (e.g. S03)</label>
            <input
              type="text"
              required
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Creation Date</label>
            <input
              type="date"
              required
              value={creationDate}
              onChange={(e) => setCreationDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
            <span className="text-xs text-[#8E9299] mt-1 block">
              Defaults to current date. Change if registering a set created on a different date.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Number of Plates per Set</label>
            <input
              type="number"
              required
              min={1}
              max={50}
              value={numPlates}
              onChange={(e) => setNumPlates(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
            <span className="text-xs text-[#8E9299] mt-1 block">
              Customize quantity of plates/positions (e.g. 11, 8, 12) for this machine.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Initial Starting Cycle</label>
            <input
              type="number"
              required
              min={0}
              step={1000}
              value={initialCycle}
              onChange={(e) => setInitialCycle(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
            <span className="text-xs text-[#8E9299] mt-1 block">
              Will initialize {numPlates} positions (P01-P{numPlates < 10 ? '0' + numPlates : numPlates}) with plates starting at cycle {initialCycle.toLocaleString()}.
            </span>
          </div>

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
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
