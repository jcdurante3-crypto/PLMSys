import React, { useState, useEffect } from 'react';
import { PositionRecord, SetRecord, PlateRecord, PlateInstallationRecord, PlateRemovalRecord, Personnel } from '../types';
import { X, AlertTriangle, Calendar, User, Wrench, Barcode, ArrowRight, Clock, History, CheckCircle, Info } from 'lucide-react';

interface PositionModalProps {
  position: PositionRecord;
  setRecord: SetRecord;
  currentPlate?: PlateRecord;
  installation?: PlateInstallationRecord;
  removals: PlateRemovalRecord[];
  personnel: Personnel[];
  onClose: () => void;
  onInstallPlate: (positionId: string, setId: string, serialNumber: string, manufacturingDate: string, operatorId: string, remarks: string, initialCycles?: number) => void;
  onReplacePlate: (
    positionId: string,
    setId: string,
    oldPlateId: string,
    newSerialNumber: string,
    mfgDate: string,
    reason: string,
    operatorId: string,
    initialCycles?: number,
    evaluationStatus?: 'RETIRED' | 'REJECTED',
    rejectTypes?: string[],
    rejectDescription?: string,
    sourceOfReject?: string,
    correctiveAction?: string
  ) => void;
  action: 'install' | 'replace' | 'history';
  installations: PlateInstallationRecord[];
  plates: PlateRecord[];
}

export const PositionModal: React.FC<PositionModalProps> = ({
  position,
  setRecord,
  currentPlate,
  installation,
  removals,
  personnel,
  onClose,
  onInstallPlate,
  onReplacePlate,
  action: initialAction,
  installations,
  plates,
}) => {
  const [modalAction, setModalAction] = useState<'install' | 'replace' | 'history'>(
    initialAction === 'history' ? 'history' : initialAction
  );

  // Install Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [mfgDate, setMfgDate] = useState(() => localStorage.getItem('draft_pos_mfgDate') || todayStr);
  const [operatorId, setOperatorId] = useState(() => {
    const saved = localStorage.getItem('draft_pos_operatorId');
    if (saved) return saved;
    if (personnel && personnel.length > 0) return personnel[0].shortName;
    return 'Admin';
  });
  const [remarks, setRemarks] = useState(() => localStorage.getItem('draft_pos_remarks') || '');
  const [initialCycles, setInitialCycles] = useState<number>(() => {
    const saved = localStorage.getItem('draft_pos_initialCycles');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Auto-generate serial preview: MMDDYY-SET-POSITION
  const dateObj = new Date(mfgDate);
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yy = String(dateObj.getFullYear()).slice(-2);
  const setNumStr = String(setRecord.setNumber).padStart(2, '0');
  const posNumStr = String(position.positionNumber).padStart(2, '0');
  const generatedSerial = `${mm}${dd}${yy}-${setNumStr}-${posNumStr}`;

  // Replace Form State
  const [replaceInstallDate, setReplaceInstallDate] = useState(() => localStorage.getItem('draft_pos_replaceInstallDate') || todayStr);
  const [evaluationStatus, setEvaluationStatus] = useState<'RETIRED' | 'REJECTED'>(() => {
    return (localStorage.getItem('draft_pos_evaluationStatus') as any) || 'REJECTED';
  });
  const [rejectTypes, setRejectTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('draft_pos_rejectTypes');
    return saved ? JSON.parse(saved) : ['Excessive Wear'];
  });
  const [otherRejectText, setOtherRejectText] = useState(() => localStorage.getItem('draft_pos_otherRejectText') || '');
  const [rejectDescription, setRejectDescription] = useState(() => localStorage.getItem('draft_pos_rejectDescription') || '');
  const [sourceOfReject, setSourceOfReject] = useState(() => localStorage.getItem('draft_pos_sourceOfReject') || '');
  const [correctiveAction, setCorrectiveAction] = useState(() => localStorage.getItem('draft_pos_correctiveAction') || '');
  const [warningMessage, setWarningMessage] = useState('');
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);

  useEffect(() => {
    localStorage.setItem('draft_pos_mfgDate', mfgDate);
    localStorage.setItem('draft_pos_operatorId', operatorId);
    localStorage.setItem('draft_pos_remarks', remarks);
    localStorage.setItem('draft_pos_initialCycles', String(initialCycles));
    localStorage.setItem('draft_pos_replaceInstallDate', replaceInstallDate);
    localStorage.setItem('draft_pos_evaluationStatus', evaluationStatus);
    localStorage.setItem('draft_pos_rejectTypes', JSON.stringify(rejectTypes));
    localStorage.setItem('draft_pos_otherRejectText', otherRejectText);
    localStorage.setItem('draft_pos_rejectDescription', rejectDescription);
    localStorage.setItem('draft_pos_sourceOfReject', sourceOfReject);
    localStorage.setItem('draft_pos_correctiveAction', correctiveAction);
  }, [
    mfgDate,
    operatorId,
    remarks,
    initialCycles,
    replaceInstallDate,
    evaluationStatus,
    rejectTypes,
    otherRejectText,
    rejectDescription,
    sourceOfReject,
    correctiveAction
  ]);

  const clearDrafts = () => {
    localStorage.removeItem('draft_pos_mfgDate');
    localStorage.removeItem('draft_pos_operatorId');
    localStorage.removeItem('draft_pos_remarks');
    localStorage.removeItem('draft_pos_initialCycles');
    localStorage.removeItem('draft_pos_replaceInstallDate');
    localStorage.removeItem('draft_pos_evaluationStatus');
    localStorage.removeItem('draft_pos_rejectTypes');
    localStorage.removeItem('draft_pos_otherRejectText');
    localStorage.removeItem('draft_pos_rejectDescription');
    localStorage.removeItem('draft_pos_sourceOfReject');
    localStorage.removeItem('draft_pos_correctiveAction');
  };

  const handleRejectTypeToggle = (type: string) => {
    if (rejectTypes.includes(type)) {
      setRejectTypes(rejectTypes.filter(t => t !== type));
    } else {
      setRejectTypes([...rejectTypes, type]);
    }
  };

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

  const handleInstallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInstallPlate(position.id, setRecord.id, generatedSerial, mfgDate, operatorId, remarks, initialCycles);
    clearDrafts();
  };

  const handleReplaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlate) return;

    if (evaluationStatus === 'REJECTED') {
      if (rejectTypes.length === 0 || !rejectDescription.trim() || !sourceOfReject.trim() || sourceOfReject === 'Define reject cause...' || !correctiveAction.trim()) {
        setWarningMessage('Please complete all fields for rejected plate documentation.');
        return;
      }
    }

    setWarningMessage('');
    setShowConfirmReplace(true);
  };

  const executeReplace = () => {
    if (!currentPlate) return;
    const rDateObj = new Date(replaceInstallDate);
    const rmm = String(rDateObj.getMonth() + 1).padStart(2, '0');
    const rdd = String(rDateObj.getDate()).padStart(2, '0');
    const ryy = String(rDateObj.getFullYear()).slice(-2);
    const newSerial = `${rmm}${rdd}${ryy}-${setNumStr}-${posNumStr}`;

    const formattedRejectTypes = evaluationStatus === 'REJECTED' 
      ? rejectTypes.map(t => (t === 'Other' && otherRejectText ? `Other: ${otherRejectText}` : t))
      : [];

    const finalRejectDesc = evaluationStatus === 'RETIRED' ? 'Reached end of life / Retired' : (rejectDescription || 'Plate Replacement');
    const finalSource = evaluationStatus === 'RETIRED' ? 'End of life' : sourceOfReject;
    const finalAction = evaluationStatus === 'RETIRED' ? 'Replaced due to end of life' : correctiveAction;

    onReplacePlate(
      position.id,
      setRecord.id,
      currentPlate.id,
      newSerial,
      replaceInstallDate,
      finalRejectDesc,
      operatorId,
      0, // Removed pre-existing cycles for new replacement plate
      evaluationStatus,
      formattedRejectTypes,
      finalRejectDesc,
      finalSource,
      finalAction
    );
    clearDrafts();
  };

  const plateLife = installation
    ? (setRecord.currentTotalCycle - installation.installationCycle) + (installation.initialCycles || 0)
    : 0;

  // Filter and sort all installations for this specific position
  const posInstallations = installations
    .filter((inst) => inst.positionId === position.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#E0E2E5]">
        {/* Modal Header */}
        <div className="bg-[#191D28] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E222A]">
          <div className="flex items-center gap-3">
            <span className="bg-[#F27D26] px-3 py-1 rounded-md font-mono text-sm font-bold text-white">
              {position.fullCode}
            </span>
            <div>
              <h3 className="font-bold text-lg">{setRecord.displayName} - Position {position.positionCode}</h3>
              <p className="text-xs text-[#8E9299]">
                {modalAction === 'install' && 'Install New Plate'}
                {modalAction === 'replace' && 'Replace Plate (Seamless Swap)'}
                {modalAction === 'history' && 'Plate Lifecycle Ledger & History'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#2D333E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="flex border-b border-[#1E222A] bg-[#0A0B0E] px-6 pt-2 gap-2">
          {currentPlate && (
            <>
              <button
                onClick={() => setModalAction('history')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  modalAction === 'history'
                    ? 'border-[#F27D26] text-[#F27D26] bg-[#0F1117]'
                    : 'border-transparent text-[#8E9299] hover:text-white'
                }`}
              >
                Lifecycle History
              </button>
              <button
                onClick={() => setModalAction('replace')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  modalAction === 'replace'
                    ? 'border-[#F27D26] text-[#F27D26] bg-[#0F1117]'
                    : 'border-transparent text-[#8E9299] hover:text-white'
                }`}
              >
                Replace Plate
              </button>
            </>
          )}
          {!currentPlate && (
            <button
              onClick={() => setModalAction('install')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                modalAction === 'install'
                  ? 'border-[#F27D26] text-[#F27D26] bg-[#0F1117]'
                  : 'border-transparent text-[#8E9299] hover:text-white'
              }`}
            >
              Install Plate
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#0F1117]">
          {/* INSTALL PLATE FORM */}
          {modalAction === 'install' && (
            <form onSubmit={handleInstallSubmit} className="space-y-4">
              <div className="bg-[#F27D26]/10 border border-[#F27D26]/20 p-4 rounded-xl">
                <div className="text-xs font-semibold text-[#F27D26] uppercase">Automatic Plate Serial Number Generation</div>
                <div className="text-2xl font-mono font-black text-white mt-1">{generatedSerial}</div>
                <p className="text-xs text-[#8E9299] mt-1">Format: MMDDYY-SET-POSITION ({mm}{dd}{yy}-{setNumStr}-{posNumStr})</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    required
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Operator</label>
                  <input
                    type="text"
                    list="operator-list"
                    required
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                  />
                  <datalist id="operator-list">
                    {renderPersonnelDatalist(personnel)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Pre-existing Plate Cycles (Installed Cycle on Plate)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={initialCycles}
                  onChange={(e) => setInitialCycles(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                  placeholder="0 (New Plate)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Installation Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes for installation record..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
              </div>

              <div className="bg-[#191D28] p-4 rounded-xl border border-[#1E222A] text-xs text-[#8E9299] space-y-1">
                <div>• Current Set Total Cycle: <strong className="text-white">{setRecord.currentTotalCycle.toLocaleString()}</strong></div>
                <div>• Initial Plate Installation Cycle: <strong className="text-white">{setRecord.currentTotalCycle.toLocaleString()}</strong></div>
                <div>• Pre-existing Plate Cycles: <strong className="text-white">{initialCycles.toLocaleString()}</strong></div>
                <div>• Total Initial Plate Life: <strong className="text-[#F27D26] font-bold">{initialCycles.toLocaleString()} cycles</strong></div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#191D28] hover:bg-[#2D333E] text-[#8E9299] text-sm font-medium border border-[#1E222A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md cursor-pointer"
                >
                  Confirm Installation
                </button>
              </div>
            </form>
          )}

          {/* REPLACE PLATE FORM */}
          {modalAction === 'replace' && currentPlate && (
            <form onSubmit={handleReplaceSubmit} className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Install New Plate</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Install Date</label>
                    <input
                      type="date"
                      required
                      value={replaceInstallDate}
                      onChange={(e) => setReplaceInstallDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Operator</label>
                    <input
                      type="text"
                      list="operator-list-replace"
                      required
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                    />
                    <datalist id="operator-list-replace">
                      {renderPersonnelDatalist(personnel)}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Sub-Header & Documentation Form for Declared Retired / Rejected */}
              <div className="pt-2">
                <div className="bg-[#F27D26]/10 border border-[#F27D26]/20 p-4 rounded-xl mb-4">
                  <div className="text-xs font-semibold text-[#F27D26] uppercase">Plate Replacement</div>
                  <p className="text-xs text-[#8E9299] mt-1">
                    Old plate <strong className="font-mono text-white">{currentPlate.plateSerialNumber}</strong> will be removed from position <strong className="text-white">{position.fullCode}</strong>, and a new replacement plate will be installed.
                  </p>
                </div>

                <div className="border-t border-[#1E222A] pt-4 mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#F27D26]" /> Plate History Record — Final Evaluation Documentation
                  </h4>
                  <p className="text-xs text-[#8E9299] mt-0.5">
                    Declare whether the removed plate is Retired or Rejected, and complete the documentation record below.
                  </p>
                </div>

                {/* FORM CONTAINER EMBEDDED LIKE THE PHYSICAL RECORD SHEET */}
                <div className="bg-[#0A0B0E] border border-[#1E222A] rounded-xl p-5 space-y-4 text-xs font-sans">
                  {/* Header */}
                  <div className="text-center border-b border-[#1E222A] pb-3">
                    <h5 className="text-sm font-black text-white tracking-wider uppercase">PLATE HISTORY RECORD</h5>
                    <span className="text-[10px] text-[#F27D26] font-bold tracking-widest uppercase">PLATE IDENTIFICATION</span>
                  </div>

                  {/* Identification Grid */}
                  <div className="grid grid-cols-2 gap-3 text-[#E0E2E5] bg-[#12141D] p-3 rounded-lg border border-[#1E222A]">
                    <div>
                      <span className="text-[#8E9299] block font-semibold text-[11px]">Plate Serial No.:</span>
                      <span className="font-mono font-bold text-white text-sm">{currentPlate.plateSerialNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#8E9299] block font-semibold text-[11px]">Position:</span>
                      <span className="font-mono font-bold text-[#F27D26] text-sm">{position.fullCode}</span>
                    </div>
                    <div>
                      <span className="text-[#8E9299] block font-semibold text-[11px]">Installation Date:</span>
                      <span className="font-mono text-white">{installation?.installationDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[#8E9299] block font-semibold text-[11px]">Removal Date:</span>
                      <span className="font-mono text-white">{replaceInstallDate}</span>
                    </div>
                  </div>

                  {/* Cycle Information */}
                  <div className="border-t border-[#1E222A] pt-3">
                    <div className="text-center mb-2">
                      <span className="text-[10px] text-[#8E9299] font-bold tracking-widest uppercase">CYCLE INFORMATION</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center bg-[#12141D] p-3 rounded-lg border border-[#1E222A]">
                      <div>
                        <span className="text-[10px] text-[#8E9299] block font-medium">Installed At Cycle</span>
                        <span className="font-mono font-bold text-white text-xs">{installation?.installationCycle.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8E9299] block font-medium">Removed At Cycle</span>
                        <span className="font-mono font-bold text-white text-xs">{setRecord.currentTotalCycle.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8E9299] block font-medium">Total Cycles Achieved</span>
                        <span className="font-mono font-bold text-[#F27D26] text-xs">
                          {(setRecord.currentTotalCycle - (installation?.installationCycle || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Final Plate Evaluation Radio Choice */}
                  <div className="border-t border-[#1E222A] pt-3">
                    <div className="text-center mb-2">
                      <span className="text-[10px] text-[#8E9299] font-bold tracking-widest uppercase">FINAL PLATE EVALUATION</span>
                    </div>
                    <div className="flex justify-center gap-4 my-2">
                      <label
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          evaluationStatus === 'RETIRED'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-md'
                            : 'bg-[#12141D] border-[#1E222A] text-[#8E9299] hover:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="evaluation"
                          value="RETIRED"
                          checked={evaluationStatus === 'RETIRED'}
                          onChange={() => setEvaluationStatus('RETIRED')}
                          className="accent-amber-500 w-4 h-4"
                        />
                        <span className="text-sm">Retired</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          evaluationStatus === 'REJECTED'
                            ? 'bg-rose-500/15 border-rose-500 text-rose-400 font-bold shadow-md'
                            : 'bg-[#12141D] border-[#1E222A] text-[#8E9299] hover:text-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="evaluation"
                          value="REJECTED"
                          checked={evaluationStatus === 'REJECTED'}
                          onChange={() => setEvaluationStatus('REJECTED')}
                          className="accent-rose-500 w-4 h-4"
                        />
                        <span className="text-sm">Rejected</span>
                      </label>
                    </div>
                  </div>

                  {/* Reject Details Form Fields (if Rejected) */}
                  {evaluationStatus === 'REJECTED' && (
                    <div className="space-y-4 pt-3 border-t border-[#1E222A] animate-fadeIn">
                      <div className="text-center">
                        <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase">REJECT TYPE</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 bg-[#12141D] p-3 rounded-lg border border-[#1E222A]">
                        {[
                          'Excessive Wear',
                          'Surface Damage',
                          'Crack',
                          'Dimension Failure',
                          'Chipping',
                          'Dent',
                          'Other'
                        ].map((type) => (
                          <label key={type} className="flex items-center gap-2 text-xs text-[#E0E2E5] cursor-pointer hover:text-white">
                            <input
                              type="checkbox"
                              checked={rejectTypes.includes(type)}
                              onChange={() => handleRejectTypeToggle(type)}
                              className="accent-[#F27D26] w-4 h-4 rounded-sm"
                            />
                            <span>{type}</span>
                          </label>
                        ))}
                      </div>

                      {rejectTypes.includes('Other') && (
                        <div>
                          <label className="block text-[11px] font-semibold text-[#8E9299] mb-1 uppercase">Other Reject Reason:</label>
                          <input
                            type="text"
                            value={otherRejectText}
                            onChange={(e) => setOtherRejectText(e.target.value)}
                            placeholder="Specify details..."
                            className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-[#8E9299] mb-1 uppercase">Reject Description:</label>
                        <textarea
                          rows={2}
                          value={rejectDescription}
                          onChange={(e) => setRejectDescription(e.target.value)}
                          placeholder="Detailed defect observation..."
                          className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#8E9299] mb-1 uppercase">Source of Reject:</label>
                          <input
                            type="text"
                            value={sourceOfReject}
                            onChange={(e) => setSourceOfReject(e.target.value)}
                            placeholder="Define reject cause..."
                            className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#8E9299] mb-1 uppercase">Remarks / Corrective Action:</label>
                          <input
                            type="text"
                            value={correctiveAction}
                            onChange={(e) => setCorrectiveAction(e.target.value)}
                            placeholder="Disposition or action..."
                            className="w-full px-3 py-2 bg-[#191D28] border border-[#1E222A] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {warningMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex items-start gap-2 text-rose-400 text-xs font-semibold animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{warningMessage}</span>
                </div>
              )}

              {showConfirmReplace && (
                <div className="bg-[#191D28] border border-[#F27D26] p-4 rounded-xl text-center space-y-3 animate-fadeIn">
                  <p className="text-white text-sm font-semibold">Confirm plate replacement and save history record?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowConfirmReplace(false)}
                      className="px-4 py-1.5 rounded-lg bg-[#2D333E] hover:bg-[#3b4351] text-[#E0E2E5] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={executeReplace}
                      className="px-4 py-1.5 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-xs font-semibold"
                    >
                      Confirm Replacement
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#191D28] hover:bg-[#2D333E] text-[#8E9299] text-sm font-medium border border-[#1E222A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#F27D26] hover:bg-[#d96a1f] text-white text-sm font-semibold shadow-md cursor-pointer"
                >
                  Execute Replacement & Log History Record
                </button>
              </div>
            </form>
          )}

          {/* LIFECYCLE HISTORY LEDGER */}
          {modalAction === 'history' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-5 h-5 text-[#F27D26]" />
                  <h4 className="text-base font-bold text-white">Position Installation Ledger</h4>
                </div>
                <p className="text-xs text-[#8E9299]">
                  Comprehensive history of all plates deployed to position <strong className="text-white">{position.fullCode}</strong>. Values automatically compute running totals.
                </p>
              </div>

              {posInstallations.length === 0 ? (
                <div className="text-center py-10 bg-[#191D28] rounded-xl border border-[#1E222A] text-[#8E9299] text-sm">
                  No installation records found for this position.
                </div>
              ) : (
                <div className="space-y-4">
                  {posInstallations.map((inst) => {
                    const pl = plates.find((p) => p.id === inst.plateId);
                    const isCurrent = currentPlate && currentPlate.id === inst.plateId;
                    const rem = removals.find(
                      (r) => r.plateId === inst.plateId && r.positionId === position.id
                    );

                    // Calculations
                    let runCycles = 0;
                    let statusStr = 'REPLACED';
                    let removalDateStr = '—';
                    let removalCycleStr = '—';

                    if (isCurrent) {
                      runCycles = setRecord.currentTotalCycle - inst.installationCycle;
                      statusStr = 'ACTIVE';
                    } else if (rem) {
                      runCycles = rem.removalCycle - inst.installationCycle;
                      statusStr = rem.status;
                      removalDateStr = rem.removalDate;
                      removalCycleStr = rem.removalCycle.toLocaleString();
                    } else {
                      statusStr = pl ? pl.status : 'HISTORIC';
                    }

                    const totalPlateCycles = runCycles + (inst.initialCycles || 0);

                    return (
                      <div
                        key={inst.id}
                        className={`p-5 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-[#191D28] border-[#F27D26]/40 shadow-lg shadow-[#F27D26]/5'
                            : 'bg-[#11131A] border-[#1E222A]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E222A] pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Barcode className="w-4 h-4 text-[#F27D26]" />
                            <span className="font-mono text-sm font-bold text-white">
                              {pl ? pl.plateSerialNumber : 'Unknown Serial'}
                            </span>
                            {isCurrent ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                CURRENTLY ACTIVE
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  statusStr === 'REJECTED'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : statusStr === 'RETIRED'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-[#191D28] text-[#8E9299] border border-[#1E222A]'
                                }`}
                              >
                                {statusStr}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#8E9299]">
                            <Calendar className="w-3.5 h-3.5 text-[#F27D26]" />
                            <span>Installed: {inst.installationDate}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-[#8E9299] block mb-0.5">Install Cycle</span>
                            <strong className="text-white font-mono">{inst.installationCycle.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[#8E9299] block mb-0.5">Removal Cycle</span>
                            <strong className="text-white font-mono">{removalCycleStr}</strong>
                          </div>
                          <div>
                            <span className="text-[#8E9299] block mb-0.5">Active Run</span>
                            <strong className="text-white font-mono">{runCycles.toLocaleString()} cycles</strong>
                          </div>
                          <div>
                            <span className="text-[#8E9299] block mb-0.5">Accumulated Life</span>
                            <strong className="text-[#F27D26] font-bold font-mono text-sm">
                              {totalPlateCycles.toLocaleString()} cycles
                            </strong>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#1E222A]/50 space-y-2 text-xs text-[#8E9299]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span>Operator: </span>
                              <strong className="text-white font-mono">{inst.operatorId}</strong>
                            </div>
                          </div>
                          {inst.remarks && (
                            <div className="w-full bg-[#0F1117] p-2.5 rounded-lg border border-[#1E222A] text-white">
                              <span className="text-[#8E9299] text-[11px] block font-semibold uppercase mb-0.5">Remarks / Notes:</span>
                              <div className="text-xs italic text-slate-200 break-words whitespace-pre-wrap">{inst.remarks}</div>
                            </div>
                          )}
                        </div>

                        {/* Defect details if rejected */}
                        {statusStr === 'REJECTED' && rem && (
                          <div className="mt-4 p-3 bg-rose-500/5 rounded-lg border border-rose-500/10 space-y-1.5 text-xs">
                            <div className="flex items-center gap-1 text-rose-400 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" /> Defect Type: {rem.rejectType}
                            </div>
                            <div className="text-[#E0E2E5]">
                              <span className="text-rose-400/80 font-semibold">Description:</span> {rem.rejectDescription}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8E9299] pt-1.5 border-t border-rose-500/10">
                              <div><span className="font-semibold">Reject Source:</span> {rem.sourceOfReject || 'N/A'}</div>
                              <div><span className="font-semibold">Corrective Action:</span> {rem.correctiveAction || 'N/A'}</div>
                            </div>
                          </div>
                        )}

                        {/* Replacement details if replaced */}
                        {statusStr === 'REPLACED' && rem && rem.rejectDescription && (
                          <div className="mt-4 p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 text-xs">
                            <span className="text-amber-400 font-semibold">Replacement Reason:</span>{' '}
                            <span className="text-[#E0E2E5]">{rem.rejectDescription}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
