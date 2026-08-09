import React, { useState } from 'react';
import { SetRecord, PositionRecord, PlateRecord } from '../types';
import { Sliders, Plus, Edit2, Check, X, AlertCircle, ArrowRight, Search } from 'lucide-react';

interface ManageSetViewProps {
  sets: SetRecord[];
  positions: PositionRecord[];
  plates: PlateRecord[];
  onSelectSet: (setId: string) => void;
  onOpenCreateSet: () => void;
  onUpdateSet: (
    setId: string,
    displayName: string,
    shortCode: string,
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
    currentTotalCycle: number
  ) => Promise<void>;
}

export const ManageSetView: React.FC<ManageSetViewProps> = ({
  sets,
  positions,
  plates,
  onSelectSet,
  onOpenCreateSet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromSetFilter, setFromSetFilter] = useState('');
  const [toSetFilter, setToSetFilter] = useState('');

  // Filter Sets
  const filteredSets = sets.filter((set) => {
    const matchesSearch =
      set.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.shortCode.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesRange = true;
    const setNum = set.setNumber;
    if (fromSetFilter !== '') {
      matchesRange = matchesRange && setNum >= parseInt(fromSetFilter, 10);
    }
    if (toSetFilter !== '') {
      matchesRange = matchesRange && setNum <= parseInt(toSetFilter, 10);
    }

    return matchesSearch && matchesRange;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Card */}
      <div className="bg-[#0F1117] rounded-2xl p-6 text-[#E0E2E5] shadow-xl border border-[#1E222A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Sliders className="w-7 h-7 text-[#F27D26]" /> Set Monitoring
            </h2>
            <p className="text-[#8E9299] text-sm mt-1 max-w-2xl">
              Monitor active machine set statuses, cumulative operational cycles, position capacity, and plate allocation.
            </p>
          </div>
          <div>
            <button
              onClick={onOpenCreateSet}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-lg shadow-[#F27D26]/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New Set
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#0F1117] p-4 rounded-xl shadow-sm border border-[#1E222A]">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8E9299]" />
          <input
            type="text"
            placeholder="Search Sets (e.g. SET 01 or S01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white placeholder-[#8E9299] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8E9299]">Set Range From:</span>
            <input
              type="number"
              placeholder="From"
              value={fromSetFilter}
              onChange={(e) => setFromSetFilter(e.target.value)}
              className="w-20 px-3 py-1.5 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8E9299]">To:</span>
            <input
              type="number"
              placeholder="To"
              value={toSetFilter}
              onChange={(e) => setToSetFilter(e.target.value)}
              className="w-20 px-3 py-1.5 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
          </div>
          {(fromSetFilter !== '' || toSetFilter !== '') && (
            <button
              onClick={() => { setFromSetFilter(''); setToSetFilter(''); }}
              className="px-2.5 py-1.5 bg-[#191D28] hover:bg-[#2D333E] text-xs text-[#8E9299] hover:text-white border border-[#1E222A] rounded-lg cursor-pointer"
            >
              Clear Range
            </button>
          )}
        </div>
      </div>



      {/* Set Monitoring Cards Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full max-h-[600px] overflow-y-auto">
        {filteredSets.map((set) => {
          const setPositions = positions.filter((p) => p.setId === set.id);
          const totalPos = setPositions.length > 0 ? setPositions.length : 11;
          const occupiedCount = setPositions.filter((p) => p.status === 'OCCUPIED').length;
          const emptyCount = totalPos - occupiedCount;

          return (
            <div
              key={set.id}
              onClick={() => onSelectSet(set.id)}
              className="bg-[#0F1117] rounded-xl shadow-sm hover:shadow-md transition-all border border-[#1E222A] p-5 cursor-pointer group flex flex-col justify-between hover:border-[#F27D26]/40"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-[#191D28] text-[#F27D26] font-bold flex items-center justify-center text-sm group-hover:bg-[#F27D26] group-hover:text-white transition-colors border border-[#1E222A]">
                      {set.shortCode}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{set.displayName}</h3>
                      <span className="text-xs text-[#8E9299]">
                        {totalPos} Positions (P01-P{totalPos < 10 ? '0' + totalPos : totalPos})
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      set.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : set.status === 'MAINTENANCE'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    {set.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4 bg-[#191D28] p-3 rounded-lg border border-[#1E222A]">
                  <div>
                    <div className="text-xs text-[#8E9299] font-medium">Set Total Cycle</div>
                    <div className="text-lg font-extrabold text-white mt-0.5">
                      {set.currentTotalCycle.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#8E9299] font-medium">Today's Production</div>
                    <div className="text-lg font-bold text-[#F27D26] mt-0.5">
                      +{set.todayProduction.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Positions indicator */}
                <div className="flex items-center justify-between text-xs text-[#8E9299] mb-2">
                  <span>
                    Active Plates: <strong className="text-white">{occupiedCount}/{totalPos}</strong>
                  </span>
                  {emptyCount > 0 ? (
                    <span className="text-amber-400 font-medium">{emptyCount} Empty</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Full Capacity</span>
                  )}
                </div>

                {/* Mini Position Bar */}
                <div className="flex gap-1 h-2 bg-[#191D28] rounded-full overflow-hidden border border-[#1E222A] mb-3">
                  {setPositions.map((pos) => (
                    <div
                      key={pos.id}
                      className={`flex-1 h-full rounded-xs ${
                        pos.status === 'OCCUPIED' ? 'bg-[#F27D26]' : 'bg-[#2D333E]'
                      }`}
                      title={`${pos.fullCode}: ${pos.status}`}
                    />
                  ))}
                </div>

                {/* Active Plates Dropdown */}
                {occupiedCount > 0 && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      defaultValue=""
                      className="w-full bg-[#191D28] border border-[#1E222A] rounded-lg text-xs text-[#8E9299] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                    >
                      <option value="" disabled>View Active Plates ({occupiedCount})</option>
                      {setPositions.filter(p => p.status === 'OCCUPIED' && p.currentPlateId).map(p => {
                        const plate = plates.find(pl => pl.id === p.currentPlateId);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.fullCode}: {plate ? plate.plateSerialNumber : 'Unknown'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E222A] flex items-center justify-between text-xs text-[#F27D26] font-semibold group-hover:translate-x-1 transition-transform">
                <span>View Positions & Logs</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
        {filteredSets.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#8E9299] bg-[#0F1117] rounded-xl border border-[#1E222A]">
            No machine sets match your search filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
