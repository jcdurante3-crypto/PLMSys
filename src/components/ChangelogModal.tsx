import React, { useState } from 'react';
import {
  X,
  FileText,
  Tag,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ChangelogModalProps {
  onClose: () => void;
  onCheckUpdate: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, onCheckUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FEATURE' | 'ENHANCEMENT' | 'SECURITY' | 'FIX'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const releases = [
    {
      version: '2.4.0',
      date: 'August 11, 2026',
      badge: 'LATEST RELEASE',
      highlight: 'Multi-User Local Network Storage Sync & Auto-Update Engine',
      items: [
        {
          category: 'FEATURE',
          title: 'Multi-User Local Network Storage & Sync',
          desc: 'Allows multiple computers (PC1, PC2) connected to a common local network storage (e.g. \\\\NAS\\PLM_Data) to open, edit, and sync changes in real time simultaneously with peer node discovery.'
        },
        {
          category: 'FEATURE',
          title: 'Automated Software Update System',
          desc: 'Integrated auto-update pipeline with smooth percentage countdown animations, MB download speed tracking, stage verification, and live change log summaries.'
        },
        {
          category: 'ENHANCEMENT',
          title: 'Contextual Plate Replacement Confirmation',
          desc: 'Side-by-side comparison modal displaying outgoing plate lifecycle metrics versus incoming plate specs prior to archiving.'
        },
        {
          category: 'SECURITY',
          title: 'Station ID Audit Trail Telemetry',
          desc: 'Every production batch log, plate swap, and supervisor authorization now attaches the specific station/terminal identifier to the audit log.'
        },
        {
          category: 'FIX',
          title: 'Electron Standalone Asset Path Resolver',
          desc: 'Resolved high-resolution app icon binding and portable path lookups across Windows Portable and Linux AppImage packages.'
        }
      ]
    },
    {
      version: '2.3.0',
      date: 'July 15, 2026',
      badge: 'STABLE',
      highlight: 'Factory Reset Safety Verification & Custom Password Sign-Off',
      items: [
        {
          category: 'SECURITY',
          title: 'Factory Reset Safety Snapshot Backup',
          desc: 'Automatic physical file snapshot created prior to factory reset with automatic instant rollback on schema mismatch.'
        },
        {
          category: 'ENHANCEMENT',
          title: 'Supervisor Password Authorization Prompt',
          desc: 'Streamlined password authentication dialog for production logging and plate retirement sign-offs.'
        },
        {
          category: 'FIX',
          title: 'Browser & Electron Dual Table Storage Normalization',
          desc: 'Normalized table collection aliases for plate installations and removals across Dexie and physical JSON files.'
        }
      ]
    },
    {
      version: '2.2.0',
      date: 'June 01, 2026',
      badge: 'STABLE',
      highlight: 'Job Order Association & CSV Database Export/Import',
      items: [
        {
          category: 'FEATURE',
          title: 'Job Order Association Engine',
          desc: 'Assign daily production batch cycles directly to active Job Orders with automatic completion tracking.'
        },
        {
          category: 'ENHANCEMENT',
          title: 'High-Resolution Plate Life Calculation',
          desc: 'Dynamic color-coded threshold progress bars (Green <75%, Yellow <90%, Red >100%) for maximum plate cycle endurance.'
        },
        {
          category: 'FEATURE',
          title: 'Native Save & Load Database Dialogs',
          desc: 'Export full database backups or import JSON archives directly via native OS dialog windows.'
        }
      ]
    },
    {
      version: '2.1.0',
      date: 'May 10, 2026',
      badge: 'LEGACY',
      highlight: 'Initial Multi-Set Position Grid & Registry Modal',
      items: [
        {
          category: 'FEATURE',
          title: 'Dynamic Multi-Set Position Visualizer',
          desc: 'Grid layout mapping sets (1..100) and position slots (1..11) with instant plate installation status badges.'
        },
        {
          category: 'FEATURE',
          title: 'Personnel & Authorized Sign-Off Registry',
          desc: 'Registry modal for managing operators, supervisors, and administrators with role-based access controls.'
        }
      ]
    }
  ];

  const filteredReleases = releases.map((rel) => {
    const items = rel.items.filter((item) => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
    return { ...rel, items };
  }).filter((rel) => rel.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#12151C] border border-[#1E222A] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#1E222A] bg-[#161B26] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F27D26]/10 rounded-xl text-[#F27D26] border border-[#F27D26]/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Software Release Notes & Version Changelog
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30">
                  v2.4.0
                </span>
              </h3>
              <p className="text-xs text-[#8E9299]">
                Complete release history, system changes, and feature logs across all Plate Lifecycle Monitoring System updates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#1E222A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-[#141822] border-b border-[#1E222A] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'FEATURE', 'ENHANCEMENT', 'SECURITY', 'FIX'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/20'
                    : 'bg-[#191D28] text-[#8E9299] hover:text-white hover:bg-[#1E222A] border border-[#1E222A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8E9299] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search release notes..."
              className="w-full bg-[#12151C] border border-[#1E222A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8E9299] focus:outline-none focus:border-[#F27D26]"
            />
          </div>
        </div>

        {/* Scrollable Changelog List */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {filteredReleases.map((rel) => (
            <div key={rel.version} className="space-y-4">
              {/* Release Header */}
              <div className="flex items-center justify-between border-b border-[#1E222A] pb-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Version {rel.version}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      rel.badge === 'LATEST RELEASE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : rel.badge === 'STABLE'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}
                  >
                    {rel.badge}
                  </span>
                  <span className="text-xs text-[#8E9299]">{rel.date}</span>
                </div>
              </div>

              <p className="text-xs text-[#F27D26] font-medium italic">{rel.highlight}</p>

              {/* List of Changes */}
              <div className="space-y-3">
                {rel.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#191D28] border border-[#1E222A] rounded-xl p-4 space-y-1.5 hover:border-[#2D333E] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.category === 'FEATURE'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : item.category === 'ENHANCEMENT'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : item.category === 'SECURITY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.category}
                      </span>
                      <h5 className="text-xs font-bold text-white">{item.title}</h5>
                    </div>
                    <p className="text-xs text-[#8E9299] leading-relaxed pl-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161B26] border-t border-[#1E222A] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onCheckUpdate}
            className="px-4 py-2 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Check For System Updates
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#191D28] hover:bg-[#2D333E] text-white text-xs font-semibold rounded-lg border border-[#1E222A] transition-colors"
          >
            Close Changelog
          </button>
        </div>
      </div>
    </div>
  );
};
