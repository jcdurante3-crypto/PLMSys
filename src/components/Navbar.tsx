import React from 'react';
import { Layers, Activity, Search, FileText, Sliders, User, Shield, HelpCircle, Share2, Sparkles } from 'lucide-react';
import { User as UserType, NetworkStorageConfig } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin') => void;
  totalPositions: number;
  activeSetsCount: number;
  currentUser: UserType;
  networkConfig?: NetworkStorageConfig;
  onOpenLogin: () => void;
  onOpenTutorial: () => void;
  onOpenNetworkSync: () => void;
  onOpenUpdateModal: () => void;
  onOpenChangelog: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalPositions,
  activeSetsCount,
  currentUser,
  networkConfig,
  onOpenLogin,
  onOpenTutorial,
  onOpenNetworkSync,
  onOpenUpdateModal,
  onOpenChangelog,
}) => {
  const isRedundantRole =
    (currentUser.name.toLowerCase() === 'operator' && currentUser.role === 'OPERATOR') ||
    (currentUser.name.toLowerCase().includes('admin') && currentUser.role === 'ADMIN') ||
    currentUser.name.toUpperCase() === currentUser.role.toUpperCase();

  const isNetworkMode = networkConfig?.mode === 'NETWORK';

  return (
    <header className="bg-[#0F1117] text-[#E0E2E5] shadow-lg border-b border-[#1E222A] sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#F27D26] p-2 rounded-lg text-white shadow-md flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight uppercase text-white leading-none">
                Plate Lifecycle Monitoring System
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#F27D26] font-semibold tracking-wider block">PLM SYSTEM</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#1E222A] text-emerald-400 font-mono rounded font-bold border border-emerald-500/20">v2.4.0</span>
              </div>
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
            {/* Network Storage Status Badge */}
            <button
              onClick={onOpenNetworkSync}
              title="Configure Network Storage & Multi-User Sync"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isNetworkMode
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-[#191D28] text-[#8E9299] hover:text-white border-[#1E222A]'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">
                {isNetworkMode ? 'LAN Sync Active' : 'Local Storage'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Auto-Update & Changelog Pill */}
            <button
              onClick={onOpenUpdateModal}
              title="Software Update System & Version Log"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F27D26]/10 text-[#F27D26] hover:bg-[#F27D26]/20 border border-[#F27D26]/30 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">v2.4.0 Live</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-[#8E9299] px-2">
              <span className="font-semibold text-white">{currentUser.name}</span>
              {!isRedundantRole && (
                <span className="bg-[#191D28] px-2 py-0.5 rounded text-[10px] uppercase font-semibold border border-[#1E222A]">{currentUser.role}</span>
              )}
            </div>
            
            <button
              onClick={onOpenTutorial}
              title="Help / Tutorial"
              className="p-2 text-[#8E9299] hover:text-white hover:bg-[#191D28] rounded-lg transition-colors border border-[#1E222A] flex items-center justify-center"
            >
              <HelpCircle className="w-4 h-4 text-[#F27D26]" />
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
