import React, { useState } from 'react';
import { SetRecord, PositionRecord, PlateRecord, PlateInstallationRecord, PlateRemovalRecord, User, Personnel } from '../types';
import { Layers, Activity, Search, Plus, ArrowRight, Sliders, Edit2, Check, X, AlertCircle, CheckCircle2, Calendar, Archive, Clock, TrendingUp, BarChart2 } from 'lucide-react';
import { getSetTodayProduction } from '../utils';

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
  const retiredPlatesCount = plates.filter(p => p.status === 'RETIRED').length;
  const totalProductionToday = sets.reduce((sum, s) => sum + getSetTodayProduction(s), 0);

  // 1. Average Lifespan of Rejected Plates
  const rejectedRemovals = removals.filter(r => r.status === 'REJECTED');
  let rejectedTotalLifespan = 0;
  rejectedRemovals.forEach(rem => {
    const inst = installations.find(i => i.plateId === rem.plateId && i.setId === rem.setId && i.positionId === rem.positionId);
    const lifespan = rem.totalCyclesAchieved + (inst?.initialCycles || 0);
    rejectedTotalLifespan += lifespan;
  });
  const avgRejectedLifespan = rejectedRemovals.length > 0 ? Math.round(rejectedTotalLifespan / rejectedRemovals.length) : 0;

  // 2. Average Lifespan of Retired Plates
  const retiredRemovals = removals.filter(r => r.status === 'RETIRED');
  let retiredTotalLifespan = 0;
  retiredRemovals.forEach(rem => {
    const inst = installations.find(i => i.plateId === rem.plateId && i.setId === rem.setId && i.positionId === rem.positionId);
    const lifespan = rem.totalCyclesAchieved + (inst?.initialCycles || 0);
    retiredTotalLifespan += lifespan;
  });
  const avgRetiredLifespan = retiredRemovals.length > 0 ? Math.round(retiredTotalLifespan / retiredRemovals.length) : 0;

  // 3. Average Total Lifespan (Retired + Rejected)
  const combinedRemovals = removals.filter(r => r.status === 'RETIRED' || r.status === 'REJECTED');
  let combinedTotalLifespan = 0;
  combinedRemovals.forEach(rem => {
    const inst = installations.find(i => i.plateId === rem.plateId && i.setId === rem.setId && i.positionId === rem.positionId);
    const lifespan = rem.totalCyclesAchieved + (inst?.initialCycles || 0);
    combinedTotalLifespan += lifespan;
  });
  const avgTotalLifespan = combinedRemovals.length > 0 ? Math.round(combinedTotalLifespan / combinedRemovals.length) : 0;

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

        {/* Metrics Section: Operational Counts */}
        <div className="mt-8">
          <div className="text-xs font-bold text-[#8E9299] uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#F27D26]" /> Operational Plate Metrics
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Active Plates</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">{activePlatesCount.toLocaleString()}</div>
                <div className="text-xs text-[#8E9299] mt-1">Currently installed & running</div>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Today's Production</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 mt-1">+{totalProductionToday.toLocaleString()}</div>
                <div className="text-xs text-[#8E9299] mt-1">Cycles added across all Sets</div>
              </div>
              <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Rejected Plates</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-1">{rejectedPlatesCount.toLocaleString()}</div>
                <div className="text-xs text-[#8E9299] mt-1">Logged with reject / defect reason</div>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Retired Plates</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 mt-1">{retiredPlatesCount.toLocaleString()}</div>
                <div className="text-xs text-[#8E9299] mt-1">Scheduled end-of-life retirement</div>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Archive className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Section: Lifespan & Performance Analytics */}
        <div className="mt-6">
          <div className="text-xs font-bold text-[#8E9299] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F27D26]" /> Lifespan Performance Analytics
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Avg Lifespan (Rejected)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                  {avgRejectedLifespan > 0 ? `${avgRejectedLifespan.toLocaleString()}` : '—'}
                  {avgRejectedLifespan > 0 && <span className="text-xs text-[#8E9299] font-normal ml-1">cycles</span>}
                </div>
                <div className="text-xs text-[#8E9299] mt-1">Average cycles reached before rejection</div>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Avg Lifespan (Retired)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 mt-1">
                  {avgRetiredLifespan > 0 ? `${avgRetiredLifespan.toLocaleString()}` : '—'}
                  {avgRetiredLifespan > 0 && <span className="text-xs text-[#8E9299] font-normal ml-1">cycles</span>}
                </div>
                <div className="text-xs text-[#8E9299] mt-1">Average cycles reached upon planned retirement</div>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Archive className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#191D28] rounded-xl p-4 border border-[#1E222A] shadow flex justify-between items-start">
              <div>
                <div className="text-[#8E9299] text-xs font-semibold uppercase tracking-wider">Ave Total Lifespan (Retired + Rejected)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 mt-1">
                  {avgTotalLifespan > 0 ? `${avgTotalLifespan.toLocaleString()}` : '—'}
                  {avgTotalLifespan > 0 && <span className="text-xs text-[#8E9299] font-normal ml-1">cycles</span>}
                </div>
                <div className="text-xs text-[#8E9299] mt-1">Combined fleet average terminal lifespan</div>
              </div>
              <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

