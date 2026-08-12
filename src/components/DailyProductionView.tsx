import React, { useState } from 'react';
import { DailyProductionRecord, SetRecord, JobOrderRecord } from '../types';
import { Activity, Calendar, FileText, CheckCircle2, Search, Plus } from 'lucide-react';

interface DailyProductionViewProps {
  dailyProductions: DailyProductionRecord[];
  sets: SetRecord[];
  jobOrders: JobOrderRecord[];
  onOpenLogProduction?: () => void;
}

export const DailyProductionView: React.FC<DailyProductionViewProps> = ({
  dailyProductions,
  sets,
  jobOrders,
  onOpenLogProduction,
}) => {
  const [operatorFilter, setOperatorFilter] = useState('');
  const [setFilter, setSetFilter] = useState('ALL');

  const sortedProductions = [...dailyProductions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredProductions = sortedProductions.filter(prod => {
    const setRecord = sets.find(s => s.id === prod.setId);
    const matchesOperator = prod.operatorId.toLowerCase().includes(operatorFilter.toLowerCase());
    const matchesSet = setFilter === 'ALL' || prod.setId === setFilter;
    return matchesOperator && matchesSet;
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#0F1117] p-6 rounded-2xl shadow-sm border border-[#1E222A] text-[#E0E2E5]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#F27D26]" /> Daily Production Records
            </h2>
            <p className="text-xs text-[#8E9299]">
              Set production logs showing previous cycle, today's added production, and current cumulative cycle.
            </p>
          </div>
          {onOpenLogProduction && (
            <button
              onClick={onOpenLogProduction}
              className="flex items-center gap-2 px-4 py-2 bg-[#F27D26] hover:bg-[#d96a1a] text-white rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Production
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Filter by operator..."
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
          />
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
          >
            <option value="ALL">All Sets</option>
            {sets.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#191D28] text-xs font-semibold text-[#8E9299] uppercase">
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Date</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Set</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Job Order</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A] text-right">Previous Cycle</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A] text-right">Added Production</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A] text-right">Current Cycle</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Operator</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Checked By</th>
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222A] text-sm">
              {filteredProductions.map((prod) => {
                const setRecord = sets.find(s => s.id === prod.setId);
                const jo = jobOrders.find(j => j.id === prod.jobOrderId);

                return (
                  <tr key={prod.id} className="hover:bg-[#191D28]/50">
                    <td className="p-3 font-medium text-white whitespace-nowrap">{prod.date}</td>
                    <td className="p-3 font-mono font-bold text-[#F27D26] whitespace-nowrap">
                      {setRecord?.displayName || 'Unknown Set'}
                    </td>
                    <td className="p-3 text-[#E0E2E5] whitespace-nowrap">
                      <span className="bg-[#191D28] px-2 py-1 rounded text-xs font-mono font-semibold text-[#8E9299] border border-[#1E222A]">
                        {prod.jobOrderId || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-[#8E9299]">{prod.previousTotalCycle.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-sky-400">+{prod.productionCycles.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-white">{prod.currentTotalCycle.toLocaleString()}</td>
                    <td className="p-3 text-xs font-medium text-white">{prod.operatorId}</td>
                    <td className="p-3 text-xs text-[#8E9299]">{prod.checkedBy}</td>
                    <td className="p-3 text-xs text-[#8E9299] max-w-xs break-words whitespace-normal">{prod.remarks || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
