import React from 'react';
import { Layers, Activity, Search, FileText, Sliders, User, Shield, HelpCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin') => void;
  totalPositions: number;
  activeSetsCount: number;
  currentUser: UserType;
  onOpenLogin: () => void;
  onOpenTutorial: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalPositions,
  activeSetsCount,
  currentUser,
  onOpenLogin,
  onOpenTutorial,
}) => {
  return (
    <header className="bg-[#0F1117] text-[#E0E2E5] shadow-lg border-b border-[#1E222A] sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#F27D26] p-2 rounded-lg text-white shadow-md flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight uppercase text-white">PLM System</h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-[#191D28] text-[#F27D26] border border-[#F27D26]/40'
                  : 'text-[#8E9299] hover:bg-[#191D28] hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Sets Dashboard
            </button>
            <button
              onClick={() => setActiveTab('manage-set')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'manage-set'
                  ? 'bg-[#191D28] text-[#F27D26] border border-[#F27D26]/40'
                  : 'text-[#8E9299] hover:bg-[#191D28] hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Set Monitoring
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'production'
                  ? 'bg-[#191D28] text-[#F27D26] border border-[#F27D26]/40'
                  : 'text-[#8E9299] hover:bg-[#191D28] hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              Daily Production
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-[#191D28] text-[#F27D26] border border-[#F27D26]/40'
                  : 'text-[#8E9299] hover:bg-[#191D28] hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              Plate Search
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'bg-[#191D28] text-[#F27D26] border border-[#F27D26]/40'
                  : 'text-[#8E9299] hover:bg-[#191D28] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Audit Log
            </button>
            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-[#191D28] text-[#F27D26] border border-[#F27D26]/40'
                    : 'text-[#8E9299] hover:bg-[#191D28] hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center gap-2 text-xs text-[#8E9299] px-3">
              <span className="font-semibold text-white">{currentUser.name}</span>
              <span className="bg-[#191D28] px-2 py-0.5 rounded text-[10px] uppercase">{currentUser.role}</span>
            </div>
            
            <button
              onClick={onOpenTutorial}
              title="Help & Tutorial"
              className="p-2 text-[#8E9299] hover:text-white hover:bg-[#191D28] rounded-lg transition-colors border border-[#1E222A] flex items-center gap-1 text-xs px-3"
            >
              <HelpCircle className="w-4 h-4 text-[#F27D26]" />
              <span className="hidden sm:inline">Tutorial</span>
            </button>
            
            <button
              onClick={onOpenLogin}
              title="Login"
              className="p-2 text-[#8E9299] hover:text-white hover:bg-[#191D28] rounded-lg transition-colors border border-[#1E222A]"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Subbar */}
      <div className="md:hidden flex border-t border-[#1E222A] bg-[#0A0B0E] px-2 py-2 overflow-x-auto space-x-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
            activeTab === 'dashboard' ? 'bg-[#F27D26] text-white' : 'text-[#8E9299]'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('manage-set')}
          className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
            activeTab === 'manage-set' ? 'bg-[#F27D26] text-white' : 'text-[#8E9299]'
          }`}
        >
          Set Monitoring
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
            activeTab === 'production' ? 'bg-[#F27D26] text-white' : 'text-[#8E9299]'
          }`}
        >
          Production
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
            activeTab === 'search' ? 'bg-[#F27D26] text-white' : 'text-[#8E9299]'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
            activeTab === 'audit' ? 'bg-[#F27D26] text-white' : 'text-[#8E9299]'
          }`}
        >
          Audit Log
        </button>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'admin' ? 'bg-[#F27D26] text-white' : 'text-[#8E9299]'
            }`}
          >
            Admin
          </button>
        )}
      </div>
    </header>
  );
};
