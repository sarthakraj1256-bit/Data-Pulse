import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  GitBranch,
  ShieldCheck,
  RotateCcw,
  Download,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Wand2,
  FileSpreadsheet,
  Lock,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Dataset, LineageRecord, AuditLogEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDataset } from '../../context/DatasetContext';
import { AuditService } from '../../services/auditService';
import { ExportService } from '../../services/exportService';
import { AuditTrail } from './AuditTrail';

interface VersionHistoryProps {
  dataset: Dataset;
  navigate: (path: string) => void;
  className?: string;
}

interface VersionNode {
  versionNumber: string;
  versionIndex: number;
  isLatest: boolean;
  isBaseline: boolean;
  title: string;
  description: string;
  timestamp: string;
  performedBy: string;
  scoreBefore?: number;
  scoreAfter: number;
  affectedRowsCount: number;
  lineageRecord?: LineageRecord;
  targetColumn?: string;
  operationType?: string;
  auditLog?: AuditLogEntry;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  dataset,
  navigate,
  className = '',
}) => {
  const { user } = useAuth();
  const { undoCleaningOperation, notifyExportComplete, showToast } = useDataset();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);
  const [showFullAuditTrail, setShowFullAuditTrail] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);

  // Load audit logs for the user to establish bidirectional link
  useEffect(() => {
    if (!user) return;
    const logs = AuditService.getLogs(user.id);
    setAuditLogs(logs);

    const unsubscribe = AuditService.subscribe((entry) => {
      if (entry.userId === user.id) {
        setAuditLogs((prev) => [entry, ...prev].slice(0, 200));
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Compute all version snapshots from raw baseline through all applied transformations
  const versions: VersionNode[] = useMemo(() => {
    const list: VersionNode[] = [];
    const lineage = dataset.lineage || [];
    const totalVersions = lineage.length + 1;

    // 1. Initial Baseline Version (v1.0)
    const initialScore =
      lineage.length > 0 && lineage[lineage.length - 1].scoreBefore !== undefined
        ? lineage[lineage.length - 1].scoreBefore!
        : dataset.qualityAssessment.overallScore;

    const baselineAudit = auditLogs.find(
      (l) =>
        l.datasetId === dataset.id &&
        (l.action === 'DATASET_UPLOADED' || l.action === 'BENCHMARK_LOADED')
    );

    const baselineNode: VersionNode = {
      versionNumber: 'v1.0',
      versionIndex: 0,
      isLatest: lineage.length === 0,
      isBaseline: true,
      title: 'Initial Asset Ingestion (Immutable Baseline)',
      description: `Original ${dataset.fileType.toUpperCase()} file "${dataset.fileName}" (${(dataset.fileSize / 1024).toFixed(1)} KB) ingested into secure platform storage.`,
      timestamp: dataset.createdAt,
      performedBy: dataset.isSynthetic ? 'System Synthetic Generator' : user?.name || user?.email || 'Authorized Analyst',
      scoreAfter: initialScore,
      affectedRowsCount: dataset.rawRecords.length,
      auditLog: baselineAudit,
    };

    // 2. Build intermediate versions (from oldest transformation to newest)
    const chronologicalLineage = [...lineage].reverse();

    chronologicalLineage.forEach((rec, idx) => {
      const vNum = `v1.${idx + 1}`;
      const isLatest = idx === chronologicalLineage.length - 1;

      // Link to audit log via traceId
      const matchedAudit = auditLogs.find(
        (l) => l.traceId === rec.traceId || (l.datasetId === dataset.id && l.metadata?.traceId === rec.traceId)
      );

      list.push({
        versionNumber: vNum,
        versionIndex: idx + 1,
        isLatest,
        isBaseline: false,
        title: `${rec.methodName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}${
          rec.columnName ? ` on '${rec.columnName}'` : ''
        }`,
        description: rec.reason || `Curated transformation applied to resolve quality defects.`,
        timestamp: rec.timestamp,
        performedBy: rec.performedBy,
        scoreBefore: rec.scoreBefore,
        scoreAfter: rec.scoreAfter ?? dataset.qualityAssessment.overallScore,
        affectedRowsCount: rec.affectedRowsCount,
        lineageRecord: rec,
        targetColumn: rec.columnName,
        operationType: rec.operationType,
        auditLog: matchedAudit,
      });
    });

    // Add baseline node
    list.unshift(baselineNode);

    // Return in reverse chronological order (newest first)
    return list.reverse();
  }, [dataset, auditLogs, user]);

  // Filter versions by keyword search
  const filteredVersions = useMemo(() => {
    if (!searchTerm.trim()) return versions;
    const term = searchTerm.toLowerCase();
    return versions.filter(
      (v) =>
        v.versionNumber.toLowerCase().includes(term) ||
        v.title.toLowerCase().includes(term) ||
        v.description.toLowerCase().includes(term) ||
        (v.targetColumn && v.targetColumn.toLowerCase().includes(term)) ||
        (v.lineageRecord?.traceId && v.lineageRecord.traceId.toLowerCase().includes(term)) ||
        (v.performedBy && v.performedBy.toLowerCase().includes(term))
    );
  }, [versions, searchTerm]);

  // Rollback / Undo handler
  const handleRollback = () => {
    setIsRollingBack(true);
    try {
      const result = undoCleaningOperation();
      if (result) {
        showToast('Successfully reverted to previous dataset version.', 'success');
        setIsRollbackConfirmOpen(false);
      }
    } catch (e: any) {
      showToast('Rollback failed: ' + (e?.message || 'Unknown error'), 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Export current version snapshot with rich toast notification + Download action
  const handleExportVersion = (version: VersionNode) => {
    const filename = `${dataset.name}_${version.versionNumber}.csv`;
    const recordsToExport = version.isBaseline ? dataset.rawRecords : dataset.cleanedRecords;

    notifyExportComplete({
      format: 'CSV',
      filename,
      downloadFn: () => ExportService.downloadCSV(recordsToExport, filename),
      title: 'Version Snapshot Export Ready',
      text: `Revision ${version.versionNumber} of "${dataset.name}" (${recordsToExport.length} rows) compiled.`,
    });
  };

  const netScoreDelta =
    versions.length > 1
      ? dataset.qualityAssessment.overallScore - (versions[versions.length - 1].scoreAfter || 0)
      : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#641B32]/10 text-[#641B32]">
                <History className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono uppercase font-bold text-[#641B32] tracking-wider">
                Version Control & Lineage Ledger
              </span>
              <span className="text-[#D9A0AE]">•</span>
              <span className="text-xs font-mono text-[#756772]">
                Active: v1.{dataset.lineage.length}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#3D1023]">
              Dataset Evolution & Audit History
            </h2>
            <p className="text-xs text-[#756772] max-w-2xl leading-relaxed">
              Every transformation produces an immutable checkpoint linked directly to DataPulse&apos;s forensic audit trail. Inspect chronological score improvements, inspect before/after samples, and audit actor signatures.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
              <div className="text-[10px] font-mono uppercase text-[#756772]">Revisions</div>
              <div className="text-lg font-bold font-mono text-[#3D1023]">{versions.length}</div>
            </div>

            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
              <div className="text-[10px] font-mono uppercase text-[#756772]">Quality Gain</div>
              <div
                className={`text-lg font-bold font-mono ${
                  netScoreDelta > 0
                    ? 'text-[#277A58]'
                    : netScoreDelta === 0
                    ? 'text-[#756772]'
                    : 'text-[#B4233D]'
                }`}
              >
                {netScoreDelta >= 0 ? `+${netScoreDelta}%` : `${netScoreDelta}%`}
              </div>
            </div>

            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl px-4 py-2.5 text-center min-w-[110px]">
              <div className="text-[10px] font-mono uppercase text-[#756772]">Audit Ledger</div>
              <div className="text-xs font-bold text-[#277A58] flex items-center justify-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#277A58] animate-pulse" />
                <span>Verified</span>
              </div>
            </div>

            {dataset.lineage.length > 0 && (
              <button
                onClick={() => setIsRollbackConfirmOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#FFF8EF] border border-[#B4233D]/30 text-[#B4233D] hover:bg-[#B4233D]/10 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Rollback latest transformation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rollback Head</span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="mt-5 pt-4 border-t border-[#D9A0AE]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756772]" />
            <input
              type="text"
              placeholder="Search versions by revision tag, operation, column, or trace ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFullAuditTrail(!showFullAuditTrail)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                showFullAuditTrail
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                  : 'bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] hover:bg-[#F8EFE5]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{showFullAuditTrail ? 'Hide Platform Audit Ledger' : 'Show Linked Audit Trail'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Audit Trail View when toggled */}
      {showFullAuditTrail && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-mono font-bold text-[#641B32] uppercase flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Forensic Platform Activity Filtered for: &quot;{dataset.name}&quot;</span>
            </div>
            <button
              onClick={() => setShowFullAuditTrail(false)}
              className="text-xs text-[#756772] hover:text-[#29212A]"
            >
              Close Ledger
            </button>
          </div>
          <AuditTrail datasetIdFilter={dataset.id} />
        </div>
      )}

      {/* Rollback Confirmation Banner/Modal */}
      {isRollbackConfirmOpen && (
        <div className="p-4 bg-[#FFF8EF] border border-[#B4233D]/40 rounded-2xl shadow-md animate-in fade-in duration-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#B4233D]/10 text-[#B4233D] shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#3D1023]">
                Confirm Rollback to Previous Version?
              </h4>
              <p className="text-xs text-[#756772] mt-0.5 leading-relaxed">
                Reverts the latest transformation (<strong className="text-[#29212A]">{dataset.lineage[0]?.methodName.replace(/_/g, ' ')}</strong>). The dataset will revert to version <strong className="text-[#641B32]">v1.{dataset.lineage.length - 1}</strong>. The raw baseline remains untouched.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRollback}
              disabled={isRollingBack}
              className="px-4 py-2 bg-[#B4233D] hover:bg-[#8B1A2E] text-[#FFF8EF] rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isRollingBack ? 'Reverting...' : 'Confirm Rollback'}
            </button>
            <button
              onClick={() => setIsRollbackConfirmOpen(false)}
              className="px-3 py-2 bg-[#F8EFE5] hover:bg-[#D9A0AE]/30 text-[#756772] rounded-xl text-xs font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="space-y-4">
        {filteredVersions.length === 0 ? (
          <div className="p-10 text-center bg-[#F8EFE5] rounded-3xl border border-[#D9A0AE]/30 space-y-3">
            <History className="w-8 h-8 text-[#756772] mx-auto opacity-50" />
            <div className="font-serif font-bold text-base text-[#3D1023]">
              No Versions Found
            </div>
            <p className="text-xs text-[#756772]">
              No revision matches the search filter &quot;{searchTerm}&quot;.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-[#641B32] before:via-[#D9A0AE] before:to-[#641B32]/30 space-y-6">
            {filteredVersions.map((version, vIdx) => {
              const isExpanded = expandedVersion === version.versionNumber;
              const hasLineage = !!version.lineageRecord;
              const scoreShift =
                version.scoreBefore !== undefined ? version.scoreAfter - version.scoreBefore : 0;

              return (
                <div key={version.versionNumber} className="relative group">
                  {/* Timeline Node Marker */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-4 w-6 sm:w-8 h-6 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      version.isLatest
                        ? 'bg-[#641B32] border-[#FFF8EF] text-[#FFF8EF] shadow-md ring-4 ring-[#641B32]/20'
                        : version.isBaseline
                        ? 'bg-[#3D1023] border-[#FFF8EF] text-[#FFF8EF]'
                        : 'bg-[#FFF8EF] border-[#641B32] text-[#641B32]'
                    }`}
                  >
                    {version.isLatest ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : version.isBaseline ? (
                      <Database className="w-3.5 h-3.5" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                  </div>

                  {/* Version Card */}
                  <div
                    className={`bg-[#FFF8EF] border rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md ${
                      version.isLatest
                        ? 'border-[#641B32]/40 ring-1 ring-[#641B32]/10 bg-gradient-to-br from-[#FFF8EF] to-[#F8EFE5]'
                        : 'border-[#D9A0AE]/30 hover:border-[#641B32]/30'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#D9A0AE]/20">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                            version.isLatest
                              ? 'bg-[#641B32] text-[#FFF8EF] border-[#641B32]'
                              : version.isBaseline
                              ? 'bg-[#3D1023]/10 text-[#3D1023] border-[#3D1023]/20'
                              : 'bg-[#F8EFE5] text-[#641B32] border-[#D9A0AE]/30'
                          }`}
                        >
                          {version.versionNumber}
                        </span>

                        {version.isLatest && (
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#277A58]/10 text-[#277A58] border border-[#277A58]/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#277A58] animate-pulse" />
                            Active Head
                          </span>
                        )}

                        {version.isBaseline && (
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#B77722]/10 text-[#B77722] border border-[#B77722]/20">
                            Pristine Baseline
                          </span>
                        )}

                        <span className="font-serif font-bold text-sm text-[#3D1023]">
                          {version.title}
                        </span>
                      </div>

                      {/* Right Meta (Timestamp & Actor) */}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#756772]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#641B32]" />
                          <span>{new Date(version.timestamp).toLocaleString()}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#756772]" />
                          <span className="truncate max-w-[140px]">{version.performedBy}</span>
                        </span>
                      </div>
                    </div>

                    {/* Body Info */}
                    <div className="mt-3.5 space-y-3">
                      <p className="text-xs text-[#29212A] leading-relaxed">
                        {version.description}
                      </p>

                      {/* Quality shift and stats pills */}
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        {/* Quality Score Pill */}
                        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase text-[#756772]">
                            Quality Score:
                          </span>
                          {version.scoreBefore !== undefined ? (
                            <div className="flex items-center gap-1 font-mono font-bold">
                              <span className="text-[#756772]">{version.scoreBefore}%</span>
                              <ArrowRight className="w-3 h-3 text-[#641B32]" />
                              <span
                                className={
                                  version.scoreAfter >= 90
                                    ? 'text-[#277A58]'
                                    : version.scoreAfter >= 70
                                    ? 'text-[#B77722]'
                                    : 'text-[#B4233D]'
                                }
                              >
                                {version.scoreAfter}%
                              </span>
                              {scoreShift !== 0 && (
                                <span
                                  className={`text-[10px] px-1 rounded ${
                                    scoreShift > 0
                                      ? 'bg-[#277A58]/10 text-[#277A58]'
                                      : 'bg-[#B4233D]/10 text-[#B4233D]'
                                  }`}
                                >
                                  {scoreShift > 0 ? `+${scoreShift}%` : `${scoreShift}%`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-[#641B32]">
                              {version.scoreAfter}%
                            </span>
                          )}
                        </div>

                        {/* Rows Affected Pill */}
                        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-mono">
                          <span className="text-[10px] font-mono uppercase text-[#756772]">
                            {version.isBaseline ? 'Baseline Rows:' : 'Affected Records:'}
                          </span>
                          <span className="font-mono font-bold text-[#29212A]">
                            {version.affectedRowsCount.toLocaleString()}
                          </span>
                        </div>

                        {/* Linked Trace ID */}
                        {version.lineageRecord?.traceId && (
                          <div className="bg-[#641B32]/10 border border-[#641B32]/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] font-mono uppercase text-[#641B32] font-semibold">
                              Trace ID:
                            </span>
                            <span className="font-mono font-bold text-[#641B32]">
                              {version.lineageRecord.traceId}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expandable Details (Data Diff & Linked Audit Entry) */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#D9A0AE]/30 space-y-4 animate-in fade-in duration-200">
                          {/* Data Diff Sample (if transformation) */}
                          {hasLineage && version.lineageRecord && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-mono uppercase font-bold text-[#756772] flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#641B32]" />
                                <span>Curated Data Value Transformation Diff</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                                <div className="p-3 bg-[#F8EFE5] border border-[#B4233D]/20 rounded-xl space-y-1">
                                  <div className="text-[10px] text-[#B4233D] font-bold uppercase tracking-wider">
                                    Sample Before Remediation:
                                  </div>
                                  <div className="text-[#29212A] break-all leading-relaxed">
                                    {version.lineageRecord.originalSample.join(', ') || 'N/A'}
                                  </div>
                                </div>

                                <div className="p-3 bg-[#F8EFE5] border border-[#277A58]/20 rounded-xl space-y-1">
                                  <div className="text-[10px] text-[#277A58] font-bold uppercase tracking-wider">
                                    Sample After Remediation:
                                  </div>
                                  <div className="text-[#29212A] break-all leading-relaxed">
                                    {version.lineageRecord.transformedSample.join(', ') || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Linked Forensic Audit Event Detail Card */}
                          <div className="p-4 bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-mono font-bold text-[#641B32] flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-[#277A58]" />
                                <span>Linked Audit Trail Forensic Verification</span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#277A58]/10 text-[#277A58] font-bold">
                                Tamper-Proof Logged
                              </span>
                            </div>

                            {version.auditLog ? (
                              <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-[#FFF8EF] rounded-lg font-mono text-[11px]">
                                  <div>
                                    <span className="text-[#756772] block text-[9px] uppercase">Audit Action</span>
                                    <span className="font-bold text-[#29212A]">{version.auditLog.action}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#756772] block text-[9px] uppercase">Category</span>
                                    <span className="font-bold text-[#641B32] uppercase">{version.auditLog.category}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#756772] block text-[9px] uppercase">Audit Event ID</span>
                                    <span className="text-[#756772] truncate block">{version.auditLog.id}</span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-[#756772] bg-[#FFF8EF] p-2.5 rounded-lg border border-[#D9A0AE]/20">
                                  <span className="font-semibold text-[#29212A]">Audit Message: </span>
                                  {version.auditLog.description}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 bg-[#FFF8EF] rounded-lg text-[11px] text-[#756772] flex items-center justify-between">
                                <span>
                                  Operation recorded in lineage with Trace ID{' '}
                                  <strong className="text-[#641B32]">
                                    {version.lineageRecord?.traceId || dataset.id}
                                  </strong>
                                  .
                                </span>
                                <button
                                  onClick={() => setShowFullAuditTrail(true)}
                                  className="text-[#641B32] font-bold underline hover:text-[#3D1023]"
                                >
                                  Search in Activity Trail
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-[#D9A0AE]/20 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          setExpandedVersion(isExpanded ? null : version.versionNumber)
                        }
                        className="text-xs text-[#641B32] hover:text-[#3D1023] font-semibold flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Verification Details</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Inspect Values & Linked Audit Event</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Download version snapshot with toast notification */}
                        <button
                          onClick={() => handleExportVersion(version)}
                          className="px-3 py-1.5 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 hover:bg-[#F8EFE5] text-[#29212A] text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                          title="Download CSV for this revision"
                        >
                          <Download className="w-3 h-3 text-[#641B32]" />
                          <span>Export Snapshot</span>
                        </button>

                        {/* Studio CTA for active head */}
                        {version.isLatest && (
                          <button
                            onClick={() => navigate('/app/cleaning')}
                            className="px-3 py-1.5 rounded-xl bg-[#641B32] hover:bg-[#3D1023] text-[#FFF8EF] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Create Next Version</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
