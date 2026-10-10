import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Wand2,
  Clock,
  Fingerprint,
  SlidersHorizontal,
  Gauge,
  CheckCircle,
  FileQuestion,
  Info,
  Sparkles,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { DimensionScoresChart, QualityRadarChart, MissingnessBarChart } from '../components/common/Charts';

interface QualityAnalysisPageProps {
  navigate: (path: string) => void;
}

export const QualityAnalysisPage: React.FC<QualityAnalysisPageProps> = ({ navigate }) => {
  const { currentDataset } = useDataset();

  // Active tooltip state for composite formula explanation
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [hoveredCardDim, setHoveredCardDim] = useState<string | null>(null);

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto">
        <ShieldCheck className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Active Dataset</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Ingest or select a dataset from the library to review its deterministic quality profile.
        </p>
        <button
          onClick={() => navigate('/app/datasets')}
          className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors"
        >
          Open Dataset Library
        </button>
      </div>
    );
  }

  const q = currentDataset.qualityAssessment;
  const dimensions = Object.values(q.dimensionScores);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Data Quality Engine
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Algorithmic evaluation across the Six Core Dimensions for{' '}
            <strong className="text-[#641B32]">{currentDataset.name}</strong>.
          </p>
        </div>

        <button
          onClick={() => navigate('/app/cleaning')}
          className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Wand2 className="w-4 h-4" />
          <span>Launch Cleaning Studio</span>
        </button>
      </div>

      {/* Quality Score Hero Card */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#D9A0AE]/30">
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#756772] font-semibold">
                Composite Quality Score
              </span>
              <button
                type="button"
                onMouseEnter={() => setShowFormulaTooltip(true)}
                onMouseLeave={() => setShowFormulaTooltip(false)}
                className="text-[#756772] hover:text-[#641B32] transition-colors relative"
                aria-label="Explain composite score calculation"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Tooltip on Formula */}
            {showFormulaTooltip && (
              <div className="absolute left-0 top-6 z-50 bg-[#3D1023] text-[#FFF8EF] p-3.5 rounded-2xl shadow-2xl border border-[#D9A0AE]/40 max-w-sm text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
                <div className="font-serif font-bold text-xs text-[#D9A0AE] pb-1 border-b border-[#FFF8EF]/20 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  Deterministic Formula Specification
                </div>
                <p className="text-[11px] text-[#FFF8EF]/90 leading-relaxed font-sans">
                  Overall Score = <strong>Σ(Evaluated Dimension Scores) / N</strong>.
                  Each dimension receives a non-black-box score from 0 to 100 based on exact test passes. Dimensions not evaluated are excluded to avoid artificial inflation.
                </p>
                <div className="text-[10px] font-mono text-[#D9A0AE] bg-[#29212A]/60 p-1.5 rounded-lg border border-[#FFF8EF]/10">
                  Evaluated Dimensions: {dimensions.filter(d => d.evaluated).length} of 6
                </div>
              </div>
            )}

            <div className="flex items-baseline gap-3 mt-1">
              <span
                className={`font-serif text-4xl sm:text-5xl font-black ${
                  q.overallScore >= 90
                    ? 'text-[#277A58]'
                    : q.overallScore >= 70
                    ? 'text-[#B77722]'
                    : 'text-[#B4233D]'
                }`}
              >
                {q.overallScore}%
              </span>
              <span className="text-xs text-[#756772]">
                / 100 benchmark integrity
              </span>
            </div>
            <p className="text-xs text-[#756772] mt-2 max-w-lg leading-relaxed">
              Calculated as the unweighted arithmetic mean of all evaluated dimension scores. Transparent, repeatable, and non-black-box.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/20 hover:border-[#641B32]/40 transition-colors">
              <span className="text-[10px] text-[#756772] uppercase block font-semibold">Total Rows</span>
              <span className="font-bold text-[#29212A] text-sm">{q.totalRows}</span>
              <span className="text-[9px] text-[#756772] block mt-0.5">{q.totalColumns} attributes</span>
            </div>
            <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/20 hover:border-[#277A58]/40 transition-colors">
              <span className="text-[10px] text-[#756772] uppercase block font-semibold">Clean Rows</span>
              <span className="font-bold text-[#277A58] text-sm">{q.cleanRowsCount}</span>
              <span className="text-[9px] text-[#277A58] block mt-0.5">
                {q.totalRows > 0 ? ((q.cleanRowsCount / q.totalRows) * 100).toFixed(1) : 0}% pristine
              </span>
            </div>
            <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/20 hover:border-[#B4233D]/40 transition-colors">
              <span className="text-[10px] text-[#756772] uppercase block font-semibold">Problematic Rows</span>
              <span className="font-bold text-[#B4233D] text-sm">{q.problematicRowsCount}</span>
              <span className="text-[9px] text-[#B4233D] block mt-0.5">
                {q.totalRows > 0 ? ((q.problematicRowsCount / q.totalRows) * 100).toFixed(1) : 0}% flagged
              </span>
            </div>
          </div>
        </div>

        {/* Dimension Breakdown Cards with Hover Tooltips */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {dimensions.map(dim => {
            const isHovered = hoveredCardDim === dim.dimension;
            const isNotApplicable = dim.status === 'not_applicable';
            const isUnassessed = dim.status === 'not_assessed';
            const isAssessed = dim.status === 'assessed';

            return (
              <div
                key={dim.dimension}
                className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/30 space-y-2 text-xs relative group transition-all hover:border-[#641B32] hover:shadow-xs"
                onMouseEnter={() => setHoveredCardDim(dim.dimension)}
                onMouseLeave={() => setHoveredCardDim(null)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-[#29212A] capitalize text-sm flex items-center gap-1.5">
                    <span>{dim.dimension}</span>
                    <HelpCircle className="w-3 h-3 text-[#756772] opacity-40 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                      !isAssessed
                        ? 'bg-[#756772]/10 text-[#756772]'
                        : dim.score >= 90
                        ? 'bg-[#277A58]/10 text-[#277A58]'
                        : dim.score >= 70
                        ? 'bg-[#B77722]/10 text-[#B77722]'
                        : 'bg-[#B4233D]/10 text-[#B4233D]'
                    }`}
                  >
                    {isAssessed ? `${dim.score}%` : isNotApplicable ? 'Not Applicable' : 'Unassessed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#756772] leading-relaxed line-clamp-2">{dim.description}</p>
                <div className="pt-2 border-t border-[#D9A0AE]/20 text-[10px] text-[#756772] flex items-center justify-between">
                  <span className="truncate max-w-[70%]">
                    <strong className="text-[#641B32]">Rule: </strong>
                    {dim.benchmarkRule}
                  </span>
                  <span className="font-mono text-[9px] text-[#641B32] font-semibold shrink-0">
                    {isAssessed ? `${dim.issuesCount} defect(s)` : 'Excluded'}
                  </span>
                </div>

                {/* Interactive Tooltip Card on Card Hover */}
                {isHovered && (
                  <div className="absolute left-0 right-0 -top-3 -translate-y-full z-50 bg-[#3D1023] text-[#FFF8EF] p-3.5 rounded-2xl shadow-2xl border border-[#D9A0AE]/40 text-xs space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-1 border-b border-[#FFF8EF]/20 font-bold">
                      <span className="font-serif capitalize text-[#D9A0AE] text-sm flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {dim.dimension} Metric
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#FFF8EF] text-[#3D1023]">
                        {isAssessed ? `${dim.score}% Score` : isNotApplicable ? 'Not Applicable' : 'Unassessed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#FFF8EF]/90 leading-relaxed font-sans">{dim.description}</p>
                    {dim.formulaDescription && (
                      <div className="text-[10px] font-mono text-[#D9A0AE] bg-[#29212A]/60 p-1.5 rounded-lg border border-[#FFF8EF]/10">
                        Formula: {dim.formulaDescription}
                        {dim.numerator !== undefined && dim.denominator !== undefined && (
                          <span className="block text-[#FFF8EF] mt-0.5">
                            Ratio: {dim.numerator} / {dim.denominator}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#29212A]/60 p-2 rounded-xl border border-[#FFF8EF]/10">
                      <div>
                        <span className="text-[#D9A0AE] block">Active Issues:</span>
                        <strong className="text-[#FFF8EF]">{dim.issuesCount}</strong>
                      </div>
                      <div>
                        <span className="text-[#D9A0AE] block">Affected Rows:</span>
                        <strong className="text-[#FFF8EF]">{dim.affectedRowsCount}</strong>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#D9A0AE]">
                      <strong className="text-[#FFF8EF]">Rule: </strong>
                      {dim.benchmarkRule}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Dimension Analysis Section: Radial Radar & Score Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Progress Bars & Explanations (7 cols) */}
        <div className="lg:col-span-7 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D9A0AE]/20">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#641B32]" />
                Six-Dimension Compliance Breakdown
              </h3>
              <p className="text-xs text-[#756772] mt-0.5">
                Hover any dimension bar below to inspect its benchmark formula and issue counts.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFF8EF] text-[#641B32] border border-[#D9A0AE]/30 font-semibold">
              Interactive
            </span>
          </div>

          <DimensionScoresChart assessment={q} />
        </div>

        {/* Right Column: Radar / Polar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D9A0AE]/20">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#641B32]" />
                Quality Radar Geometry
              </h3>
              <p className="text-xs text-[#756772] mt-0.5">
                Hover vertices to view metric explanations and benchmark boundaries.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFF8EF] text-[#641B32] border border-[#D9A0AE]/30 font-semibold">
              Polar Plot
            </span>
          </div>

          <div className="flex justify-center py-2">
            <QualityRadarChart assessment={q} size={290} />
          </div>

          <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/30 text-[11px] text-[#756772] leading-relaxed">
            <strong className="text-[#641B32]">Geometry interpretation: </strong>
            A fully balanced polygon approaching the 100% outer perimeter signifies uniform high quality. Indentations pinpoint specific dimensions requiring targeted remediation.
          </div>
        </div>
      </div>

      {/* Column Missingness / Completeness Breakdown Chart */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D9A0AE]/20">
          <div>
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#641B32]" />
              Attribute-Level Completeness Profiler
            </h3>
            <p className="text-xs text-[#756772] mt-0.5">
              Hover over any column bar to inspect missing value counts and recommended imputation methods.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFF8EF] text-[#641B32] border border-[#D9A0AE]/30 font-semibold">
            Missingness
          </span>
        </div>

        <MissingnessBarChart
          columns={currentDataset.columns.map(c => ({
            name: c.name,
            nullCount: c.nullCount,
            nullPercentage: c.nullPercentage,
            inferredType: c.inferredType,
          }))}
        />
      </div>

      {/* Issues Table */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9A0AE]/30">
          <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B77722]" />
            Itemized Quality Defect Registry ({q.issues.length})
          </h3>
          <span className="text-xs font-mono text-[#756772]">
            Deterministic findings
          </span>
        </div>

        {q.issues.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#277A58] bg-[#277A58]/5 rounded-xl border border-[#277A58]/20 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero quality defects detected. Dataset satisfies all configured validation criteria.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9A0AE]/30 text-[#756772] font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Dimension</th>
                  <th className="py-2.5 px-3">Target Field</th>
                  <th className="py-2.5 px-3">Affected Rows</th>
                  <th className="py-2.5 px-3">Technical Explanation</th>
                  <th className="py-2.5 px-3">Sample Problematic Values</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9A0AE]/20 font-sans">
                {q.issues.map(issue => (
                  <tr key={issue.id} className="hover:bg-[#FFF8EF]/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                            issue.severity === 'high'
                              ? 'bg-[#B4233D]/10 text-[#B4233D]'
                              : issue.severity === 'medium'
                              ? 'bg-[#B77722]/10 text-[#B77722]'
                              : 'bg-[#756772]/10 text-[#756772]'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                            issue.isAnomaly
                              ? 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/30'
                              : 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/30'
                          }`}
                        >
                          {issue.isAnomaly ? 'Anomaly' : 'Rule Violation'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#29212A] capitalize">
                      {issue.dimension}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#641B32] font-bold">
                      {issue.column || '(entire row)'}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#29212A]">
                      {issue.affectedRowsCount}
                    </td>
                    <td className="py-3 px-3 max-w-xs text-[11px] text-[#756772] leading-relaxed">
                      {issue.explanation}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-[#B4233D] max-w-[150px] truncate">
                      {issue.sampleProblematicValues.join(', ') || 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate('/app/cleaning')}
                        className="px-2.5 py-1 rounded-lg bg-[#641B32] text-[#FFF8EF] text-[10px] font-bold hover:bg-[#3D1023] transition-colors inline-flex items-center gap-1"
                      >
                        <span>Remediate</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Caveat and Honesty Note */}
      <div className="p-5 rounded-2xl bg-[#FFF8EF] border border-[#D9A0AE]/30 flex items-start gap-3 text-xs text-[#756772]">
        <Info className="w-4 h-4 text-[#641B32] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#29212A]">Methodological Notice: </strong>
          A score of 100% does not imply that the data is an absolute mirror of reality; it confirms that the data conforms to the configured constraints, type specifications, and ranges. Flagged plausibility outliers may be genuine extreme environmental events. Always review recommendations before applying irreversible transformations.
        </p>
      </div>
    </div>
  );
};
