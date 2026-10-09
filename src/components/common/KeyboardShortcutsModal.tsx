import React, { useState } from 'react';
import {
  X,
  Keyboard,
  Search,
  LayoutDashboard,
  UploadCloud,
  Database,
  ShieldCheck,
  Wand2,
  GitBranch,
  BarChart3,
  Sparkles,
  FileText,
  Radio,
  Settings,
  HelpCircle,
  Command,
  CornerDownLeft,
  ArrowRight
} from 'lucide-react';

interface ShortcutItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'General';
  keys: string[];
  description: string;
  action?: () => void;
  icon?: React.FC<{ className?: string }>;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
  onLoadBenchmark?: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  navigate,
  onLoadBenchmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    // Navigation
    {
      id: 'nav-overview',
      category: 'Navigation',
      keys: ['G', 'D'],
      description: 'Go to Dashboard / Overview',
      icon: LayoutDashboard,
      action: () => {
        navigate('/app');
        onClose();
      },
    },
    {
      id: 'nav-upload',
      category: 'Navigation',
      keys: ['G', 'U'],
      description: 'Go to Upload Data (CSV/XLSX/JSON)',
      icon: UploadCloud,
      action: () => {
        navigate('/app/upload');
        onClose();
      },
    },
    {
      id: 'nav-datasets',
      category: 'Navigation',
      keys: ['G', 'L'],
      description: 'Go to Dataset Library',
      icon: Database,
      action: () => {
        navigate('/app/datasets');
        onClose();
      },
    },
    {
      id: 'nav-quality',
      category: 'Navigation',
      keys: ['G', 'Q'],
      description: 'Go to Data Quality Profiler',
      icon: ShieldCheck,
      action: () => {
        navigate('/app/quality');
        onClose();
      },
    },
    {
      id: 'nav-cleaning',
      category: 'Navigation',
      keys: ['G', 'C'],
      description: 'Go to Cleaning Studio & Transformations',
      icon: Wand2,
      action: () => {
        navigate('/app/cleaning');
        onClose();
      },
    },
    {
      id: 'nav-lineage',
      category: 'Navigation',
      keys: ['G', 'T'],
      description: 'Go to Lineage & Traceability Graph',
      icon: GitBranch,
      action: () => {
        navigate('/app/lineage');
        onClose();
      },
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      keys: ['G', 'A'],
      description: 'Go to Analytics & Distribution Visualizer',
      icon: BarChart3,
      action: () => {
        navigate('/app/analytics');
        onClose();
      },
    },
    {
      id: 'nav-predictions',
      category: 'Navigation',
      keys: ['G', 'P'],
      description: 'Go to Predictive Intelligence & Forecasts',
      icon: Sparkles,
      action: () => {
        navigate('/app/predictions');
        onClose();
      },
    },
    {
      id: 'nav-reports',
      category: 'Navigation',
      keys: ['G', 'R'],
      description: 'Go to Audit Reports & Export Center',
      icon: FileText,
      action: () => {
        navigate('/app/reports');
        onClose();
      },
    },
    {
      id: 'nav-iot',
      category: 'Navigation',
      keys: ['G', 'I'],
      description: 'Go to IoT & ESP32 Telemetry Status',
      icon: Radio,
      action: () => {
        navigate('/app/iot');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      keys: ['G', 'S'],
      description: 'Go to Quality Config & Account Settings',
      icon: Settings,
      action: () => {
        navigate('/app/settings');
        onClose();
      },
    },

    // Actions
    {
      id: 'action-benchmark',
      category: 'Actions',
      keys: ['B'],
      description: 'Quick Load Synthetic Benchmark Dataset',
      icon: Sparkles,
      action: () => {
        if (onLoadBenchmark) onLoadBenchmark();
        onClose();
      },
    },

    // General
    {
      id: 'gen-help',
      category: 'General',
      keys: ['?'],
      description: 'Open this Keyboard Shortcuts cheat sheet',
      icon: HelpCircle,
    },
    {
      id: 'gen-command',
      category: 'General',
      keys: ['⌘', 'K'],
      description: 'Command search / Shortcuts palette',
      icon: Command,
    },
    {
      id: 'gen-esc',
      category: 'General',
      keys: ['Esc'],
      description: 'Dismiss modal or cancel active sequence',
      icon: CornerDownLeft,
    },
  ];

  const filteredShortcuts = shortcuts.filter(s =>
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Navigation', 'Actions', 'General'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#29212A]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#FFF8EF] rounded-3xl shadow-2xl border border-[#D9A0AE]/50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9A0AE]/30 flex items-center justify-between bg-[#F8EFE5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#641B32] text-[#FFF8EF] flex items-center justify-center shadow-sm">
              <Keyboard className="w-5 h-5 text-[#FFF8EF]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#3D1023]">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[#756772]">
                Power-user workflow navigation & action bindings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#756772] hover:bg-[#D9A0AE]/20 hover:text-[#29212A] transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-[#D9A0AE]/20 bg-[#FFF8EF]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#756772] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter shortcuts (e.g., 'upload', 'G U', 'cleaning')..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] placeholder-[#756772] focus:outline-none focus:border-[#641B32]"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {categories.map(category => {
            const items = filteredShortcuts.filter(s => s.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-[#641B32]">
                    {category}
                  </h3>
                  <div className="flex-1 h-px bg-[#D9A0AE]/30" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(item => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={item.action}
                        className={`p-2.5 rounded-2xl bg-[#F8EFE5]/70 border border-[#D9A0AE]/25 flex items-center justify-between gap-3 transition-colors ${
                          item.action
                            ? 'hover:bg-[#F8EFE5] hover:border-[#641B32]/40 cursor-pointer group'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {Icon && (
                            <Icon className="w-4 h-4 text-[#641B32] shrink-0" />
                          )}
                          <span className="text-xs text-[#29212A] font-medium truncate">
                            {item.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, idx) => (
                            <React.Fragment key={idx}>
                              <kbd className="px-2 py-1 bg-[#FFF8EF] border border-[#D9A0AE]/70 rounded-lg text-[11px] font-mono font-bold text-[#641B32] shadow-xs">
                                {k}
                              </kbd>
                              {idx < item.keys.length - 1 && (
                                <span className="text-[10px] text-[#756772] font-mono">then</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 text-[#756772]">
              <p className="text-xs">No shortcuts matching &ldquo;{searchQuery}&rdquo;.</p>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-[#F8EFE5] border-t border-[#D9A0AE]/30 flex items-center justify-between text-[11px] text-[#756772]">
          <span>
            Tip: Press <kbd className="px-1.5 py-0.5 bg-[#FFF8EF] border border-[#D9A0AE]/50 rounded font-mono text-[10px] text-[#641B32]">G</kbd> followed by a destination key to jump anywhere instantly.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#641B32] text-[#FFF8EF] text-xs font-semibold hover:bg-[#4E1426] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
