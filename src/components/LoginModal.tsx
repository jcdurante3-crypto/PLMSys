import React, { useState } from 'react';
import { X, User as UserIcon, Lock } from 'lucide-react';
import { User, Personnel } from '../types';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: User) => void;
  personnel: Personnel[];
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, personnel }) => {
  const [isAskingForAdminPassword, setIsAskingForAdminPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (role: 'ADMIN' | 'OPERATOR', passwordInput?: string) => {
    if (role === 'ADMIN') {
      const matchedAdmin = personnel.find(
        (p) =>
          (p.position === 'Admin' || p.fullName === 'Administrator') &&
          p.password === passwordInput
      );
      if (matchedAdmin) {
        onLogin({ name: matchedAdmin.fullName, role: 'ADMIN' });
        onClose();
      } else {
        setError('Invalid password');
        setTimeout(() => setError(''), 2000);
      }
    } else {
      onLogin({ name: 'Operator', role: 'OPERATOR' });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm p-4">
      <div className="bg-[#0F1117] rounded-2xl shadow-2xl border border-[#1E222A] w-full max-w-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{isAskingForAdminPassword ? 'Admin Login' : 'Login'}</h2>
          <button onClick={onClose} className="text-[#8E9299] hover:text-white"><X /></button>
        </div>
        <div className="space-y-4">
          {!isAskingForAdminPassword ? (
            <>
              <button onClick={() => handleLogin('OPERATOR')} className="w-full flex items-center justify-center gap-2 p-3 bg-[#191D28] text-white rounded-lg hover:bg-[#2D333E]">
                <UserIcon size={16} /> Login as Operator
              </button>
              <button onClick={() => setIsAskingForAdminPassword(true)} className="w-full flex items-center justify-center gap-2 p-3 bg-[#F27D26] text-white rounded-lg hover:bg-[#d96a1f] font-bold">
                <Lock size={16} /> Login as Admin
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <input 
                type="password" 
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[#191D28] text-white rounded-lg border border-[#1E222A]"
              />
              {error && <p className="text-rose-400 text-xs">{error}</p>}
              <button onClick={() => handleLogin('ADMIN', password)} className="w-full flex items-center justify-center gap-2 p-3 bg-[#F27D26] text-white rounded-lg hover:bg-[#d96a1f] font-bold">
                <Lock size={16} /> Login
              </button>
              <button onClick={() => setIsAskingForAdminPassword(false)} className="w-full text-[#8E9299] hover:text-white text-sm">
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
