import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  History,
  RotateCcw,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  Database,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Layers,
  Tag,
  Hash
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { ExportService } from '../services/exportService';
import { AuditTrail } from '../components/common/AuditTrail';
import { LineageRecord, CleaningOperationType } from '../types';

interface LineagePageProps {
  navigate: (path: string) => void;
}

export const LineagePage: React.FC<LineagePageProps> = ({ navigate }) => {
  const {
    currentDataset,
    datasets,
    selectDataset,
    undoCleaningOperation,
    rollbackToVersion,
    notifyExportComplete,
    showToast,
  } = useDataset();

  const [activeTab, setActiveTab] = useState<'transformations' | 'audit_trail'>('transformations');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterDestructive, setFilterDestructive] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'impact'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal / Drawer state
  const [selectedRecord, setSelectedRecord] = useState<LineageRecord | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<LineageRecord | null>(null);
  const [showRawResetConfirm, setShowRawResetConfirm] = useState(false);
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTraceId(id);
    showToast(`Trace ID ${text} copied to clipboard`, 'info');
    setTimeout(() => setCopiedTraceId(null), 2000);
  };

  if (!currentDataset) {
    return (
      <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#641B32]/10 flex items-center justify-center mx-auto mb-4">
          <GitBranch className="w-8 h-8 text-[#641B32]" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#3D1023]">No Active Dataset Selected</h2>
        <p className="text-xs sm:text-sm text-[#756772] mt-2 mb-6 max-w-md mx-auto">
          Select or import a dataset in the Dataset Library to inspect its full transformation history, provenance records, and version lineage.
        </p>
        <button
          onClick={() => navigate('/app/datasets')}
          className="px-6 py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors shadow-sm"
        >
          Open Dataset Library
        </button>
      </div>
    );
  }

  const allColumns = currentDataset.columns.map(c => c.name);
  const lineage = currentDataset.lineage || [];

  // Summary counts based on actual stored records
  const totalTransformations = lineage.length;
  const currentVersionLabel =
    totalTransformations === 0 ? 'v1.0 (Raw)' : `v1.${totalTransformations}`;

  const improvedCount = lineage.filter(r => r.validationOutcome === 'improved').length;
  const neutralCount = lineage.filter(
    r => !r.validationOutcome || r.validationOutcome === 'neutral'
  ).length;
  const degradedCount = lineage.filter(r => r.validationOutcome === 'degraded').length;
  const destructiveCount = lineage.filter(r => r.isDestructive).length;

  const totalChangedCells = lineage.reduce(
    (acc, r) => acc + (r.changedCellsCount !== undefined ? r.changedCellsCount : r.affectedRowsCount || 0),
    0
  );
  const totalRemovedRows = lineage.reduce(
    (acc, r) => acc + (r.removedRowsCount !== undefined ? r.removedRowsCount : (r.isDestructive ? r.affectedRowsCount : 0)),
    0
  );

  // Unique operation types present in the current dataset's lineage
  const presentOperationTypes = Array.from(new Set(lineage.map(r => r.operationType)));

  // Filter & Search Logic
  const filteredLineage = useMemo(() => {
    let result = [...lineage];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(item => {
        const traceMatch = item.traceId.toLowerCase().includes(q);
        const methodMatch = item.methodName.toLowerCase().includes(q);
        const reasonMatch = item.reason.toLowerCase().includes(q);
        const defectMatch = item.detectedIssue.toLowerCase().includes(q);
        const colMatch = item.columnName ? item.columnName.toLowerCase().includes(q) : false;
        const actorMatch = item.performedBy.toLowerCase().includes(q);
        return traceMatch || methodMatch || reasonMatch || defectMatch || colMatch || actorMatch;
      });
    }

    // Column filter
    if (filterColumn !== 'all') {
      result = result.filter(item => item.columnName === filterColumn);
    }

    // Operation filter
    if (filterOperation !== 'all') {
      result = result.filter(item => item.operationType === filterOperation);
    }

    // Validation outcome filter
    if (filterOutcome !== 'all') {
      result = result.filter(item => {
        if (filterOutcome === 'improved') return item.validationOutcome === 'improved';
        if (filterOutcome === 'neutral') return !item.validationOutcome || item.validationOutcome === 'neutral';
        if (filterOutcome === 'degraded') return item.validationOutcome === 'degraded';
        return true;
      });
    }

    // Destructive filter
    if (filterDestructive !== 'all') {
      if (filterDestructive === 'destructive') {
        result = result.filter(item => item.isDestructive === true);
      } else if (filterDestructive === 'non_destructive') {
        result = result.filter(item => !item.isDestructive);
      }
    }

    // Sort order
    if (sortOrder === 'newest') {
      // already newest first in lineage array
    } else if (sortOrder === 'oldest') {
      result.reverse();
    } else if (sortOrder === 'impact') {
      result.sort((a, b) => {
        const shiftA = (a.scoreAfter || 0) - (a.scoreBefore || 0);
        const shiftB = (b.scoreAfter || 0) - (b.scoreBefore || 0);
        return shiftB - shiftA;
      });
    }

    return result;
  }, [
    lineage,
    searchTerm,
    filterColumn,
    filterOperation,
    filterOutcome,
    filterDestructive,
    sortOrder,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLineage.length / pageSize));
  const paginatedLineage = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLineage.slice(startIndex, startIndex + pageSize);
  }, [filteredLineage, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterColumn('all');
    setFilterOperation('all');
    setFilterOutcome('all');
    setFilterDestructive('all');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  const handleConfirmRollback = () => {
    if (!rollbackTarget || !rollbackTarget.afterVersionId) return;
    rollbackToVersion(rollbackTarget.afterVersionId);
    setRollbackTarget(null);
    setSelectedRecord(null);
  };

  const handleConfirmRawReset = () => {
    rollbackToVersion('v1.0 (Raw)');
    setShowRawResetConfirm(false);
    setSelectedRecord(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Dataset Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFF8EF] p-5 sm:p-6 rounded-3xl border border-[#D9A0AE]/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#641B32] text-[#FFF8EF]">
              PROVENANCE & AUDIT
            </span>
            <span className="text-xs font-mono text-[#756772]">
              Active: {currentVersionLabel}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023] mt-1">
            Data Lineage Explorer
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Traceable step-by-step transformation lineage and point-in-time state recovery.
          </p>
        </div>

        {/* Dataset Switcher & Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dataset Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-3 py-1.5 shadow-inner">
            <Database className="w-3.5 h-3.5 text-[#641B32] shrink-0" />
            <span className="text-xs font-bold text-[#3D1023] whitespace-nowrap">Dataset:</span>
            <select
              value={currentDataset.id}
              onChange={e => {
                selectDataset(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-[#29212A] focus:outline-none cursor-pointer"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rowCount} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-[#F8EFE5] p-1 border border-[#D9A0AE]/30 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('transformations')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'transformations'
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                  : 'text-[#756772] hover:text-[#29212A]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Transformation Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('audit_trail')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit_trail'
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                  : 'text-[#756772] hover:text-[#29212A]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>User Audit Log</span>
            </button>
          </div>

          {/* Export Button */}
          {activeTab === 'transformations' && (
            <button
              onClick={() => {
                const filename = `${currentDataset.name.replace(/\s+/g, '_')}_lineage_ledger.json`;
                notifyExportComplete({
                  format: 'JSON',
                  filename,
                  downloadFn: () => ExportService.downloadJSON(lineage, filename),
                  title: 'Lineage Ledger Exported',
                  text: `Exported ${lineage.length} verified lineage transformation records.`,
                });
              }}
              disabled={lineage.length === 0}
              className="px-3.5 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#F8EFE5] disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Export complete JSON transformation ledger"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'audit_trail' ? (
        <AuditTrail datasetIdFilter={currentDataset.id} />
      ) : (
        <>
          {/* Dataset Version & Provenance Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Version Info */}
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#756772] text-[11px] font-mono">
                <span>ACTIVE VERSION</span>
                <GitBranch className="w-3.5 h-3.5 text-[#641B32]" />
              </div>
              <div className="text-xl font-bold font-serif text-[#3D1023] mt-1">
                {currentVersionLabel}
              </div>
              <div className="text-[10px] text-[#756772] mt-0.5">
                {totalTransformations === 0 ? 'Pristine raw snapshot' : `${totalTransformations} step(s) applied`}
              </div>
            </div>

            {/* Total Operations */}
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#756772] text-[11px] font-mono">
                <span>TOTAL TRACES</span>
                <Clock className="w-3.5 h-3.5 text-[#641B32]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#29212A] mt-1">
                {totalTransformations}
              </div>
              <div className="text-[10px] text-[#756772] mt-0.5">
                Stored lineage records
              </div>
            </div>

            {/* Improved Outcomes */}
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#277A58] text-[11px] font-mono">
                <span>IMPROVED</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#277A58]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#277A58] mt-1">
                {improvedCount}
              </div>
              <div className="text-[10px] text-[#756772] mt-0.5">
                Quality score increased
              </div>
            </div>

            {/* Neutral Outcomes */}
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#756772] text-[11px] font-mono">
                <span>NEUTRAL</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#756772]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#29212A] mt-1">
                {neutralCount}
              </div>
              <div className="text-[10px] text-[#756772] mt-0.5">
                Standardized structure
              </div>
            </div>

            {/* Degraded Outcomes */}
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#B4233D] text-[11px] font-mono">
                <span>DEGRADED</span>
                <AlertTriangle className="w-3.5 h-3.5 text-[#B4233D]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#B4233D] mt-1">
                {degradedCount}
              </div>
              <div className="text-[10px] text-[#756772] mt-0.5">
                Score drop detected
              </div>
            </div>

            {/* Destructive Operations */}
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#935200] text-[11px] font-mono">
                <span>DESTRUCTIVE</span>
                <AlertTriangle className="w-3.5 h-3.5 text-[#935200]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#935200] mt-1">
                {destructiveCount}
              </div>
              <div className="text-[10px] text-[#756772] mt-0.5">
                Rows dropped or purged
              </div>
            </div>
          </div>

          {/* Head & Undo Action Banner */}
          {lineage.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#641B32] text-[#FFF8EF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#3D1023] text-[#D9A0AE] shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-[#3D1023] px-2 py-0.5 rounded text-[#D9A0AE]">
                      HEAD: {currentVersionLabel}
                    </span>
                    <span className="text-xs text-[#FFF8EF]/80">
                      Most recent: <strong className="text-[#FFF8EF]">{lineage[0].methodName.replace(/_/g, ' ')}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-[#D9A0AE] mt-1">
                    Every operation is reproducible from the raw snapshot. You can undo the latest step or roll back to any prior milestone.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => undoCleaningOperation()}
                  className="px-3.5 py-2 rounded-xl bg-[#FFF8EF] text-[#641B32] text-xs font-bold hover:bg-[#F8EFE5] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Most Recent</span>
                </button>
                <button
                  onClick={() => setShowRawResetConfirm(true)}
                  className="px-3 py-2 rounded-xl bg-[#3D1023] text-[#D9A0AE] border border-[#D9A0AE]/30 text-xs font-semibold hover:bg-[#29212A] transition-colors flex items-center gap-1.5"
                  title="Revert all transformations back to pristine v1.0 raw state"
                >
                  <span>Revert to Raw (v1.0)</span>
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter & Sort Toolbar */}
          <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
                <input
                  type="text"
                  placeholder="Search by Trace ID (e.g. DP-000184), method, column, reason, or analyst..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756772] hover:text-[#29212A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters Group */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Column Filter */}
                <select
                  value={filterColumn}
                  onChange={e => {
                    setFilterColumn(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-2 text-[#29212A] focus:outline-none focus:border-[#641B32]"
                >
                  <option value="all">All Columns</option>
                  {allColumns.map(col => (
                    <option key={col} value={col}>
                      Col: {col}
                    </option>
                  ))}
                </select>

                {/* Operation Filter */}
                <select
                  value={filterOperation}
                  onChange={e => {
                    setFilterOperation(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-2 text-[#29212A] focus:outline-none focus:border-[#641B32]"
                >
                  <option value="all">All Operations</option>
                  {presentOperationTypes.map(op => (
                    <option key={op} value={op}>
                      {op.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>

                {/* Outcome Filter */}
                <select
                  value={filterOutcome}
                  onChange={e => {
                    setFilterOutcome(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-2 text-[#29212A] focus:outline-none focus:border-[#641B32]"
                >
                  <option value="all">All Outcomes</option>
                  <option value="improved">Improved Only</option>
                  <option value="neutral">Neutral Only</option>
                  <option value="degraded">Degraded Only</option>
                </select>

                {/* Destructive Filter */}
                <select
                  value={filterDestructive}
                  onChange={e => {
                    setFilterDestructive(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-2 text-[#29212A] focus:outline-none focus:border-[#641B32]"
                >
                  <option value="all">All Safety Levels</option>
                  <option value="destructive">Destructive Only</option>
                  <option value="non_destructive">Non-Destructive</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-mono text-[#756772] hidden sm:inline">Sort:</span>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-2 text-[#29212A] focus:outline-none focus:border-[#641B32]"
                >
                  <option value="newest">Newest First (Head ↓)</option>
                  <option value="oldest">Oldest First (v1.0 ↑)</option>
                  <option value="impact">Highest Quality Gain</option>
                </select>
              </div>
            </div>

            {/* Active Filters Bar */}
            {(searchTerm || filterColumn !== 'all' || filterOperation !== 'all' || filterOutcome !== 'all' || filterDestructive !== 'all') && (
              <div className="flex items-center justify-between pt-2 border-t border-[#D9A0AE]/20 text-xs">
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#756772]">
                  <span>Active Filters:</span>
                  {searchTerm && (
                    <span className="px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] font-mono">
                      Query: &quot;{searchTerm}&quot;
                    </span>
                  )}
                  {filterColumn !== 'all' && (
                    <span className="px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] font-mono">
                      Col: {filterColumn}
                    </span>
                  )}
                  {filterOperation !== 'all' && (
                    <span className="px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] font-mono">
                      Op: {filterOperation}
                    </span>
                  )}
                  {filterOutcome !== 'all' && (
                    <span className="px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] font-mono">
                      Outcome: {filterOutcome}
                    </span>
                  )}
                  {filterDestructive !== 'all' && (
                    <span className="px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] font-mono">
                      Safety: {filterDestructive}
                    </span>
                  )}
                  <span className="text-[#29212A] font-bold">
                    ({filteredLineage.length} matched)
                  </span>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#641B32] hover:underline font-semibold"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Timeline & Records View */}
          {filteredLineage.length === 0 ? (
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-3xl p-12 text-center shadow-sm">
              <Clock className="w-12 h-12 text-[#756772] mx-auto mb-3 opacity-60" />
              <h3 className="font-serif font-bold text-lg text-[#29212A]">
                {lineage.length === 0
                  ? 'No Lineage History Recorded'
                  : 'No Matching Lineage Records'}
              </h3>
              <p className="text-xs sm:text-sm text-[#756772] mt-1 max-w-md mx-auto">
                {lineage.length === 0
                  ? `Dataset "${currentDataset.name}" is currently in its pristine raw state (v1.0 Raw). No cleaning operations or schema transformations have been applied yet.`
                  : 'No transformations match the current search filters. Try widening your search or clearing active filters.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {lineage.length === 0 ? (
                  <>
                    <button
                      onClick={() => navigate('/app/cleaning')}
                      className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors shadow-sm"
                    >
                      Open Cleaning Studio
                    </button>
                    <button
                      onClick={() => navigate('/app/quality')}
                      className="px-5 py-2.5 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#641B32] text-xs font-bold hover:bg-[#FFF8EF] transition-colors"
                    >
                      Inspect Quality Rules
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleResetFilters}
                    className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors shadow-sm"
                  >
                    Reset Search & Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pagination info bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#756772] px-2 gap-2">
                <div>
                  Showing{' '}
                  <strong className="text-[#29212A]">
                    {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, filteredLineage.length)}
                  </strong>{' '}
                  of <strong className="text-[#29212A]">{filteredLineage.length}</strong> transformation records
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-lg px-2 py-1 text-xs text-[#29212A] focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded-lg bg-[#F8EFE5] border border-[#D9A0AE]/30 text-[#756772] hover:text-[#29212A] disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-mono px-2 text-[11px]">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded-lg bg-[#F8EFE5] border border-[#D9A0AE]/30 text-[#756772] hover:text-[#29212A] disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chronological Timeline Cards */}
              <div className="relative border-l-2 border-[#D9A0AE]/40 ml-4 sm:ml-6 space-y-5 pl-4 sm:pl-6">
                {paginatedLineage.map((rec, index) => {
                  const isHead = index === 0 && currentPage === 1 && sortOrder === 'newest';
                  const stepIndex =
                    sortOrder === 'newest'
                      ? totalTransformations - ((currentPage - 1) * pageSize + index)
                      : (currentPage - 1) * pageSize + index + 1;

                  const scoreDiff =
                    rec.scoreBefore !== undefined && rec.scoreAfter !== undefined
                      ? (rec.scoreAfter - rec.scoreBefore).toFixed(1)
                      : null;

                  return (
                    <div
                      key={rec.id}
                      className={`relative bg-[#FFF8EF] border rounded-2xl p-5 transition-all shadow-sm space-y-4 hover:shadow-md ${
                        isHead
                          ? 'border-[#641B32] ring-2 ring-[#641B32]/10'
                          : 'border-[#D9A0AE]/30 hover:border-[#641B32]/40'
                      }`}
                    >
                      {/* Timeline Node Bullet */}
                      <div
                        className={`absolute -left-[25px] sm:-left-[33px] top-6 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isHead
                            ? 'bg-[#641B32] border-[#FFF8EF] shadow'
                            : 'bg-[#FFF8EF] border-[#641B32]'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isHead ? 'bg-[#FFF8EF]' : 'bg-[#641B32]'
                          }`}
                        />
                      </div>

                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D9A0AE]/20 gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Step Badge */}
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F8EFE5] text-[#756772] border border-[#D9A0AE]/30">
                            STEP #{stepIndex}
                          </span>

                          {/* Trace ID with Copy */}
                          <button
                            onClick={() => copyToClipboard(rec.traceId, rec.id)}
                            className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#641B32] text-[#FFF8EF] shadow-sm flex items-center gap-1.5 hover:bg-[#3D1023] transition-colors"
                            title="Click to copy Trace ID"
                          >
                            <span>{rec.traceId}</span>
                            {copiedTraceId === rec.id ? (
                              <Check className="w-3 h-3 text-[#277A58]" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-70" />
                            )}
                          </button>

                          {/* Active Head Badge */}
                          {isHead && (
                            <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-[#641B32] text-[#FFF8EF] shadow-sm animate-pulse">
                              CURRENT HEAD
                            </span>
                          )}

                          {/* Operation Title */}
                          <h3 className="font-bold text-sm text-[#29212A] capitalize">
                            {rec.methodName.replace(/_/g, ' ')}
                          </h3>

                          {/* Version Transition */}
                          {rec.beforeVersionId && rec.afterVersionId && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8EFE5] border border-[#D9A0AE]/30 text-[#641B32] font-semibold">
                              {rec.beforeVersionId} → {rec.afterVersionId}
                            </span>
                          )}

                          {/* Destructive Indicator */}
                          {rec.isDestructive ? (
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#B4233D]/10 text-[#B4233D] border border-[#B4233D]/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Destructive</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#277A58]/10 text-[#277A58]">
                              Safe
                            </span>
                          )}

                          {/* Validation Outcome */}
                          {rec.validationOutcome && (
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                                rec.validationOutcome === 'improved'
                                  ? 'bg-[#277A58]/10 text-[#277A58]'
                                  : rec.validationOutcome === 'degraded'
                                  ? 'bg-[#B4233D]/10 text-[#B4233D]'
                                  : 'bg-[#756772]/10 text-[#756772]'
                              }`}
                            >
                              {rec.validationOutcome}
                            </span>
                          )}

                          {/* Column Tag */}
                          {rec.columnName ? (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] border border-[#D9A0AE]/20">
                              col: {rec.columnName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F8EFE5] text-[#756772]">
                              Dataset-level
                            </span>
                          )}
                        </div>

                        {/* Timestamp & Actor */}
                        <div className="flex items-center gap-3 text-[11px] text-[#756772] font-mono shrink-0">
                          <span title={rec.timestamp}>
                            {new Date(rec.timestamp).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {rec.performedBy}
                          </span>
                        </div>
                      </div>

                      {/* Defect & Business Justification */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-[#F8EFE5] rounded-xl space-y-1">
                          <span className="text-[10px] text-[#756772] font-mono uppercase font-semibold block">
                            Trigger Defect
                          </span>
                          <span className="text-[#29212A] font-medium leading-relaxed">
                            {rec.detectedIssue}
                          </span>
                        </div>
                        <div className="p-3 bg-[#F8EFE5] rounded-xl space-y-1 md:col-span-2">
                          <span className="text-[10px] text-[#756772] font-mono uppercase font-semibold block">
                            Why did DataPulse change this?
                          </span>
                          <span className="text-[#29212A] leading-relaxed">
                            {rec.reason}
                          </span>
                        </div>
                      </div>

                      {/* Before / After Sample Value Diff */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-[#F8EFE5]/50 border border-[#D9A0AE]/20 rounded-xl text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-[#B4233D] font-bold block mb-1.5 flex items-center gap-1">
                            <span>RAW OBSERVATION (BEFORE):</span>
                          </span>
                          <div className="text-[11px] text-[#756772] space-y-1">
                            {rec.originalSample && rec.originalSample.length > 0 ? (
                              rec.originalSample.map((s, i) => (
                                <div key={i} className="truncate bg-[#FFF8EF] px-2 py-1 rounded border border-[#D9A0AE]/20">
                                  • {s}
                                </div>
                              ))
                            ) : (
                              <div className="text-[#756772]/60 italic">No sample values recorded</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#277A58] font-bold block mb-1.5 flex items-center gap-1">
                            <span>TRANSFORMED VALUE (AFTER):</span>
                          </span>
                          <div className="text-[11px] text-[#29212A] space-y-1">
                            {rec.transformedSample && rec.transformedSample.length > 0 ? (
                              rec.transformedSample.map((s, i) => (
                                <div key={i} className="truncate bg-[#FFF8EF] px-2 py-1 rounded border border-[#277A58]/20 text-[#277A58] font-medium">
                                  • {s}
                                </div>
                              ))
                            ) : (
                              <div className="text-[#756772]/60 italic">No sample values recorded</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Impact Stats & Action Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-[#D9A0AE]/20 gap-3">
                        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#756772]">
                          <span>
                            Affected: <strong className="text-[#29212A]">{rec.affectedRowsCount} rows</strong>
                          </span>
                          {rec.changedCellsCount !== undefined && (
                            <span>
                              Changed Cells: <strong className="text-[#29212A]">{rec.changedCellsCount}</strong>
                            </span>
                          )}
                          {rec.removedRowsCount !== undefined && rec.removedRowsCount > 0 && (
                            <span className="text-[#B4233D]">
                              Purged Rows: <strong>{rec.removedRowsCount}</strong>
                            </span>
                          )}
                          {scoreDiff !== null && (
                            <span
                              className={
                                Number(scoreDiff) > 0
                                  ? 'text-[#277A58] font-semibold'
                                  : Number(scoreDiff) < 0
                                  ? 'text-[#B4233D] font-semibold'
                                  : 'text-[#756772]'
                              }
                            >
                              Quality Score: {rec.scoreBefore}% → {rec.scoreAfter}% ({Number(scoreDiff) > 0 ? `+${scoreDiff}` : scoreDiff}%)
                            </span>
                          )}
                        </div>

                        {/* Actions: Inspect Trace & Rollback */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="px-3 py-1.5 rounded-lg bg-[#F8EFE5] border border-[#D9A0AE]/30 text-[#641B32] font-semibold text-xs hover:bg-[#FFF8EF] transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Full Trace</span>
                          </button>

                          {rec.afterVersionId && rec.afterVersionId !== currentVersionLabel && (
                            <button
                              onClick={() => setRollbackTarget(rec)}
                              className="px-3 py-1.5 rounded-lg bg-[#FFF8EF] border border-[#641B32]/30 text-[#641B32] font-semibold text-xs hover:bg-[#641B32] hover:text-[#FFF8EF] transition-colors flex items-center gap-1.5"
                              title={`Rollback dataset to ${rec.afterVersionId}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Rollback to this state</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 px-2 text-xs text-[#756772]">
                  <div>
                    Page <strong className="text-[#29212A]">{currentPage}</strong> of{' '}
                    <strong className="text-[#29212A]">{totalPages}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-[#F8EFE5] border border-[#D9A0AE]/30 text-[#29212A] disabled:opacity-40 font-semibold"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-[#F8EFE5] border border-[#D9A0AE]/30 text-[#29212A] disabled:opacity-40 font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TRANSFORMATION DETAIL INSPECTION DRAWER / MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-[#29212A]/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#FFF8EF] h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#D9A0AE]/40">
            {/* Drawer Header */}
            <div className="p-6 bg-[#641B32] text-[#FFF8EF] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[#3D1023] text-[#D9A0AE]">
                    {selectedRecord.traceId}
                  </span>
                  {selectedRecord.beforeVersionId && selectedRecord.afterVersionId && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3D1023]/70 text-[#FFF8EF]">
                      {selectedRecord.beforeVersionId} → {selectedRecord.afterVersionId}
                    </span>
                  )}
                  {selectedRecord.isDestructive ? (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#B4233D] text-[#FFF8EF] font-bold">
                      DESTRUCTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#277A58] text-[#FFF8EF]">
                      NON-DESTRUCTIVE
                    </span>
                  )}
                </div>
                <h2 className="font-serif text-xl font-bold mt-2 capitalize">
                  {selectedRecord.methodName.replace(/_/g, ' ')}
                </h2>
                <p className="text-xs text-[#D9A0AE] mt-0.5">
                  Immutable provenance record for dataset &quot;{selectedRecord.datasetName}&quot;
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl bg-[#3D1023] text-[#FFF8EF] hover:bg-[#29212A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Core Identifiers Table */}
              <div className="bg-[#F8EFE5] rounded-2xl p-4 border border-[#D9A0AE]/30 space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#756772]">
                  Trace Provenance & Metadata
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#756772] font-mono block">TRACE ID</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-[#641B32]">{selectedRecord.traceId}</span>
                      <button
                        onClick={() => copyToClipboard(selectedRecord.traceId, 'modal')}
                        className="text-[#756772] hover:text-[#29212A]"
                        title="Copy Trace ID"
                      >
                        {copiedTraceId === 'modal' ? (
                          <Check className="w-3 h-3 text-[#277A58]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#756772] font-mono block">DATASET ID</span>
                    <span className="font-mono text-[#29212A] mt-0.5 block truncate">
                      {selectedRecord.datasetId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#756772] font-mono block">TIMESTAMP</span>
                    <span className="font-mono text-[#29212A] mt-0.5 block">
                      {new Date(selectedRecord.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#756772] font-mono block">ACTOR / AUTHORITY</span>
                    <span className="font-mono text-[#29212A] mt-0.5 block">
                      {selectedRecord.performedBy}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#756772] font-mono block">AFFECTED COLUMN</span>
                    <span className="font-mono text-[#29212A] mt-0.5 block">
                      {selectedRecord.columnName ? selectedRecord.columnName : 'None (Dataset-wide)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#756772] font-mono block">VALIDATION OUTCOME</span>
                    <span className="font-mono font-bold capitalize text-[#277A58] mt-0.5 block">
                      {selectedRecord.validationOutcome || 'Neutral'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Justification & Detected Rule Defect */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#756772]">
                  Defect Diagnosis & Remediation Justification
                </h3>
                <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#756772] font-semibold block">
                      Detected Rule Defect
                    </span>
                    <p className="text-xs text-[#29212A] font-medium mt-1">
                      {selectedRecord.detectedIssue}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#D9A0AE]/20">
                    <span className="text-[10px] font-mono uppercase text-[#756772] font-semibold block">
                      Action Justification & Rationale
                    </span>
                    <p className="text-xs text-[#29212A] mt-1 leading-relaxed">
                      {selectedRecord.reason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parameters & Configuration */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#756772]">
                  Operation Parameters
                </h3>
                <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 text-xs">
                  {selectedRecord.params && Object.keys(selectedRecord.params).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {Object.entries(selectedRecord.params).map(([key, val]) => (
                        <div key={key} className="bg-[#FFF8EF] p-2 rounded-lg border border-[#D9A0AE]/20">
                          <span className="text-[10px] text-[#756772] block">{key}</span>
                          <span className="font-bold text-[#29212A]">
                            {val === null || val === undefined ? 'null' : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#756772] italic font-mono text-[11px]">
                      Standard deterministic algorithm heuristics applied (no custom threshold override provided).
                    </div>
                  )}
                </div>
              </div>

              {/* Row & Cell Impact Metrics */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#756772]">
                  Row & Cell Impact Metrics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#F8EFE5] rounded-xl border border-[#D9A0AE]/30 text-center">
                    <span className="text-[10px] font-mono text-[#756772] uppercase block">
                      Affected Rows
                    </span>
                    <div className="text-lg font-mono font-bold text-[#29212A] mt-1">
                      {selectedRecord.affectedRowsCount}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8EFE5] rounded-xl border border-[#D9A0AE]/30 text-center">
                    <span className="text-[10px] font-mono text-[#756772] uppercase block">
                      Changed Cells
                    </span>
                    <div className="text-lg font-mono font-bold text-[#29212A] mt-1">
                      {selectedRecord.changedCellsCount !== undefined
                        ? selectedRecord.changedCellsCount
                        : selectedRecord.affectedRowsCount}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8EFE5] rounded-xl border border-[#D9A0AE]/30 text-center">
                    <span className="text-[10px] font-mono text-[#756772] uppercase block">
                      Removed Rows
                    </span>
                    <div className="text-lg font-mono font-bold text-[#B4233D] mt-1">
                      {selectedRecord.removedRowsCount !== undefined
                        ? selectedRecord.removedRowsCount
                        : selectedRecord.isDestructive
                        ? selectedRecord.affectedRowsCount
                        : 0}
                    </div>
                  </div>
                </div>

                {/* Specific affected row indices if available */}
                {selectedRecord.affectedRowIndices && selectedRecord.affectedRowIndices.length > 0 && (
                  <div className="p-3 bg-[#F8EFE5] rounded-xl border border-[#D9A0AE]/30 text-xs">
                    <span className="text-[10px] font-mono uppercase text-[#756772] block mb-2 font-semibold">
                      Identified Row Positions (First {Math.min(selectedRecord.affectedRowIndices.length, 30)} rows):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {selectedRecord.affectedRowIndices.slice(0, 30).map(idx => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-[#FFF8EF] border border-[#D9A0AE]/30 text-[10px] font-mono text-[#641B32]"
                        >
                          Row #{idx + 1}
                        </span>
                      ))}
                      {selectedRecord.affectedRowIndices.length > 30 && (
                        <span className="text-[10px] font-mono text-[#756772] self-center">
                          +{selectedRecord.affectedRowIndices.length - 30} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quality Score Shift */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#756772]">
                  Deterministic Quality Score Shift
                </h3>
                <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 flex items-center justify-between">
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-[#756772] uppercase block">Before</span>
                    <div className="text-lg font-mono font-bold text-[#29212A] mt-0.5">
                      {selectedRecord.scoreBefore !== undefined ? `${selectedRecord.scoreBefore}%` : 'N/A'}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#641B32]" />
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-[#756772] uppercase block">After</span>
                    <div className="text-lg font-mono font-bold text-[#277A58] mt-0.5">
                      {selectedRecord.scoreAfter !== undefined ? `${selectedRecord.scoreAfter}%` : 'N/A'}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-[#756772] uppercase block">Delta</span>
                    <div className="text-lg font-mono font-bold text-[#641B32] mt-0.5">
                      {selectedRecord.scoreBefore !== undefined && selectedRecord.scoreAfter !== undefined ? (
                        <>
                          {selectedRecord.scoreAfter >= selectedRecord.scoreBefore ? '+' : ''}
                          {(selectedRecord.scoreAfter - selectedRecord.scoreBefore).toFixed(1)}%
                        </>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Value Diff Comparison */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#756772]">
                  Observed Cell Value Diff
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#B4233D] block">
                      ORIGINAL RAW (BEFORE):
                    </span>
                    {selectedRecord.originalSample.map((s, i) => (
                      <div key={i} className="p-1.5 rounded bg-[#FFF8EF] border border-[#D9A0AE]/20 text-[11px] truncate">
                        {s}
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#277A58] block">
                      TRANSFORMED (AFTER):
                    </span>
                    {selectedRecord.transformedSample.map((s, i) => (
                      <div key={i} className="p-1.5 rounded bg-[#FFF8EF] border border-[#277A58]/20 text-[11px] text-[#277A58] truncate">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 bg-[#F8EFE5] border-t border-[#D9A0AE]/30 flex items-center justify-between">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/30 text-xs font-bold text-[#29212A] hover:bg-[#F8EFE5]"
              >
                Close Details
              </button>

              {selectedRecord.afterVersionId && selectedRecord.afterVersionId !== currentVersionLabel && (
                <button
                  onClick={() => {
                    setRollbackTarget(selectedRecord);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rollback to {selectedRecord.afterVersionId}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROLLBACK CONFIRMATION MODAL */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 bg-[#29212A]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFF8EF] rounded-3xl border border-[#D9A0AE]/40 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#641B32]/10 flex items-center justify-center text-[#641B32]">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-[#3D1023]">
                Confirm Version Rollback
              </h3>
              <p className="text-xs text-[#756772] mt-1 leading-relaxed">
                You are rolling back dataset <strong>{currentDataset.name}</strong> to milestone{' '}
                <strong className="text-[#641B32]">{rollbackTarget.afterVersionId}</strong> (Trace {rollbackTarget.traceId}).
              </p>
            </div>

            <div className="p-3 bg-[#F8EFE5] rounded-xl text-xs space-y-1.5 border border-[#D9A0AE]/20">
              <div className="flex justify-between">
                <span className="text-[#756772]">Current Version:</span>
                <span className="font-mono font-bold text-[#29212A]">{currentVersionLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#756772]">Target Version:</span>
                <span className="font-mono font-bold text-[#641B32]">{rollbackTarget.afterVersionId}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#756772] pt-1 border-t border-[#D9A0AE]/20">
                <span>Preserves Raw Baseline:</span>
                <span className="text-[#277A58] font-bold">Yes (Non-destructive)</span>
              </div>
            </div>

            <p className="text-[11px] text-[#756772]">
              Any transformations executed after this milestone will be reverted by replaying the deterministic lineage from the original raw snapshot.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRollbackTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#756772] hover:text-[#29212A]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRollback}
                className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors shadow-sm"
              >
                Confirm & Roll Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVERT TO RAW (v1.0) CONFIRMATION MODAL */}
      {showRawResetConfirm && (
        <div className="fixed inset-0 z-50 bg-[#29212A]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFF8EF] rounded-3xl border border-[#D9A0AE]/40 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#B4233D]/10 flex items-center justify-center text-[#B4233D]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-[#3D1023]">
                Revert to Pristine Raw State (v1.0)?
              </h3>
              <p className="text-xs text-[#756772] mt-1 leading-relaxed">
                This will reset the dataset to its original uploaded state and clear all {lineage.length} cleaning transformations.
              </p>
            </div>

            <div className="p-3 bg-[#F8EFE5] rounded-xl text-xs text-[#756772] border border-[#D9A0AE]/20">
              The original raw dataset records are completely immutable and will be restored immediately.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRawResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#756772] hover:text-[#29212A]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRawReset}
                className="px-5 py-2.5 rounded-xl bg-[#B4233D] text-[#FFF8EF] text-xs font-bold hover:bg-[#8A182D] transition-colors shadow-sm"
              >
                Yes, Restore Raw v1.0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
