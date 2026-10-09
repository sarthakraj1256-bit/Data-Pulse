import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Clock,
  ArrowRight,
  Database,
  Wand2,
  FileText,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDataset } from '../../context/DatasetContext';
import { AuditService } from '../../services/auditService';
import { AuditLogEntry, AuditCategoryType } from '../../types';

interface AuditTrailProps {
  datasetIdFilter?: string;
  limit?: number;
  className?: string;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  datasetIdFilter,
  limit,
  className = '',
}) => {
  const { user } = useAuth();
  const { notifyExportComplete } = useDataset();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditCategoryType | 'all'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLogs(AuditService.getLogs(user.id));

    const unsubscribe = AuditService.subscribe((entry) => {
      if (entry.userId === user.id) {
        setLogs((prev) => [entry, ...prev].slice(0, 200));
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const categories: { label: string; value: AuditCategoryType | 'all' }[] = [
    { label: 'All Activities', value: 'all' },
    { label: 'Ingestion', value: 'ingestion' },
    { label: 'Transformations', value: 'transformation' },
    { label: 'Quality', value: 'quality' },
    { label: 'Exports', value: 'export' },
    { label: 'Predictions', value: 'prediction' },
    { label: 'Security', value: 'security' },
  ];

  const filteredLogs = logs.filter((log) => {
    if (datasetIdFilter && log.datasetId !== datasetIdFilter) return false;
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.description.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.datasetName && log.datasetName.toLowerCase().includes(term)) ||
      (log.traceId && log.traceId.toLowerCase().includes(term))
    );
  });

  const displayedLogs = limit ? filteredLogs.slice(0, limit) : filteredLogs;

  const getActionIcon = (category: AuditCategoryType) => {
    switch (category) {
      case 'ingestion':
        return <Database className="w-3.5 h-3.5 text-[#641B32]" />;
      case 'transformation':
        return <Wand2 className="w-3.5 h-3.5 text-[#B94B68]" />;
      case 'quality':
        return <ShieldCheck className="w-3.5 h-3.5 text-[#277A58]" />;
      case 'export':
        return <FileText className="w-3.5 h-3.5 text-[#3D1023]" />;
      case 'prediction':
        return <Sparkles className="w-3.5 h-3.5 text-[#B77722]" />;
      case 'security':
        return <Lock className="w-3.5 h-3.5 text-[#641B32]" />;
      default:
        return <History className="w-3.5 h-3.5 text-[#756772]" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-[#277A58]/10 text-[#277A58] border-[#277A58]/20';
      case 'warning':
        return 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/20';
      case 'alert':
        return 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/20';
      default:
        return 'bg-[#641B32]/10 text-[#641B32] border-[#641B32]/20';
    }
  };

  return (
    <div className={`bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9A0AE]/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/30 text-[#641B32]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <span>Real-Time User Activity Audit Trail</span>
              <span className="w-2 h-2 rounded-full bg-[#277A58] animate-pulse" title="Live Logging Active" />
            </h3>
            <p className="text-xs text-[#756772]">
              Cryptographically timestamped ledger of ingestions, operations, exports, and model evaluations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const filename = `DataPulse_Audit_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
              notifyExportComplete({
                format: 'CSV',
                filename,
                downloadFn: () => AuditService.exportLogsToCSV(user.id),
                title: 'Audit Ledger Export Ready',
                text: `Platform audit logs CSV compiled (${logs.length} entries).`,
              });
            }}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#F8EFE5] disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-1.5 bg-[#FFF8EF] p-1 rounded-xl border border-[#B4233D]/30">
              <button
                onClick={() => {
                  AuditService.clearLogs(user.id);
                  setLogs([]);
                  setConfirmClear(false);
                }}
                className="px-2 py-0.5 rounded-lg bg-[#B4233D] text-[#FFF8EF] text-[10px] font-bold"
              >
                Confirm Clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[10px] text-[#756772] hover:text-[#29212A] px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={logs.length === 0}
              className="p-1.5 rounded-xl text-[#756772] hover:text-[#B4233D] hover:bg-[#B4233D]/10 transition-colors disabled:opacity-30"
              title="Clear Activity Trail"
              aria-label="Clear Activity Trail"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
          <input
            type="text"
            placeholder="Search activity by keyword, action, or trace ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-[#641B32] text-[#FFF8EF]'
                  : 'bg-[#FFF8EF] border border-[#D9A0AE]/30 text-[#756772] hover:text-[#29212A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      {displayedLogs.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#756772] bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/20">
          No audit entries found matching the criteria.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {displayedLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-xl text-xs hover:border-[#641B32]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F8EFE5] border border-[#D9A0AE]/20 shrink-0 mt-0.5">
                  {getActionIcon(log.category)}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#29212A]">{log.description}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full border ${getSeverityBadge(
                        log.severity
                      )}`}
                    >
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    {log.traceId && (
                      <span className="text-[10px] font-mono font-bold text-[#641B32] bg-[#641B32]/10 px-1.5 rounded">
                        {log.traceId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[#756772] font-mono">
                    <span>{log.userEmail}</span>
                    {log.datasetName && (
                      <>
                        <span>•</span>
                        <span className="text-[#641B32]">Asset: {log.datasetName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-[#756772] shrink-0 self-end sm:self-center">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} •{' '}
                {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
