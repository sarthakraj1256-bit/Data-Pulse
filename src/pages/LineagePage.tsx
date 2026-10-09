import React, { useState } from 'react';
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
  History
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { ExportService } from '../services/exportService';
import { AuditTrail } from '../components/common/AuditTrail';

interface LineagePageProps {
  navigate: (path: string) => void;
}

export const LineagePage: React.FC<LineagePageProps> = ({ navigate }) => {
  const { currentDataset, datasets, notifyExportComplete } = useDataset();
  const [activeTab, setActiveTab] = useState<'transformations' | 'audit_trail'>('transformations');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('all');

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto">
        <GitBranch className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Active Dataset</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Select a dataset to view its transformation audit ledger.
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

  const allColumns = currentDataset.columns.map(c => c.name);
  const lineage = currentDataset.lineage;

  const filteredLineage = lineage.filter(item => {
    const matchSearch =
      item.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.methodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.columnName && item.columnName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCol = filterColumn === 'all' || item.columnName === filterColumn;
    return matchSearch && matchCol;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Data Lineage & Traceability
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Immutable audit trail for{' '}
            <strong className="text-[#641B32]">{currentDataset.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              <span>Activity Audit</span>
            </button>
          </div>

          {activeTab === 'transformations' && (
            <button
              onClick={() => {
                const filename = `${currentDataset.name}_lineage.json`;
                notifyExportComplete({
                  format: 'JSON',
                  filename,
                  downloadFn: () =>
                    ExportService.downloadJSON(lineage, filename),
                  title: 'Lineage Ledger Ready',
                  text: `Lineage JSON audit ledger for "${currentDataset.name}" compiled.`,
                });
              }}
              disabled={lineage.length === 0}
              className="px-3.5 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#F8EFE5] disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm"
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
          {/* Prominent Question Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#641B32] text-[#FFF8EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#3D1023] text-[#D9A0AE]">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base">
                  “Why did DataPulse change this value?”
                </h3>
                <p className="text-xs text-[#D9A0AE] mt-0.5">
                  Every modified observation is bound to an immutable trace ID with the exact trigger rule, pre-transformation sample, and acting user.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold bg-[#3D1023] px-3 py-1.5 rounded-lg border border-[#D9A0AE]/20">
                {lineage.length} Operations Logged
              </span>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
              <input
                type="text"
                placeholder="Search by Trace ID (e.g. DP-000184), method, or keyword..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] placeholder-[#756772]/60 focus:outline-none focus:border-[#641B32]"
              />
            </div>

            <select
              value={filterColumn}
              onChange={e => setFilterColumn(e.target.value)}
              className="w-full sm:w-auto text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-3 py-2 text-[#29212A] focus:outline-none focus:border-[#641B32]"
            >
              <option value="all">All Affected Columns</option>
              {allColumns.map(col => (
                <option key={col} value={col}>
                  Column: {col}
                </option>
              ))}
            </select>
          </div>

          {/* Trace Records List */}
          {filteredLineage.length === 0 ? (
            <div className="bg-[#F8EFE5]/50 border border-[#D9A0AE]/30 rounded-3xl p-10 text-center">
              <Clock className="w-10 h-10 text-[#756772] mx-auto mb-3 opacity-60" />
              <h3 className="font-serif font-bold text-base text-[#29212A]">
                No Lineage Records Found
              </h3>
              <p className="text-xs text-[#756772] mt-1 max-w-sm mx-auto">
                {searchTerm || filterColumn !== 'all'
                  ? 'No trace matches the current filters.'
                  : 'This dataset has not undergone any cleaning transformations yet. It remains in its pristine raw state.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLineage.map(rec => (
                <div
                  key={rec.id}
                  className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-5 hover:border-[#641B32]/40 transition-all shadow-sm space-y-4"
                >
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D9A0AE]/20 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#641B32] text-[#FFF8EF] shadow-sm">
                        {rec.traceId}
                      </span>
                      <h3 className="font-bold text-sm text-[#29212A] capitalize">
                        {rec.methodName.replace(/_/g, ' ')}
                      </h3>
                      {rec.columnName && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32]">
                          col: {rec.columnName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#756772] font-mono">
                      <span>{new Date(rec.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>Actor: {rec.performedBy}</span>
                    </div>
                  </div>

                  {/* Justification & detected defect */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#F8EFE5] rounded-xl space-y-1">
                      <span className="text-[10px] text-[#756772] font-mono uppercase font-semibold block">
                        Trigger Defect
                      </span>
                      <span className="text-[#29212A] font-medium">{rec.detectedIssue}</span>
                    </div>
                    <div className="p-3 bg-[#F8EFE5] rounded-xl space-y-1 md:col-span-2">
                      <span className="text-[10px] text-[#756772] font-mono uppercase font-semibold block">
                        Why did DataPulse change this?
                      </span>
                      <span className="text-[#29212A]">{rec.reason}</span>
                    </div>
                  </div>

                  {/* Value comparison diff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-[#F8EFE5]/50 border border-[#D9A0AE]/20 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[#B4233D] font-bold block mb-1">
                        ORIGINAL RAW VALUES (BEFORE):
                      </span>
                      <div className="text-[11px] text-[#756772] space-y-0.5">
                        {rec.originalSample.map((s, i) => (
                          <div key={i} className="truncate">• {s}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#277A58] font-bold block mb-1">
                        TRANSFORMED VALUES (AFTER):
                      </span>
                      <div className="text-[11px] text-[#29212A] space-y-0.5">
                        {rec.transformedSample.map((s, i) => (
                          <div key={i} className="truncate">• {s}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Impact stats */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#756772] pt-1">
                    <span>Affected Row Count: <strong className="text-[#29212A]">{rec.affectedRowsCount} rows</strong></span>
                    <span className="text-[#277A58]">
                      Quality Score Shift: {rec.scoreBefore}% → {rec.scoreAfter}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
