import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { Personnel } from '../types';

interface AdminLoginModalProps {
  onClose: () => void;
  onLogin: () => void;
  personnel: Personnel[];
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onLogin, personnel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedAdmin = personnel.find(
      (p) =>
        (p.position === 'Admin' || p.fullName === 'Administrator') &&
        p.password === password
    );
    if (matchedAdmin) {
      onLogin();
    } else {
      setError('Invalid password');
      setTimeout(() => setError(''), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4">
      <form onSubmit={handleLogin} className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Lock size={20} /> Admin Login</h2>
          <button type="button" onClick={onClose} className="text-[#8E9299] hover:text-white"><X /></button>
        </div>
        <input 
          type="password" 
          placeholder="Enter Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-[#191D28] text-white rounded-lg border border-[#1E222A] focus:ring-2 focus:ring-[#F27D26] outline-none"
        />
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <button type="submit" className="w-full p-3 bg-[#F27D26] text-white rounded-lg font-bold hover:bg-[#d96a1f]">Login</button>
      </form>
    </div>
  );
};
