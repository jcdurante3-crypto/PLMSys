import React, { useState, useEffect } from 'react';
import { SetRecord, PositionRecord, PlateRecord, JobOrderRecord, PlateInstallationRecord, DailyProductionRecord, Personnel } from '../types';
import { ArrowLeft, Activity, Plus, Wrench, Trash2, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Calendar, User, ChevronLeft, ChevronRight, Layers, Lock, X, AlertCircle } from 'lucide-react';
import { formatJobOrder, isValidJobOrder, getSetTodayProduction } from '../utils';

interface SetDetailProps {
  setRecord: SetRecord;
  sets?: SetRecord[];
  positions: PositionRecord[];
  plates: PlateRecord[];
  installations: PlateInstallationRecord[];
  jobOrders: JobOrderRecord[];
  dailyProductions?: DailyProductionRecord[];
  personnel: Personnel[];
  onBack: () => void;
  onSelectSet?: (setId: string) => void;
  onAddProduction: (setId: string, positionId: string | 'ALL', cycles: number, jobOrderId: string, operatorName: string, checkedBy: string, remarks: string) => void;
  onOpenPositionModal: (position: PositionRecord, action: 'install' | 'replace' | 'history') => void;
  onDeleteSet?: (setId: string) => void;
}

export const SetDetail: React.FC<SetDetailProps> = ({
  setRecord,
  sets = [],
  positions,
  plates,
  installations,
  jobOrders,
  dailyProductions = [],
  personnel,
  onBack,
  onSelectSet,
  onAddProduction,
  onOpenPositionModal,
  onDeleteSet,
}) => {
  const [productionCyclesInput, setProductionCyclesInput] = useState(() => localStorage.getItem('draft_set_productionCyclesInput') || '');
  const [jobOrderInput, setJobOrderInput] = useState(() => localStorage.getItem('draft_set_jobOrderInput') || '');
  const [operatorNameInput, setOperatorNameInput] = useState(() => localStorage.getItem('draft_set_operatorNameInput') || '');
  const [checkedByInput, setCheckedByInput] = useState('');
  const [isCheckedByVerified, setIsCheckedByVerified] = useState(false);
  const [remarksInput, setRemarksInput] = useState(() => localStorage.getItem('draft_set_remarksInput') || '');
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string>(() => localStorage.getItem('draft_set_selectedPositionId') || 'ALL');

  useEffect(() => {
    localStorage.setItem('draft_set_productionCyclesInput', productionCyclesInput);
    localStorage.setItem('draft_set_jobOrderInput', jobOrderInput);
    localStorage.setItem('draft_set_operatorNameInput', operatorNameInput);
    localStorage.setItem('draft_set_remarksInput', remarksInput);
    localStorage.setItem('draft_set_selectedPositionId', selectedPositionId);
  }, [productionCyclesInput, jobOrderInput, operatorNameInput, remarksInput, selectedPositionId]);

  const clearDrafts = () => {
    localStorage.removeItem('draft_set_productionCyclesInput');
    localStorage.removeItem('draft_set_jobOrderInput');
    localStorage.removeItem('draft_set_operatorNameInput');
    localStorage.removeItem('draft_set_remarksInput');
    localStorage.removeItem('draft_set_selectedPositionId');
  };

  const currentIndex = sets.findIndex(s => s.id === setRecord.id);
  const prevSet = currentIndex > 0 ? sets[currentIndex - 1] : null;
  const nextSet = currentIndex >= 0 && currentIndex < sets.length - 1 ? sets[currentIndex + 1] : null;

  const setPositions = positions
    .filter(p => p.setId === setRecord.id)
    .sort((a, b) => a.positionNumber - b.positionNumber);

  const totalPos = setPositions.length > 0 ? setPositions.length : 11;
  const occupiedCount = setPositions.filter(p => p.status === 'OCCUPIED').length;
  const emptyCount = totalPos - occupiedCount;

  const handleProductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cycles = parseInt(productionCyclesInput, 10);
    if (isNaN(cycles) || cycles <= 0) {
      setFormError('Please enter a valid positive number for production cycles.');
      return;
    }
    
    if (!jobOrderInput.trim() || !operatorNameInput.trim() || !remarksInput.trim()) {
      setFormError('Please fill all fields, including job order, operator, and remarks.');
      return;
    }

    if (!isValidJobOrder(jobOrderInput)) {
      setFormError('Job Order Number must be 4 numbers followed by dash and 2 numbers (e.g., 0000-00).');
      return;
    }

    if (!isCheckedByVerified || !checkedByInput.trim()) {
      setFormError('Checked By requires password sign-off from an authorized supervisor or admin.');
      handleOpenAuthModal();
      return;
    }

    setShowConfirmSubmit(true);
  };

  // Authorization Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const renderPersonnelDatalist = (personnelList: Personnel[]) => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    personnelList.forEach(p => {
      const name = p.shortName || p.fullName;
      const norm = name.toUpperCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        options.push({ value: name, label: `${p.fullName} (${p.position})` });
      }
    });

    return options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ));
  };

  const handleOpenAuthModal = () => {
    setAuthError('');
    setAuthPassword('');
    setShowAuthModal(true);
  };

  const handleConfirmAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authPassword.trim()) {
      setAuthError('Please enter authorization password.');
      return;
    }

    const matched = personnel.find(p => p.password && p.password === authPassword);
    if (matched) {
      setCheckedByInput(matched.shortName || matched.fullName);
      setIsCheckedByVerified(true);
      setShowAuthModal(false);
      return;
    }

    setAuthError('Invalid password. Enter a valid supervisor or admin password.');
  };

  const executeProductionSubmit = () => {
    const cycles = parseInt(productionCyclesInput, 10);
    onAddProduction(setRecord.id, selectedPositionId, cycles, jobOrderInput, operatorNameInput, checkedByInput, remarksInput);
    clearDrafts();
    setProductionCyclesInput('');
    setRemarksInput('');
    setCheckedByInput('');
    setIsCheckedByVerified(false);
    setShowConfirmSubmit(false);
    setShowProductionForm(false);
  };

  let currentTargetLife = setRecord.currentTotalCycle;
  if (selectedPositionId !== 'ALL') {
    const position = positions.find(p => p.id === selectedPositionId);
    if (position && position.currentPlateId) {
      const inst = installations.find(i => i.plateId === position.currentPlateId && i.positionId === position.id);
      if (inst) {
        const runCycles = setRecord.currentTotalCycle - inst.installationCycle;
        currentTargetLife = runCycles + (inst.initialCycles || 0);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Bar & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F1117] p-4 rounded-2xl border border-[#1E222A]">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#191D28] border border-[#1E222A] text-[#E0E2E5] hover:bg-[#2D333E] text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#F27D26]" /> Back
          </button>
          
          <div className="h-4 w-[1px] bg-[#1E222A] mx-1" />

          {/* Jump Set Selector */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#F27D26] hidden sm:block" />
            <select
              value={setRecord.id}
              onChange={(e) => onSelectSet && onSelectSet(e.target.value)}
              className="px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} (Set {s.setNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prev / Next Set Quick Switcher */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => prevSet && onSelectSet && onSelectSet(prevSet.id)}
            disabled={!prevSet}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              prevSet 
                ? 'bg-[#191D28] text-white border-[#1E222A] hover:bg-[#2D333E]' 
                : 'bg-[#191D28]/40 text-[#8E9299]/40 border-[#1E222A] cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Prev Set
          </button>
          <span className="text-xs font-mono text-[#8E9299] px-2">
            Set {currentIndex + 1} of {sets.length}
          </span>
          <button
            onClick={() => nextSet && onSelectSet && onSelectSet(nextSet.id)}
            disabled={!nextSet}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              nextSet 
                ? 'bg-[#191D28] text-white border-[#1E222A] hover:bg-[#2D333E]' 
                : 'bg-[#191D28]/40 text-[#8E9299]/40 border-[#1E222A] cursor-not-allowed'
            }`}
          >
            Next Set <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Set Banner Card */}
      <div className="bg-[#0F1117] rounded-2xl p-6 text-[#E0E2E5] shadow-xl border border-[#1E222A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#F27D26] text-white font-mono px-3 py-1 rounded-lg text-sm font-bold">
                {setRecord.shortCode}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{setRecord.displayName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {setRecord.status}
              </span>
            </div>
            <p className="text-[#8E9299] text-sm">
              Master Cycle Reference for all {totalPos} installed plates. Automatic calculation: Current Cycle = Previous + Production.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowProductionForm(!showProductionForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-lg shadow-[#F27D26]/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-4 h-4" /> {showProductionForm ? 'Close Production Log' : 'Log Plate Cycle'}
            </button>
          </div>
        </div>

        {/* Set Metrics */}
        {(() => {
          const setDailyLogsCycles = dailyProductions
            .filter((dp) => dp.setId === setRecord.id)
            .reduce((sum, dp) => sum + dp.productionCycles, 0);
          const initialSetCycle = setRecord.initialCycle !== undefined ? setRecord.initialCycle : (setRecord.currentTotalCycle - setDailyLogsCycles);
          
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1E222A]">
              <div className="bg-[#191D28] p-3 rounded-xl border border-[#1E222A] flex flex-col justify-between">
                <div>
                  <div className="text-[#8E9299] text-xs font-medium uppercase">Current Total Cycle</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {setRecord.currentTotalCycle.toLocaleString()}
                  </div>
                </div>
                <div className="text-[10px] text-[#8E9299] mt-2 pt-1 border-t border-[#1E222A] font-mono leading-tight">
                  <span className="text-[#F27D26] font-bold">Auto Sum:</span> {initialSetCycle.toLocaleString()} (Starting) + {setDailyLogsCycles.toLocaleString()} (Daily Logs)
                </div>
              </div>
              <div className="bg-[#191D28] p-3 rounded-xl border border-[#1E222A]">
                <div className="text-[#8E9299] text-xs font-medium uppercase">Today's Production</div>
                <div className="text-2xl sm:text-3xl font-bold text-sky-400 mt-1">+{getSetTodayProduction(setRecord).toLocaleString()}</div>
              </div>
              <div className="bg-[#191D28] p-3 rounded-xl border border-[#1E222A]">
                <div className="text-[#8E9299] text-xs font-medium uppercase">Active Plates</div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">{occupiedCount} / {totalPos}</div>
              </div>
              <div className="bg-[#191D28] p-3 rounded-xl border border-[#1E222A]">
                <div className="text-[#8E9299] text-xs font-medium uppercase">Empty Positions</div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 mt-1">{emptyCount}</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Production Log Form Drawer */}
      {showProductionForm && (
        <form onSubmit={handleProductionSubmit} className="bg-[#0F1117] p-6 rounded-2xl shadow-md border border-[#1E222A] space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#1E222A] pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#F27D26]" /> Log Plate Cycle
            </h3>
            <span className="text-xs text-[#8E9299]">
              {selectedPositionId === 'ALL' ? 'Previous Set Cycle:' : 'Current Plate Life:'} <strong className="text-white">{currentTargetLife.toLocaleString()}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Select Position</label>
              <select
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              >
                <option value="ALL">All Plates in Set</option>
                {setPositions.filter(p => p.status === 'OCCUPIED' && p.currentPlateId).map(p => {
                  const plate = plates.find(pl => pl.id === p.currentPlateId);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.fullCode} ({plate ? plate.plateSerialNumber : 'Unknown'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Add Production Cycle *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="e.g. 2500"
                value={productionCyclesInput}
                onChange={(e) => setProductionCyclesInput(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
              <span className="text-xs text-[#8E9299] mt-1.5 block">
                Resulting Cycle: <strong className="text-white">{(currentTargetLife + (parseInt(productionCyclesInput) || 0)).toLocaleString()}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Job Order Number *</label>
              <input
                type="text"
                required
                maxLength={7}
                placeholder="0000-00"
                value={jobOrderInput}
                onChange={(e) => setJobOrderInput(formatJobOrder(e.target.value))}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26] font-mono tracking-wider"
              />
              <span className="text-[11px] text-[#8E9299] mt-1 block">
                Format: 4 digits - 2 digits (e.g. <strong className="text-white">0000-00</strong>)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Operator *</label>
              <input
                type="text"
                list="operator-list-detail"
                required
                placeholder="Enter operator name..."
                value={operatorNameInput}
                onChange={(e) => setOperatorNameInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
              <datalist id="operator-list-detail">
                {renderPersonnelDatalist(personnel)}
              </datalist>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Checked By *</label>
                {isCheckedByVerified && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Password Verified
                  </span>
                )}
              </div>
              {!isCheckedByVerified ? (
                <div className="p-3 bg-[#191D28] border border-amber-500/30 rounded-xl flex flex-col gap-3 shadow-inner">
                  <div className="flex items-start gap-2 text-amber-400 text-xs">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">Password Required.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAuthModal}
                    className="w-full px-3.5 py-2 bg-[#F27D26] hover:bg-[#d96a1a] text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Sign Off & Authorize
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-start gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span className="leading-relaxed">Checked & Verified By: <strong className="text-white text-sm ml-1 underline">{checkedByInput}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAuthModal}
                    className="text-xs text-[#8E9299] hover:text-white underline cursor-pointer shrink-0 font-medium self-end"
                  >
                    Change Sign-Off
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Remarks / Notes</label>
            <input
              type="text"
              placeholder="Optional notes regarding production run..."
              value={remarksInput}
              onChange={(e) => setRemarksInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-semibold">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowProductionForm(false);
                setFormError('');
                setShowConfirmSubmit(false);
              }}
              className="px-4 py-2 rounded-lg bg-[#191D28] hover:bg-[#2D333E] text-[#8E9299] text-sm font-medium border border-[#1E222A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md"
            >
              Update Cycle
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F1117] border border-[#F27D26] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slideUp">
            <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
            <p className="text-[#8E9299] text-sm mb-6">Confirm saving this plate cycle log?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-lg bg-[#191D28] border border-[#1E222A] hover:bg-[#2D333E] text-[#E0E2E5] text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeProductionSubmit}
                className="px-4 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#F27D26]/20"
              >
                Confirm Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Positions Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-xl font-bold text-white">Fixed Plate Positions (P01 - P{totalPos < 10 ? '0' + totalPos : totalPos})</h3>
          <p className="text-xs text-[#8E9299]">Each position holds exactly one active plate or stands empty.</p>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {setPositions.map((pos) => {
          const plate = plates.find(p => p.id === pos.currentPlateId && p.status === 'ACTIVE');
          const installation = plate ? installations.find(i => i.plateId === plate.id && i.setId === setRecord.id && i.positionId === pos.id) : null;
          const plateLife = installation ? (setRecord.currentTotalCycle - installation.installationCycle) + (installation.initialCycles || 0) : 0;

          return (
            <div
              key={pos.id}
              className={`rounded-xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                pos.status === 'OCCUPIED' ? 'bg-[#0F1117] border-[#1E222A] hover:border-[#F27D26]/50' : 'bg-[#0A0B0E] border-dashed border-[#1E222A]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-[#191D28] text-white px-2.5 py-1 rounded-md text-xs font-bold border border-[#1E222A]">
                      {pos.fullCode}
                    </span>
                    <span className="text-xs text-[#8E9299] font-medium">Position {pos.positionNumber}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    pos.status === 'OCCUPIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#191D28] text-[#8E9299] border border-[#1E222A]'
                  }`}>
                    {pos.status}
                  </span>
                </div>

                {pos.status === 'OCCUPIED' && plate ? (
                  <div className="space-y-2 my-3">
                    <div className="bg-[#191D28] p-3 rounded-lg border border-[#1E222A]">
                      <div className="text-xs text-[#F27D26] font-semibold uppercase tracking-wider">Plate Serial No.</div>
                      <div className="font-mono text-base font-bold text-white mt-0.5">{plate.plateSerialNumber}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[#8E9299] pt-1">
                      <div>
                        <span className="text-[#8E9299]/70 block">Installed Cycle:</span>
                        <strong className="text-white">{installation?.installationCycle.toLocaleString() || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[#8E9299]/70 block">Plate Life:</span>
                        <strong className="text-[#F27D26] font-bold">{plateLife.toLocaleString()} cycles</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <div className="text-sm font-medium text-[#8E9299]">Position Empty</div>
                    <div className="text-xs text-[#8E9299]/70 mt-1">Ready for plate installation</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-[#1E222A] flex items-center justify-between gap-2">
                {pos.status === 'OCCUPIED' && plate ? (
                  <>
                    <button
                      onClick={() => onOpenPositionModal(pos, 'history')}
                      className="flex-1 px-3 py-1.5 bg-[#191D28] hover:bg-[#2D333E] text-[#8E9299] hover:text-white text-xs font-semibold rounded-lg transition-colors text-center border border-[#1E222A]"
                    >
                      History
                    </button>
                    <button
                      onClick={() => onOpenPositionModal(pos, 'replace')}
                      className="flex-1 px-3 py-1.5 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] text-xs font-semibold rounded-lg transition-colors text-center border border-[#F27D26]/30"
                    >
                      Replace
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onOpenPositionModal(pos, 'install')}
                    className="w-full py-2 bg-[#F27D26] hover:bg-[#d96a1f] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Install Plate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AUTHORIZATION MODAL DIALOG */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0F1117] border border-[#1E222A] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E222A] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F27D26]" />
                <h3 className="text-base font-bold text-white">Authorization</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-[#8E9299] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAuth} className="space-y-4">
              <div className="p-3 bg-[#191D28] border border-[#1E222A] rounded-xl text-xs text-[#8E9299]">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#F27D26]" /> Double-Check Details Verification
                </p>
                Enter your supervisor or admin password to sign off and verify this production log. The system will automatically identify your account name.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">
                  Authorization Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter authorization password..."
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E222A]">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 bg-[#191D28] hover:bg-[#252A38] border border-[#1E222A] text-[#8E9299] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#d96a1f] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Authorization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
