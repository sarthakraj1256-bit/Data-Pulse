import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Download,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useDataset();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const defaultDuration = toastMessage.action ? 8000 : 4500;
      const duration = toastMessage.duration || defaultDuration;

      if (!isHovered) {
        const timer = setTimeout(() => {
          clearToast();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [toastMessage, clearToast, isHovered]);

  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#277A58] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#B77722] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#B4233D] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#641B32] shrink-0" />,
  };

  const borderColors = {
    success: 'border-[#277A58]/30 shadow-[#277A58]/10',
    warning: 'border-[#B77722]/30 shadow-[#B77722]/10',
    error: 'border-[#B4233D]/30 shadow-[#B4233D]/10',
    info: 'border-[#641B32]/30 shadow-[#641B32]/10',
  };

  const badgeStyles = {
    success: 'bg-[#277A58]/10 text-[#277A58] border-[#277A58]/20',
    warning: 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/20',
    error: 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/20',
    info: 'bg-[#641B32]/10 text-[#641B32] border-[#641B32]/20',
  };

  const renderActionIcon = (iconName?: string) => {
    switch (iconName) {
      case 'download':
        return <Download className="w-3.5 h-3.5" />;
      case 'arrow':
        return <ArrowRight className="w-3.5 h-3.5" />;
      default:
        return <Download className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`relative overflow-hidden bg-[#FFF8EF] border rounded-2xl p-4 shadow-xl flex flex-col gap-2.5 transition-all ${
          borderColors[toastMessage.type]
        }`}
      >
        {/* Top bar with indicator and close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{icons[toastMessage.type]}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {toastMessage.title ? (
                  <h4 className="font-serif font-bold text-sm text-[#3D1023] leading-none">
                    {toastMessage.title}
                  </h4>
                ) : (
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border font-bold ${
                      badgeStyles[toastMessage.type]
                    }`}
                  >
                    {toastMessage.type}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#29212A] font-medium leading-relaxed">
                {toastMessage.text}
              </p>
            </div>
          </div>

          <button
            onClick={clearToast}
            className="text-[#756772] hover:text-[#29212A] hover:bg-[#D9A0AE]/20 p-1.5 rounded-lg transition-colors shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button (e.g. direct Download button for completed exports) */}
        {toastMessage.action && (
          <div className="mt-1 pt-2.5 border-t border-[#D9A0AE]/25 flex items-center justify-between gap-3">
            <div className="text-[11px] text-[#756772] font-mono flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-[#277A58]" />
              <span>Asset compiled & verified</span>
            </div>

            <button
              onClick={() => {
                toastMessage.action?.onClick();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#641B32]/30"
            >
              {renderActionIcon(toastMessage.action.icon)}
              <span>{toastMessage.action.label}</span>
            </button>
          </div>
        )}

        {/* Ambient progress indicator bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D9A0AE]/20 overflow-hidden">
          <div
            className={`h-full ${
              toastMessage.type === 'success'
                ? 'bg-[#277A58]'
                : toastMessage.type === 'warning'
                ? 'bg-[#B77722]'
                : toastMessage.type === 'error'
                ? 'bg-[#B4233D]'
                : 'bg-[#641B32]'
            } transition-all duration-300 opacity-60`}
            style={{ width: isHovered ? '100%' : '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
