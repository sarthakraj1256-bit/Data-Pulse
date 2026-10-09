import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Wand2,
  GitBranch,
  BarChart3,
  Download,
  ArrowLeft,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  History
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { DataTable } from '../components/common/DataTable';
import { DimensionScoresChart, MissingnessBarChart } from '../components/common/Charts';
import { ExportService } from '../services/exportService';
import { VersionHistory } from '../components/common/VersionHistory';

interface DatasetWorkspaceProps {
  navigate: (path: string) => void;
  datasetId?: string;
}

export const DatasetWorkspace: React.FC<DatasetWorkspaceProps> = ({ navigate, datasetId }) => {
  const { currentDataset, selectDataset, datasets, notifyExportComplete } = useDataset();
  const [activeTab, setActiveTab] = useState<'preview' | 'quality' | 'version-history' | 'lineage' | 'exports'>('preview');

  // Select dataset if id param changed
  React.useEffect(() => {
    if (datasetId) {
      const found = datasets.find(d => d.id === datasetId);
      if (found && (!currentDataset || currentDataset.id !== datasetId)) {
        selectDataset(datasetId);
      }
    }
  }, [datasetId, currentDataset, datasets, selectDataset]);

  // Authorization check: if a specific datasetId was requested in URL but doesn't exist in user's authorized datasets
  if (datasetId && !datasets.some(d => d.id === datasetId)) {
    return (
      <div className="bg-[#FFF8EF] border border-[#B4233D]/30 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#B4233D]/10 text-[#B4233D] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">
          Access Denied / Dataset Not Found
        </h2>
        <p className="text-xs text-[#756772] leading-relaxed">
          The requested dataset <span className="font-mono text-[#641B32]">({datasetId})</span> is not accessible under your account. DataPulse strictly enforces user isolation—assets cannot be viewed or modified across accounts.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/app/datasets')}
            className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors"
          >
            Return to My Datasets
          </button>
        </div>
      </div>
    );
  }

  const ds = currentDataset || datasets[0];

  if (!ds) {
    return (
      <div className="text-center py-12">
        <h2 className="font-serif text-xl font-bold text-[#29212A]">No Dataset Selected</h2>
        <button
          onClick={() => navigate('/app/datasets')}
          className="mt-4 px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold"
        >
          Back to Dataset Library
        </button>
      </div>
    );
  }

  const score = ds.qualityAssessment.overallScore;

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/app/datasets')}
                className="text-xs text-[#756772] hover:text-[#641B32] flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Datasets</span>
              </button>
              <span className="text-[#D9A0AE]">/</span>
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#FFF8EF] text-[#641B32] font-semibold border border-[#D9A0AE]/20">
                {ds.fileType.toUpperCase()}
              </span>
              {ds.isSynthetic && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#B77722]/10 text-[#B77722] font-bold border border-[#B77722]/20">
                  Synthetic Benchmark
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl font-bold text-[#3D1023]">{ds.name}</h1>
            <p className="text-xs text-[#756772] max-w-xl">{ds.description}</p>
          </div>

          {/* Quick stats and studio CTA */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#756772]">
                Quality Score
              </div>
              <div
                className={`text-2xl font-bold font-mono ${
                  score >= 90 ? 'text-[#277A58]' : score >= 70 ? 'text-[#B77722]' : 'text-[#B4233D]'
                }`}
              >
                {score}%
              </div>
            </div>

            <button
              onClick={() => navigate('/app/cleaning')}
              className="px-4 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Wand2 className="w-4 h-4" />
              <span>Cleaning Studio</span>
            </button>
          </div>
        </div>

        {/* Workspace Subnav Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#D9A0AE]/30 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-[#641B32] text-[#FFF8EF]'
                : 'text-[#756772] hover:bg-[#FFF8EF]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data Matrix & Diff</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'quality'
                ? 'bg-[#641B32] text-[#FFF8EF]'
                : 'text-[#756772] hover:bg-[#FFF8EF]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quality Dimensions ({ds.qualityAssessment.issues.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('version-history')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'version-history'
                ? 'bg-[#641B32] text-[#FFF8EF]'
                : 'text-[#756772] hover:bg-[#FFF8EF]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Version History ({ds.lineage.length + 1})</span>
          </button>
          <button
            onClick={() => setActiveTab('lineage')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lineage'
                ? 'bg-[#641B32] text-[#FFF8EF]'
                : 'text-[#756772] hover:bg-[#FFF8EF]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Trace History ({ds.lineage.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'exports'
                ? 'bg-[#641B32] text-[#FFF8EF]'
                : 'text-[#756772] hover:bg-[#FFF8EF]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exports & Reports</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'preview' && (
        <DataTable
          records={ds.cleanedRecords}
          columns={ds.columns}
          rawRecords={ds.rawRecords}
          enableComparison={true}
          title="Data Matrix Preview"
          subtitle="Toggle between active cleaned dataset and the immutable raw snapshot."
        />
      )}

      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-5 shadow-sm">
            <h3 className="font-serif font-bold text-base text-[#3D1023] mb-4">
              Dimension Radar
            </h3>
            <DimensionScoresChart assessment={ds.qualityAssessment} />
          </div>

          <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-5 lg:col-span-2 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-[#3D1023]">
              Active Quality Anomaly Registry
            </h3>

            {ds.qualityAssessment.issues.length === 0 ? (
              <div className="p-8 text-center bg-[#277A58]/5 rounded-xl border border-[#277A58]/20 text-xs text-[#277A58]">
                No active issues. Dataset passed all deterministic validation rules.
              </div>
            ) : (
              <div className="space-y-3">
                {ds.qualityAssessment.issues.map(issue => (
                  <div
                    key={issue.id}
                    className="p-4 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#29212A] flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#641B32]/10 text-[#641B32]">
                          {issue.dimension}
                        </span>
                        <span>{issue.description}</span>
                      </div>
                      <span className="font-mono text-[#756772] text-[11px]">
                        {issue.affectedRowsCount} rows affected
                      </span>
                    </div>
                    <p className="text-[11px] text-[#756772] leading-relaxed">
                      {issue.explanation}
                    </p>
                    <div className="pt-2 border-t border-[#D9A0AE]/20 flex items-center justify-between text-[11px]">
                      <span className="text-[#641B32] font-medium">
                        Recommended: {issue.recommendedFix}
                      </span>
                      <button
                        onClick={() => navigate('/app/cleaning')}
                        className="px-2.5 py-1 bg-[#641B32] text-[#FFF8EF] rounded-lg font-bold text-[10px]"
                      >
                        Apply Fix
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'version-history' && (
        <VersionHistory dataset={ds} navigate={navigate} />
      )}

      {activeTab === 'lineage' && (
        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#641B32]" />
              Data Transformation Audit Trail
            </h3>
            <span className="text-xs font-mono text-[#756772]">
              {ds.lineage.length} record(s) logged
            </span>
          </div>

          {ds.lineage.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#756772] bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/20">
              No cleaning operations have been applied to this dataset yet. It remains in its pristine raw state.
            </div>
          ) : (
            <div className="space-y-3">
              {ds.lineage.map(rec => (
                <div
                  key={rec.id}
                  className="p-4 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-[#641B32] bg-[#641B32]/10 px-2 py-0.5 rounded">
                      {rec.traceId}
                    </span>
                    <span className="text-[#756772] text-[11px]">
                      {new Date(rec.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-bold text-[#29212A] text-sm capitalize">
                    {rec.methodName.replace(/_/g, ' ')}
                  </div>
                  <p className="text-[11px] text-[#756772]">{rec.reason}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2.5 bg-[#F8EFE5] rounded-lg text-[11px] font-mono">
                    <div>
                      <span className="text-[#B4233D] font-bold block mb-0.5">Sample Before:</span>
                      <span className="text-[#756772]">{rec.originalSample.join(', ') || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[#277A58] font-bold block mb-0.5">Sample After:</span>
                      <span className="text-[#756772]">{rec.transformedSample.join(', ') || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'exports' && (
        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-serif font-bold text-base text-[#3D1023]">
            Export Cleaned Asset & Audit Documentation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-[#641B32] text-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-3 text-xs shadow-sm">
              <h4 className="font-bold text-[#FFF8EF]">Executive Audit (PDF)</h4>
              <p className="text-[#D9A0AE] text-[11px]">
                Multi-page branded PDF with 6-D matrix, defects, trace logs, and caveats.
              </p>
              <button
                onClick={() => {
                  const filename = `DataPulse_Quality_Audit_${ds.name.replace(/\s+/g, '_')}.pdf`;
                  notifyExportComplete({
                    format: 'PDF',
                    filename,
                    downloadFn: () => ExportService.downloadQualityAuditPDF(ds),
                    title: 'PDF Executive Audit Ready',
                    text: `Executive Audit PDF for "${ds.name}" compiled successfully.`,
                  });
                }}
                className="w-full py-2 rounded-lg bg-[#FFF8EF] text-[#641B32] font-bold hover:bg-[#F8EFE5] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Audit PDF</span>
              </button>
            </div>

            <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-3 text-xs">
              <h4 className="font-bold text-[#29212A]">Analysis Insights (CSV)</h4>
              <p className="text-[#756772] text-[11px]">
                Complete statistical distribution, dimension scores, and anomalies summary.
              </p>
              <button
                onClick={() => {
                  const filename = `DataPulse_Analysis_Insights_${ds.name.replace(/\s+/g, '_')}.csv`;
                  notifyExportComplete({
                    format: 'CSV',
                    filename,
                    downloadFn: () => ExportService.downloadAnalysisInsightsCSV(ds),
                    title: 'Analysis Insights CSV Ready',
                    text: `Statistical distribution and quality anomaly summary for "${ds.name}" compiled.`,
                  });
                }}
                className="w-full py-2 rounded-lg bg-[#641B32] text-[#FFF8EF] font-bold hover:bg-[#3D1023] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Insights CSV</span>
              </button>
            </div>

            <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-3 text-xs">
              <h4 className="font-bold text-[#29212A]">Cleaned CSV File</h4>
              <p className="text-[#756772] text-[11px]">
                Standard comma-separated format compatible with Python Pandas, R, and SQL pipelines.
              </p>
              <button
                onClick={() => {
                  const filename = `${ds.name}_cleaned.csv`;
                  notifyExportComplete({
                    format: 'CSV',
                    filename,
                    downloadFn: () => ExportService.downloadCSV(ds.cleanedRecords, filename),
                    title: 'Cleaned CSV Ready',
                    text: `Curated dataset "${filename}" (${ds.cleanedRecords.length} rows) is ready.`,
                  });
                }}
                className="w-full py-2 rounded-lg bg-[#F8EFE5] text-[#29212A] font-bold hover:bg-[#D9A0AE]/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Cleaned CSV</span>
              </button>
            </div>

            <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-3 text-xs">
              <h4 className="font-bold text-[#29212A]">Cleaned JSON Format</h4>
              <p className="text-[#756772] text-[11px]">
                Structured JSON object array for REST API ingestion and NoSQL document stores.
              </p>
              <button
                onClick={() => {
                  const filename = `${ds.name}_cleaned.json`;
                  notifyExportComplete({
                    format: 'JSON',
                    filename,
                    downloadFn: () => ExportService.downloadJSON(ds.cleanedRecords, filename),
                    title: 'JSON Dataset Ready',
                    text: `Cleaned records JSON for "${ds.name}" compiled.`,
                  });
                }}
                className="w-full py-2 rounded-lg bg-[#F8EFE5] text-[#29212A] font-bold hover:bg-[#D9A0AE]/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON</span>
              </button>
            </div>

            <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-3 text-xs">
              <h4 className="font-bold text-[#29212A]">Excel Workbook (.xlsx)</h4>
              <p className="text-[#756772] text-[11px]">
                Native SheetJS workbook with preserved column types.
              </p>
              <button
                onClick={() => {
                  const filename = `${ds.name}_cleaned.xlsx`;
                  notifyExportComplete({
                    format: 'XLSX',
                    filename,
                    downloadFn: () => ExportService.downloadXLSX(ds.cleanedRecords, filename),
                    title: 'Excel Workbook Ready',
                    text: `Cleaned workbook "${filename}" compiled.`,
                  });
                }}
                className="w-full py-2 rounded-lg bg-[#F8EFE5] text-[#29212A] font-bold hover:bg-[#D9A0AE]/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download XLSX</span>
              </button>
            </div>

            <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 space-y-3 text-xs">
              <h4 className="font-bold text-[#29212A]">Executive Quality Report</h4>
              <p className="text-[#756772] text-[11px]">
                Full markdown audit document with dimension scores, trace history, and caveats.
              </p>
              <button
                onClick={() => {
                  const filename = `DataPulse_Quality_Audit_${ds.name.replace(/\s+/g, '_')}.md`;
                  notifyExportComplete({
                    format: 'MD',
                    filename,
                    downloadFn: () => ExportService.downloadQualityReport(ds),
                    title: 'Quality Report Ready',
                    text: `Markdown audit report for "${ds.name}" compiled.`,
                  });
                }}
                className="w-full py-2 rounded-lg bg-[#3D1023] text-[#FFF8EF] font-bold hover:bg-[#641B32] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report (.md)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
