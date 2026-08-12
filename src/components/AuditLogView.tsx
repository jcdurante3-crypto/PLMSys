import React, { useState } from 'react';
import { AuditRecord, SetRecord, PositionRecord, PlateRecord } from '../types';
import { FileText, Search, Filter, Layers, LayoutGrid, Clipboard, Settings, HelpCircle, CheckCircle } from 'lucide-react';

interface AuditLogViewProps {
  auditLogs: AuditRecord[];
  sets: SetRecord[];
  positions: PositionRecord[];
  plates: PlateRecord[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs, sets, positions, plates }) => {
  const [selectedSetId, setSelectedSetId] = useState<string>('ALL');
  const [selectedPosNum, setSelectedPosNum] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Helper to trace logs to sets and positions
  const getLogDetails = (log: AuditRecord) => {
    let matchedSet: SetRecord | undefined;
    let matchedPos: PositionRecord | undefined;

    if (log.action === 'CREATE_SET' || log.action === 'EDIT_SET' || log.action === 'ADD_PRODUCTION') {
      matchedSet = sets.find((s) => s.id === log.recordId);
    } else if (log.action === 'INSTALL_PLATE' || log.action === 'REMOVE_PLATE' || log.action === 'REPLACE_PLATE') {
      matchedPos = positions.find((p) => p.id === log.recordId);
      if (matchedPos) {
        matchedSet = sets.find((s) => s.id === matchedPos!.setId);
      }
    }

    return {
      set: matchedSet,
      position: matchedPos,
    };
  };

  // Filter logic
  const filteredLogs = sortedLogs.filter((log) => {
    const { set, position } = getLogDetails(log);

    // Set filter
    if (selectedSetId && selectedSetId !== 'ALL') {
      if (!set || set.id !== selectedSetId) return false;
    }

    // Position filter
    if (selectedPosNum && selectedPosNum !== 'ALL') {
      if (!position || position.positionNumber !== parseInt(selectedPosNum)) return false;
    }

    // Action filter
    if (selectedAction && selectedAction !== 'ALL') {
      if (log.action !== selectedAction) return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesCode = log.auditCode.toLowerCase().includes(q);
      const matchesUser = log.user.toLowerCase().includes(q);
      const matchesReason = (log.reason || '').toLowerCase().includes(q);
      const matchesOld = (log.oldValue || '').toLowerCase().includes(q);
      const matchesNew = (log.newValue || '').toLowerCase().includes(q);
      const matchesSetName = set
        ? set.displayName.toLowerCase().includes(q) || set.shortCode.toLowerCase().includes(q)
        : false;
      const matchesPosName = position ? position.fullCode.toLowerCase().includes(q) : false;

      if (
        !matchesCode &&
        !matchesUser &&
        !matchesReason &&
        !matchesOld &&
        !matchesNew &&
        !matchesSetName &&
        !matchesPosName
      ) {
        return false;
      }
    }

    return true;
  });

  const formatValue = (val: string | undefined, action: string) => {
    if (!val) return val;
    if (action === 'REPLACE_PLATE') {
      const plate = plates.find(p => p.id === val);
      return plate ? plate.plateSerialNumber : val;
    }
    return val;
  };

  // Sort sets for dropdown
  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);

  // Position options (P01 to P11)
  const positionOptions = Array.from({ length: 11 }, (_, i) => i + 1);

  // Counts of filtered actions
  const totalCount = filteredLogs.length;
  const installsAndReplacements = filteredLogs.filter(l => l.action === 'INSTALL_PLATE' || l.action === 'REPLACE_PLATE').length;
  const installs = installsAndReplacements;
  const replacements = installsAndReplacements;
  const removals = filteredLogs.filter(l => l.action === 'REMOVE_PLATE').length;

  // Action types for dropdown
  const actionTypes = Array.from(new Set(auditLogs.map((log) => log.action))).sort();

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-[#0F1117] p-5 rounded-2xl shadow-sm border border-[#1E222A] text-[#E0E2E5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-[#1E222A]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F27D26]" /> Optimized History & Traceability Logs
            </h2>
            <p className="text-xs text-[#8E9299] mt-1">
              Select any Set or Position to view and trace all lifecycle changes, plate installations, replacements, and production cycles.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-[#191D28] p-2 rounded-xl border border-[#1E222A] text-xs">
            <div>
              <span className="text-[#8E9299]">Logs:</span> <strong className="text-white">{totalCount}</strong>
            </div>
            <div className="h-4 w-px bg-[#1E222A]" />
            <div>
              <span className="text-emerald-500 font-medium">Installs:</span> <strong className="text-white">{installs}</strong>
            </div>
            <div className="h-4 w-px bg-[#1E222A]" />
            <div>
              <span className="text-indigo-400 font-medium">Replaces:</span> <strong className="text-white">{replacements}</strong>
            </div>
          </div>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filter Set */}
          <div>
            <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#F27D26]" /> Filter by Set
            </label>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]/50"
            >
              <option value="ALL">All Sets (All)</option>
              {sortedSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.shortCode})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Position */}
          <div>
            <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <LayoutGrid className="w-3.5 h-3.5 text-[#F27D26]" /> Filter by Position
            </label>
            <select
              value={selectedPosNum}
              onChange={(e) => setSelectedPosNum(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]/50"
            >
              <option value="ALL">All Positions (P01 - P11)</option>
              {positionOptions.map((num) => (
                <option key={num} value={num}>
                  Position {num < 10 ? `0${num}` : num} (P{num < 10 ? `0${num}` : num})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Action */}
          <div>
            <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Clipboard className="w-3.5 h-3.5 text-[#F27D26]" /> Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]/50"
            >
              <option value="ALL">All Actions</option>
              {actionTypes.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[10px] font-bold text-[#8E9299] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-[#F27D26]" /> Search Keywords
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Serial No, Operator, Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-xl text-sm text-white placeholder-[#8E9299]/50 focus:outline-none focus:ring-2 focus:ring-[#F27D26]/50"
              />
              <Search className="w-4 h-4 text-[#8E9299] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Main logs table */}
      <div className="bg-[#0F1117] rounded-2xl shadow-sm border border-[#1E222A] text-[#E0E2E5] overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#191D28] text-xs font-semibold text-[#8E9299] uppercase">
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">Audit Code</th>
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">Timestamp</th>
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">Set / Position</th>
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">User (Operator)</th>
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">Checked By</th>
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">Action</th>
                <th className="p-4 bg-[#191D28] border-b-2 border-[#1E222A]">Details / Values Changed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E222A] text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#8E9299]">
                    <HelpCircle className="w-8 h-8 text-[#8E9299]/30 mx-auto mb-2" />
                    No matching traceability records found for the current selection.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { set, position } = getLogDetails(log);
                  return (
                    <tr key={log.id} className="hover:bg-[#191D28]/40 transition-colors">
                      {/* Code */}
                      <td className="p-4 font-mono font-bold text-[#F27D26] whitespace-nowrap">
                        {log.auditCode}
                      </td>

                      {/* Time */}
                      <td className="p-4 text-xs text-[#8E9299] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      {/* Set & Position mapping */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {set ? (
                            <span className="px-2 py-0.5 rounded bg-[#1E222A] text-white text-xs font-semibold border border-[#2D333E]">
                              {set.displayName}
                            </span>
                          ) : log.action === 'DELETE_SET' && log.oldValue ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
                              {log.oldValue} (Deleted)
                            </span>
                          ) : (
                            <span className="text-[#8E9299] text-xs">—</span>
                          )}
                          {position && (
                            <span className="px-2 py-0.5 rounded bg-[#F27D26]/10 text-[#F27D26] text-xs font-mono font-bold border border-[#F27D26]/20">
                              {position.positionCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* User */}
                      <td className="p-4 font-medium text-white whitespace-nowrap">
                        {log.user}
                      </td>

                      {/* Checked By */}
                      <td className="p-4 font-medium text-[#8E9299] whitespace-nowrap">
                        {log.checkedBy || '—'}
                      </td>

                      {/* Action */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            log.action === 'INSTALL_PLATE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : log.action === 'REPLACE_PLATE'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : log.action === 'REMOVE_PLATE'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : log.action === 'DELETE_SET' || log.action === 'DELETE_PRODUCTION'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Details / Values */}
                      <td className="p-4 text-xs text-[#E0E2E5] max-w-sm break-words whitespace-normal">
                        <div className="space-y-1">
                          <div>{log.reason || 'No description provided.'}</div>
                          {(log.oldValue || log.newValue) && (
                            <div className="flex items-center gap-1 text-[10px] text-[#8E9299] bg-[#191D28] px-2 py-1 rounded border border-[#1E222A] mt-1 font-mono">
                              {log.oldValue && (
                                <>
                                  <span className="text-rose-400 font-bold">Old:</span>{' '}
                                  <span className="truncate max-w-[150px]" title={formatValue(log.oldValue, log.action)}>{formatValue(log.oldValue, log.action)}</span>
                                </>
                              )}
                              {log.oldValue && log.newValue && <span className="text-slate-500 mx-1">→</span>}
                              {log.newValue && (
                                <>
                                  <span className="text-emerald-400 font-bold">New:</span>{' '}
                                  <span className="truncate max-w-[150px]" title={formatValue(log.newValue, log.action)}>{formatValue(log.newValue, log.action)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
