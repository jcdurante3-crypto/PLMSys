import React, { useState, useEffect } from 'react';
import { DailyProductionRecord, SetRecord, JobOrderRecord } from '../types';
import { Activity, Calendar, FileText, CheckCircle2, Search, Plus, RotateCcw, Clock, AlertTriangle } from 'lucide-react';

interface DailyProductionViewProps {
  dailyProductions: DailyProductionRecord[];
  sets: SetRecord[];
  jobOrders: JobOrderRecord[];
  onOpenLogProduction?: () => void;
  undoableBatch?: {
    ids: string[];
    timestamp: number;
    description: string;
  } | null;
  onUndoProductionBatch?: (ids: string[]) => Promise<void>;
}

export const DailyProductionView: React.FC<DailyProductionViewProps> = ({
  dailyProductions,
  sets,
  jobOrders,
  onOpenLogProduction,
  undoableBatch,
  onUndoProductionBatch,
}) => {
  const [operatorFilter, setOperatorFilter] = useState('');
  const [setFilter, setSetFilter] = useState('ALL');
  const [now, setNow] = useState(Date.now());
  const [undoSuccessMessage, setUndoSuccessMessage] = useState('');

  // Live timer tick for 10-second window countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const sortedProductions = [...dailyProductions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredProductions = sortedProductions.filter(prod => {
    const setRecord = sets.find(s => s.id === prod.setId);
    const matchesOperator = prod.operatorId.toLowerCase().includes(operatorFilter.toLowerCase());
    const matchesSet = setFilter === 'ALL' || prod.setId === setFilter;
    return matchesOperator && matchesSet;
  });

  const isBatchActive = undoableBatch && (now - undoableBatch.timestamp < 10000);
  const batchSecondsLeft = isBatchActive ? Math.ceil((10000 - (now - undoableBatch.timestamp)) / 1000) : 0;
  const batchPercent = isBatchActive ? Math.max(0, ((10000 - (now - undoableBatch.timestamp)) / 10000) * 100) : 0;

  const handleTriggerUndo = async (ids: string[]) => {
    if (onUndoProductionBatch) {
      await onUndoProductionBatch(ids);
      setUndoSuccessMessage('Production log entry successfully undone and cycle counts reverted.');
      setTimeout(() => setUndoSuccessMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast confirmation message */}
      {undoSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{undoSuccessMessage}</span>
        </div>
      )}

      {/* 10-second Undo Banner for Active Batch */}
      {isBatchActive && undoableBatch && (
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-[#0F1117] p-5 rounded-2xl border border-amber-500/40 shadow-xl space-y-3 relative overflow-hidden animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
                <RotateCcw className="w-6 h-6 animate-spin-once" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Production Entry Saved
                  </h3>
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold rounded-md text-[11px] flex items-center gap-1 shadow">
                    <Clock className="w-3 h-3" /> {batchSecondsLeft}s Left to Undo
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 font-medium mt-0.5">
                  {undoableBatch.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleTriggerUndo(undoableBatch.ids)}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Undo Entry ({batchSecondsLeft}s)
              </button>
            </div>
          </div>

          {/* Animated timer bar */}
          <div className="w-full bg-[#191D28] h-1.5 rounded-full overflow-hidden border border-amber-500/20">
            <div
              className="bg-amber-500 h-full transition-all duration-150"
              style={{ width: `${batchPercent}%` }}
            />
          </div>
        </div>
      )}

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
                <th className="p-3 bg-[#191D28] border-b-2 border-[#1E222A] text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222A] text-sm">
              {filteredProductions.map((prod) => {
                const setRecord = sets.find(s => s.id === prod.setId);
                const createdAtTime = new Date(prod.createdAt).getTime();
                const isWithin10s = (now - createdAtTime) <= 10000;
                const rowSecsLeft = isWithin10s ? Math.ceil((10000 - (now - createdAtTime)) / 1000) : 0;

                return (
                  <tr
                    key={prod.id}
                    className={`transition-colors ${
                      isWithin10s
                        ? 'bg-amber-500/10 border-l-4 border-l-amber-500 hover:bg-amber-500/15'
                        : 'hover:bg-[#191D28]/50'
                    }`}
                  >
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
                    <td className="p-3 text-xs text-[#8E9299] max-w-xs truncate">{prod.remarks || '—'}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {isWithin10s ? (
                        <button
                          onClick={() => handleTriggerUndo([prod.id])}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                          title="Undo this production entry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Undo ({rowSecsLeft}s)
                        </button>
                      ) : (
                        <span className="text-xs text-[#8E9299]/50">—</span>
                      )}
                    </td>
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

