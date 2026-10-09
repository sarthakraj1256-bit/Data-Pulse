import React from 'react';
import {
  Database,
  Layers,
  AlertTriangle,
  Wand2,
  TrendingUp,
  FlaskConical,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { MetricCard } from '../components/common/MetricCard';
import { DimensionScoresChart, MissingnessBarChart } from '../components/common/Charts';

interface DashboardOverviewProps {
  navigate: (path: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ navigate }) => {
  const { datasets, currentDataset, loadSyntheticBenchmark } = useDataset();

  // Aggregate stats across all datasets owned by this user
  const totalDatasets = datasets.length;
  const totalRecords = datasets.reduce((acc, d) => acc + d.rowCount, 0);
  const totalIssues = datasets.reduce((acc, d) => acc + d.qualityAssessment.issues.length, 0);
  const totalCleaningOps = datasets.reduce((acc, d) => acc + d.lineage.length, 0);

  // If no datasets exist yet, display an elegant empty state
  if (totalDatasets === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-1">
            Transform heterogeneous raw data into validated, traceable, analysis-ready assets.
          </p>
        </div>

        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#641B32]/10 border border-[#641B32]/20 flex items-center justify-center text-[#641B32] mx-auto mb-5">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3D1023] mb-2">
            No Datasets Ingested Yet
          </h2>
          <p className="text-xs sm:text-sm text-[#756772] max-w-md mx-auto mb-8 leading-relaxed">
            Begin by uploading a CSV, XLSX, or JSON file, or immediately initialize our controlled synthetic benchmark to test all six quality dimensions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => loadSyntheticBenchmark()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Load Synthetic IoT Benchmark</span>
            </button>
            <button
              onClick={() => navigate('/app/upload')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/50 text-[#3D1023] font-bold text-xs hover:bg-[#F8EFE5] transition-colors flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Custom Dataset</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestScore = currentDataset?.qualityAssessment.overallScore ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Active Dataset:{' '}
            <span className="font-semibold text-[#641B32]">{currentDataset?.name}</span>
            {currentDataset?.isSynthetic && (
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#B77722]/10 text-[#B77722] font-semibold border border-[#B77722]/20">
                Synthetic Benchmark
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/app/cleaning')}
            className="px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Cleaning Studio</span>
          </button>
          <button
            onClick={() => navigate('/app/upload')}
            className="px-4 py-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#3D1023] font-bold text-xs hover:bg-[#FFF8EF] transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Active Score"
          value={`${latestScore}/100`}
          subtitle="Deterministic quality score"
          icon={<ShieldCheck className="w-4 h-4" />}
          badge={{
            text: latestScore >= 90 ? 'Healthy' : latestScore >= 70 ? 'Moderate' : 'Action Required',
            variant: latestScore >= 90 ? 'success' : latestScore >= 70 ? 'warning' : 'error',
          }}
        />
        <MetricCard
          title="Records"
          value={totalRecords.toLocaleString()}
          subtitle="Total rows tracked"
          icon={<Database className="w-4 h-4" />}
        />
        <MetricCard
          title="Datasets"
          value={totalDatasets}
          subtitle="Ingested assets"
          icon={<Layers className="w-4 h-4" />}
        />
        <MetricCard
          title="Active Issues"
          value={currentDataset?.qualityAssessment.issues.length ?? 0}
          subtitle="Quality anomalies detected"
          icon={<AlertTriangle className="w-4 h-4" />}
          badge={{
            text: (currentDataset?.qualityAssessment.issues.length ?? 0) > 0 ? 'Remediate' : 'Clean',
            variant: (currentDataset?.qualityAssessment.issues.length ?? 0) > 0 ? 'error' : 'success',
          }}
        />
        <MetricCard
          title="Trace Ledger"
          value={totalCleaningOps}
          subtitle="Transformations recorded"
          icon={<Wand2 className="w-4 h-4" />}
          badge={{
            text: `${currentDataset?.lineage.length || 0} active`,
            variant: 'accent',
          }}
        />
      </div>

      {/* Detailed Analysis Section */}
      {currentDataset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quality Dimensions Radar / Bars */}
          <div className="bg-[#F8EFE5]/70 border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 lg:col-span-1 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9A0AE]/30">
              <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#641B32]" />
                6 Quality Dimensions
              </h3>
              <button
                onClick={() => navigate('/app/quality')}
                className="text-xs text-[#641B32] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Audit</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <DimensionScoresChart assessment={currentDataset.qualityAssessment} />
          </div>

          {/* Missing Values Breakdown & Recent Issues */}
          <div className="bg-[#F8EFE5]/70 border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 lg:col-span-2 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D9A0AE]/30">
                <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#B77722]" />
                  Detected Quality Defects
                </h3>
                <span className="text-xs font-mono text-[#756772]">
                  {currentDataset.qualityAssessment.issues.length} detected
                </span>
              </div>

              {currentDataset.qualityAssessment.issues.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#277A58] bg-[#277A58]/5 rounded-2xl border border-[#277A58]/20 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No quality defects found in the current dataset.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentDataset.qualityAssessment.issues.slice(0, 4).map(issue => (
                    <div
                      key={issue.id}
                      className="p-3 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#29212A] flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              issue.severity === 'high'
                                ? 'bg-[#B4233D]'
                                : issue.severity === 'medium'
                                ? 'bg-[#B77722]'
                                : 'bg-[#756772]'
                            }`}
                          />
                          <span>{issue.description}</span>
                        </div>
                        <p className="text-[11px] text-[#756772]">{issue.explanation}</p>
                      </div>
                      <button
                        onClick={() => navigate('/app/cleaning')}
                        className="px-2.5 py-1 rounded-lg bg-[#641B32] text-[#FFF8EF] text-[10px] font-bold hover:bg-[#3D1023] shrink-0"
                      >
                        Fix
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missingness column chart */}
            <div>
              <h4 className="text-xs font-bold text-[#29212A] uppercase tracking-wider mb-2">
                Completeness Breakdown by Column
              </h4>
              <MissingnessBarChart columns={currentDataset.columns} />
            </div>
          </div>
        </div>
      )}

      {/* Recent Transformations Audit Trail */}
      {currentDataset && currentDataset.lineage.length > 0 && (
        <div className="bg-[#F8EFE5]/70 border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9A0AE]/30">
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#641B32]" />
              Recent Lineage Trace Records
            </h3>
            <button
              onClick={() => navigate('/app/lineage')}
              className="text-xs text-[#641B32] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentDataset.lineage.slice(0, 3).map(rec => (
              <div
                key={rec.id}
                className="p-3.5 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-[#641B32]">{rec.traceId}</span>
                  <span className="text-[10px] text-[#756772]">
                    {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="font-semibold text-[#29212A] capitalize">
                  {rec.methodName.replace(/_/g, ' ')}
                </div>
                <p className="text-[11px] text-[#756772] line-clamp-2">
                  {rec.reason}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono border-t border-[#D9A0AE]/20">
                  <span className="text-[#277A58]">
                    Score: {rec.scoreBefore}% → {rec.scoreAfter}%
                  </span>
                  <span className="text-[#756772]">{rec.affectedRowsCount} rows</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
