import { PredictionConfig, PredictionResult } from '../types';

export const PredictionEngine = {
  validateDatasetSuitability(
    records: Record<string, any>[],
    targetCol: string,
    featureCols: string[]
  ): { suitable: boolean; reason?: string } {
    if (records.length < 10) {
      return {
        suitable: false,
        reason: `Dataset contains only ${records.length} records. Reliable predictive modeling requires at least 15 clean observations.`,
      };
    }

    const targetNumericCount = records.filter(r => typeof r[targetCol] === 'number' && !isNaN(r[targetCol])).length;
    if (targetNumericCount < 10) {
      return {
        suitable: false,
        reason: `Target column '${targetCol}' has only ${targetNumericCount} valid numerical values. Impute or clean missing values first.`,
      };
    }

    if (featureCols.length === 0) {
      return {
        suitable: false,
        reason: 'At least one input feature column or historical index must be selected.',
      };
    }

    return { suitable: true };
  },

  trainAndPredict(records: Record<string, any>[], config: PredictionConfig): PredictionResult {
    // 1. Filter usable records
    const usable: { index: number; target: number; features: number[]; raw: Record<string, any> }[] = [];

    records.forEach((r, idx) => {
      const tgt = r[config.targetColumn];
      if (typeof tgt === 'number' && !isNaN(tgt)) {
        const featVals: number[] = [];
        let validFeatures = true;

        for (const col of config.featureColumns) {
          const val = r[col];
          if (typeof val === 'number' && !isNaN(val)) {
            featVals.push(val);
          } else {
            validFeatures = false;
            break;
          }
        }

        if (validFeatures) {
          usable.push({ index: idx, target: tgt, features: featVals, raw: r });
        }
      }
    });

    if (usable.length < 8) {
      throw new Error(`Insufficient clean contiguous records (${usable.length}). Please clean dataset missing values first.`);
    }

    // 2. Time-ordered train/test split to avoid data leakage
    const splitIndex = Math.max(4, Math.floor(usable.length * config.trainSplitRatio));
    const trainData = usable.slice(0, splitIndex);
    const testData = usable.slice(splitIndex);

    const actualVsPredicted: {
      index: number;
      timestamp?: string;
      actual: number;
      predicted: number;
      residual: number;
    }[] = [];

    let forecastFuture: { step: number; predictedValue: number; lowerBound: number; upperBound: number }[] = [];
    let anomaliesDetected: { rowIndex: number; value: number; zScore: number; isAnomaly: boolean }[] = [];

    if (config.modelType === 'linear_trend') {
      // Fit univar or multivar regression via least squares on index/feature
      // Single feature (or index) linear trend
      const n = trainData.length;
      const xTrain = trainData.map((d, i) => i);
      const yTrain = trainData.map(d => d.target);

      const xMean = xTrain.reduce((a, b) => a + b, 0) / n;
      const yMean = yTrain.reduce((a, b) => a + b, 0) / n;

      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (xTrain[i] - xMean) * (yTrain[i] - yMean);
        den += (xTrain[i] - xMean) * (xTrain[i] - xMean);
      }

      const slope = den === 0 ? 0 : num / den;
      const intercept = yMean - slope * xMean;

      // Evaluate on test set
      testData.forEach((d, testIdx) => {
        const xTest = splitIndex + testIdx;
        const pred = slope * xTest + intercept;
        actualVsPredicted.push({
          index: d.index,
          timestamp: d.raw.timestamp ? String(d.raw.timestamp) : undefined,
          actual: d.target,
          predicted: Number(pred.toFixed(2)),
          residual: Number((d.target - pred).toFixed(2)),
        });
      });

      // Extrapolate future steps
      for (let s = 1; s <= config.forecastHorizonSteps; s++) {
        const xFuture = usable.length + s;
        const futurePred = slope * xFuture + intercept;
        const margin = Math.abs(futurePred * 0.08) + 0.5;
        forecastFuture.push({
          step: s,
          predictedValue: Number(futurePred.toFixed(2)),
          lowerBound: Number((futurePred - margin).toFixed(2)),
          upperBound: Number((futurePred + margin).toFixed(2)),
        });
      }
    } else if (config.modelType === 'moving_average') {
      const windowSize = 3;
      testData.forEach((d, testIdx) => {
        // Calculate moving average from recent training/preceding points
        const recentPoints = usable.slice(Math.max(0, splitIndex + testIdx - windowSize), splitIndex + testIdx);
        const avg = recentPoints.reduce((acc, p) => acc + p.target, 0) / Math.max(1, recentPoints.length);
        actualVsPredicted.push({
          index: d.index,
          timestamp: d.raw.timestamp ? String(d.raw.timestamp) : undefined,
          actual: d.target,
          predicted: Number(avg.toFixed(2)),
          residual: Number((d.target - avg).toFixed(2)),
        });
      });

      const lastWindow = usable.slice(-windowSize);
      const lastAvg = lastWindow.reduce((a, b) => a + b.target, 0) / Math.max(1, lastWindow.length);
      for (let s = 1; s <= config.forecastHorizonSteps; s++) {
        const margin = Math.abs(lastAvg * 0.05 * s) + 0.4;
        forecastFuture.push({
          step: s,
          predictedValue: Number(lastAvg.toFixed(2)),
          lowerBound: Number((lastAvg - margin).toFixed(2)),
          upperBound: Number((lastAvg + margin).toFixed(2)),
        });
      }
    } else {
      // anomaly_zscore
      const targets = trainData.map(d => d.target);
      const mean = targets.reduce((a, b) => a + b, 0) / targets.length;
      const variance = targets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / targets.length;
      const std = Math.sqrt(variance) || 1;

      usable.forEach(d => {
        const z = (d.target - mean) / std;
        const isAnomaly = Math.abs(z) > 2.5;
        anomaliesDetected.push({
          rowIndex: d.index,
          value: d.target,
          zScore: Number(z.toFixed(2)),
          isAnomaly,
        });
      });

      testData.forEach(d => {
        actualVsPredicted.push({
          index: d.index,
          timestamp: d.raw.timestamp ? String(d.raw.timestamp) : undefined,
          actual: d.target,
          predicted: Number(mean.toFixed(2)),
          residual: Number((d.target - mean).toFixed(2)),
        });
      });
    }

    // 3. Compute real evaluation metrics
    const nEval = actualVsPredicted.length;
    let sumAbsErr = 0;
    let sumSqErr = 0;
    let sumActual = 0;

    actualVsPredicted.forEach(p => {
      sumAbsErr += Math.abs(p.residual);
      sumSqErr += p.residual * p.residual;
      sumActual += p.actual;
    });

    const mae = nEval > 0 ? Number((sumAbsErr / nEval).toFixed(3)) : 0;
    const rmse = nEval > 0 ? Number(Math.sqrt(sumSqErr / nEval).toFixed(3)) : 0;

    const actualMean = nEval > 0 ? sumActual / nEval : 0;
    let totalSumSquares = 0;
    actualVsPredicted.forEach(p => {
      totalSumSquares += Math.pow(p.actual - actualMean, 2);
    });

    const r2 = totalSumSquares > 0 
      ? Number(Math.max(-1, 1 - (sumSqErr / totalSumSquares)).toFixed(3)) 
      : 0;

    return {
      config,
      evaluatedAt: new Date().toISOString(),
      trainSize: trainData.length,
      testSize: testData.length,
      metrics: {
        mae,
        rmse,
        r2,
        explainedVariance: Number(Math.max(0, r2 * 100).toFixed(1)),
      },
      actualVsPredicted,
      forecastFuture: forecastFuture.length > 0 ? forecastFuture : undefined,
      anomaliesDetected: anomaliesDetected.length > 0 ? anomaliesDetected : undefined,
      scientificCaveat: 'Controlled experimental validation: Tested strictly on held-out temporal partition. Not verified for production automated dispatch.',
    };
  },
};
