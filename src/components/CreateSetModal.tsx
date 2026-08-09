import React, { useState } from 'react';
import { X, Layers, Plus } from 'lucide-react';
import { SetRecord, Personnel } from '../types';

interface CreateSetModalProps {
  sets: SetRecord[];
  onClose: () => void;
  onCreateSet: (setNumber: number, displayName: string, shortCode: string, initialCycle: number, numPlates: number) => Promise<void>;
}

export const CreateSetModal: React.FC<CreateSetModalProps> = ({
  sets,
  onClose,
  onCreateSet,
}) => {
  const nextNum = sets.length > 0 ? Math.max(...sets.map(s => s.setNumber)) + 1 : 1;
  const [setNumber, setSetNumber] = useState(nextNum);
  const [displayName, setDisplayName] = useState(`SET ${nextNum < 10 ? '0' + nextNum : nextNum}`);
  const [shortCode, setShortCode] = useState(`S${nextNum < 10 ? '0' + nextNum : nextNum}`);
  const [initialCycle, setInitialCycle] = useState(0);
  const [numPlates, setNumPlates] = useState<number>(11);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateSet(setNumber, displayName, shortCode, initialCycle, numPlates);
      onClose();
    } catch (err) {
      console.error(err);
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
              <h3 className="font-bold text-base text-white">Create New Master Set</h3>
              <p className="text-xs text-[#8E9299]">Sets up 11 fixed positions & initial plates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#2D333E] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
