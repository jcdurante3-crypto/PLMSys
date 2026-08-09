import React, { useState } from 'react';
import { SetRecord, PositionRecord, PlateRecord, PlateInstallationRecord, PlateRemovalRecord, User, Personnel } from '../types';
import { Layers, Activity, Search, Plus, ArrowRight, Sliders, Edit2, Check, X, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

interface DashboardProps {
  sets: SetRecord[];
  positions: PositionRecord[];
  plates: PlateRecord[];
  installations: PlateInstallationRecord[];
  removals: PlateRemovalRecord[];
  currentUser: User;
  personnel: Personnel[];
  onSelectSet: (setId: string) => void;
  onOpenCreateSet: () => void;
  onOpenLogProduction: () => void;
  onOpenRegistry: () => void;
  onUpdateSet?: (
    setId: string,
    displayName: string,
    shortCode: string,
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
    currentTotalCycle: number
  ) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  sets,
  positions,
  plates,
  installations,
  removals,
  currentUser,
  personnel,
  onSelectSet,
  onOpenCreateSet,
  onOpenLogProduction,
  onOpenRegistry,
  onUpdateSet,
}) => {
  const activePlatesCount = plates.filter(p => p.status === 'ACTIVE').length;
  const rejectedPlatesCount = plates.filter(p => p.status === 'REJECTED').length;
  const totalProductionToday = sets.reduce((sum, s) => sum + s.todayProduction, 0);

  // Calculate average lifespan based on rejected plates (removals with status === 'REJECTED')
  const rejectedRemovals = removals.filter(r => r.status === 'REJECTED');
  let totalLifespan = 0;
  let rejectedCount = 0;

  rejectedRemovals.forEach(rem => {
    const inst = installations.find(i => i.plateId === rem.plateId && i.setId === rem.setId && i.positionId === rem.positionId);
    const lifespan = rem.totalCyclesAchieved + (inst?.initialCycles || 0);
    totalLifespan += lifespan;
    rejectedCount++;
  });

  const avgLifespan = rejectedCount > 0 ? Math.round(totalLifespan / rejectedCount) : 0;

  const activeSetsCount = sets.filter(s => s.status === 'ACTIVE').length;
  const maintenanceSetsCount = sets.filter(s => s.status === 'MAINTENANCE').length;
  const totalPositionsCount = positions.length;
  const occupiedPositionsCount = positions.filter(p => p.status === 'OCCUPIED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-[#0F1117] rounded-2xl p-6 text-[#E0E2E5] shadow-xl border border-[#1E222A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Plate Lifecycle & Set Operations</h2>
            <p className="text-[#8E9299] text-sm mt-1">
              Consolidated operational cockpit for machine sets monitoring, active tracking, and equipment status updates.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {currentUser.role === 'ADMIN' && (
              <div className="flex gap-2">
                <button
                  onClick={onOpenRegistry}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md shadow-[#F27D26]/20 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-white" /> Registry
                </button>
              </div>
            )}
            <button
              onClick={onOpenLogProduction}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md shadow-[#F27D26]/20 transition-all cursor-pointer"
            >
              <Activity className="w-4 h-4 text-white" /> Log Production
            </button>
            <button
              onClick={onOpenCreateSet}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md shadow-[#F27D26]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Set
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow">
            <div className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Active Plates</div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">{activePlatesCount.toLocaleString()}</div>
            <div className="text-xs text-[#8E9299] mt-1">Currently installed & running</div>
          </div>
          <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow">
            <div className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Today's Production</div>
            <div className="text-2xl sm:text-3xl font-bold text-sky-400 mt-1">+{totalProductionToday.toLocaleString()}</div>
            <div className="text-xs text-[#8E9299] mt-1">Cycles added across all Sets</div>
          </div>
          <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow">
            <div className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Rejected Plates</div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">{rejectedPlatesCount.toLocaleString()}</div>
            <div className="text-xs text-[#8E9299] mt-1">Logged with reject reason</div>
          </div>
          <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow">
            <div className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Average Plate Lifespan</div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-500 mt-1">
              {avgLifespan > 0 ? `${avgLifespan.toLocaleString()} cycles` : '—'}
            </div>
            <div className="text-xs text-[#8E9299] mt-1">Average life of rejected plates</div>
          </div>
        </div>
      </div>
    </div>
  );
};
