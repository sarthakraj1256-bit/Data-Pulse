import { 
  QualityAssessment, 
  QualityIssue, 
  DimensionScore, 
  QualityDimensionType, 
  ColumnProfile, 
  QualityConfigSettings 
} from '../types';
import { DEFAULT_QUALITY_SETTINGS } from './storage';

export const QualityEngine = {
  assessQuality(
    records: Record<string, any>[],
    columns: ColumnProfile[],
    settings: QualityConfigSettings = DEFAULT_QUALITY_SETTINGS
  ): QualityAssessment {
    const totalRows = records.length;
    const totalColumns = columns.length;

    if (totalRows === 0 || totalColumns === 0) {
      return {
        overallScore: 0,
        evaluatedAt: new Date().toISOString(),
        dimensionScores: {
          completeness: { dimension: 'completeness', score: 0, evaluated: false, issuesCount: 0, affectedRowsCount: 0, description: 'Empty dataset', benchmarkRule: 'Dataset contains 0 rows' },
          validity: { dimension: 'validity', score: 0, evaluated: false, issuesCount: 0, affectedRowsCount: 0, description: 'Empty dataset', benchmarkRule: 'Dataset contains 0 rows' },
          consistency: { dimension: 'consistency', score: 0, evaluated: false, issuesCount: 0, affectedRowsCount: 0, description: 'Empty dataset', benchmarkRule: 'Dataset contains 0 rows' },
          uniqueness: { dimension: 'uniqueness', score: 0, evaluated: false, issuesCount: 0, affectedRowsCount: 0, description: 'Empty dataset', benchmarkRule: 'Dataset contains 0 rows' },
          timeliness: { dimension: 'timeliness', score: 0, evaluated: false, issuesCount: 0, affectedRowsCount: 0, description: 'Empty dataset', benchmarkRule: 'Dataset contains 0 rows' },
          plausibility: { dimension: 'plausibility', score: 0, evaluated: false, issuesCount: 0, affectedRowsCount: 0, description: 'Empty dataset', benchmarkRule: 'Dataset contains 0 rows' },
        },
        issues: [],
        totalRows: 0,
        totalColumns: 0,
        cleanRowsCount: 0,
        problematicRowsCount: 0,
        completenessPercent: 0,
        validityPercent: 0,
        uniquenessPercent: 0,
      };
    }

    const issues: QualityIssue[] = [];
    const affectedRowIndices = new Set<number>();

    // ==========================================
    // 1. COMPLETENESS CHECK
    // ==========================================
    let totalCells = totalRows * totalColumns;
    let missingCells = 0;
    const completenessAffectedRows = new Set<number>();

    for (const col of columns) {
      const colMissingIndices: number[] = [];
      const sampleProblemValues: any[] = [];

      records.forEach((row, idx) => {
        const val = row[col.name];
        if (val === null || val === undefined || val === '' || String(val).trim() === '' || val === 'NULL' || val === 'NaN') {
          missingCells++;
          colMissingIndices.push(idx);
          completenessAffectedRows.add(idx);
          affectedRowIndices.add(idx);
          if (sampleProblemValues.length < 3) {
            sampleProblemValues.push(val === '' ? '(empty string)' : String(val));
          }
        }
      });

      if (colMissingIndices.length > 0) {
        const pct = ((colMissingIndices.length / totalRows) * 100).toFixed(1);
        issues.push({
          id: `comp_${col.name}`,
          dimension: 'completeness',
          severity: Number(pct) > 20 ? 'high' : Number(pct) > 5 ? 'medium' : 'low',
          column: col.name,
          affectedRowsCount: colMissingIndices.length,
          description: `Column '${col.name}' has ${colMissingIndices.length} missing values (${pct}%)`,
          explanation: `Null, blank, or NaN values prevent uninterrupted statistical calculations and model training.`,
          sampleProblematicValues: sampleProblemValues,
          recommendedFix: col.inferredType === 'number' ? 'Impute with median/mean or drop records' : 'Impute with mode or user placeholder',
          recommendedMethod: col.inferredType === 'number' ? 'impute_median' : 'impute_mode',
        });
      }
    }

    const completenessScore = Math.max(0, Math.round(((totalCells - missingCells) / totalCells) * 100));

    // ==========================================
    // 2. VALIDITY CHECK
    // ==========================================
    let invalidCells = 0;
    const validityAffectedRows = new Set<number>();

    for (const col of columns) {
      const invalidIndices: number[] = [];
      const sampleInvalids: any[] = [];

      if (col.inferredType === 'number') {
        records.forEach((row, idx) => {
          const val = row[col.name];
          if (val !== null && val !== undefined && val !== '') {
            if (typeof val === 'string') {
              const num = Number(val.trim());
              if (isNaN(num)) {
                invalidCells++;
                invalidIndices.push(idx);
                validityAffectedRows.add(idx);
                affectedRowIndices.add(idx);
                if (sampleInvalids.length < 3) sampleInvalids.push(val);
              }
            }
          }
        });
      } else if (col.inferredType === 'date' || col.isTimestamp) {
        records.forEach((row, idx) => {
          const val = row[col.name];
          if (val !== null && val !== undefined && val !== '') {
            const time = Date.parse(String(val));
            if (isNaN(time)) {
              invalidCells++;
              invalidIndices.push(idx);
              validityAffectedRows.add(idx);
              affectedRowIndices.add(idx);
              if (sampleInvalids.length < 3) sampleInvalids.push(val);
            }
          }
        });
      }

      if (invalidIndices.length > 0) {
        issues.push({
          id: `valid_${col.name}`,
          dimension: 'validity',
          severity: 'high',
          column: col.name,
          affectedRowsCount: invalidIndices.length,
          description: `Column '${col.name}' contains ${invalidIndices.length} non-conforming data types`,
          explanation: `Values failed parser type constraints for inferred schema type: ${col.inferredType}.`,
          sampleProblematicValues: sampleInvalids,
          recommendedFix: `Coerce to ${col.inferredType} or replace malformed entries with null`,
          recommendedMethod: col.inferredType === 'number' ? 'coerce_numeric' : 'normalize_date_iso',
        });
      }
    }

    const evaluatedCellsForValidity = totalCells;
    const validityScore = Math.max(0, Math.round(((evaluatedCellsForValidity - invalidCells) / evaluatedCellsForValidity) * 100));

    // ==========================================
    // 3. CONSISTENCY CHECK
    // ==========================================
    let inconsistencyIssuesCount = 0;
    const consistencyAffectedRows = new Set<number>();

    for (const col of columns) {
      if (col.inferredType === 'string' && !col.isTimestamp && !col.isPotentialId) {
        // Detect mixed casing (e.g. ONLINE vs online vs Online) or untrimmed whitespace
        const casingMap = new Map<string, Set<string>>();
        let untrimmedCount = 0;

        records.forEach((row, idx) => {
          const raw = row[col.name];
          if (typeof raw === 'string') {
            if (raw !== raw.trim()) {
              untrimmedCount++;
              consistencyAffectedRows.add(idx);
              affectedRowIndices.add(idx);
            }
            const lower = raw.trim().toLowerCase();
            if (!casingMap.has(lower)) {
              casingMap.set(lower, new Set());
            }
            casingMap.get(lower)!.add(raw.trim());
          }
        });

        const mixedVariants: string[] = [];
        casingMap.forEach((variants) => {
          if (variants.size > 1) {
            mixedVariants.push(Array.from(variants).join(' / '));
          }
        });

        if (untrimmedCount > 0) {
          inconsistencyIssuesCount += untrimmedCount;
          issues.push({
            id: `consist_trim_${col.name}`,
            dimension: 'consistency',
            severity: 'low',
            column: col.name,
            affectedRowsCount: untrimmedCount,
            description: `Column '${col.name}' contains ${untrimmedCount} values with leading or trailing whitespace`,
            explanation: `Whitespace discrepancies create artificial cardinality inflation in grouping and joins.`,
            sampleProblematicValues: ['  value  ', ' value'],
            recommendedFix: `Trim leading and trailing whitespace`,
            recommendedMethod: 'trim_whitespace',
          });
        }

        if (mixedVariants.length > 0) {
          inconsistencyIssuesCount += mixedVariants.length * 2;
          issues.push({
            id: `consist_case_${col.name}`,
            dimension: 'consistency',
            severity: 'medium',
            column: col.name,
            affectedRowsCount: mixedVariants.length,
            description: `Column '${col.name}' has conflicting letter casing variants: ${mixedVariants.slice(0, 2).join(', ')}`,
            explanation: `Identical categorical entities are split across uppercase and lowercase records.`,
            sampleProblematicValues: mixedVariants.slice(0, 3),
            recommendedFix: `Standardize to uppercase or lowercase`,
            recommendedMethod: 'standardize_case_upper',
          });
        }
      }
    }

    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (consistencyAffectedRows.size / totalRows) * 100)));

    // ==========================================
    // 4. UNIQUENESS CHECK
    // ==========================================
    const rowSignatures = new Map<string, number[]>();
    records.forEach((row, idx) => {
      const sig = JSON.stringify(row);
      if (!rowSignatures.has(sig)) {
        rowSignatures.set(sig, []);
      }
      rowSignatures.get(sig)!.push(idx);
    });

    const duplicateRows: number[] = [];
    rowSignatures.forEach((indices) => {
      if (indices.length > 1) {
        // All occurrences after the first are duplicates
        duplicateRows.push(...indices.slice(1));
        indices.slice(1).forEach(i => affectedRowIndices.add(i));
      }
    });

    if (duplicateRows.length > 0) {
      issues.push({
        id: `uniq_duplicate_rows`,
        dimension: 'uniqueness',
        severity: 'high',
        column: undefined,
        affectedRowsCount: duplicateRows.length,
        description: `Detected ${duplicateRows.length} exact duplicate record(s)`,
        explanation: `Identical row vectors distort aggregate sums, means, and predictive feature weights.`,
        sampleProblematicValues: duplicateRows.slice(0, 2).map(i => `Row #${i + 1}`),
        recommendedFix: `Remove redundant duplicate instances`,
        recommendedMethod: 'remove_duplicates',
      });
    }

    const uniquenessScore = Math.max(0, Math.round(((totalRows - duplicateRows.length) / totalRows) * 100));

    // ==========================================
    // 5. TIMELINESS CHECK
    // ==========================================
    let timelinessEvaluated = false;
    let timelinessScore = 100;
    const timeCols = columns.filter(c => c.isTimestamp);

    if (timeCols.length > 0) {
      timelinessEvaluated = true;
      const targetTimeCol = timeCols[0].name;
      const parsedTimes: { idx: number; timestamp: number }[] = [];

      records.forEach((row, idx) => {
        const val = row[targetTimeCol];
        if (val) {
          const t = Date.parse(String(val));
          if (!isNaN(t)) {
            parsedTimes.push({ idx, timestamp: t });
          }
        }
      });

      let outOfOrderCount = 0;
      let gapCount = 0;
      const gapDetails: string[] = [];

      for (let i = 1; i < parsedTimes.length; i++) {
        const prev = parsedTimes[i - 1].timestamp;
        const curr = parsedTimes[i].timestamp;

        if (curr < prev) {
          outOfOrderCount++;
          affectedRowIndices.add(parsedTimes[i].idx);
        }

        const deltaSec = (curr - prev) / 1000;
        if (deltaSec > settings.maxGapSeconds * 4) { // Suspicious gap (e.g. > 20 mins for 5-min expected)
          gapCount++;
          affectedRowIndices.add(parsedTimes[i].idx);
          if (gapDetails.length < 2) {
            gapDetails.push(`${Math.round(deltaSec / 60)} min gap at row ${parsedTimes[i].idx + 1}`);
          }
        }
      }

      if (outOfOrderCount > 0) {
        issues.push({
          id: `time_order_${targetTimeCol}`,
          dimension: 'timeliness',
          severity: 'medium',
          column: targetTimeCol,
          affectedRowsCount: outOfOrderCount,
          description: `${outOfOrderCount} timestamps are non-chronological / out of order`,
          explanation: `Time-series processing and lag-feature engineering require strictly non-decreasing timestamps.`,
          sampleProblematicValues: ['Timestamp reversal detected'],
          recommendedFix: `Sort chronologically by ${targetTimeCol}`,
          recommendedMethod: 'normalize_date_iso',
        });
      }

      if (gapCount > 0) {
        issues.push({
          id: `time_gap_${targetTimeCol}`,
          dimension: 'timeliness',
          severity: 'low',
          column: targetTimeCol,
          affectedRowsCount: gapCount,
          description: `${gapCount} unexpected sampling gaps detected (> ${settings.maxGapSeconds * 4}s)`,
          explanation: `Telemetry interruptions indicate transmission dropouts or sensor offline intervals.`,
          sampleProblematicValues: gapDetails,
          recommendedFix: `Resample / forward-fill periodic metrics`,
          recommendedMethod: 'impute_forward_fill',
        });
      }

      const totalTimeChecks = Math.max(1, parsedTimes.length - 1);
      const timeIssuesCount = outOfOrderCount + gapCount;
      timelinessScore = Math.max(0, Math.round(100 - (timeIssuesCount / totalTimeChecks) * 100));
    }

    // ==========================================
    // 6. PLAUSIBILITY CHECK
    // ==========================================
    let plausibilityEvaluated = false;
    let plausibilityOutliersCount = 0;
    const plausibilityAffectedRows = new Set<number>();

    for (const col of columns) {
      if (col.inferredType === 'number') {
        const customRule = settings.customPlausibilityRules.find(r => 
          r.column.toLowerCase() === col.name.toLowerCase()
        );

        const outlierIndices: number[] = [];
        const outlierSamples: number[] = [];

        // Check if rule exists OR use IQR bounds
        let lowerBound = customRule?.min;
        let upperBound = customRule?.max;

        if (lowerBound === undefined || upperBound === undefined) {
          // Compute IQR if at least 10 values
          const numericVals = records
            .map(r => r[col.name])
            .filter(v => typeof v === 'number' && !isNaN(v))
            .sort((a, b) => a - b);

          if (numericVals.length >= 10) {
            const q1 = numericVals[Math.floor(numericVals.length * 0.25)];
            const q3 = numericVals[Math.floor(numericVals.length * 0.75)];
            const iqr = q3 - q1;
            if (iqr > 0) {
              lowerBound = lowerBound ?? (q1 - settings.outlierIqrMultiplier * iqr);
              upperBound = upperBound ?? (q3 + settings.outlierIqrMultiplier * iqr);
            }
          }
        }

        if (lowerBound !== undefined || upperBound !== undefined) {
          plausibilityEvaluated = true;
          records.forEach((row, idx) => {
            const val = row[col.name];
            if (typeof val === 'number') {
              if ((lowerBound !== undefined && val < lowerBound) || (upperBound !== undefined && val > upperBound)) {
                outlierIndices.push(idx);
                plausibilityAffectedRows.add(idx);
                affectedRowIndices.add(idx);
                if (outlierSamples.length < 3) outlierSamples.push(val);
              }
            }
          });

          if (outlierIndices.length > 0) {
            plausibilityOutliersCount += outlierIndices.length;
            const boundsDesc = `Valid domain range: [${lowerBound?.toFixed(1) ?? '-∞'}, ${upperBound?.toFixed(1) ?? '+∞'}]`;
            issues.push({
              id: `plaus_${col.name}`,
              dimension: 'plausibility',
              severity: 'high',
              column: col.name,
              affectedRowsCount: outlierIndices.length,
              description: `Column '${col.name}' has ${outlierIndices.length} implausible physical/statistical values`,
              explanation: `${boundsDesc}. Flagged values may indicate sensor malfunction, transmission corruption, or legitimate extreme spikes.`,
              sampleProblematicValues: outlierSamples,
              recommendedFix: `Review and flag or cap with IQR bounds`,
              recommendedMethod: 'flag_outliers',
            });
          }
        }
      }
    }

    const plausibilityScore = plausibilityEvaluated
      ? Math.max(0, Math.min(100, Math.round(100 - (plausibilityAffectedRows.size / totalRows) * 100)))
      : 100;

    // Dimension Scores summary
    const dimensionScores: Record<QualityDimensionType, DimensionScore> = {
      completeness: {
        dimension: 'completeness',
        score: completenessScore,
        evaluated: true,
        issuesCount: issues.filter(i => i.dimension === 'completeness').length,
        affectedRowsCount: completenessAffectedRows.size,
        description: `${totalCells - missingCells}/${totalCells} cells populated`,
        benchmarkRule: `Checks for null, NaN, and empty strings across all fields.`,
      },
      validity: {
        dimension: 'validity',
        score: validityScore,
        evaluated: true,
        issuesCount: issues.filter(i => i.dimension === 'validity').length,
        affectedRowsCount: validityAffectedRows.size,
        description: `${invalidCells === 0 ? 'All types conform to schema' : `${invalidCells} parser type rejections`}`,
        benchmarkRule: `Enforces type integrity (numbers, timestamps, schemas).`,
      },
      consistency: {
        dimension: 'consistency',
        score: consistencyScore,
        evaluated: true,
        issuesCount: issues.filter(i => i.dimension === 'consistency').length,
        affectedRowsCount: consistencyAffectedRows.size,
        description: `${consistencyScore}% format and casing parity`,
        benchmarkRule: `Detects whitespace padding and casing fragmentation.`,
      },
      uniqueness: {
        dimension: 'uniqueness',
        score: uniquenessScore,
        evaluated: true,
        issuesCount: duplicateRows.length > 0 ? 1 : 0,
        affectedRowsCount: duplicateRows.length,
        description: `${duplicateRows.length} duplicate row(s) identified`,
        benchmarkRule: `Identifies duplicate row tuples across all attribute keys.`,
      },
      timeliness: {
        dimension: 'timeliness',
        score: timelinessScore,
        evaluated: timelinessEvaluated,
        issuesCount: issues.filter(i => i.dimension === 'timeliness').length,
        affectedRowsCount: 0,
        description: timelinessEvaluated ? `${timelinessScore}% sampling consistency` : 'Not evaluated (No timestamp column)',
        benchmarkRule: `Monitors chronological sequence and sampling frequency intervals.`,
      },
      plausibility: {
        dimension: 'plausibility',
        score: plausibilityScore,
        evaluated: plausibilityEvaluated,
        issuesCount: issues.filter(i => i.dimension === 'plausibility').length,
        affectedRowsCount: plausibilityAffectedRows.size,
        description: plausibilityEvaluated ? `${plausibilityOutliersCount} domain boundary violations` : 'Not evaluated (No numeric bounds defined)',
        benchmarkRule: `Compares records against domain boundaries and 1.5x IQR statistical envelopes.`,
      },
    };

    // Calculate weighted overall score
    const evaluatedScores = Object.values(dimensionScores).filter(d => d.evaluated);
    const overallScore = evaluatedScores.length > 0
      ? Math.round(evaluatedScores.reduce((acc, curr) => acc + curr.score, 0) / evaluatedScores.length)
      : 0;

    const problematicRowsCount = affectedRowIndices.size;
    const cleanRowsCount = Math.max(0, totalRows - problematicRowsCount);

    return {
      overallScore,
      evaluatedAt: new Date().toISOString(),
      dimensionScores,
      issues,
      totalRows,
      totalColumns,
      cleanRowsCount,
      problematicRowsCount,
      completenessPercent: completenessScore,
      validityPercent: validityScore,
      uniquenessPercent: uniquenessScore,
    };
  },
};
