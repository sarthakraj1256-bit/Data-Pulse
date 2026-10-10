import React, { useState, useMemo } from 'react';
import {
  Wand2,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  GitBranch,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  Info,
  Check,
  Filter,
  Search,
  Sparkles,
  Trash2,
  Table,
  Layers,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { CleaningEngine, PreviewResult, isDestructiveOperation } from '../services/cleaningEngine';
import { ExportService } from '../services/exportService';
import {
  CleaningOperationType,
  QualityDimensionType,
  QualityIssue,
  CleaningRecommendation
} from '../types';

interface CleaningStudioProps {
  navigate: (path: string) => void;
}

export const CleaningStudio: React.FC<CleaningStudioProps> = ({ navigate }) => {
  const { currentDataset, applyCleaningOperation, undoCleaningOperation, showToast } = useDataset();

  // State: Issue Explorer Filters
  const [selectedDimension, setSelectedDimension] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedDefectType, setSelectedDefectType] = useState<string>('all'); // 'all' | 'violation' | 'anomaly'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // State: Cleaning Configuration
  const [selectedMethod, setSelectedMethod] = useState<CleaningOperationType>('remove_duplicates');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [paramConstantVal, setParamConstantVal] = useState<string>('UNKNOWN');
  const [paramClampMin, setParamClampMin] = useState<string>('');
  const [paramClampMax, setParamClampMax] = useState<string>('');
  const [paramTargetVal, setParamTargetVal] = useState<string>('');
  const [paramReplaceVal, setParamReplaceVal] = useState<string>('');

  // State: Preview & Approval
  const [activePreview, setActivePreview] = useState<PreviewResult | null>(null);
  const [previewMethod, setPreviewMethod] = useState<CleaningOperationType | null>(null);
  const [previewColumn, setPreviewColumn] = useState<string | null>(null);
  const [approvedDestructive, setApprovedDestructive] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // State: Data Preview View Mode
  const [dataViewMode, setDataViewMode] = useState<'cleaned' | 'raw' | 'diff'>('cleaned');
  const [page, setPage] = useState(0);
  const rowsPerPage = 12;

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto my-12">
        <Wand2 className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Active Dataset Selected</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Select an active dataset from the Library or upload a new file to enter the Traceable Cleaning Studio.
        </p>
        <button
          onClick={() => navigate('/app/datasets')}
          className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-all"
        >
          Browse Dataset Library
        </button>
      </div>
    );
  }

  const issues = currentDataset.qualityAssessment.issues;
  const columns = currentDataset.columns;
  const recommendations = CleaningEngine.generateRecommendations(currentDataset);

  // Filtered issues list for Issue Explorer
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (selectedDimension !== 'all' && issue.dimension !== selectedDimension) return false;
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) return false;
      if (selectedDefectType === 'violation' && issue.isAnomaly) return false;
      if (selectedDefectType === 'anomaly' && !issue.isAnomaly) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCol = issue.column?.toLowerCase().includes(q);
        const matchDesc = issue.description.toLowerCase().includes(q);
        const matchExp = issue.explanation.toLowerCase().includes(q);
        if (!matchCol && !matchDesc && !matchExp) return false;
      }
      return true;
    });
  }, [issues, selectedDimension, selectedSeverity, selectedDefectType, searchQuery]);

  // Handle selecting an issue from Area 1 (Issue Explorer)
  const handleSelectIssue = (issue: QualityIssue) => {
    setSelectedIssueId(issue.id);
    if (issue.column) {
      setSelectedColumn(issue.column);
    }

    // Auto-map recommendation to operation method
    const matchingRec = recommendations.find(r => r.column === issue.column && r.issueType === issue.dimension);
    if (matchingRec) {
      setSelectedMethod(matchingRec.method);
    } else {
      if (issue.dimension === 'completeness') setSelectedMethod('impute_median');
      else if (issue.dimension === 'uniqueness') setSelectedMethod('remove_duplicates');
      else if (issue.dimension === 'consistency') {
        setSelectedMethod(issue.id.includes('trim') ? 'trim_whitespace' : 'standardize_case_upper');
      } else if (issue.dimension === 'plausibility') setSelectedMethod('cap_outliers_iqr');
      else if (issue.dimension === 'validity') setSelectedMethod('coerce_numeric');
      else if (issue.dimension === 'timeliness') setSelectedMethod('normalize_date_iso');
    }

    // Clear previous preview so user re-previews new selection
    setActivePreview(null);
    setApprovedDestructive(false);
  };

  // Build params payload for preview/apply
  const buildParams = () => {
    const p: Record<string, any> = {};
    if (selectedMethod === 'impute_constant') p.constantValue = paramConstantVal;
    if (selectedMethod === 'clamp_range') {
      if (paramClampMin !== '') p.min = Number(paramClampMin);
      if (paramClampMax !== '') p.max = Number(paramClampMax);
    }
    if (selectedMethod === 'custom_replace') {
      p.targetValue = paramTargetVal;
      p.replacementValue = paramReplaceVal;
    }
    return p;
  };

  // Run Preview Calculation
  const handleCalculatePreview = () => {
    const params = buildParams();
    const result = CleaningEngine.previewOperation(
      currentDataset.cleanedRecords,
      selectedMethod,
      selectedColumn || undefined,
      params
    );

    setActivePreview(result);
    setPreviewMethod(selectedMethod);
    setPreviewColumn(selectedColumn);
    setApprovedDestructive(false);
    setDataViewMode('diff');

    if (result.affectedCount === 0) {
      showToast('Preview completed: 0 rows match this operation criteria.', 'info');
    } else {
      showToast(
        `Preview ready: ${result.affectedCount} row(s) impacted. Review changes before applying.`,
        'info'
      );
    }
  };

  // Apply transformation
  const handleApplyTransformation = () => {
    if (!activePreview) {
      showToast('Please generate a preview before applying changes.', 'warning');
      return;
    }

    if (activePreview.isDestructive && !approvedDestructive) {
      showToast('Destructive transformation requires explicit confirmation checkbox.', 'error');
      return;
    }

    setIsApplying(true);
    try {
      const reason =
        customReason.trim() ||
        `Applied ${selectedMethod.replace(/_/g, ' ')} on ${selectedColumn || 'dataset'}`;

      const params = buildParams();
      const { updated, lineage } = applyCleaningOperation(
        selectedMethod,
        selectedColumn || undefined,
        reason,
        params
      );

      // Reset preview state
      setActivePreview(null);
      setPreviewMethod(null);
      setPreviewColumn(null);
      setApprovedDestructive(false);
      setCustomReason('');
      setDataViewMode('cleaned');
    } catch (err: any) {
      showToast(`Transformation failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Records to display in Data Preview
  const displayRecords = useMemo(() => {
    if (dataViewMode === 'diff' && activePreview) {
      return activePreview.previewRecords;
    }
    if (dataViewMode === 'raw') {
      return currentDataset.rawRecords;
    }
    return currentDataset.cleanedRecords;
  }, [dataViewMode, activePreview, currentDataset]);

  const totalPages = Math.ceil(displayRecords.length / rowsPerPage);
  const paginatedRows = displayRecords.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Method explanation text helper
  const getMethodExplanation = (method: CleaningOperationType) => {
    switch (method) {
      case 'remove_duplicates':
        return 'Identifies identical record signatures across all attributes and eliminates redundant instances, preserving the primary ingest occurrence.';
      case 'impute_median':
        return 'Calculates the true mathematical median of populated numeric records and replaces null/empty cells. Robust against skewness and extreme outliers.';
      case 'impute_mean':
        return 'Calculates the arithmetic mean of populated numeric entries and substitutes missing values. Ideal for normally distributed sensor telemetry.';
      case 'impute_mode':
        return 'Identifies the most frequent non-empty categorical value and assigns it to blank rows.';
      case 'impute_constant':
        return 'Fills blank values with an explicit constant placeholder (e.g. UNKNOWN or 0) to maintain data volume.';
      case 'impute_forward_fill':
        return 'Propagates the last observed valid reading forward into consecutive blank rows. Ideal for continuous time-series.';
      case 'drop_missing_rows':
        return 'Permanently purges rows containing null or empty values in the target column. DESTRUCTIVE: Reduces total dataset row count.';
      case 'trim_whitespace':
        return 'Strips leading and trailing whitespace characters from text strings to eliminate grouping fragmentation.';
      case 'standardize_case_upper':
        return 'Transforms string values to uppercase to unify casing variants (e.g., "online" and "ONLINE").';
      case 'standardize_case_lower':
        return 'Transforms string values to lowercase for uniform classification.';
      case 'normalize_date_iso':
        return 'Parses arbitrary date/time formats and harmonizes them into standard ISO-8601 strings (YYYY-MM-DDTHH:mm:ss.sssZ).';
      case 'clamp_range':
        return 'Enforces configured numerical boundaries. Values below Minimum are clamped to Minimum; values above Maximum are clamped to Maximum.';
      case 'cap_outliers_iqr':
        return 'Calculates Interquartile Range (IQR = Q3 - Q1) and winsorizes values exceeding Q1 - 1.5*IQR or Q3 + 1.5*IQR without deleting records.';
      case 'drop_outliers':
        return 'Deletes rows whose target attribute falls outside the 1.5*IQR statistical envelope. DESTRUCTIVE: Removes rows.';
      case 'flag_outliers':
        return 'Adds a boolean metadata column (_outlier_<column>) marking extreme readings without altering original measurements.';
      case 'coerce_numeric':
        return 'Attempts to parse text strings into IEEE floating point numbers; converts unparseable corrupt strings into null.';
      case 'custom_replace':
        return 'Finds occurrences of an exact target value and substitutes the replacement value.';
      default:
        return 'Custom transformation rule applied deterministically across matching records.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#641B32] text-[#FFF8EF]">
              <Wand2 className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
              Traceable Cleaning Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#756772] mt-1">
            Human-in-the-loop quality remediation with raw immutability for{' '}
            <strong className="text-[#641B32]">{currentDataset.name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 p-0.5 shadow-xs">
            <button
              onClick={() => {
                ExportService.downloadCleanedDatasetWithSummaryCSV(currentDataset);
                showToast(`Exported cleaned CSV for ${currentDataset.name}`, 'success');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#641B32] hover:bg-[#F8EFE5] transition-colors flex items-center gap-1.5"
              title="Download cleaned dataset with session transformations as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <div className="w-[1px] h-4 bg-[#D9A0AE]/40" />
            <button
              onClick={() => {
                ExportService.downloadCleanedDatasetWithSummaryJSON(currentDataset);
                showToast(`Exported cleaned JSON for ${currentDataset.name}`, 'success');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#641B32] hover:bg-[#F8EFE5] transition-colors flex items-center gap-1.5"
              title="Download cleaned dataset with session transformation audit as JSON"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

          <button
            onClick={() => undoCleaningOperation()}
            disabled={currentDataset.lineage.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#F8EFE5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-xs"
            title="Revert the most recent transformation while preserving original raw snapshot"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Last Action</span>
          </button>
          <button
            onClick={() => navigate('/app/lineage')}
            className="px-3.5 py-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#3D1023] font-semibold text-xs hover:bg-[#FFF8EF] transition-colors flex items-center gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Trace Ledger ({currentDataset.lineage.length})</span>
          </button>
        </div>
      </div>

      {/* Real-time Quality Score Banner & Workflow Steps */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[#641B32] font-bold">LIFECYCLE:</span>
          <span className="text-[#29212A]">1. Explore Issues</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#641B32] font-semibold">2. Configure Method</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#29212A]">3. Preview Diff</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#277A58] font-semibold">4. Approve & Apply</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#641B32] font-bold">5. Re-evaluate Quality</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#756772]">
            Current Score:{' '}
            <strong
              className={`font-mono text-sm ${
                currentDataset.qualityAssessment.overallScore >= 90
                  ? 'text-[#277A58]'
                  : currentDataset.qualityAssessment.overallScore >= 70
                  ? 'text-[#B77722]'
                  : 'text-[#B4233D]'
              }`}
            >
              {currentDataset.qualityAssessment.overallScore}%
            </strong>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFF8EF] text-[#641B32] border border-[#D9A0AE]/30 font-semibold">
            {currentDataset.qualityAssessment.cleanRowsCount} / {currentDataset.rowCount} rows pristine
          </span>
        </div>
      </div>

      {/* Main Studio Grid: Area 1 (Issue Explorer) & Area 3 (Cleaning Configuration) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AREA 1: ISSUE EXPLORER (5 cols) */}
        <div className="lg:col-span-5 bg-[#F8EFE5]/70 border border-[#D9A0AE]/30 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#D9A0AE]/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B77722]" />
                <h2 className="font-serif font-bold text-base text-[#3D1023]">
                  1. Issue Explorer ({filteredIssues.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#756772]">
                {issues.length} total defects
              </span>
            </div>

            {/* Filters Row */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756772]" />
                <input
                  type="text"
                  placeholder="Filter by column or issue keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-xl focus:outline-none focus:border-[#641B32] text-[#29212A]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <select
                  value={selectedDimension}
                  onChange={e => setSelectedDimension(e.target.value)}
                  className="px-2 py-1.5 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none"
                >
                  <option value="all">All Dimensions</option>
                  <option value="completeness">Completeness</option>
                  <option value="validity">Validity</option>
                  <option value="consistency">Consistency</option>
                  <option value="uniqueness">Uniqueness</option>
                  <option value="timeliness">Timeliness</option>
                  <option value="plausibility">Plausibility</option>
                </select>

                <select
                  value={selectedSeverity}
                  onChange={e => setSelectedSeverity(e.target.value)}
                  className="px-2 py-1.5 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={selectedDefectType}
                  onChange={e => setSelectedDefectType(e.target.value)}
                  className="px-2 py-1.5 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none"
                >
                  <option value="all">All Defect Types</option>
                  <option value="violation">Rule Violations</option>
                  <option value="anomaly">Anomalies</option>
                </select>
              </div>
            </div>

            {/* Issues Scrollable List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="p-8 text-center bg-[#277A58]/5 rounded-2xl border border-[#277A58]/20 text-xs text-[#277A58] space-y-1">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-[#277A58]" />
                  <strong className="block">No matching issues found</strong>
                  <span>Dataset satisfies all filtered quality rules.</span>
                </div>
              ) : (
                filteredIssues.map(issue => {
                  const isSelected = selectedIssueId === issue.id;
                  return (
                    <div
                      key={issue.id}
                      onClick={() => handleSelectIssue(issue)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all text-xs space-y-1.5 ${
                        isSelected
                          ? 'bg-[#FFF8EF] border-[#641B32] shadow-sm ring-1 ring-[#641B32]'
                          : 'bg-[#FFF8EF]/80 border-[#D9A0AE]/30 hover:border-[#641B32]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                              issue.severity === 'high'
                                ? 'bg-[#B4233D] text-[#FFF8EF]'
                                : issue.severity === 'medium'
                                ? 'bg-[#B77722] text-[#FFF8EF]'
                                : 'bg-[#756772] text-[#FFF8EF]'
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-[#756772] bg-[#F8EFE5] px-1.5 py-0.5 rounded border border-[#D9A0AE]/20">
                            {issue.dimension}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              issue.isAnomaly
                                ? 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/30'
                                : 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/30'
                            }`}
                          >
                            {issue.isAnomaly ? 'Anomaly' : 'Rule Violation'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#756772]">
                          {issue.affectedRowsCount} rows
                        </span>
                      </div>

                      <div className="font-bold text-[#29212A] text-xs">
                        {issue.column ? (
                          <span>
                            Field: <code className="text-[#641B32] font-mono">[{issue.column}]</code>
                          </span>
                        ) : (
                          <span>Dataset-wide Issue</span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#756772] leading-relaxed line-clamp-2">
                        {issue.description}
                      </p>

                      <div className="pt-1.5 border-t border-[#D9A0AE]/20 flex items-center justify-between text-[10px]">
                        <span className="text-[#641B32] font-medium truncate max-w-[80%]">
                          Fix: {issue.recommendedFix}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#641B32]" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* AREA 3: CLEANING CONFIGURATION & CONTROLS (7 cols) */}
        <div className="lg:col-span-7 bg-[#F8EFE5]/70 border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D9A0AE]/20">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#641B32]" />
                <h2 className="font-serif font-bold text-base text-[#3D1023]">
                  2. Cleaning Configuration & Controls
                </h2>
              </div>
              {selectedIssueId && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#641B32]/10 text-[#641B32] font-semibold">
                  Linked to Selected Issue
                </span>
              )}
            </div>

            {/* Operation & Column Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#29212A] mb-1">
                  Cleaning Operation Method:
                </label>
                <select
                  value={selectedMethod}
                  onChange={e => {
                    setSelectedMethod(e.target.value as CleaningOperationType);
                    setActivePreview(null);
                    setApprovedDestructive(false);
                  }}
                  className="w-full px-3 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32] font-medium"
                >
                  <optgroup label="Missing Value Handling">
                    <option value="impute_median">Impute Missing with Median (Numeric)</option>
                    <option value="impute_mean">Impute Missing with Mean (Numeric)</option>
                    <option value="impute_mode">Impute Missing with Mode (Categorical)</option>
                    <option value="impute_constant">Impute Missing with Custom Constant</option>
                    <option value="impute_forward_fill">Forward Fill Last Observed Value</option>
                    <option value="drop_missing_rows">Drop Incomplete Rows (Destructive)</option>
                  </optgroup>
                  <optgroup label="Deduplication">
                    <option value="remove_duplicates">Eliminate Duplicate Records</option>
                  </optgroup>
                  <optgroup label="Format & String Normalization">
                    <option value="trim_whitespace">Trim Leading & Trailing Whitespace</option>
                    <option value="standardize_case_upper">Standardize to Uppercase</option>
                    <option value="standardize_case_lower">Standardize to Lowercase</option>
                    <option value="normalize_date_iso">Normalize Timestamps to ISO-8601</option>
                  </optgroup>
                  <optgroup label="Range & Outlier Treatment">
                    <option value="clamp_range">Clamp to Configured Min/Max Range</option>
                    <option value="cap_outliers_iqr">Cap Extreme Outliers (IQR Envelope)</option>
                    <option value="flag_outliers">Flag Outliers for Audit (Add Column)</option>
                    <option value="drop_outliers">Drop Outlier Rows (Destructive)</option>
                  </optgroup>
                  <optgroup label="Type Coercion & Custom">
                    <option value="coerce_numeric">Sanitize & Coerce to Numeric</option>
                    <option value="custom_replace">Custom Value Replacement</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#29212A] mb-1">
                  Target Field / Attribute:
                </label>
                <select
                  value={selectedColumn}
                  onChange={e => {
                    setSelectedColumn(e.target.value);
                    setActivePreview(null);
                    setApprovedDestructive(false);
                  }}
                  disabled={selectedMethod === 'remove_duplicates'}
                  className="w-full px-3 py-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32] font-medium disabled:opacity-50"
                >
                  <option value="">{selectedMethod === 'remove_duplicates' ? '(Entire Row Tuple)' : 'Select Target Column...'}</option>
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.inferredType}) {c.nullCount > 0 ? `• ${c.nullCount} nulls` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Parameter Settings based on Method */}
            {selectedMethod === 'impute_constant' && (
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 text-xs">
                <label className="block font-semibold text-[#29212A] mb-1">
                  Constant Placeholder Value:
                </label>
                <input
                  type="text"
                  value={paramConstantVal}
                  onChange={e => setParamConstantVal(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none"
                  placeholder="e.g. UNKNOWN, 0, N/A"
                />
              </div>
            )}

            {selectedMethod === 'clamp_range' && (
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 text-xs grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#29212A] mb-1">Minimum Bound:</label>
                  <input
                    type="number"
                    value={paramClampMin}
                    onChange={e => setParamClampMin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none font-mono"
                    placeholder="-40"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#29212A] mb-1">Maximum Bound:</label>
                  <input
                    type="number"
                    value={paramClampMax}
                    onChange={e => setParamClampMax(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none font-mono"
                    placeholder="80"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'custom_replace' && (
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 text-xs grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#29212A] mb-1">Target Value to Find:</label>
                  <input
                    type="text"
                    value={paramTargetVal}
                    onChange={e => setParamTargetVal(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none font-mono"
                    placeholder="e.g. ERR_99"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#29212A] mb-1">Replacement Value:</label>
                  <input
                    type="text"
                    value={paramReplaceVal}
                    onChange={e => setParamReplaceVal(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-lg text-[#29212A] focus:outline-none font-mono"
                    placeholder="e.g. 0 or Valid String"
                  />
                </div>
              </div>
            )}

            {/* Method Explanation Box */}
            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 text-xs text-[#756772] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#641B32]">
                <Info className="w-3.5 h-3.5" />
                <span>Deterministic Method Explanation:</span>
              </div>
              <p className="leading-relaxed">{getMethodExplanation(selectedMethod)}</p>
            </div>

            {/* Audit Trace Reason Input */}
            <div>
              <label className="block text-xs font-semibold text-[#29212A] mb-1">
                Audit Trace Justification (recorded in DP lineage):
              </label>
              <input
                type="text"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder={`Remediate ${selectedMethod.replace(/_/g, ' ')} on ${selectedColumn || 'dataset'}`}
                className="w-full px-3 py-2 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32]"
              />
            </div>

            {/* Preview Output Banner if calculated */}
            {activePreview && (
              <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#641B32]/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-[#D9A0AE]/30 text-xs">
                  <span className="font-bold text-[#641B32] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#641B32]" />
                    Preview Ready: {activePreview.affectedCount} row(s) impacted
                  </span>
                  <span className="font-mono text-[10px] text-[#756772]">
                    Simulated without mutating state
                  </span>
                </div>

                {/* Before & After Samples */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F8EFE5] border border-[#B4233D]/20">
                    <span className="text-[10px] font-mono font-bold text-[#B4233D] block mb-1">
                      BEFORE TRANSFORMATION:
                    </span>
                    <div className="space-y-0.5 font-mono text-[11px] text-[#29212A]">
                      {activePreview.sampleBefore.length > 0 ? (
                        activePreview.sampleBefore.map((s, i) => (
                          <div key={i} className="truncate">• {s}</div>
                        ))
                      ) : (
                        <span className="text-[#756772]">(No matching values)</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8EFE5] border border-[#277A58]/20">
                    <span className="text-[10px] font-mono font-bold text-[#277A58] block mb-1">
                      PROPOSED RESULT:
                    </span>
                    <div className="space-y-0.5 font-mono text-[11px] text-[#29212A]">
                      {activePreview.sampleAfter.length > 0 ? (
                        activePreview.sampleAfter.map((s, i) => (
                          <div key={i} className="truncate">• {s}</div>
                        ))
                      ) : (
                        <span className="text-[#756772]">(No changes calculated)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Destructive Warning and Checkbox Approval */}
                {activePreview.isDestructive && (
                  <div className="p-3 rounded-xl bg-[#B4233D]/10 border border-[#B4233D]/30 text-xs space-y-2">
                    <div className="flex items-start gap-2 text-[#B4233D] font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{activePreview.warningMessage}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-[#29212A]">
                      <input
                        type="checkbox"
                        checked={approvedDestructive}
                        onChange={e => setApprovedDestructive(e.target.checked)}
                        className="w-4 h-4 accent-[#641B32] rounded cursor-pointer"
                      />
                      <span>I explicitly authorize deleting these {activePreview.affectedCount} record(s) from this cleaned version.</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Preview & Apply */}
          <div className="pt-4 border-t border-[#D9A0AE]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              onClick={handleCalculatePreview}
              className="px-4 py-2.5 rounded-xl bg-[#FFF8EF] border border-[#641B32] text-[#641B32] font-bold hover:bg-[#F8EFE5] transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Transformation</span>
            </button>

            <button
              onClick={handleApplyTransformation}
              disabled={!activePreview || isApplying || (activePreview.isDestructive && !approvedDestructive)}
              className="px-6 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold hover:bg-[#3D1023] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#FFF8EF] border-t-transparent rounded-full animate-spin" />
                  <span>Applying & Re-evaluating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Apply Transformation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AREA 2: DATA PREVIEW & PROBLEM CELL HIGHLIGHTING */}
      <div className="bg-[#F8EFE5]/70 border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9A0AE]/30">
          <div>
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <Table className="w-4 h-4 text-[#641B32]" />
              3. Data Preview Matrix & Highlighted Records
            </h3>
            <p className="text-xs text-[#756772] mt-0.5">
              Inspecting {displayRecords.length} records. Problematic or modified cells are highlighted below.
            </p>
          </div>

          {/* View Mode Toggle: Cleaned vs Raw Snapshot vs Preview Diff */}
          <div className="flex items-center gap-1 bg-[#FFF8EF] p-1 rounded-xl border border-[#D9A0AE]/30 text-xs">
            <button
              onClick={() => setDataViewMode('cleaned')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                dataViewMode === 'cleaned'
                  ? 'bg-[#641B32] text-[#FFF8EF]'
                  : 'text-[#756772] hover:bg-[#F8EFE5]'
              }`}
            >
              Active Cleaned Data
            </button>
            <button
              onClick={() => setDataViewMode('raw')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                dataViewMode === 'raw'
                  ? 'bg-[#641B32] text-[#FFF8EF]'
                  : 'text-[#756772] hover:bg-[#F8EFE5]'
              }`}
            >
              Original Raw Snapshot
            </button>
            {activePreview && (
              <button
                onClick={() => setDataViewMode('diff')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  dataViewMode === 'diff'
                    ? 'bg-[#277A58] text-[#FFF8EF]'
                    : 'text-[#756772] hover:bg-[#F8EFE5]'
                }`}
              >
                Simulated Preview Diff
              </button>
            )}
          </div>
        </div>

        {/* Data Table with Highlighted Problem Cells */}
        <div className="overflow-x-auto rounded-2xl border border-[#D9A0AE]/30 bg-[#FFF8EF]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8EFE5] text-[#756772] border-b border-[#D9A0AE]/30 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-14">#</th>
                {columns.map(c => (
                  <th
                    key={c.name}
                    className={`py-2.5 px-3 font-semibold ${
                      selectedColumn === c.name ? 'text-[#641B32] bg-[#D9A0AE]/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{c.name}</span>
                      <span className="text-[9px] opacity-60">({c.inferredType})</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9A0AE]/20 font-sans text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-8 text-center text-[#756772]">
                    No records to display.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rowIdx) => {
                  const globalRowIdx = page * rowsPerPage + rowIdx;
                  const isAffectedByPreview =
                    activePreview?.affectedRowIndices?.includes(globalRowIdx);

                  return (
                    <tr
                      key={globalRowIdx}
                      className={`hover:bg-[#F8EFE5]/60 transition-colors ${
                        isAffectedByPreview ? 'bg-[#277A58]/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-[#756772] font-mono text-[10px]">
                        {globalRowIdx + 1}
                      </td>
                      {columns.map(c => {
                        const val = row[c.name];
                        const isNull = val === null || val === undefined || val === '';
                        const isTargetCol = selectedColumn === c.name;
                        const isCellProblematic = isTargetCol && isNull;

                        return (
                          <td
                            key={c.name}
                            className={`py-2 px-3 font-mono text-xs ${
                              isTargetCol ? 'bg-[#D9A0AE]/10' : ''
                            } ${
                              isCellProblematic
                                ? 'text-[#B4233D] font-bold bg-[#B4233D]/10'
                                : isNull
                                ? 'text-[#B77722] italic'
                                : 'text-[#29212A]'
                            }`}
                          >
                            {isNull ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#B77722]/10 text-[#B77722]">
                                null
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-[#756772] pt-2">
            <span>
              Showing {page * rowsPerPage + 1} to{' '}
              {Math.min((page + 1) * rowsPerPage, displayRecords.length)} of{' '}
              {displayRecords.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded-lg border border-[#D9A0AE]/40 disabled:opacity-40 hover:bg-[#FFF8EF]"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded-lg border border-[#D9A0AE]/40 disabled:opacity-40 hover:bg-[#FFF8EF]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raw Data Immutability Notice */}
      <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#D9A0AE]/30 flex items-start gap-3 text-xs text-[#756772]">
        <ShieldCheck className="w-4 h-4 text-[#277A58] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#29212A]">Raw Ingest Integrity Guarantee: </strong>
          The original raw data snapshot ({currentDataset.rawRecords?.length ?? currentDataset.rowCount} rows) is preserved without in-place mutation. Each transformation step generates a recoverable version recorded in the audit trace ledger. The active cleaned version can be rolled back to its immaculate raw state at any time.
        </p>
      </div>
    </div>
  );
};
