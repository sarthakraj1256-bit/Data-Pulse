import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Play,
  ShieldAlert,
  Info,
  TrendingUp,
  Cpu,
  CheckCircle2,
  HelpCircle,
  Download,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { PredictionEngine } from '../services/predictionEngine';
import { ExportService } from '../services/exportService';
import { AuditService } from '../services/auditService';
import { PredictionConfig, PredictionResult } from '../types';

interface PredictionsPageProps {
  navigate: (path: string) => void;
}

export const PredictionsPage: React.FC<PredictionsPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { currentDataset, showToast, notifyExportComplete } = useDataset();

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto">
        <Sparkles className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Dataset Selected</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Please select a dataset to configure experimental prediction and anomaly models.
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

  const numericCols = currentDataset.columns.filter(c => c.inferredType === 'number').map(c => c.name);

  const [targetColumn, setTargetColumn] = useState<string>(numericCols[0] || '');
  const [modelType, setModelType] = useState<'linear_trend' | 'moving_average' | 'anomaly_zscore'>('linear_trend');
  const [splitRatio, setSplitRatio] = useState<number>(0.8);
  const [forecastSteps, setForecastSteps] = useState<number>(5);

  const [running, setRunning] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [suitabilityError, setSuitabilityError] = useState<string | null>(null);

  const handleRunModel = () => {
    setSuitabilityError(null);

    const validation = PredictionEngine.validateDatasetSuitability(
      currentDataset.cleanedRecords,
      targetColumn,
      numericCols.filter(c => c !== targetColumn)
    );

    if (!validation.suitable) {
      setSuitabilityError(validation.reason || 'Dataset is unsuitable for modeling.');
      return;
    }

    setRunning(true);
    try {
      const config: PredictionConfig = {
        targetColumn,
        featureColumns: numericCols.filter(c => c !== targetColumn),
        modelType,
        trainSplitRatio: splitRatio,
        forecastHorizonSteps: forecastSteps,
      };

      const result = PredictionEngine.trainAndPredict(currentDataset.cleanedRecords, config);
      setPredictionResult(result);

      if (user) {
        AuditService.log(
          user,
          'PREDICTION_EXECUTED',
          'prediction',
          `Ran ${modelType} model on target "${targetColumn}" (MAE: ${result.metrics.mae}, R²: ${result.metrics.r2})`,
          {
            datasetId: currentDataset.id,
            datasetName: currentDataset.name,
            severity: 'info',
          }
        );
      }
      showToast('Model fitted and evaluated on held-out temporal partition.', 'success');
    } catch (err: any) {
      setSuitabilityError(err?.message || 'Modeling failed. Verify clean numeric values.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
              Experimental Prediction Workspace
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#B77722]/15 text-[#B77722] font-bold border border-[#B77722]/30">
              EXPERIMENTAL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Strictly controlled temporal validation with zero data leakage for{' '}
            <strong className="text-[#641B32]">{currentDataset.name}</strong>.
          </p>
        </div>
      </div>

      {/* Mandatory Scientific Honesty Banner */}
      <div className="p-4 rounded-2xl bg-[#F8EFE5] border-l-4 border-[#B77722] border-t border-r border-b border-[#D9A0AE]/30 flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-[#B77722] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-[#29212A]">Methodological Disclaimer</h4>
          <p className="text-[#756772] leading-relaxed">
            All predictive experiments are evaluated on time-ordered held-out test splits. Metrics reflect mathematical performance on the specific dataset partition and are <strong>not certified for mission-critical industrial dispatch or production automated controls</strong>.
          </p>
        </div>
      </div>

      {/* Model Configuration Form */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#641B32]" />
          Configure Predictive Experiment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Target Column Selection */}
          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Target Numeric Column
            </label>
            <select
              value={targetColumn}
              onChange={e => setTargetColumn(e.target.value)}
              className="w-full bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-3 py-2 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32]"
            >
              {numericCols.map(col => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Model Type */}
          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Algorithmic Baseline
            </label>
            <select
              value={modelType}
              onChange={e => setModelType(e.target.value as any)}
              className="w-full bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-3 py-2 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32]"
            >
              <option value="linear_trend">Linear Trend (Least Squares)</option>
              <option value="moving_average">Rolling Moving Average</option>
              <option value="anomaly_zscore">Z-Score Anomaly Detector</option>
            </select>
          </div>

          {/* Temporal Train/Test Split */}
          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Time-Ordered Train Split ({Math.round(splitRatio * 100)}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="0.9"
              step="0.05"
              value={splitRatio}
              onChange={e => setSplitRatio(Number(e.target.value))}
              className="w-full mt-2 accent-[#641B32]"
            />
          </div>

          {/* Forecast Horizon */}
          <div>
            <label className="block font-semibold text-[#29212A] mb-1">
              Forecast Horizon (Steps)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={forecastSteps}
              onChange={e => setForecastSteps(Number(e.target.value))}
              className="w-full bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-3 py-1.5 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32]"
            />
          </div>
        </div>

        {suitabilityError && (
          <div className="p-3.5 bg-[#B4233D]/10 border border-[#B4233D]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#B4233D]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Suitability Check Warning: </span>
              {suitabilityError}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleRunModel}
            disabled={running || !targetColumn}
            className="px-6 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{running ? 'Fitting Model...' : 'Execute Experimental Evaluation'}</span>
          </button>
        </div>
      </div>

      {/* Model Results */}
      {predictionResult && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Export Bar */}
          <div className="p-4 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <span className="font-bold text-xs text-[#29212A] block">Model Evaluation Verified</span>
              <span className="text-[11px] text-[#756772]">
                Export fitted model metrics, regression coefficients, and held-out test predictions directly to device.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const filename = `DataPulse_Quality_Audit_${currentDataset.name.replace(/\s+/g, '_')}.pdf`;
                  notifyExportComplete({
                    format: 'PDF',
                    filename,
                    downloadFn: () =>
                      ExportService.downloadQualityAuditPDF(currentDataset, predictionResult),
                    title: 'PDF Audit Ready',
                    text: `Model & Quality Audit PDF for "${currentDataset.name}" compiled.`,
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Audit PDF</span>
              </button>
              <button
                onClick={() => {
                  const filename = `DataPulse_Analysis_Insights_${currentDataset.name.replace(/\s+/g, '_')}.csv`;
                  notifyExportComplete({
                    format: 'CSV',
                    filename,
                    downloadFn: () =>
                      ExportService.downloadAnalysisInsightsCSV(currentDataset, predictionResult),
                    title: 'CSV Insights Ready',
                    text: `Model summary & regression insights CSV for "${currentDataset.name}" compiled.`,
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#FFF8EF] transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Insights CSV</span>
              </button>
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#756772] block">
                Mean Absolute Error (MAE)
              </span>
              <span className="text-xl font-bold font-mono text-[#29212A] mt-1 block">
                {predictionResult.metrics.mae}
              </span>
              <span className="text-[10px] text-[#756772]">Average absolute deviation</span>
            </div>

            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#756772] block">
                Root Mean Squared Error (RMSE)
              </span>
              <span className="text-xl font-bold font-mono text-[#29212A] mt-1 block">
                {predictionResult.metrics.rmse}
              </span>
              <span className="text-[10px] text-[#756772]">Penalizes larger outliers</span>
            </div>

            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#756772] block">
                Coefficient of Determination (R²)
              </span>
              <span
                className={`text-xl font-bold font-mono mt-1 block ${
                  predictionResult.metrics.r2 > 0.6 ? 'text-[#277A58]' : 'text-[#B77722]'
                }`}
              >
                {predictionResult.metrics.r2}
              </span>
              <span className="text-[10px] text-[#756772]">Variance explained</span>
            </div>

            <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-mono uppercase text-[#756772] block">
                Partition Split
              </span>
              <span className="text-xl font-bold font-mono text-[#641B32] mt-1 block">
                {predictionResult.trainSize} / {predictionResult.testSize}
              </span>
              <span className="text-[10px] text-[#756772]">Train vs Test rows</span>
            </div>
          </div>

          {/* Test Partition Predictions Table */}
          <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-[#3D1023]">
              Held-Out Test Set: Actual vs Predicted
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#D9A0AE]/30 text-[#756772] text-[11px]">
                    <th className="py-2 px-3">Row #</th>
                    <th className="py-2 px-3">Actual Value</th>
                    <th className="py-2 px-3">Predicted Value</th>
                    <th className="py-2 px-3">Residual Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9A0AE]/20">
                  {predictionResult.actualVsPredicted.map(p => (
                    <tr key={p.index} className="hover:bg-[#FFF8EF]/50">
                      <td className="py-2 px-3 text-[#756772]">#{p.index + 1}</td>
                      <td className="py-2 px-3 font-bold text-[#29212A]">{p.actual}</td>
                      <td className="py-2 px-3 text-[#641B32]">{p.predicted}</td>
                      <td
                        className={`py-2 px-3 ${
                          Math.abs(p.residual) > 5 ? 'text-[#B4233D] font-bold' : 'text-[#756772]'
                        }`}
                      >
                        {p.residual > 0 ? `+${p.residual}` : p.residual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Future Extrapolated Forecast Steps */}
          {predictionResult.forecastFuture && (
            <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-base text-[#3D1023]">
                Extrapolated Forward Forecast Horizon
              </h3>
              <p className="text-xs text-[#756772]">
                Model projections with 95% statistical heuristic confidence interval:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                {predictionResult.forecastFuture.map(f => (
                  <div key={f.step} className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/30 text-center">
                    <span className="text-[10px] text-[#756772] block">Step +{f.step}</span>
                    <span className="font-bold text-sm text-[#641B32] block my-0.5">
                      {f.predictedValue}
                    </span>
                    <span className="text-[9px] text-[#756772] block">
                      [{f.lowerBound}, {f.upperBound}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
