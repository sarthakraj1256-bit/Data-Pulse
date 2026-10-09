import React, { useState } from 'react';
import {
  Info,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { QualityAssessment, DimensionScore, QualityDimensionType } from '../../types';

// ==========================================
// 1. Dimension Scores Horizontal Breakdown
// ==========================================

interface DimensionChartProps {
  assessment: QualityAssessment;
}

export const DimensionScoresChart: React.FC<DimensionChartProps> = ({ assessment }) => {
  const dimensions = Object.values(assessment.dimensionScores);
  const [hoveredDimension, setHoveredDimension] = useState<DimensionScore | null>(null);

  const getScoreColor = (score: number, evaluated: boolean) => {
    if (!evaluated) return '#756772';
    if (score >= 90) return '#277A58'; // Success
    if (score >= 70) return '#B77722'; // Warning
    return '#B4233D'; // Error
  };

  const getDimensionExplanation = (type: QualityDimensionType): string => {
    switch (type) {
      case 'completeness':
        return 'Measures the proportion of populated versus missing (NULL, NaN, blank) data cells across all attributes.';
      case 'validity':
        return 'Checks conformance to syntactic schema types, valid numeric parsability, and ISO 8601 timestamp constraints.';
      case 'consistency':
        return 'Detects conflicting categorical representations (e.g. uppercase vs lowercase parity) and unwanted whitespace padding.';
      case 'uniqueness':
        return 'Identifies redundant tuple duplications and duplicate primary records across all dataset feature keys.';
      case 'timeliness':
        return 'Verifies non-decreasing chronological ordering and isolates unexpected sampling dropouts exceeding max gap thresholds.';
      case 'plausibility':
        return 'Evaluates physical domain boundaries and 1.5x IQR Tukey statistical fences to flag genuine anomalies versus corrupt spikes.';
      default:
        return 'Quality dimension check evaluated against deterministic criteria.';
    }
  };

  const getRemediationHint = (type: QualityDimensionType): string => {
    switch (type) {
      case 'completeness':
        return 'Impute missing values using Mean/Median/Mode or drop rows with excessive missingness.';
      case 'validity':
        return 'Coerce non-numeric text to numeric or standardize dates to ISO 8601 format.';
      case 'consistency':
        return 'Apply whitespace trimming and case normalization (UPPERCASE or lowercase).';
      case 'uniqueness':
        return 'Deduplicate rows preserving primary occurrence.';
      case 'timeliness':
        return 'Sort by timestamp or interpolate missing sample time steps.';
      case 'plausibility':
        return 'Apply Tukey IQR fence capping or flag extreme physical values.';
      default:
        return 'Review detected defects in the Cleaning Studio.';
    }
  };

  return (
    <div className="space-y-4 relative">
      {dimensions.map(dim => {
        const color = getScoreColor(dim.score, dim.evaluated);
        const isHovered = hoveredDimension?.dimension === dim.dimension;

        return (
          <div
            key={dim.dimension}
            className="group relative cursor-pointer p-2.5 -mx-2.5 rounded-2xl transition-all hover:bg-[#FFF8EF] border border-transparent hover:border-[#D9A0AE]/30"
            onMouseEnter={() => setHoveredDimension(dim)}
            onMouseLeave={() => setHoveredDimension(null)}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#29212A] capitalize flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="font-serif font-bold text-sm text-[#3D1023]">{dim.dimension}</span>
                <span className="text-[10px] font-mono text-[#756772] opacity-75">
                  ({dim.evaluated ? 'Active' : 'N/A'})
                </span>
                <HelpCircle className="w-3.5 h-3.5 text-[#756772] opacity-40 group-hover:opacity-100 transition-opacity" />
              </span>
              <div className="flex items-center gap-2">
                {dim.issuesCount > 0 ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#B4233D]/10 text-[#B4233D] font-bold border border-[#B4233D]/20">
                    {dim.issuesCount} defect{dim.issuesCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#277A58]/10 text-[#277A58] font-bold border border-[#277A58]/20">
                    Optimal
                  </span>
                )}
                <span
                  className="font-mono font-bold text-sm px-2 py-0.5 rounded-lg"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                  }}
                >
                  {dim.evaluated ? `${dim.score}%` : 'Not Evaluated'}
                </span>
              </div>
            </div>

            {/* Score progress bar */}
            <div className="w-full h-3 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-full overflow-hidden shadow-inner p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${dim.evaluated ? dim.score : 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#756772] mt-1.5">
              <span className="truncate max-w-[70%]">{dim.description}</span>
              <span className="text-[10px] font-mono text-[#641B32] font-semibold">
                {dim.affectedRowsCount > 0 ? `${dim.affectedRowsCount} rows affected` : '0 affected records'}
              </span>
            </div>

            {/* Interactive Tooltip Card on Hover */}
            {isHovered && (
              <div className="absolute left-0 right-0 -top-3 -translate-y-full z-50 bg-[#3D1023] text-[#FFF8EF] p-4 rounded-2xl shadow-2xl border border-[#D9A0AE]/40 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                <div className="flex items-center justify-between pb-2 border-b border-[#FFF8EF]/20 mb-2.5">
                  <span className="font-serif font-bold text-sm uppercase tracking-wide flex items-center gap-2 text-[#FFF8EF]">
                    <ShieldCheck className="w-4 h-4 text-[#D9A0AE]" />
                    {dim.dimension} Metric Audit
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                    style={{ backgroundColor: color, color: '#FFF8EF' }}
                  >
                    {dim.evaluated ? `${dim.score}% Compliance` : 'Not Assessed'}
                  </span>
                </div>

                <p className="text-xs text-[#FFF8EF]/90 leading-relaxed mb-3 font-sans">
                  {getDimensionExplanation(dim.dimension)}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#29212A]/70 p-2.5 rounded-xl mb-2.5 border border-[#FFF8EF]/10">
                  <div>
                    <span className="text-[#D9A0AE] block text-[10px] uppercase">Identified Defects:</span>
                    <span className="font-bold text-[#FFF8EF] text-xs">{dim.issuesCount} anomaly issue(s)</span>
                  </div>
                  <div>
                    <span className="text-[#D9A0AE] block text-[10px] uppercase">Impacted Rows:</span>
                    <span className="font-bold text-[#FFF8EF] text-xs">{dim.affectedRowsCount} record(s)</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="text-[#D9A0AE]">
                    <strong className="text-[#FFF8EF]">Evaluation Benchmark: </strong>
                    {dim.benchmarkRule}
                  </div>
                  <div className="text-[#FFF8EF]/80 flex items-center gap-1.5 pt-1 border-t border-[#FFF8EF]/10">
                    <Zap className="w-3 h-3 text-[#D9A0AE] shrink-0" />
                    <span><strong className="text-[#D9A0AE]">Suggested Fix: </strong>{getRemediationHint(dim.dimension)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// 2. Quality Radar / Spider Chart (Polar)
// ==========================================

interface QualityRadarProps {
  assessment: QualityAssessment;
  size?: number;
}

export const QualityRadarChart: React.FC<QualityRadarProps> = ({ assessment, size = 320 }) => {
  const dimensions = Object.values(assessment.dimensionScores);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalPoints = dimensions.length;
  const center = size / 2;
  const radius = size * 0.36;

  // Compute vertex coordinates
  const getCoordinates = (index: number, valueScore: number, maxRadius: number) => {
    // 0 is at top (-PI/2)
    const angle = (Math.PI * 2 / totalPoints) * index - Math.PI / 2;
    const r = (valueScore / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Polygon path for scores
  const scorePoints = dimensions.map((d, i) => getCoordinates(i, d.evaluated ? d.score : 0, radius));
  const scorePath = scorePoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '') + ' Z';

  // Grid concentric polygons (25%, 50%, 75%, 100%)
  const gridLevels = [25, 50, 75, 100];

  const activeDim = hoveredIdx !== null ? dimensions[hoveredIdx] : null;

  return (
    <div className="relative flex flex-col items-center select-none">
      <svg width={size} height={size} className="overflow-visible font-mono text-[10px]">
        {/* Background circular web grids */}
        {gridLevels.map(lvl => {
          const gridPoints = dimensions.map((_, i) => getCoordinates(i, lvl, radius));
          const gridPath = gridPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '') + ' Z';
          return (
            <g key={lvl}>
              <path
                d={gridPath}
                fill="none"
                stroke="#D9A0AE"
                strokeOpacity={lvl === 100 ? '0.4' : '0.2'}
                strokeDasharray={lvl === 100 ? undefined : '3 3'}
              />
              <text
                x={center + 3}
                y={center - (lvl / 100) * radius + 9}
                fill="#756772"
                fontSize="8"
                opacity="0.6"
              >
                {lvl}%
              </text>
            </g>
          );
        })}

        {/* Spokes radiating from center */}
        {dimensions.map((d, i) => {
          const outer = getCoordinates(i, 100, radius);
          const isHovered = hoveredIdx === i;
          return (
            <line
              key={d.dimension}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke={isHovered ? '#641B32' : '#D9A0AE'}
              strokeWidth={isHovered ? 1.5 : 1}
              strokeOpacity={isHovered ? 0.8 : 0.3}
            />
          );
        })}

        {/* Shaded Area of scores */}
        <path
          d={scorePath}
          fill="url(#radarGradient)"
          stroke="#641B32"
          strokeWidth="2.5"
          className="transition-all duration-300"
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#641B32" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#D9A0AE" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Vertex interactive points */}
        {scorePoints.map((p, i) => {
          const dim = dimensions[i];
          const isHovered = hoveredIdx === i;
          const outerLabelPos = getCoordinates(i, 118, radius);

          return (
            <g
              key={dim.dimension}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible large target for hover */}
              <circle cx={p.x} cy={p.y} r={14} fill="transparent" />

              {/* Point dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill={dim.score >= 90 ? '#277A58' : dim.score >= 70 ? '#B77722' : '#B4233D'}
                stroke="#FFF8EF"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="transition-all duration-150"
              />

              {/* Dimension Label around perimeter */}
              <text
                x={outerLabelPos.x}
                y={outerLabelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? '#641B32' : '#29212A'}
                fontWeight={isHovered ? 'bold' : 'normal'}
                fontSize="10"
                className="capitalize transition-colors font-sans"
              >
                {dim.dimension}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Interactive Tooltip Callout on Hover */}
      {activeDim && (
        <div className="absolute -top-3 z-50 bg-[#3D1023] text-[#FFF8EF] p-3 rounded-2xl shadow-xl border border-[#D9A0AE]/30 max-w-xs pointer-events-none text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1 border-b border-[#FFF8EF]/20 font-bold">
            <span className="font-serif capitalize text-[#D9A0AE] text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {activeDim.dimension}
            </span>
            <span
              className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                activeDim.score >= 90
                  ? 'bg-[#277A58] text-[#FFF8EF]'
                  : activeDim.score >= 70
                  ? 'bg-[#B77722] text-[#FFF8EF]'
                  : 'bg-[#B4233D] text-[#FFF8EF]'
              }`}
            >
              {activeDim.score}%
            </span>
          </div>
          <p className="text-[11px] text-[#FFF8EF]/90">{activeDim.description}</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#29212A]/60 p-1.5 rounded-lg border border-[#FFF8EF]/10">
            <div>
              <span className="text-[#D9A0AE] block">Defects:</span>
              <span className="font-bold text-[#FFF8EF]">{activeDim.issuesCount} issue(s)</span>
            </div>
            <div>
              <span className="text-[#D9A0AE] block">Impacted Rows:</span>
              <span className="font-bold text-[#FFF8EF]">{activeDim.affectedRowsCount}</span>
            </div>
          </div>
          <div className="text-[10px] text-[#D9A0AE]">
            <strong className="text-[#FFF8EF]">Rule: </strong>
            {activeDim.benchmarkRule}
          </div>
        </div>
      )}

      <div className="text-[11px] text-[#756772] font-mono mt-1 text-center">
        Hover vertices to inspect dimensional compliance rules.
      </div>
    </div>
  );
};

// ==========================================
// 3. Missingness Bar Chart (Completeness)
// ==========================================

interface MissingnessChartProps {
  columns: { name: string; nullCount: number; nullPercentage: number; inferredType?: string }[];
}

export const MissingnessBarChart: React.FC<MissingnessChartProps> = ({ columns }) => {
  const relevantCols = columns.filter(c => c.nullCount > 0);
  const [hoveredCol, setHoveredCol] = useState<{
    name: string;
    nullCount: number;
    nullPercentage: number;
    inferredType?: string;
  } | null>(null);

  if (relevantCols.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[#277A58] bg-[#277A58]/5 rounded-xl border border-[#277A58]/20 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>100% Complete: Zero missing, null, or blank values detected across all columns.</span>
      </div>
    );
  }

  const maxPct = Math.max(...relevantCols.map(c => c.nullPercentage), 1);

  return (
    <div className="space-y-3 relative">
      {relevantCols.map(col => {
        const isHovered = hoveredCol?.name === col.name;

        return (
          <div
            key={col.name}
            className="space-y-1 relative cursor-pointer p-2 -mx-2 rounded-xl hover:bg-[#FFF8EF] transition-all border border-transparent hover:border-[#D9A0AE]/30"
            onMouseEnter={() => setHoveredCol(col)}
            onMouseLeave={() => setHoveredCol(null)}
          >
            <div className="flex justify-between text-xs">
              <span className="font-mono text-[#29212A] font-semibold flex items-center gap-1.5">
                <span className="text-[#641B32] font-bold">{col.name}</span>
                {col.inferredType && (
                  <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#F8EFE5] text-[#756772] rounded-md border border-[#D9A0AE]/20 font-mono">
                    {col.inferredType}
                  </span>
                )}
              </span>
              <span className="text-[#B4233D] font-mono font-bold">
                {col.nullCount} missing ({col.nullPercentage}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#FFF8EF] border border-[#D9A0AE]/20 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#B94B68] to-[#B4233D] rounded-full transition-all duration-300"
                style={{ width: `${(col.nullPercentage / maxPct) * 100}%` }}
              />
            </div>

            {/* Interactive Tooltip on Hover */}
            {isHovered && (
              <div className="absolute left-0 right-0 -top-2 -translate-y-full z-40 bg-[#3D1023] text-[#FFF8EF] p-3.5 rounded-2xl shadow-2xl border border-[#D9A0AE]/40 pointer-events-none text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="font-bold flex items-center justify-between pb-1.5 border-b border-[#FFF8EF]/20">
                  <span className="font-mono text-[#D9A0AE] text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D9A0AE]" />
                    {col.name} Completeness Analysis
                  </span>
                  <span className="text-[#B4233D] bg-[#FFF8EF] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                    {col.nullPercentage}% Missing
                  </span>
                </div>
                <p className="text-[11px] text-[#FFF8EF]/90 leading-relaxed">
                  Contains <strong>{col.nullCount}</strong> unpopulated or NULL records. Missing values distort algorithmic parameter estimations and bias correlations.
                </p>
                <div className="p-2 rounded-lg bg-[#29212A]/60 text-[10px] font-mono text-[#D9A0AE] border border-[#FFF8EF]/10">
                  <span className="text-[#FFF8EF] font-bold">Remediation: </span>
                  {col.inferredType === 'number'
                    ? 'Impute using median (robust against outliers) or mean in the Cleaning Studio.'
                    : 'Impute using mode (most frequent category) or drop missing rows.'}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// 4. Frequency Histogram Chart
// ==========================================

interface HistogramProps {
  bins: { binStart: number; binEnd: number; label: string; count: number }[];
  columnName: string;
}

export const HistogramChart: React.FC<HistogramProps> = ({ bins, columnName }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const totalObs = bins.reduce((a, b) => a + b.count, 0);

  if (bins.length === 0) {
    return <div className="text-xs text-[#756772] py-4 text-center">No distribution data available for this attribute.</div>;
  }

  // Calculate cumulative counts for distribution profiling
  let runningCount = 0;
  const cumulativePercentages = bins.map(b => {
    runningCount += b.count;
    return totalObs > 0 ? ((runningCount / totalObs) * 100).toFixed(1) : '0';
  });

  return (
    <div className="space-y-3">
      <div className="h-44 flex items-end gap-1.5 pt-6 px-2 border-b border-[#D9A0AE]/30 relative">
        {bins.map((bin, i) => {
          const heightPct = (bin.count / maxCount) * 100;
          const isHovered = hoveredIdx === i;
          const pctOfTotal = totalObs > 0 ? ((bin.count / totalObs) * 100).toFixed(1) : '0';
          const cumulativePct = cumulativePercentages[i];
          const isModalBin = bin.count === maxCount;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Interactive Tooltip Card for Histogram Bin */}
              {isHovered && (
                <div className="absolute -top-24 bg-[#3D1023] text-[#FFF8EF] p-3 rounded-2xl shadow-2xl z-40 whitespace-nowrap pointer-events-none text-left border border-[#D9A0AE]/40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-xs font-bold text-[#FFF8EF] flex items-center justify-between gap-3 pb-1 border-b border-[#FFF8EF]/20">
                    <span className="flex items-center gap-1.5 text-[#D9A0AE]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D9A0AE]" />
                      <span>Interval [{bin.binStart.toFixed(2)} to {bin.binEnd.toFixed(2)}]</span>
                    </span>
                    {isModalBin && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#277A58] text-[#FFF8EF]">
                        Mode Peak
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#D9A0AE] mt-1.5">
                    <div>
                      <span>Bin Frequency: </span>
                      <strong className="text-[#FFF8EF]">{bin.count} obs</strong>
                    </div>
                    <div>
                      <span>Relative Share: </span>
                      <strong className="text-[#FFF8EF]">{pctOfTotal}%</strong>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#D9A0AE] mt-1">
                    <span>Cumulative Distribution (≤ max): </span>
                    <strong className="text-[#FFF8EF]">{cumulativePct}% of dataset</strong>
                  </div>
                </div>
              )}

              <div
                className={`w-full rounded-t transition-all duration-200 ${
                  isHovered
                    ? 'bg-[#641B32] shadow-md scale-y-102 ring-1 ring-[#FFF8EF]'
                    : isModalBin
                    ? 'bg-[#B94B68]'
                    : 'bg-[#D9A0AE] hover:bg-[#B94B68]'
                }`}
                style={{ height: `${Math.max(6, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] font-mono text-[#756772] px-1">
        <span>Min: {bins[0]?.binStart.toFixed(1)}</span>
        <span className="font-sans text-[11px] text-[#29212A] font-semibold">
          Observed Density for <span className="text-[#641B32] font-mono font-bold">{columnName}</span> ({totalObs} total observations)
        </span>
        <span>Max: {bins[bins.length - 1]?.binEnd.toFixed(1)}</span>
      </div>
    </div>
  );
};

// ==========================================
// 5. Time Series Trend Chart
// ==========================================

interface TimeSeriesChartProps {
  data: { timestamp: string; value: number; label: string }[];
  metricName: string;
}

export const TimeSeriesTrendChart: React.FC<TimeSeriesChartProps> = ({ data, metricName }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    timestamp: string;
    value: number;
    label: string;
    index: number;
  } | null>(null);

  if (data.length < 2) {
    return (
      <div className="py-8 text-center text-xs text-[#756772]">
        Requires at least 2 timestamped data points to render trend line.
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const avgVal = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
  const range = maxVal - minVal || 1;

  // Compute standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avgVal, 2), 0) / values.length;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  const width = 640;
  const height = 200;
  const padding = 34;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - minVal) / range) * (height - padding * 2);
    return { x, y, index: i, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Previous point for derivative calculation
  const prevPoint = hoveredPoint && hoveredPoint.index > 0 ? data[hoveredPoint.index - 1] : null;
  const deltaFromPrev = hoveredPoint && prevPoint ? Number((hoveredPoint.value - prevPoint.value).toFixed(2)) : null;

  return (
    <div className="w-full relative">
      {/* SVG Container */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[340px] max-h-56 font-mono text-[9px] select-none"
        >
          {/* Horizontal gridlines */}
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="#D9A0AE"
            strokeOpacity="0.2"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#D9A0AE"
            strokeOpacity="0.2"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#D9A0AE"
            strokeOpacity="0.3"
          />

          {/* Reference Axis Labels */}
          <text x={padding - 6} y={padding + 4} textAnchor="end" fill="#756772">
            {maxVal.toFixed(1)}
          </text>
          <text x={padding - 6} y={height / 2 + 3} textAnchor="end" fill="#756772" opacity="0.6">
            {avgVal.toFixed(1)}
          </text>
          <text x={padding - 6} y={height - padding + 4} textAnchor="end" fill="#756772">
            {minVal.toFixed(1)}
          </text>

          {/* Area Gradient Fill */}
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
            fill="url(#timeTrendGradient)"
            opacity="0.25"
          />

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke="#641B32" strokeWidth="2.5" strokeLinecap="round" />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="timeTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#641B32" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFF8EF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Data Points with Hover Detection */}
          {points.map((p) => {
            const isHovered = hoveredPoint?.index === p.index;
            const isOutlier = Math.abs(p.value - avgVal) > 2 * stdDev;

            return (
              <g
                key={p.index}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Invisible large target for easy hovering */}
                <circle cx={p.x} cy={p.y} r={12} fill="transparent" />

                {/* Visible dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : isOutlier ? 4.5 : 3.5}
                  fill={isHovered ? '#641B32' : isOutlier ? '#B4233D' : '#3D1023'}
                  stroke="#FFF8EF"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}

          {/* X Axis Edge Labels */}
          <text x={padding} y={height - 10} fill="#756772">
            {data[0].label}
          </text>
          <text x={width - padding} y={height - 10} textAnchor="end" fill="#756772">
            {data[data.length - 1].label}
          </text>
        </svg>
      </div>

      {/* Floating Interactive Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-40 bg-[#3D1023] text-[#FFF8EF] p-3 rounded-2xl shadow-2xl border border-[#D9A0AE]/40 pointer-events-none text-xs transform -translate-x-1/2 -translate-y-full -top-3 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(85, Math.max(15, (hoveredPoint.x / width) * 100))}%`,
          }}
        >
          <div className="font-bold text-[#D9A0AE] text-[10px] font-mono flex items-center justify-between gap-2 pb-1 border-b border-[#FFF8EF]/20">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#FFF8EF]" />
              <span>Record #{hoveredPoint.index + 1} of {data.length}</span>
            </span>
            <span className="text-[#FFF8EF]">{hoveredPoint.label}</span>
          </div>

          <div className="font-bold text-sm text-[#FFF8EF] mt-1">
            {metricName}: <span className="text-[#D9A0AE] font-mono">{hoveredPoint.value}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#29212A]/60 p-1.5 rounded-lg border border-[#FFF8EF]/10 mt-1.5">
            <div>
              <span className="text-[#D9A0AE] block">Vs. Mean ({avgVal}):</span>
              <strong className={hoveredPoint.value >= avgVal ? 'text-[#277A58]' : 'text-[#B4233D]'}>
                {hoveredPoint.value >= avgVal ? `+${(hoveredPoint.value - avgVal).toFixed(2)}` : (hoveredPoint.value - avgVal).toFixed(2)}
              </strong>
            </div>
            <div>
              <span className="text-[#D9A0AE] block">Step Delta:</span>
              <span className="text-[#FFF8EF]">
                {deltaFromPrev !== null ? (deltaFromPrev > 0 ? `+${deltaFromPrev}` : deltaFromPrev) : 'Initial'}
              </span>
            </div>
          </div>

          {Math.abs(hoveredPoint.value - avgVal) > 2 * stdDev && (
            <div className="text-[9px] font-mono text-[#B4233D] bg-[#FFF8EF] px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
              Outlier Warning: &gt; 2σ deviation
            </div>
          )}
        </div>
      )}

      <div className="text-center text-[11px] text-[#756772] mt-1 flex items-center justify-center gap-2">
        <span>Observed series trend for <strong className="text-[#641B32]">{metricName}</strong></span>
        <span>•</span>
        <span className="font-mono text-[10px]">Mean: {avgVal} | StdDev: {stdDev} | Range: [{minVal}, {maxVal}]</span>
      </div>
    </div>
  );
};

// ==========================================
// 6. Pearson Correlation Matrix
// ==========================================

interface CorrelationMatrixProps {
  correlations: { colA: string; colB: string; coefficient: number }[];
}

export const CorrelationMatrixChart: React.FC<CorrelationMatrixProps> = ({ correlations }) => {
  const [hoveredCorr, setHoveredCorr] = useState<{
    colA: string;
    colB: string;
    coefficient: number;
  } | null>(null);

  if (correlations.length === 0) {
    return (
      <p className="text-xs text-[#756772] py-8 text-center">
        Requires at least two numerical features to compute pairwise Pearson correlations.
      </p>
    );
  }

  const getInterpretation = (r: number, colA: string, colB: string): string => {
    const absR = Math.abs(r);
    const direction = r > 0 ? 'positive' : 'negative';
    const strength = absR >= 0.7 ? 'Strong' : absR >= 0.4 ? 'Moderate' : absR >= 0.2 ? 'Weak' : 'Negligible';
    const rSquared = (r * r * 100).toFixed(1);
    return `${strength} ${direction} linear correlation (r = ${r}). Roughly ${rSquared}% of the variance in ${colB} is co-linear with ${colA}.`;
  };

  return (
    <div className="space-y-2.5 relative">
      <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
        {correlations.map((c, i) => {
          const absR = Math.abs(c.coefficient);
          const isHovered = hoveredCorr?.colA === c.colA && hoveredCorr?.colB === c.colB;

          return (
            <div
              key={i}
              className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/30 flex items-center justify-between text-xs hover:border-[#641B32] cursor-pointer transition-all relative group"
              onMouseEnter={() => setHoveredCorr(c)}
              onMouseLeave={() => setHoveredCorr(null)}
            >
              <div className="font-mono text-[#29212A] flex items-center gap-2">
                <span className="font-bold text-[#641B32] text-xs">{c.colA}</span>
                <span className="text-[#756772]">↔</span>
                <span className="font-bold text-[#641B32] text-xs">{c.colB}</span>
                <HelpCircle className="w-3.5 h-3.5 text-[#756772] opacity-40 group-hover:opacity-100 transition-opacity ml-1" />
              </div>

              <div className="flex items-center gap-2.5 font-mono">
                <div className="w-20 h-2 bg-[#F8EFE5] rounded-full overflow-hidden border border-[#D9A0AE]/20">
                  <div
                    className={`h-full ${c.coefficient > 0 ? 'bg-[#277A58]' : 'bg-[#B4233D]'}`}
                    style={{ width: `${absR * 100}%` }}
                  />
                </div>
                <span
                  className={`font-bold w-14 text-right text-xs ${
                    c.coefficient > 0.5
                      ? 'text-[#277A58]'
                      : c.coefficient < -0.5
                      ? 'text-[#B4233D]'
                      : 'text-[#756772]'
                  }`}
                >
                  {c.coefficient > 0 ? `+${c.coefficient}` : c.coefficient}
                </span>
              </div>

              {/* Interactive Tooltip Card for Pearson Correlation */}
              {isHovered && (
                <div className="absolute left-0 right-0 -top-3 -translate-y-full z-50 bg-[#3D1023] text-[#FFF8EF] p-3.5 rounded-2xl shadow-2xl border border-[#D9A0AE]/40 pointer-events-none text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="font-bold flex items-center justify-between pb-1.5 border-b border-[#FFF8EF]/20">
                    <span className="font-mono text-[#D9A0AE] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {c.colA} × {c.colB} Pearson Correlation
                    </span>
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.2 rounded ${
                        c.coefficient > 0 ? 'bg-[#277A58] text-[#FFF8EF]' : 'bg-[#B4233D] text-[#FFF8EF]'
                      }`}
                    >
                      r = {c.coefficient}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#FFF8EF]/95 leading-relaxed font-sans">
                    {getInterpretation(c.coefficient, c.colA, c.colB)}
                  </p>
                  <div className="text-[10px] font-mono text-[#D9A0AE] bg-[#29212A]/60 p-1.5 rounded-lg border border-[#FFF8EF]/10">
                    Shared Variance: R² = {(c.coefficient * c.coefficient).toFixed(3)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
