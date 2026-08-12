import React, { useState } from 'react';
import { PlateRecord, SetRecord, PositionRecord, PlateInstallationRecord, PlateRemovalRecord } from '../types';
import { Search, Layers, Cpu, Calendar, CheckCircle2, AlertTriangle, ArrowRight, History } from 'lucide-react';

interface GlobalSearchProps {
  plates: PlateRecord[];
  sets: SetRecord[];
  positions: PositionRecord[];
  installations: PlateInstallationRecord[];
  removals?: PlateRemovalRecord[];
  onSelectSet: (setId: string) => void;
  onOpenPositionModal?: (pos: PositionRecord) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  plates,
  sets,
  positions,
  installations,
  removals = [],
  onSelectSet,
  onOpenPositionModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredPlates = plates.filter(plate => {
    const matchesSearch =
      plate.plateSerialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plate.manufacturingDate.includes(searchTerm) ||
      plate.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || plate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#0F1117] p-6 rounded-2xl shadow-sm border border-[#1E222A] text-[#E0E2E5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-[#F27D26]" /> Global Plate Search & Traceability
            </h2>
            <p className="text-xs text-[#8E9299]">
              Search by Plate Serial Number (e.g. 080826-01-05), Manufacturing Date, or Status with partial matches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>

              <option value="REJECTED">Rejected</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#8E9299]" />
          <input
            type="text"
            placeholder="Type plate serial number, e.g. 080826-01 or 080826..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#191D28] border border-[#1E222A] rounded-xl text-base text-white placeholder-[#8E9299] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
          />
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#191D28] text-xs font-semibold text-[#8E9299] uppercase">
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Plate Serial Number</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Status</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Set & Position Location</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Mfg Date</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222A] text-sm">
              {filteredPlates.slice(0, 50).map((plate) => {
                const setRecord = sets.find(s => s.id === plate.currentSetId);
                const posRecord = positions.find(p => p.id === plate.currentPositionId);

                return (
                  <tr key={plate.id} className="hover:bg-[#191D28]/50">
                    <td className="p-3 font-mono font-bold text-[#F27D26]">{plate.plateSerialNumber}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        plate.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        plate.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-[#191D28] text-[#8E9299]'
                      }`}>
                        {plate.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {setRecord && posRecord ? (
                        <span className="font-medium text-white">
                          {setRecord.displayName} ({posRecord.fullCode})
                        </span>
                      ) : (
                        <span className="text-[#8E9299]">Unassigned / Stored</span>
                      )}
                    </td>
                    <td className="p-3 text-[#8E9299]">{plate.manufacturingDate}</td>
                    <td className="p-3 text-right">
                      {plate.currentSetId && (
                        <button
                          onClick={() => onSelectSet(plate.currentSetId!)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] text-xs font-semibold rounded-lg transition-colors border border-[#F27D26]/30"
                        >
                          View Set <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!plate.currentSetId && (plate.status === 'REJECTED' || plate.status === 'RETIRED' || plate.status === 'REMOVED') && (
                        <button
                          onClick={() => {
                            if (onOpenPositionModal) {
                              const removal = removals.find(r => r.plateId === plate.id);
                              if (removal) {
                                const pos = positions.find(p => p.id === removal.positionId);
                                if (pos) onOpenPositionModal(pos);
                              }
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#8E9299]/10 hover:bg-[#8E9299]/20 text-[#8E9299] text-xs font-semibold rounded-lg transition-colors border border-[#8E9299]/30"
                        >
                          View <History className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredPlates.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#8E9299]">
                    No matching plates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
