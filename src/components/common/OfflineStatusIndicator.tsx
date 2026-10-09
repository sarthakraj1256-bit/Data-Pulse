import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Trash2,
  ChevronDown,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { useDataset } from '../../context/DatasetContext';

export const OfflineStatusIndicator: React.FC = () => {
  const {
    isOnline,
    isSimulatedOffline,
    pendingCount,
    queue,
    lastSyncTime,
    isSyncing,
    toggleSimulatedOffline,
    syncPending,
    clearQueue,
  } = useNetwork();
  const { showToast } = useDataset();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    if (!isOnline) {
      showToast('Cannot sync while offline. Please restore connectivity first.', 'warning');
      return;
    }
    const result = await syncPending();
    if (result.syncedCount > 0) {
      showToast(`Successfully synchronized ${result.syncedCount} queued local operations.`, 'success');
    } else {
      showToast('All local operations are already synchronized.', 'info');
    }
  };

  const handleToggleSimulate = () => {
    toggleSimulatedOffline();
    if (!isSimulatedOffline) {
      showToast(
        'Simulated Offline Mode enabled. Local operations will now queue locally.',
        'warning'
      );
    } else {
      showToast('Simulated Offline Mode disabled. Restored online state.', 'success');
    }
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Not yet synced';

  return (
    <div className="relative" ref={popoverRef}>
      {/* Top Bar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 focus:outline-none ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 hover:bg-emerald-500/15'
            : 'bg-amber-500/15 text-amber-900 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
        }`}
        title={isOnline ? 'Online — Connected to DataPulse' : 'Offline — Local operations queued'}
        aria-label={isOnline ? 'Online network status' : 'Offline network status alert'}
      >
        {isOnline ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-600 hidden sm:inline" />
            <span className="hidden sm:inline font-semibold">Online</span>
            {pendingCount > 0 && (
              <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-amber-700" />
            <span className="font-bold text-[#641B32]">Offline</span>
            {pendingCount > 0 && (
              <span className="bg-[#641B32] text-[#FFF8EF] px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {pendingCount} queued
              </span>
            )}
          </>
        )}
        <ChevronDown className="w-3 h-3 text-[#756772] opacity-70" />
      </button>

      {/* Popover / Alert Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFF8EF] border border-[#D9A0AE]/50 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#29212A]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#D9A0AE]/20">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl ${
                  isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-[#3D1023]">
                  {isOnline ? 'Network Connected' : 'Offline Mode Active'}
                </h4>
                <p className="text-[11px] text-[#756772]">
                  {isOnline
                    ? 'Connected to DataPulse local & server engine'
                    : 'Disconnected — local operations safely queued'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#756772] hover:bg-[#F8EFE5] text-xs"
            >
              ✕
            </button>
          </div>

          {/* Offline Alert Banner */}
          {!isOnline && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs space-y-1.5 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Connectivity Alert</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                You are currently disconnected. All local dataset transformations, schema checks,
                audit trails, and tags are preserved in your browser and queued for synchronization
                once connectivity is restored.
              </p>
            </div>
          )}

          {/* Sync Stats Overview */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#756772] block">
                Queued Changes
              </span>
              <span className="font-bold text-sm text-[#641B32]">{pendingCount} pending</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#756772] block">
                Last Sync
              </span>
              <span className="font-medium text-xs text-[#29212A]">{formattedLastSync}</span>
            </div>
          </div>

          {/* Queued Items List */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#756772] mb-1.5">
              <span>Operations Queue ({queue.length})</span>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[10px] text-[#B4233D] hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {queue.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-[#F8EFE5]/50 border border-dashed border-[#D9A0AE]/30 text-[#756772] text-[11px]">
                  No pending operations in queue. All data is synchronized.
                </div>
              ) : (
                queue.map(item => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/20 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[11px] text-[#29212A] truncate">{item.title}</p>
                      <span className="text-[10px] text-[#756772] font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : item.status === 'syncing'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-[#D9A0AE]/20 flex flex-col gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                !isOnline
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-[#641B32] text-[#FFF8EF] hover:bg-[#4E1426] shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing Operations...' : 'Sync Pending Operations'}</span>
            </button>

            {/* Toggle Simulate Offline mode for rapid testing */}
            <button
              onClick={handleToggleSimulate}
              className="w-full py-1.5 px-3 rounded-xl border border-[#D9A0AE]/50 text-[#641B32] hover:bg-[#F8EFE5] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {isSimulatedOffline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restore Real Connection (End Simulation)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simulate Offline Mode (Test Queuing)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
