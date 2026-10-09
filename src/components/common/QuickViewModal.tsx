import React, { useEffect, useState } from 'react';
import {
  X,
  Database,
  Calendar,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Trash2,
  Tag,
  Clock,
  Layers,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Activity,
  SlidersHorizontal,
  Table,
  Check
} from 'lucide-react';
import { Dataset, QualityDimensionType, DimensionScore, QualityIssue, ColumnProfile } from '../../types';
import { ExportService } from '../../services/exportService';
import { useDataset } from '../../context/DatasetContext';

interface QuickViewModalProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspace: (id: string) => void;
  onDelete: (id: string) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  dataset,
  isOpen,
  onClose,
  onOpenWorkspace,
  onDelete,
}) => {
  const { notifyExportComplete } = useDataset();
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'preview'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset tab and confirm when dataset changes
  useEffect(() => {
    setActiveTab('overview');
    setDeleteConfirm(false);
  }, [dataset?.id]);

  if (!isOpen || !dataset) return null;

  const score = dataset.qualityAssessment.overallScore;
  const dimensionScores = dataset.qualityAssessment.dimensionScores;
  const dimensionList: DimensionScore[] = dimensionScores ? Object.values(dimensionScores) : [];

  const isHealthy = score >= 90;
  const needsAttention = score < 70;

  // File size formatting
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Relative time calculation
  const getRelativeTime = (isoString: string) => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Inspect columns and sample records
  const sampleRecords = dataset.cleanedRecords || [];
  const rawRecords = dataset.rawRecords || [];
  const columnProfiles: ColumnProfile[] = dataset.columns || [];
  const columnNames = columnProfiles.length > 0 
    ? columnProfiles.map(c => c.name) 
    : sampleRecords.length > 0 ? Object.keys(sampleRecords[0]) : [];

  // Calculate total null cells across columns
  const totalCells = dataset.rowCount * dataset.columnCount;
  const totalNullCells = columnProfiles.reduce((acc, c) => acc + (c.nullCount || 0), 0);
  const totalNullRate = totalCells > 0 ? ((totalNullCells / totalCells) * 100).toFixed(1) : '0';

  const tags = dataset.tags || (dataset.isSynthetic ? ['synthetic', 'iot-telemetry', 'benchmark', 'csv'] : [dataset.fileType, 'raw']);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-[#29212A]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-2xl bg-[#FFF8EF] h-full shadow-2xl flex flex-col z-10 border-l border-[#D9A0AE]/30 transform transition-transform ease-out duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-[#D9A0AE]/20 bg-[#FFF8EF] shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#641B32] text-[#FFF8EF] font-bold">
                  {dataset.fileType.toUpperCase()}
                </span>
                {dataset.isSynthetic && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#B77722]/15 text-[#B77722] font-bold border border-[#B77722]/30">
                    Synthetic Benchmark
                  </span>
                )}
                {dataset.lineage && dataset.lineage.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#B94B68]/15 text-[#B94B68] font-bold border border-[#B94B68]/30">
                    {dataset.lineage.length} Transformation{dataset.lineage.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3D1023] leading-snug break-words">
                {dataset.name}
              </h2>
              <p className="text-xs text-[#756772] line-clamp-2">
                {dataset.description || 'Ingested dataset ready for exploration, profiling, and quality verification.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Score badge */}
              <div
                className={`flex flex-col items-end px-3 py-1.5 rounded-xl border text-right ${
                  isHealthy
                    ? 'bg-[#277A58]/10 text-[#277A58] border-[#277A58]/20'
                    : needsAttention
                    ? 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/20'
                    : 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/20'
                }`}
              >
                <div className="text-[10px] uppercase font-mono tracking-wider font-semibold">Health Score</div>
                <div className="text-lg font-bold font-mono leading-none">{score}%</div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#756772] hover:text-[#29212A] hover:bg-[#F8EFE5] transition-colors focus:outline-none"
                title="Close Quick View (Esc)"
                aria-label="Close Quick View"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#D9A0AE]/20">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-xs'
                  : 'bg-[#F8EFE5] text-[#756772] hover:text-[#29212A]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Summary & Quality</span>
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'columns'
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-xs'
                  : 'bg-[#F8EFE5] text-[#756772] hover:text-[#29212A]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Columns Schema ({columnProfiles.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-xs'
                  : 'bg-[#F8EFE5] text-[#756772] hover:text-[#29212A]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Sample Records ({Math.min(5, sampleRecords.length)})</span>
            </button>
          </div>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#F8EFE5] border border-[#D9A0AE]/20 rounded-2xl">
                  <div className="text-[10px] font-mono text-[#756772] uppercase">Total Rows</div>
                  <div className="text-xl font-bold font-mono text-[#29212A] mt-0.5">
                    {dataset.rowCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#756772] mt-0.5">
                    {rawRecords.length} raw immutable
                  </div>
                </div>

                <div className="p-3 bg-[#F8EFE5] border border-[#D9A0AE]/20 rounded-2xl">
                  <div className="text-[10px] font-mono text-[#756772] uppercase">Columns</div>
                  <div className="text-xl font-bold font-mono text-[#29212A] mt-0.5">
                    {dataset.columnCount}
                  </div>
                  <div className="text-[10px] text-[#756772] mt-0.5">
                    {columnProfiles.filter(c => c.inferredType === 'number').length} numeric
                  </div>
                </div>

                <div className="p-3 bg-[#F8EFE5] border border-[#D9A0AE]/20 rounded-2xl">
                  <div className="text-[10px] font-mono text-[#756772] uppercase">File Size</div>
                  <div className="text-xl font-bold font-mono text-[#29212A] mt-0.5">
                    {formatSize(dataset.fileSize)}
                  </div>
                  <div className="text-[10px] text-[#756772] mt-0.5">
                    .{dataset.fileType} format
                  </div>
                </div>

                <div className="p-3 bg-[#F8EFE5] border border-[#D9A0AE]/20 rounded-2xl">
                  <div className="text-[10px] font-mono text-[#756772] uppercase">Null Rate</div>
                  <div className="text-xl font-bold font-mono text-[#641B32] mt-0.5">
                    {totalNullRate}%
                  </div>
                  <div className="text-[10px] text-[#756772] mt-0.5">
                    {totalNullCells.toLocaleString()} empty cells
                  </div>
                </div>
              </div>

              {/* Six Quality Dimensions Detailed Breakdown */}
              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#641B32]" />
                    <h3 className="font-bold text-sm text-[#29212A]">Six Quality Dimensions</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#641B32]">
                    Aggregate Score: {score}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dimensionList.map((dim: DimensionScore) => {
                    const dimScore = dim.score;
                    const isDimGood = dimScore >= 90;
                    const isDimWarn = dimScore < 70;

                    return (
                      <div
                        key={dim.dimension}
                        className="p-3 rounded-xl bg-[#F8EFE5]/70 border border-[#D9A0AE]/20 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[#29212A] capitalize">
                            {dim.dimension}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold ${
                              isDimGood
                                ? 'text-[#277A58]'
                                : isDimWarn
                                ? 'text-[#B4233D]'
                                : 'text-[#B77722]'
                            }`}
                          >
                            {dimScore}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-[#E5D7C8] rounded-full h-1.5 overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDimGood
                                ? 'bg-[#277A58]'
                                : isDimWarn
                                ? 'bg-[#B4233D]'
                                : 'bg-[#B77722]'
                            }`}
                            style={{ width: `${Math.max(5, dimScore)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-[#756772] flex items-center justify-between">
                          <span className="truncate max-w-[140px]" title={dim.benchmarkRule}>
                            {dim.benchmarkRule || 'Deterministic heuristic'}
                          </span>
                          <span className="font-mono">
                            {dim.issuesCount > 0 ? `${dim.issuesCount} issue(s)` : 'Clean'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* File Metadata Card */}
              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-[#641B32]" />
                  <h3 className="font-bold text-sm text-[#29212A]">File & Ingestion Metadata</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#D9A0AE]/20">
                    <span className="text-[#756772]">Original File Name:</span>
                    <span className="font-mono font-medium text-[#29212A] truncate max-w-[200px]" title={dataset.fileName}>
                      {dataset.fileName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D9A0AE]/20">
                    <span className="text-[#756772]">Dataset Identifier:</span>
                    <span className="font-mono font-medium text-[#29212A]">{dataset.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D9A0AE]/20">
                    <span className="text-[#756772]">Ingestion Timestamp:</span>
                    <span className="font-mono font-medium text-[#29212A]">
                      {new Date(dataset.createdAt).toLocaleString()} ({getRelativeTime(dataset.createdAt)})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D9A0AE]/20">
                    <span className="text-[#756772]">Last Updated:</span>
                    <span className="font-mono font-medium text-[#29212A]">
                      {dataset.updatedAt ? new Date(dataset.updatedAt).toLocaleString() : 'Never modified'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D9A0AE]/20">
                    <span className="text-[#756772]">Raw Snapshot:</span>
                    <span className="font-mono font-medium text-[#277A58] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Immutable ({rawRecords.length || dataset.rowCount} rows)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#D9A0AE]/20">
                    <span className="text-[#756772]">Working Clean State:</span>
                    <span className="font-mono font-medium text-[#641B32]">
                      {sampleRecords.length || dataset.rowCount} rows
                    </span>
                  </div>
                </div>

                {/* Tags Row */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-[#756772] block mb-1.5">
                    Associated Tags:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-[#F8EFE5] text-[#641B32] text-xs font-mono font-semibold border border-[#D9A0AE]/30"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detected Issues or Clean State */}
              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#B77722]" />
                  <h3 className="font-bold text-sm text-[#29212A]">
                    Automated Quality Issue Checks ({dataset.qualityAssessment.issues?.length || 0})
                  </h3>
                </div>

                {dataset.qualityAssessment.issues && dataset.qualityAssessment.issues.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {dataset.qualityAssessment.issues.map((iss: QualityIssue, i: number) => (
                      <div
                        key={iss.id || i}
                        className="p-2.5 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30 text-xs flex items-start gap-2"
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                            iss.severity === 'high'
                              ? 'bg-[#B4233D] text-[#FFF8EF]'
                              : iss.severity === 'medium'
                              ? 'bg-[#B77722] text-[#FFF8EF]'
                              : 'bg-[#756772] text-[#FFF8EF]'
                          }`}
                        >
                          {iss.severity}
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-[#29212A]">
                            {iss.column ? `Column "${iss.column}": ` : ''}{iss.description}
                          </div>
                          {iss.recommendedFix && (
                            <div className="text-[11px] text-[#756772] mt-0.5">
                              Recommended Fix: {iss.recommendedFix}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#277A58]/10 border border-[#277A58]/20 text-xs text-[#277A58] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>No critical data quality defects detected. All integrity assertions passed.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COLUMNS SCHEMA */}
          {activeTab === 'columns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#756772]">
                <span>Showing schema breakdown for {columnProfiles.length} columns</span>
                <span className="font-mono">{dataset.rowCount} rows profiled</span>
              </div>

              <div className="border border-[#D9A0AE]/30 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8EFE5] border-b border-[#D9A0AE]/30 text-[#756772] font-semibold font-mono text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Inferred Type</th>
                      <th className="py-2.5 px-3">Null %</th>
                      <th className="py-2.5 px-3">Unique Values</th>
                      <th className="py-2.5 px-3">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9A0AE]/20 bg-[#FFF8EF]">
                    {columnProfiles.map((col: ColumnProfile) => (
                      <tr key={col.name} className="hover:bg-[#F8EFE5]/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold font-mono text-[#29212A]">
                          {col.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-[#F8EFE5] text-[10px] font-mono text-[#641B32] border border-[#D9A0AE]/20 font-bold uppercase">
                            {col.inferredType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={
                              col.nullPercentage > 10
                                ? 'text-[#B4233D] font-bold'
                                : col.nullPercentage > 0
                                ? 'text-[#B77722]'
                                : 'text-[#277A58]'
                            }
                          >
                            {col.nullPercentage.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-[#756772] ml-1">({col.nullCount})</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#29212A]">
                          {col.uniqueCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#756772] truncate max-w-[150px]">
                          {col.sampleValues && col.sampleValues.length > 0
                            ? String(col.sampleValues[0])
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE RECORDS PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#756772]">
                <span>Showing first {Math.min(5, sampleRecords.length)} rows of cleaned dataset state</span>
                <span className="font-mono">{dataset.rowCount} total rows</span>
              </div>

              {sampleRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#756772] bg-[#F8EFE5]/50 rounded-2xl border border-[#D9A0AE]/30">
                  No records found in this dataset.
                </div>
              ) : (
                <div className="border border-[#D9A0AE]/30 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8EFE5] border-b border-[#D9A0AE]/30 text-[#756772] font-semibold font-mono text-[11px] whitespace-nowrap">
                      <tr>
                        <th className="py-2 px-3 bg-[#E5D7C8]/40 border-r border-[#D9A0AE]/20">#</th>
                        {columnNames.map(colName => (
                          <th key={colName} className="py-2.5 px-3">
                            {colName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9A0AE]/20 bg-[#FFF8EF] font-mono whitespace-nowrap">
                      {sampleRecords.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F8EFE5]/40 transition-colors">
                          <td className="py-2 px-3 text-[#756772] bg-[#F8EFE5]/40 border-r border-[#D9A0AE]/20 text-[10px]">
                            {idx + 1}
                          </td>
                          {columnNames.map(colName => {
                            const val = row[colName];
                            const isNull = val === null || val === undefined || val === '';
                            return (
                              <td
                                key={colName}
                                className={`py-2 px-3 text-xs ${
                                  isNull ? 'text-[#B4233D] italic' : 'text-[#29212A]'
                                }`}
                              >
                                {isNull ? '<null>' : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#D9A0AE]/30 bg-[#F8EFE5]/70 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Open in full workspace */}
            <button
              onClick={() => {
                onOpenWorkspace(dataset.id);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-semibold text-xs hover:bg-[#3D1023] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>Open in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Export Cleaned */}
            <button
              onClick={() => {
                const filename = `${dataset.name}_cleaned.csv`;
                notifyExportComplete({
                  format: 'CSV',
                  filename,
                  downloadFn: () =>
                    ExportService.downloadCSV(dataset.cleanedRecords, `${dataset.name}_cleaned`),
                  title: 'CSV Export Ready',
                  text: `Dataset "${dataset.name}" exported to CSV successfully.`,
                });
              }}
              className="px-3 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#29212A] font-semibold text-xs hover:bg-[#FFF8EF]/80 transition-colors flex items-center gap-1.5"
              title="Download Cleaned CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#641B32]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete button with confirmation */}
            {deleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    onDelete(dataset.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#B4233D] text-[#FFF8EF] text-xs font-bold hover:bg-[#8B182C] transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-2 py-1.5 rounded-xl text-xs text-[#756772] hover:text-[#29212A]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="p-2 rounded-xl text-[#756772] hover:text-[#B4233D] hover:bg-[#B4233D]/10 transition-colors"
                title="Delete this dataset"
                aria-label="Delete this dataset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#756772] hover:text-[#29212A] text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
