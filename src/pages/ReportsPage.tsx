import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  Layers,
  History,
  FileDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { ExportService } from '../services/exportService';
import { AuditService } from '../services/auditService';
import { AuditTrail } from '../components/common/AuditTrail';

interface ReportsPageProps {
  navigate: (path: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { currentDataset, datasets, selectDataset, showToast, notifyExportComplete } = useDataset();
  const [activeTab, setActiveTab] = useState<'exports' | 'audit_trail'>('exports');

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto">
        <FileText className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Dataset Selected</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Please select a dataset to generate formal quality reports, insights exports, and audit logs.
        </p>
        <button
          onClick={() => navigate('/app/datasets')}
          className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold"
        >
          Open Dataset Library
        </button>
      </div>
    );
  }

  const ds = currentDataset;
  const reportMarkdown = ExportService.generateQualityReportMarkdown(ds);

  const logExport = (format: string, filename: string) => {
    if (user) {
      AuditService.log(
        user,
        'EXPORT_GENERATED',
        'export',
        `Exported ${format} artifact: "${filename}"`,
        { datasetId: ds.id, datasetName: ds.name, severity: 'success' }
      );
    }
  };

  const handleExportPDF = () => {
    try {
      const filename = `DataPulse_Quality_Audit_${ds.name.replace(/\s+/g, '_')}.pdf`;
      notifyExportComplete({
        format: 'PDF',
        filename,
        downloadFn: () => ExportService.downloadQualityAuditPDF(ds),
        title: 'PDF Quality Audit Ready',
        text: `Executive Audit PDF for "${ds.name}" is ready for download.`,
      });
      logExport('PDF Quality Audit', filename);
    } catch (err: any) {
      showToast('Failed to generate PDF audit: ' + (err?.message || 'Unknown error'), 'error');
    }
  };

  const handleExportInsightsCSV = () => {
    try {
      const filename = `DataPulse_Analysis_Insights_${ds.name.replace(/\s+/g, '_')}.csv`;
      notifyExportComplete({
        format: 'CSV',
        filename,
        downloadFn: () => ExportService.downloadAnalysisInsightsCSV(ds),
        title: 'Analysis Insights CSV Ready',
        text: `Analysis insights & model summary CSV for "${ds.name}" is ready.`,
      });
      logExport('Analysis Insights & Model Summary CSV', filename);
    } catch (err: any) {
      showToast('Failed to export insights CSV.', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      const filename = `${ds.name}_cleaned.csv`;
      notifyExportComplete({
        format: 'CSV',
        filename,
        downloadFn: () => ExportService.downloadCSV(ds.cleanedRecords, filename),
        title: 'Cleaned CSV File Ready',
        text: `Cleaned CSV for "${ds.name}" (${ds.cleanedRecords.length} rows) is ready.`,
      });
      logExport('Cleaned CSV', filename);
    } catch {
      showToast('Failed to export CSV.', 'error');
    }
  };

  const handleExportJSON = () => {
    try {
      const filename = `${ds.name}_cleaned.json`;
      notifyExportComplete({
        format: 'JSON',
        filename,
        downloadFn: () => ExportService.downloadJSON(ds.cleanedRecords, filename),
        title: 'JSON Dataset Ready',
        text: `Cleaned JSON for "${ds.name}" is ready.`,
      });
      logExport('Cleaned JSON', filename);
    } catch {
      showToast('Failed to export JSON.', 'error');
    }
  };

  const handleExportXLSX = () => {
    try {
      const filename = `${ds.name}_cleaned.xlsx`;
      notifyExportComplete({
        format: 'XLSX',
        filename,
        downloadFn: () => ExportService.downloadXLSX(ds.cleanedRecords, filename),
        title: 'Excel Workbook Ready',
        text: `Excel workbook for "${ds.name}" is ready.`,
      });
      logExport('Excel Workbook', filename);
    } catch {
      showToast('Failed to export Excel workbook.', 'error');
    }
  };

  const handleExportMarkdownReport = () => {
    try {
      const filename = `DataPulse_Quality_Audit_${ds.name.replace(/\s+/g, '_')}.md`;
      notifyExportComplete({
        format: 'MD',
        filename,
        downloadFn: () => ExportService.downloadQualityReport(ds),
        title: 'Markdown Report Ready',
        text: `Executive Quality Audit Report for "${ds.name}" (.md) is ready.`,
      });
      logExport('Markdown Quality Audit', filename);
    } catch {
      showToast('Failed to download report.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Reports & Traceability Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Download analytical insights, audit PDFs, and review real-time platform activity for{' '}
            <strong className="text-[#641B32]">{ds.name}</strong>.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-xl bg-[#F8EFE5] p-1 border border-[#D9A0AE]/30 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('exports')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'exports'
                ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                : 'text-[#756772] hover:text-[#29212A]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF/CSV Exports</span>
          </button>
          <button
            onClick={() => setActiveTab('audit_trail')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit_trail'
                ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                : 'text-[#756772] hover:text-[#29212A]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity Audit Trail</span>
          </button>
        </div>
      </div>

      {activeTab === 'exports' ? (
        <div className="space-y-6">
          {/* Featured PDF & Insights CSV Downloads Banner */}
          <div className="bg-gradient-to-br from-[#641B32] to-[#3D1023] rounded-3xl p-6 sm:p-8 text-[#FFF8EF] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D9A0AE] bg-[#3D1023]/60 px-2.5 py-0.5 rounded-full border border-[#D9A0AE]/20 font-bold">
                Direct Document & Insight Exports
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Executive Quality Audit PDF & Insights CSV
              </h2>
              <p className="text-xs text-[#FFF8EF]/80 leading-relaxed">
                Download a fully structured, multi-page audit PDF containing the 6 quality dimensions, defect registries, transformation trace IDs, and predictive summaries. Or download all computed analysis metrics in CSV format.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={handleExportPDF}
                className="px-5 py-3 rounded-xl bg-[#FFF8EF] text-[#641B32] font-bold text-xs hover:bg-[#F8EFE5] transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Audit PDF</span>
              </button>
              <button
                onClick={handleExportInsightsCSV}
                className="px-5 py-3 rounded-xl bg-[#FFF8EF]/15 border border-[#FFF8EF]/30 text-[#FFF8EF] font-bold text-xs hover:bg-[#FFF8EF]/25 transition-all flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Insights CSV</span>
              </button>
            </div>
          </div>

          {/* Grid of Standard Dataset Exports */}
          <div>
            <h3 className="font-serif font-bold text-base text-[#3D1023] mb-4">
              Processed Dataset Formats
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-5 hover:border-[#641B32]/40 transition-all shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8EFE5] text-[#641B32] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#29212A]">Cleaned CSV File</h4>
                  <p className="text-[11px] text-[#756772] mt-0.5">
                    RFC 4180 standard table with all approved transformations applied.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="w-full py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Cleaned CSV</span>
                </button>
              </div>

              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-5 hover:border-[#641B32]/40 transition-all shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8EFE5] text-[#641B32] flex items-center justify-center">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#29212A]">Cleaned JSON</h4>
                  <p className="text-[11px] text-[#756772] mt-0.5">
                    Structured array of record objects for microservices and NoSQL.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="w-full py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Cleaned JSON</span>
                </button>
              </div>

              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-5 hover:border-[#641B32]/40 transition-all shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8EFE5] text-[#641B32] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#29212A]">Excel Workbook (.xlsx)</h4>
                  <p className="text-[11px] text-[#756772] mt-0.5">
                    Native SheetJS workbook with preserved column typing.
                  </p>
                </div>
                <button
                  onClick={handleExportXLSX}
                  className="w-full py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download XLSX</span>
                </button>
              </div>

              <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-5 hover:border-[#641B32]/40 transition-all shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#641B32]/10 text-[#641B32] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#29212A]">Executive Audit (.md)</h4>
                  <p className="text-[11px] text-[#756772] mt-0.5">
                    Complete markdown audit report with citations and caveats.
                  </p>
                </div>
                <button
                  onClick={handleExportMarkdownReport}
                  className="w-full py-2 rounded-xl bg-[#3D1023] text-[#FFF8EF] font-bold text-xs hover:bg-[#641B32] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Markdown</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Markdown Preview */}
          <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9A0AE]/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#641B32]" />
                <h3 className="font-serif font-bold text-base text-[#3D1023]">
                  Live Preview: Executive Quality Audit
                </h3>
              </div>
              <button
                onClick={handleExportMarkdownReport}
                className="text-xs text-[#641B32] font-semibold hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .md</span>
              </button>
            </div>

            <div className="p-5 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/30 max-h-80 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-[#29212A] leading-relaxed select-text">
              {reportMarkdown}
            </div>
          </div>
        </div>
      ) : (
        /* Real-Time User Activity Audit Trail View */
        <AuditTrail />
      )}
    </div>
  );
};
