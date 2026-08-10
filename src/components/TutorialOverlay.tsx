import React, { useState } from 'react';
import { Layers, Activity, Search, FileText, Sliders, Shield, ChevronRight, ChevronLeft, X, CheckCircle2, HelpCircle, Monitor } from 'lucide-react';

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: string;
  highlights: string[];
}

const steps: TutorialStep[] = [
  {
    title: 'Welcome to PLM System',
    subtitle: 'Plate Lifecycle Management System for Industrial Operations',
    icon: <Layers className="w-8 h-8 text-[#F27D26]" />,
    content: 'PLM System is designed for robust tracking and lifecycle management of industrial plates across multiple sets and positions. Whether running in your browser or packaged as a desktop app via Electron, your data remains secure and fully persistent locally or exported.',
    highlights: [
      'End-to-end plate installation, replacement, and removal tracking',
      'Real-time status indicators (Active, Worn, Damaged, Inspected)',
      'Secure offline-first architecture with local SQLite/Dexie storage'
    ]
  },
  {
    title: 'Sets Dashboard & Monitoring',
    subtitle: 'Manage Equipment Sets and Position Layouts',
    icon: <Sliders className="w-8 h-8 text-[#F27D26]" />,
    content: 'The Sets Dashboard and Set Monitoring views give you a comprehensive breakdown of all active sets and individual plate positions.',
    highlights: [
      'Create new sets with customizable position counts',
      'Click any position to install a new plate, record replacements, or view full history',
      'Monitor health metrics, operating hours, and wear thresholds'
    ]
  },
  {
    title: 'Daily Production & Plate Registry',
    subtitle: 'Track Daily Output and Complete Plate Inventory',
    icon: <Activity className="w-8 h-8 text-[#F27D26]" />,
    content: 'Keep accurate logs of daily production output, shift details, and operator notes, while maintaining a master registry of all manufactured and installed plates.',
    highlights: [
      'Log daily production quantities, reject types, and shift personnel',
      'Search and filter master plate registry by serial number, grade, or status',
      'Automatic backup and threshold-based export capabilities'
    ]
  },
  {
    title: 'Plate Search & Audit Logs',
    subtitle: 'Instant Traceability and Accountability',
    icon: <FileText className="w-8 h-8 text-[#F27D26]" />,
    content: 'Easily trace any plate across its entire lifecycle from manufacture to retirement. Every action is meticulously recorded in the audit log.',
    highlights: [
      'Global search across all serial numbers, sets, and positions',
      'Detailed audit logs tracking who performed each action and when',
      'Role-based permissions for Operators and Administrators'
    ]
  },
  {
    title: 'Desktop App & Offline Support',
    subtitle: 'Built for Reliable Field and Plant Operation',
    icon: <Monitor className="w-8 h-8 text-[#F27D26]" />,
    content: 'Running on Electron with secure context isolation, PLM System works seamlessly offline in plant environments without internet dependency.',
    highlights: [
      'Native desktop window controls and optimized performance',
      'Automatic local database persistence using IndexedDB / Dexie',
      'Built-in automated backups to prevent any data loss'
    ]
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#12151C] border border-[#262B35] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-[#E0E2E5] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#212630] bg-[#0A0D14]">
          <div className="flex items-center space-x-3">
            <span className="bg-[#F27D26]/20 text-[#F27D26] px-2.5 py-1 rounded-full text-xs font-semibold">
              Tutorial {currentStep + 1} of {steps.length}
            </span>
            <h3 className="text-sm font-medium text-[#8E9299]">PLM System Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E9299] hover:text-white p-1 rounded-lg hover:bg-[#1E222A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#191D28] border border-[#2E3544] flex items-center justify-center mb-6 shadow-inner">
            {step.icon}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
          <p className="text-sm font-medium text-[#F27D26] mb-4">{step.subtitle}</p>
          <p className="text-sm text-[#A0A4AE] leading-relaxed max-w-lg mb-8">
            {step.content}
          </p>

          <div className="w-full bg-[#191D28]/60 border border-[#262B35] rounded-xl p-5 text-left mb-6">
            <h4 className="text-xs font-semibold text-[#8E9299] uppercase tracking-wider mb-3">Key Features</h4>
            <ul className="space-y-2.5">
              {step.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start text-sm text-[#D0D4DC]">
                  <CheckCircle2 className="w-4 h-4 text-[#F27D26] mr-2.5 mt-0.5 shrink-0" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-4 border-t border-[#212630] bg-[#0A0D14] flex items-center justify-between">
          <div className="flex space-x-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-8 bg-[#F27D26]' : 'w-2 bg-[#2E3544] hover:bg-[#404756]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-xs font-semibold text-[#8E9299] hover:text-white bg-[#191D28] hover:bg-[#212630] rounded-lg transition-colors border border-[#2E3544] flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F27D26] hover:bg-[#E06D1B] rounded-lg transition-colors shadow-md flex items-center gap-1"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
