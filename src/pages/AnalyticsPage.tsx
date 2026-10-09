import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  ScatterChart,
  Binary,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  HelpCircle,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { AnalyticsEngine } from '../services/analyticsEngine';
import { HistogramChart, TimeSeriesTrendChart, MissingnessBarChart, CorrelationMatrixChart } from '../components/common/Charts';

interface AnalyticsPageProps {
  navigate: (path: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ navigate }) => {
  const { currentDataset } = useDataset();

  // Active hover tooltip for table stats
  const [hoveredStatHeader, setHoveredStatHeader] = useState<string | null>(null);

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto">
        <BarChart3 className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Dataset Selected</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Select or ingest a dataset to generate exploratory statistical analytics.
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

  const numericCols = currentDataset.columns.filter(c => c.inferredType === 'number').map(c => c.name);
  const timeCols = currentDataset.columns.filter(c => c.isTimestamp).map(c => c.name);

  const [selectedHistogramCol, setSelectedHistogramCol] = useState<string>(numericCols[0] || '');
  const [selectedTimeCol, setSelectedTimeCol] = useState<string>(timeCols[0] || '');
  const [selectedMetricCol, setSelectedMetricCol] = useState<string>(numericCols[0] || '');

  const correlations = AnalyticsEngine.computeCorrelations(currentDataset.cleanedRecords, numericCols);
  const histogramBins = selectedHistogramCol
    ? AnalyticsEngine.computeHistogram(currentDataset.cleanedRecords, selectedHistogramCol)
    : [];

  const timeSeriesData = selectedTimeCol && selectedMetricCol
    ? AnalyticsEngine.extractTimeSeries(currentDataset.cleanedRecords, selectedTimeCol, selectedMetricCol)
    : [];

  const getMetricExplanation = (metric: string) => {
    switch (metric) {
      case 'min':
        return 'Minimum observed value across all clean rows. Extreme low values may indicate sensor drops, negative offsets, or corrupt nulls coded as numbers.';
      case 'median':
        return '50th percentile (middle value). Unlike the mean, the median is robust to extreme outliers and skewed tails.';
      case 'mean':
        return 'Arithmetic average. When Mean diverges significantly from Median, it signals skewness or outlier contamination in the distribution.';
      case 'max':
        return 'Maximum observed value. Extreme high values may indicate signal spikes, unit mismatches, or measurement overflow.';
      case 'stdDev':
        return 'Standard deviation (σ). Quantifies statistical dispersion. In normal distributions, ~68% of data falls within Mean ± 1σ, and ~95% within Mean ± 2σ.';
      case 'nullPct':
        return 'Percentage of unpopulated or NULL records in this attribute. Features with >20% missingness may require systematic imputation or omission.';
      default:
        return 'Statistical distribution summary metric.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Statistical Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Exploratory distributions, cross-attribute correlations, and temporal series for{' '}
            <strong className="text-[#641B32]">{currentDataset.name}</strong>.
          </p>
        </div>

        <button
          onClick={() => navigate('/app/predictions')}
          className="px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Experimental Predictions</span>
        </button>
      </div>

      {/* Numerical Feature Profiler Table with Interactive Header Tooltips */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#641B32]" />
            Numerical Feature Distribution Summary
          </h3>
          <span className="text-[10px] font-mono text-[#756772]">
            Hover column headers for statistical definitions
          </span>
        </div>

        {numericCols.length === 0 ? (
          <p className="text-xs text-[#756772]">No numeric attributes identified in this dataset.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#D9A0AE]/30 text-[#756772] font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Column</th>
                  
                  {/* Min with Tooltip */}
                  <th
                    className="py-2.5 px-3 relative cursor-help"
                    onMouseEnter={() => setHoveredStatHeader('min')}
                    onMouseLeave={() => setHoveredStatHeader(null)}
                  >
                    <span className="underline decoration-dotted decoration-[#D9A0AE]">Min</span>
                    {hoveredStatHeader === 'min' && (
                      <div className="absolute left-0 bottom-full mb-1 z-40 bg-[#3D1023] text-[#FFF8EF] p-2.5 rounded-xl shadow-xl w-48 text-[10px] font-sans pointer-events-none animate-in fade-in">
                        <strong className="text-[#D9A0AE] block">Minimum</strong>
                        {getMetricExplanation('min')}
                      </div>
                    )}
                  </th>

                  {/* Median with Tooltip */}
                  <th
                    className="py-2.5 px-3 relative cursor-help"
                    onMouseEnter={() => setHoveredStatHeader('median')}
                    onMouseLeave={() => setHoveredStatHeader(null)}
                  >
                    <span className="underline decoration-dotted decoration-[#D9A0AE]">Median</span>
                    {hoveredStatHeader === 'median' && (
                      <div className="absolute left-0 bottom-full mb-1 z-40 bg-[#3D1023] text-[#FFF8EF] p-2.5 rounded-xl shadow-xl w-48 text-[10px] font-sans pointer-events-none animate-in fade-in">
                        <strong className="text-[#D9A0AE] block">Median (P50)</strong>
                        {getMetricExplanation('median')}
                      </div>
                    )}
                  </th>

                  {/* Mean with Tooltip */}
                  <th
                    className="py-2.5 px-3 relative cursor-help"
                    onMouseEnter={() => setHoveredStatHeader('mean')}
                    onMouseLeave={() => setHoveredStatHeader(null)}
                  >
                    <span className="underline decoration-dotted decoration-[#D9A0AE]">Mean</span>
                    {hoveredStatHeader === 'mean' && (
                      <div className="absolute left-0 bottom-full mb-1 z-40 bg-[#3D1023] text-[#FFF8EF] p-2.5 rounded-xl shadow-xl w-48 text-[10px] font-sans pointer-events-none animate-in fade-in">
                        <strong className="text-[#D9A0AE] block">Mean (Arithmetic)</strong>
                        {getMetricExplanation('mean')}
                      </div>
                    )}
                  </th>

                  {/* Max with Tooltip */}
                  <th
                    className="py-2.5 px-3 relative cursor-help"
                    onMouseEnter={() => setHoveredStatHeader('max')}
                    onMouseLeave={() => setHoveredStatHeader(null)}
                  >
                    <span className="underline decoration-dotted decoration-[#D9A0AE]">Max</span>
                    {hoveredStatHeader === 'max' && (
                      <div className="absolute left-0 bottom-full mb-1 z-40 bg-[#3D1023] text-[#FFF8EF] p-2.5 rounded-xl shadow-xl w-48 text-[10px] font-sans pointer-events-none animate-in fade-in">
                        <strong className="text-[#D9A0AE] block">Maximum</strong>
                        {getMetricExplanation('max')}
                      </div>
                    )}
                  </th>

                  {/* Std Dev with Tooltip */}
                  <th
                    className="py-2.5 px-3 relative cursor-help"
                    onMouseEnter={() => setHoveredStatHeader('stdDev')}
                    onMouseLeave={() => setHoveredStatHeader(null)}
                  >
                    <span className="underline decoration-dotted decoration-[#D9A0AE]">Std Dev (σ)</span>
                    {hoveredStatHeader === 'stdDev' && (
                      <div className="absolute left-0 bottom-full mb-1 z-40 bg-[#3D1023] text-[#FFF8EF] p-2.5 rounded-xl shadow-xl w-52 text-[10px] font-sans pointer-events-none animate-in fade-in">
                        <strong className="text-[#D9A0AE] block">Standard Deviation</strong>
                        {getMetricExplanation('stdDev')}
                      </div>
                    )}
                  </th>

                  {/* Null % with Tooltip */}
                  <th
                    className="py-2.5 px-3 relative cursor-help"
                    onMouseEnter={() => setHoveredStatHeader('nullPct')}
                    onMouseLeave={() => setHoveredStatHeader(null)}
                  >
                    <span className="underline decoration-dotted decoration-[#D9A0AE]">Null %</span>
                    {hoveredStatHeader === 'nullPct' && (
                      <div className="absolute right-0 bottom-full mb-1 z-40 bg-[#3D1023] text-[#FFF8EF] p-2.5 rounded-xl shadow-xl w-52 text-[10px] font-sans pointer-events-none animate-in fade-in">
                        <strong className="text-[#D9A0AE] block">Missing Percentage</strong>
                        {getMetricExplanation('nullPct')}
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9A0AE]/20">
                {currentDataset.columns
                  .filter(c => c.inferredType === 'number')
                  .map(col => {
                    const isSkewed =
                      col.mean !== undefined &&
                      col.median !== undefined &&
                      Math.abs(col.mean - col.median) > (col.stdDev || 1) * 0.5;

                    return (
                      <tr key={col.name} className="hover:bg-[#FFF8EF]/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#641B32]">
                          <span>{col.name}</span>
                          {isSkewed && (
                            <span
                              className="ml-2 text-[9px] font-sans font-normal px-1.5 py-0.2 rounded bg-[#B77722]/15 text-[#B77722] border border-[#B77722]/30"
                              title="Mean and median diverge noticeably, indicating skewed distribution"
                            >
                              skewed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#29212A]">{col.min ?? 'N/A'}</td>
                        <td className="py-2.5 px-3 text-[#29212A]">{col.median ?? 'N/A'}</td>
                        <td className="py-2.5 px-3 text-[#29212A]">{col.mean ?? 'N/A'}</td>
                        <td className="py-2.5 px-3 text-[#29212A]">{col.max ?? 'N/A'}</td>
                        <td className="py-2.5 px-3 text-[#756772]">{col.stdDev ?? 'N/A'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              col.nullPercentage > 0
                                ? 'bg-[#B4233D]/10 text-[#B4233D] font-bold'
                                : 'text-[#277A58]'
                            }`}
                          >
                            {col.nullPercentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Analytics Grid: Histograms & Pearson Correlations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Histogram with Rich Tooltips */}
        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#641B32]" />
                Frequency Histogram
              </h3>
              <p className="text-[11px] text-[#756772]">
                Hover bins for exact frequencies, interval bounds, and cumulative shares.
              </p>
            </div>

            {numericCols.length > 0 && (
              <select
                value={selectedHistogramCol}
                onChange={e => setSelectedHistogramCol(e.target.value)}
                className="text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-1 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32]"
                aria-label="Select feature for histogram"
              >
                {numericCols.map(col => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            )}
          </div>

          <HistogramChart bins={histogramBins} columnName={selectedHistogramCol} />
        </div>

        {/* Pearson Correlation Matrix with Rich Tooltips */}
        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                <Binary className="w-4 h-4 text-[#641B32]" />
                Pairwise Pearson Correlation (r)
              </h3>
              <p className="text-[11px] text-[#756772]">
                Hover correlation pairs to read intuitive collinearity interpretations.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFF8EF] text-[#641B32] border border-[#D9A0AE]/30 font-semibold">
              Linear (r)
            </span>
          </div>

          <CorrelationMatrixChart correlations={correlations} />
        </div>
      </div>

      {/* Time-Series Trend Line (if timestamp column present) */}
      {timeCols.length > 0 && (
        <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#641B32]" />
                Temporal Trend Series
              </h3>
              <p className="text-[11px] text-[#756772]">
                Hover data points to inspect step delta, deviation from series mean, and outlier warnings.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {timeCols.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#756772]">Time:</span>
                  <select
                    value={selectedTimeCol}
                    onChange={e => setSelectedTimeCol(e.target.value)}
                    className="bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-1 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32]"
                  >
                    {timeCols.map(col => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-[#756772]">Metric:</span>
                <select
                  value={selectedMetricCol}
                  onChange={e => setSelectedMetricCol(e.target.value)}
                  className="bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-2.5 py-1 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32]"
                  aria-label="Select metric for temporal series"
                >
                  {numericCols.map(col => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <TimeSeriesTrendChart data={timeSeriesData} metricName={selectedMetricCol} />
        </div>
      )}
    </div>
  );
};
