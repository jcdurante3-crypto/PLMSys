import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, Layers, Sliders, Activity, Search, FileText, Shield, QrCode, UserCheck, Database, CheckCircle2 } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: 'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin') => void;
}

interface TutorialStep {
  title: string;
  tab: 'dashboard' | 'manage-set' | 'production' | 'search' | 'audit' | 'admin';
  icon: React.ReactNode;
  description: string;
  tip: string;
}

const steps: TutorialStep[] = [
  {
    title: 'Sets Dashboard',
    tab: 'dashboard',
    icon: <Layers className="w-6 h-6 text-[#F27D26]" />,
    description: 'The Sets Dashboard is your central command center. Here you can view active production sets, overall completion percentages, total operating positions, and quick status summaries.',
    tip: 'Click on any set card to open its detailed monitoring view.'
  },
  {
    title: 'Create New Set',
    tab: 'dashboard',
    icon: <Layers className="w-6 h-6 text-[#F27D26]" />,
    description: 'Use the "New Production Set" button on the dashboard to initialize a new set. Specify the set name, target cycles, and notes to track a new manufacturing batch.',
    tip: 'Sets help organize your production lines and mold plate groupings.'
  },
  {
    title: 'Set Monitoring & Details',
    tab: 'manage-set',
    icon: <Sliders className="w-6 h-6 text-[#F27D26]" />,
    description: 'In Set Monitoring, you get an in-depth view of individual sets. Monitor progress bars, total cycles accumulated, operator notes, and plate status breakdowns.',
    tip: 'Switch between sets easily using the set selector dropdown.'
  },
  {
    title: 'Plate Positions Grid',
    tab: 'manage-set',
    icon: <Sliders className="w-6 h-6 text-[#F27D26]" />,
    description: 'Each set contains multiple plate positions (e.g. Pos 1, Pos 2). Each position tracks installed mold plate serial numbers, cycle counts, and service status.',
    tip: 'Color-coded indicators show active, warning, or replacement-due statuses.'
  },
  {
    title: 'Install, Replace & Remove Plates',
    tab: 'manage-set',
    icon: <Sliders className="w-6 h-6 text-[#F27D26]" />,
    description: 'Manage mold plates directly on positions. You can install new plates, record replacements when wear limits are reached, or remove plates with full audit tracking.',
    tip: 'Serial numbers and operator IDs are recorded for traceability.'
  },
  {
    title: 'Log Production Cycles',
    tab: 'manage-set',
    icon: <Activity className="w-6 h-6 text-[#F27D26]" />,
    description: 'Record daily production outputs by clicking "Log Production". Enter cycle counts, Job Order numbers (format 0000-00), operator name, and supervisor sign-off.',
    tip: 'Supervisor sign-off requires entering a valid supervisor or admin password.'
  },
  {
    title: 'Daily Production View',
    tab: 'production',
    icon: <Activity className="w-6 h-6 text-[#F27D26]" />,
    description: 'The Daily Production tab aggregates all production logs chronologically across all sets. Review daily totals, job orders, and shift performance at a glance.',
    tip: 'Use date filters to inspect specific operating shifts.'
  },
  {
    title: 'Plate & Record Search',
    tab: 'search',
    icon: <Search className="w-6 h-6 text-[#F27D26]" />,
    description: 'Search across all sets, plates, Job Order numbers, and operators using the advanced search tool. Find historical data in seconds.',
    tip: 'Supports partial matching on serial numbers and Job Orders.'
  },
  {
    title: 'Audit Log & History',
    tab: 'audit',
    icon: <FileText className="w-6 h-6 text-[#F27D26]" />,
    description: 'The Audit Log maintains an immutable record of all system actions, plate installations, cycle updates, and authorization events with timestamps and user IDs.',
    tip: 'Essential for quality assurance and compliance tracking.'
  },
  {
    title: 'Backup & Restore Data',
    tab: 'admin',
    icon: <Database className="w-6 h-6 text-[#F27D26]" />,
    description: 'Administrators can export encrypted JSON backups of the entire database or restore from a previous backup file to ensure data safety.',
    tip: 'Regularly back up your production data.'
  },
  {
    title: 'Admin Functions & Personnel',
    tab: 'admin',
    icon: <Shield className="w-6 h-6 text-[#F27D26]" />,
    description: 'Manage authorized personnel, configure supervisor sign-off passwords, oversee system access roles, and perform factory resets when required.',
    tip: 'Requires Admin authentication credentials.'
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, setActiveTab }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setActiveTab(steps[nextIdx].tab);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setActiveTab(steps[prevIdx].tab);
    }
  };

  const handleSelectStep = (idx: number) => {
    setCurrentStepIndex(idx);
    setActiveTab(steps[idx].tab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#12151C] border border-[#1E222A] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-[#E0E2E5]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E222A] bg-[#0F1117]">
          <div className="flex items-center gap-3">
            <div className="bg-[#191D28] p-2 rounded-xl border border-[#1E222A]">
              <HelpCircle className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">PLM System Walkthrough</h2>
              <p className="text-xs text-[#8E9299]">Interactive Operator Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E9299] hover:text-white p-2 rounded-lg hover:bg-[#191D28] transition-colors"
            title="Close Tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8E9299]">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span className="text-[#F27D26] uppercase tracking-wider font-mono">{currentStep.tab}</span>
            </div>
            <div className="w-full bg-[#191D28] h-2 rounded-full overflow-hidden border border-[#1E222A]">
              <div
                className="bg-[#F27D26] h-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Card */}
          <div className="bg-[#191D28] border border-[#1E222A] rounded-xl p-6 space-y-4 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#12151C] border border-[#1E222A] rounded-xl shadow">
                {currentStep.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{currentStep.title}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 uppercase">
                  Active Screen: {currentStep.tab}
                </span>
              </div>
            </div>

            <p className="text-sm text-[#E0E2E5] leading-relaxed">
              {currentStep.description}
            </p>

            <div className="bg-[#12151C] border border-[#1E222A] rounded-lg p-3.5 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#F27D26] mt-0.5 shrink-0" />
              <div className="text-xs text-[#8E9299]">
                <strong className="text-white">Operator Tip:</strong> {currentStep.tip}
              </div>
            </div>
          </div>

          {/* Step Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectStep(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all shrink-0 ${
                  currentStepIndex === idx
                    ? 'bg-[#F27D26] text-white shadow-md scale-105'
                    : 'bg-[#191D28] text-[#8E9299] hover:text-white hover:bg-[#1E222A] border border-[#1E222A]'
                }`}
                title={`Go to step ${idx + 1}: ${step.title}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E222A] bg-[#0F1117]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#8E9299] hover:text-white transition-colors"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                currentStepIndex === 0
                  ? 'opacity-40 cursor-not-allowed bg-[#191D28] text-[#8E9299] border-[#1E222A]'
                  : 'bg-[#191D28] text-white border-[#1E222A] hover:bg-[#1E222A]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-5 py-2 rounded-lg text-xs font-bold bg-[#F27D26] text-white hover:bg-[#d96a1f] shadow transition-all"
            >
              {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
