import React, { useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { Personnel } from '../types';

interface RegistryModalProps {
  personnel: Personnel[];
  onAdd: (personnel: Omit<Personnel, 'id'>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export const RegistryModal: React.FC<RegistryModalProps> = ({ personnel, onAdd, onRemove, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [shortName, setShortName] = useState('');
  const [position, setPosition] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim() && shortName.trim() && position.trim()) {
      if (isAuthorized && !password.trim()) {
        alert('Please set a password for authorized personnel.');
        return;
      }
      onAdd({
        fullName: fullName.trim(),
        shortName: shortName.trim(),
        position: position.trim(),
        isAuthorized,
        password: isAuthorized ? password.trim() : ''
      });
      setFullName('');
      setShortName('');
      setPosition('');
      setIsAuthorized(false);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4">
      <div className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Personnel Registry</h2>
          <button onClick={onClose} className="text-[#8E9299] hover:text-white"><X /></button>
        </div>
        
        <form onSubmit={handleAdd} className="space-y-4 p-4 bg-[#191D28] rounded-xl border border-[#1E222A]">
          <input 
            type="text" 
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 bg-[#0F1117] text-white rounded-lg border border-[#1E222A] focus:ring-2 focus:ring-[#F27D26] outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="text" 
              placeholder="Short Name"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              className="p-3 bg-[#0F1117] text-white rounded-lg border border-[#1E222A] focus:ring-2 focus:ring-[#F27D26] outline-none"
            />
            <input 
              type="text" 
              placeholder="Position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="p-3 bg-[#0F1117] text-white rounded-lg border border-[#1E222A] focus:ring-2 focus:ring-[#F27D26] outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isAuthorized}
                onChange={(e) => setIsAuthorized(e.target.checked)}
                className="accent-[#F27D26]"
              />
              <span>Requires Authorization</span>
            </label>
          </div>
          {isAuthorized && (
            <input 
              type="password" 
              placeholder="Set Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#0F1117] text-white rounded-lg border border-[#1E222A] focus:ring-2 focus:ring-[#F27D26] outline-none"
            />
          )}
          <button type="submit" className="w-full p-3 bg-[#F27D26] text-white rounded-xl font-bold hover:bg-[#d96a1f] flex items-center justify-center gap-2">
            <UserPlus size={20} /> Add Personnel
          </button>
        </form>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {personnel.map(p => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-[#191D28] rounded-xl border border-[#1E222A]">
              <div className="text-white text-sm flex-1">
                <div className="font-bold">{p.shortName} <span className="font-normal text-[#8E9299]">/ {p.fullName}</span></div>
                <div className="text-[#8E9299] text-xs">{p.position} {p.isAuthorized && '• 🔑 Required'}</div>
              </div>
              <button onClick={() => onRemove(p.id)} className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
