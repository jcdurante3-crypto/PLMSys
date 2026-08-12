import React, { useState } from 'react';
import { PlateRecord, SetRecord, PositionRecord } from '../types';
import { X, Barcode, Search, CheckCircle2, ArrowRight } from 'lucide-react';

interface PlateScannerModalProps {
  plates: PlateRecord[];
  sets: SetRecord[];
  positions: PositionRecord[];
  onClose: () => void;
  onSelectSet: (setId: string) => void;
}

export const PlateScannerModal: React.FC<PlateScannerModalProps> = ({
  plates,
  sets,
  positions,
  onClose,
  onSelectSet,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [scannedPlate, setScannedPlate] = useState<PlateRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const found = plates.find(p => p.plateSerialNumber.toLowerCase() === scanInput.trim().toLowerCase());
    if (found) {
      setScannedPlate(found);
    } else {
      setScannedPlate(null);
      setErrorMsg(`Plate serial number "${scanInput}" not found in database.`);
    }
  };

  const setRecord = scannedPlate ? sets.find(s => s.id === scannedPlate.currentSetId) : null;
  const posRecord = scannedPlate ? positions.find(p => p.id === scannedPlate.currentPositionId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-lg overflow-hidden flex flex-col text-[#E0E2E5]">
        {/* Header */}
        <div className="bg-[#191D28] text-white px-6 py-4 flex items-center justify-between border-b border-[#1E222A]">
          <div className="flex items-center gap-3">
            <div className="bg-[#F27D26] p-2 rounded-lg text-white">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Plate Serial Scanner</h3>
              <p className="text-xs text-[#8E9299]">Scan or enter barcode/QR serial number</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#2D333E] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E9299] uppercase mb-1">Plate Serial Number (MMDDYY-SET-POSITION)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. 080826-01-05"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-[#191D28] border border-[#1E222A] rounded-xl font-mono text-base text-white placeholder-[#8E9299] focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#d96a1f] text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {scannedPlate && (
            <div className="bg-[#191D28] p-4 rounded-xl border border-[#1E222A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8E9299] uppercase">Scan Result Verified</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {scannedPlate.status}
                </span>
              </div>
              <div className="font-mono text-xl font-extrabold text-white">{scannedPlate.plateSerialNumber}</div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#8E9299] pt-2 border-t border-[#1E222A]">
                <div>
                  <span className="text-[#8E9299]/70 block">Location:</span>
                  <strong className="text-white">
                    {setRecord && posRecord ? `${setRecord.displayName} (${posRecord.fullCode})` : 'Unassigned'}
                  </strong>
                </div>
                <div>
                  <span className="text-[#8E9299]/70 block">Mfg Date:</span>
                  <strong className="text-white">{scannedPlate.manufacturingDate}</strong>
                </div>
              </div>

              {scannedPlate.currentSetId && (
                <button
                  onClick={() => {
                    onSelectSet(scannedPlate.currentSetId!);
                    onClose();
                  }}
                  className="w-full mt-2 py-2.5 bg-[#F27D26] hover:bg-[#d96a1f] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  Open Set & Position <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
