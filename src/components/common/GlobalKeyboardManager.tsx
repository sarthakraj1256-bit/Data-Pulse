import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Keyboard,
  X,
  Compass,
  ArrowRight,
  Sparkles,
  Command
} from 'lucide-react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { useDataset } from '../../context/DatasetContext';

interface GlobalKeyboardManagerProps {
  navigate: (path: string) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

export const GlobalKeyboardManager: React.FC<GlobalKeyboardManagerProps> = ({
  navigate,
  isModalOpen,
  setIsModalOpen,
}) => {
  const { loadSyntheticBenchmark, showToast } = useDataset();
  const [pendingSequence, setPendingSequence] = useState<string | null>(null);
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSequence = useCallback(() => {
    setPendingSequence(null);
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }, []);

  const startSequence = useCallback((key: string) => {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
    }
    setPendingSequence(key);
    sequenceTimerRef.current = setTimeout(() => {
      setPendingSequence(null);
      sequenceTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing into an input field or contenteditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) {
        return;
      }

      // Cmd+K or Ctrl+K for shortcuts palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsModalOpen(!isModalOpen);
        clearSequence();
        return;
      }

      // Escape key cancels active sequence or closes modal
      if (e.key === 'Escape') {
        if (pendingSequence) {
          e.preventDefault();
          clearSequence();
          return;
        }
        if (isModalOpen) {
          e.preventDefault();
          setIsModalOpen(false);
          return;
        }
      }

      // ? or Shift + / triggers cheat sheet modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsModalOpen(true);
        clearSequence();
        return;
      }

      // Handle two-key 'G' sequences (e.g., G then D, G then U)
      if (pendingSequence === 'G') {
        e.preventDefault();
        const targetKey = e.key.toUpperCase();
        clearSequence();

        switch (targetKey) {
          case 'D':
            navigate('/app');
            showToast('Navigated to Dashboard [G D]', 'info');
            break;
          case 'U':
            navigate('/app/upload');
            showToast('Navigated to Upload Data [G U]', 'info');
            break;
          case 'L':
            navigate('/app/datasets');
            showToast('Navigated to Dataset Library [G L]', 'info');
            break;
          case 'Q':
            navigate('/app/quality');
            showToast('Navigated to Data Quality [G Q]', 'info');
            break;
          case 'C':
            navigate('/app/cleaning');
            showToast('Navigated to Cleaning Studio [G C]', 'info');
            break;
          case 'T':
            navigate('/app/lineage');
            showToast('Navigated to Data Lineage [G T]', 'info');
            break;
          case 'A':
            navigate('/app/analytics');
            showToast('Navigated to Analytics [G A]', 'info');
            break;
          case 'P':
            navigate('/app/predictions');
            showToast('Navigated to Predictions [G P]', 'info');
            break;
          case 'R':
            navigate('/app/reports');
            showToast('Navigated to Reports & Exports [G R]', 'info');
            break;
          case 'I':
            navigate('/app/iot');
            showToast('Navigated to IoT Telemetry [G I]', 'info');
            break;
          case 'S':
            navigate('/app/settings');
            showToast('Navigated to Settings [G S]', 'info');
            break;
          default:
            // Unrecognized second key
            break;
        }
        return;
      }

      // Initial 'G' key press to initiate Go To sequence
      if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        startSequence('G');
        return;
      }

      // 'B' key for quick benchmark loading
      if ((e.key === 'b' || e.key === 'B') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!isModalOpen) {
          e.preventDefault();
          loadSyntheticBenchmark()
            .then(ds => {
              showToast(`Loaded benchmark dataset "${ds.name}" [B]`, 'success');
              navigate('/app/datasets');
            })
            .catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isModalOpen,
    pendingSequence,
    navigate,
    clearSequence,
    startSequence,
    setIsModalOpen,
    loadSyntheticBenchmark,
    showToast,
  ]);

  return (
    <>
      {/* Floating HUD Indicator for 'G' Sequence */}
      {pendingSequence === 'G' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="bg-[#3D1023] text-[#FFF8EF] border border-[#D9A0AE]/50 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <kbd className="px-2 py-0.5 rounded-md bg-[#641B32] border border-[#D9A0AE]/40 font-bold text-[#FFF8EF]">
                G
              </kbd>
              <span className="text-[#D9A0AE] animate-pulse">then...</span>
            </div>

            <div className="h-4 w-px bg-[#D9A0AE]/30" />

            <div className="flex items-center gap-2 text-xs font-medium text-[#FFF8EF]/90">
              <span className="text-[#D9A0AE]">[D]</span>ashboard
              <span className="text-[#D9A0AE]">[U]</span>pload
              <span className="text-[#D9A0AE]">[L]</span>ibrary
              <span className="text-[#D9A0AE]">[Q]</span>uality
              <span className="text-[#D9A0AE]">[C]</span>leaning
              <span className="text-[#D9A0AE]">[T]</span>race
              <span className="text-[#D9A0AE]">[A]</span>nalytics
              <span className="text-[#D9A0AE]">[R]</span>eports
              <span className="text-[#D9A0AE]">[S]</span>ettings
            </div>

            <button
              onClick={clearSequence}
              className="ml-2 text-[10px] text-[#D9A0AE] hover:text-[#FFF8EF] font-mono px-1.5 py-0.5 rounded bg-black/20"
              title="Cancel sequence"
            >
              Esc
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference Dialog */}
      <KeyboardShortcutsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        navigate={navigate}
        onLoadBenchmark={() => {
          loadSyntheticBenchmark()
            .then(ds => {
              showToast(`Loaded benchmark "${ds.name}"`, 'success');
              navigate('/app/datasets');
            })
            .catch(() => {});
        }}
      />
    </>
  );
};
