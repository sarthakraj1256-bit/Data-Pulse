import { 
  QualityAssessment, 
  QualityIssue, 
  DimensionScore, 
  QualityDimensionType, 
  ColumnProfile, 
  QualityConfigSettings,
  AssessmentStatus
} from '../types';
import { DEFAULT_QUALITY_SETTINGS } from './storage';

export interface QualityEngineOptions {
  settings?: QualityConfigSettings;
  uniqueKeyColumns?: string[];
}

/**
 * DataPulse Deterministic Data Quality Engine
 * 
 * Evaluates dataset content across the Six Core Dimensions of Data Quality:
 * 1. Completeness: Missing, null, NaN, and blank cell frequencies.
 * 2. Validity: Adherence of populated values to syntactic/inferred type constraints.
 * 3. Consistency: Uniformity of letter casing, whitespace padding, and formats.
 * 4. Uniqueness: Exact duplicate row tuples and primary key collision rates.
 * 5. Timeliness: Non-decreasing chronological sequence and temporal sampling cadence.
 * 6. Plausibility: Physical domain boundary compliance and statistical IQR envelopes.
 * 
 * Rules:
 * - Deterministic, reproducible calculations.
 * - Non-assessed or not-applicable dimensions are never treated as perfect (100%) scores.
 * - Confirmed rule violations are explicitly distinguished from potential statistical anomalies.
 * - Missing values are not double-penalized in Validity.
 * - Overall score is the unweighted arithmetic mean of only the ASSESSED dimensions.
 */
export const QualityEngine = {
  assessQuality(
    records: Record<string, any>[],
    columns: ColumnProfile[],
    options: QualityEngineOptions | QualityConfigSettings = DEFAULT_QUALITY_SETTINGS
  ): QualityAssessment {
    // Normalise options
    const settings: QualityConfigSettings = 'customPlausibilityRules' in options
      ? options
      : (options.settings || DEFAULT_QUALITY_SETTINGS);
    const uniqueKeyColumns: string[] | undefined = 'uniqueKeyColumns' in options
      ? options.uniqueKeyColumns
      : undefined;

    const totalRows = records.length;
    const totalColumns = columns.length;

    // Handle empty datasets gracefully
    if (totalRows === 0 || totalColumns === 0) {
      const emptyDimensionScores: Record<QualityDimensionType, DimensionScore> = {
        completeness: {
          dimension: 'completeness',
          score: 0,
          evaluated: false,
          status: 'not_applicable',
          issuesCount: 0,
          affectedRowsCount: 0,
          affectedColumns: [],
          description: 'Not applicable (Dataset has 0 rows or 0 columns)',
          benchmarkRule: 'Requires at least 1 record and 1 column to evaluate missingness.',
          numerator: 0,
          denominator: 0,
          formulaDescription: '(Populated Cells) / (Total Cells) * 100',
          defectCount: 0,
          potentialAnomalyCount: 0,
        },
        validity: {
          dimension: 'validity',
          score: 0,
          evaluated: false,
          status: 'not_applicable',
          issuesCount: 0,
          affectedRowsCount: 0,
          affectedColumns: [],
          description: 'Not applicable (No records to validate)',
          benchmarkRule: 'Requires populated cells to evaluate schema syntax conformance.',
          numerator: 0,
          denominator: 0,
          formulaDescription: '(Valid Non-Null Cells) / (Evaluated Non-Null Cells) * 100',
          defectCount: 0,
          potentialAnomalyCount: 0,
        },
        consistency: {
          dimension: 'consistency',
          score: 0,
          evaluated: false,
          status: 'not_applicable',
          issuesCount: 0,
          affectedRowsCount: 0,
          affectedColumns: [],
          description: 'Not applicable (No records to inspect for consistency)',
          benchmarkRule: 'Requires string or categorical entries to inspect format uniformity.',
          numerator: 0,
          denominator: 0,
          formulaDescription: '(Consistent String Cells) / (Total String Cells) * 100',
          defectCount: 0,
          potentialAnomalyCount: 0,
        },
        uniqueness: {
          dimension: 'uniqueness',
          score: 0,
          evaluated: false,
          status: 'not_applicable',
          issuesCount: 0,
          affectedRowsCount: 0,
          affectedColumns: [],
          description: 'Not applicable (No records to evaluate uniqueness)',
          benchmarkRule: 'Requires at least 1 row to evaluate tuple duplication.',
          numerator: 0,
          denominator: 0,
          formulaDescription: '(Unique Rows) / (Total Rows) * 100',
          defectCount: 0,
          potentialAnomalyCount: 0,
        },
        timeliness: {
          dimension: 'timeliness',
          score: 0,
          evaluated: false,
          status: 'not_applicable',
          issuesCount: 0,
          affectedRowsCount: 0,
          affectedColumns: [],
          description: 'Not applicable (No temporal records)',
          benchmarkRule: 'Requires timestamped records to assess chronological ordering and interval gaps.',
          numerator: 0,
          denominator: 0,
          formulaDescription: '(Valid Temporal Transitions) / (Total Transitions) * 100',
          defectCount: 0,
          potentialAnomalyCount: 0,
        },
        plausibility: {
          dimension: 'plausibility',
          score: 0,
          evaluated: false,
          status: 'not_applicable',
          issuesCount: 0,
          affectedRowsCount: 0,
          affectedColumns: [],
          description: 'Not applicable (No numeric records)',
          benchmarkRule: 'Requires numeric fields to test against physical bounds and IQR fences.',
          numerator: 0,
          denominator: 0,
          formulaDescription: '(Plausible Numeric Cells) / (Evaluated Numeric Cells) * 100',
          defectCount: 0,
          potentialAnomalyCount: 0,
        },
      };

      return {
        overallScore: 0,
        evaluatedAt: new Date().toISOString(),
        dimensionScores: emptyDimensionScores,
        issues: [],
        totalRows: 0,
        totalColumns: 0,
        cleanRowsCount: 0,
        problematicRowsCount: 0,
        completenessPercent: 0,
        validityPercent: 0,
        uniquenessPercent: 0,
        includedDimensions: [],
        aggregationMethod: 'Unweighted arithmetic mean of assessed dimensions (none assessed)',
        duplicateRowCount: 0,
        totalNullCells: 0,
        totalCells: 0,
        overallNullPercentage: 0,
      };
    }

    const issues: QualityIssue[] = [];
    const problematicRowIndices = new Set<number>();

    // Helper: test if value is null / blank / missing
    const isMissingValue = (val: any): boolean => {
      if (val === null || val === undefined) return true;
      if (typeof val === 'number') return isNaN(val);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return (
          trimmed === '' ||
          trimmed.toUpperCase() === 'NULL' ||
          trimmed.toUpperCase() === 'NAN' ||
          trimmed.toUpperCase() === 'NA' ||
          trimmed === '#N/A' ||
          trimmed === '-'
        );
      }
      return false;
    };

    // =========================================================================
    // 1. COMPLETENESS CHECK
    // Formula: (Total Cells - Missing Cells) / (Total Cells) * 100
    // Denominator: Total Cells across all columns
    // =========================================================================
    const totalCells = totalRows * totalColumns;
    let totalMissingCells = 0;
    const completenessAffectedRows = new Set<number>();
    const completenessAffectedCols: string[] = [];

    for (const col of columns) {
      const missingIndices: number[] = [];
      const sampleMissing: any[] = [];

      records.forEach((row, idx) => {
        const val = row[col.name];
        if (isMissingValue(val)) {
          totalMissingCells++;
          missingIndices.push(idx);
          completenessAffectedRows.add(idx);
          problematicRowIndices.add(idx);
          if (sampleMissing.length < 3) {
            sampleMissing.push(val === '' ? '(empty string)' : String(val ?? 'null'));
          }
        }
      });

      if (missingIndices.length > 0) {
        completenessAffectedCols.push(col.name);
        const colMissingPct = (missingIndices.length / totalRows) * 100;
        issues.push({
          id: `comp_${col.name}`,
          dimension: 'completeness',
          severity: colMissingPct > 20 ? 'high' : colMissingPct > 5 ? 'medium' : 'low',
          column: col.name,
          affectedRowsCount: missingIndices.length,
          description: `Column '${col.name}' has ${missingIndices.length} missing value(s) (${colMissingPct.toFixed(1)}%)`,
          explanation: `Null, blank, or NaN values prevent uninterrupted statistical calculations and model training.`,
          sampleProblematicValues: sampleMissing,
          recommendedFix: col.inferredType === 'number'
            ? 'Impute with column median/mean or drop missing rows'
            : 'Impute with modal class or placeholder',
          recommendedMethod: col.inferredType === 'number' ? 'impute_median' : 'impute_mode',
          isAnomaly: false,
        });
      }
    }

    const completenessNumerator = Math.max(0, totalCells - totalMissingCells);
    const completenessScore = totalCells > 0 ? Math.round((completenessNumerator / totalCells) * 100) : 0;
    const completenessStatus: AssessmentStatus = 'assessed';

    // =========================================================================
    // 2. VALIDITY CHECK
    // Formula: (Evaluated Populated Cells - Invalid Cells) / (Evaluated Populated Cells) * 100
    // Denominator: Populated non-null cells in typed/validated columns
    // Notice: Missing values are NOT double-counted here!
    // =========================================================================
    let validityEvaluatedCells = 0;
    let validityInvalidCells = 0;
    const validityAffectedRows = new Set<number>();
    const validityAffectedCols: string[] = [];

    for (const col of columns) {
      const invalidIndices: number[] = [];
      const sampleInvalids: any[] = [];

      if (col.inferredType === 'number') {
        records.forEach((row, idx) => {
          const val = row[col.name];
          if (!isMissingValue(val)) {
            validityEvaluatedCells++;
            if (typeof val === 'number') {
              if (isNaN(val) || !isFinite(val)) {
                validityInvalidCells++;
                invalidIndices.push(idx);
                validityAffectedRows.add(idx);
                problematicRowIndices.add(idx);
                if (sampleInvalids.length < 3) sampleInvalids.push(String(val));
              }
            } else if (typeof val === 'string') {
              const trimmed = val.trim();
              const num = Number(trimmed);
              if (isNaN(num) || trimmed === '') {
                validityInvalidCells++;
                invalidIndices.push(idx);
                validityAffectedRows.add(idx);
                problematicRowIndices.add(idx);
                if (sampleInvalids.length < 3) sampleInvalids.push(val);
              }
            } else {
              validityInvalidCells++;
              invalidIndices.push(idx);
              validityAffectedRows.add(idx);
              problematicRowIndices.add(idx);
              if (sampleInvalids.length < 3) sampleInvalids.push(String(val));
            }
          }
        });
      } else if (col.inferredType === 'date' || col.isTimestamp) {
        records.forEach((row, idx) => {
          const val = row[col.name];
          if (!isMissingValue(val)) {
            validityEvaluatedCells++;
            const parsed = Date.parse(String(val));
            let isValidDate = !isNaN(parsed);

            // Detailed validation for impossible dates like "2026-11-99"
            if (isValidDate && typeof val === 'string' && val.includes('-')) {
              const parts = val.split(/[-T :]/);
              if (parts.length >= 3) {
                const day = parseInt(parts[2], 10);
                const month = parseInt(parts[1], 10);
                if (day > 31 || day < 1 || month > 12 || month < 1) {
                  isValidDate = false;
                }
              }
            }

            if (!isValidDate) {
              validityInvalidCells++;
              invalidIndices.push(idx);
              validityAffectedRows.add(idx);
              problematicRowIndices.add(idx);
              if (sampleInvalids.length < 3) sampleInvalids.push(String(val));
            }
          }
        });
      } else if (col.inferredType === 'boolean') {
        records.forEach((row, idx) => {
          const val = row[col.name];
          if (!isMissingValue(val)) {
            validityEvaluatedCells++;
            const strVal = String(val).toLowerCase().trim();
            const validBools = ['true', 'false', '1', '0', 'yes', 'no', 't', 'f'];
            if (typeof val !== 'boolean' && !validBools.includes(strVal)) {
              validityInvalidCells++;
              invalidIndices.push(idx);
              validityAffectedRows.add(idx);
              problematicRowIndices.add(idx);
              if (sampleInvalids.length < 3) sampleInvalids.push(String(val));
            }
          }
        });
      }

      if (invalidIndices.length > 0) {
        validityAffectedCols.push(col.name);
        issues.push({
          id: `valid_${col.name}`,
          dimension: 'validity',
          severity: 'high',
          column: col.name,
          affectedRowsCount: invalidIndices.length,
          description: `Column '${col.name}' contains ${invalidIndices.length} invalid value(s) violating ${col.inferredType} type constraints`,
          explanation: `Values failed parser syntax constraints for inferred schema type: ${col.inferredType}.`,
          sampleProblematicValues: sampleInvalids,
          recommendedFix: col.inferredType === 'number'
            ? 'Coerce to numeric format or replace corrupt characters with null'
            : 'Standardize to ISO 8601 or replace with null',
          recommendedMethod: col.inferredType === 'number' ? 'coerce_numeric' : 'normalize_date_iso',
          isAnomaly: false,
        });
      }
    }

    const validityHasEvaluatedCells = validityEvaluatedCells > 0;
    const validityStatus: AssessmentStatus = validityHasEvaluatedCells ? 'assessed' : 'not_applicable';
    const validityNumerator = validityHasEvaluatedCells ? Math.max(0, validityEvaluatedCells - validityInvalidCells) : 0;
    const validityScore = validityHasEvaluatedCells ? Math.round((validityNumerator / validityEvaluatedCells) * 100) : 0;

    // =========================================================================
    // 3. CONSISTENCY CHECK
    // Formula: (Evaluated String Cells - Inconsistent Cells) / (Evaluated String Cells) * 100
    // Denominator: Total populated string cells inspected for whitespace & casing fragmentation
    // =========================================================================
    let consistencyEvaluatedCells = 0;
    let consistencyDefectsCount = 0;
    const consistencyAffectedRows = new Set<number>();
    const consistencyAffectedCols: string[] = [];

    for (const col of columns) {
      if (col.inferredType === 'string' && !col.isTimestamp && !col.isPotentialId) {
        const casingMap = new Map<string, Set<string>>();
        const untrimmedIndices: number[] = [];

        records.forEach((row, idx) => {
          const raw = row[col.name];
          if (!isMissingValue(raw) && typeof raw === 'string') {
            consistencyEvaluatedCells++;

            // 1. Whitespace padding check
            if (raw !== raw.trim()) {
              untrimmedIndices.push(idx);
              consistencyAffectedRows.add(idx);
              problematicRowIndices.add(idx);
            }

            // 2. Casing fragmentation map
            const normalized = raw.trim().toLowerCase();
            if (!casingMap.has(normalized)) {
              casingMap.set(normalized, new Set());
            }
            casingMap.get(normalized)!.add(raw.trim());
          }
        });

        // Collect casing variations
        const mixedVariants: string[] = [];
        let casingSplitAffectedRows = 0;
        casingMap.forEach((variants) => {
          if (variants.size > 1) {
            mixedVariants.push(Array.from(variants).join(' vs '));
            casingSplitAffectedRows += variants.size;
          }
        });

        if (untrimmedIndices.length > 0) {
          consistencyDefectsCount += untrimmedIndices.length;
          consistencyAffectedCols.push(col.name);
          issues.push({
            id: `consist_trim_${col.name}`,
            dimension: 'consistency',
            severity: 'low',
            column: col.name,
            affectedRowsCount: untrimmedIndices.length,
            description: `Column '${col.name}' contains ${untrimmedIndices.length} value(s) with untrimmed whitespace padding`,
            explanation: `Whitespace discrepancies create artificial cardinality inflation in grouping, filtering, and joins.`,
            sampleProblematicValues: ['  value  ', ' value'],
            recommendedFix: `Trim leading and trailing whitespace`,
            recommendedMethod: 'trim_whitespace',
            isAnomaly: false,
          });
        }

        if (mixedVariants.length > 0) {
          consistencyDefectsCount += casingSplitAffectedRows;
          if (!consistencyAffectedCols.includes(col.name)) {
            consistencyAffectedCols.push(col.name);
          }
          issues.push({
            id: `consist_case_${col.name}`,
            dimension: 'consistency',
            severity: 'medium',
            column: col.name,
            affectedRowsCount: casingSplitAffectedRows,
            description: `Column '${col.name}' has conflicting letter casing variants: ${mixedVariants.slice(0, 3).join(', ')}`,
            explanation: `Identical categorical entities are split across uppercase, lowercase, or titlecase representations.`,
            sampleProblematicValues: mixedVariants.slice(0, 3),
            recommendedFix: `Standardize to uppercase or lowercase`,
            recommendedMethod: 'standardize_case_upper',
            isAnomaly: false,
          });
        }
      }
    }

    const consistencyHasEvaluatedCells = consistencyEvaluatedCells > 0;
    const consistencyStatus: AssessmentStatus = consistencyHasEvaluatedCells ? 'assessed' : 'not_applicable';
    const consistencyNumerator = consistencyHasEvaluatedCells
      ? Math.max(0, consistencyEvaluatedCells - consistencyDefectsCount)
      : 0;
    const consistencyScore = consistencyHasEvaluatedCells
      ? Math.round((consistencyNumerator / consistencyEvaluatedCells) * 100)
      : 0;

    // =========================================================================
    // 4. UNIQUENESS CHECK
    // Formula: (Total Rows - Duplicate Rows) / (Total Rows) * 100
    // Denominator: Total Rows
    // =========================================================================
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
        // Redundant occurrences after the first
        const extras = indices.slice(1);
        duplicateRows.push(...extras);
        extras.forEach(i => problematicRowIndices.add(i));
      }
    });

    // Configured unique key checks if provided
    let uniqueKeyCollisionsCount = 0;
    if (uniqueKeyColumns && uniqueKeyColumns.length > 0) {
      const keySignatures = new Map<string, number[]>();
      records.forEach((row, idx) => {
        const keySig = uniqueKeyColumns.map(k => String(row[k])).join(':::');
        if (!keySignatures.has(keySig)) {
          keySignatures.set(keySig, []);
        }
        keySignatures.get(keySig)!.push(idx);
      });
      keySignatures.forEach(indices => {
        if (indices.length > 1) {
          uniqueKeyCollisionsCount += (indices.length - 1);
        }
      });
    }

    const totalUniquenessViolations = duplicateRows.length + uniqueKeyCollisionsCount;

    if (duplicateRows.length > 0) {
      issues.push({
        id: `uniq_duplicate_rows`,
        dimension: 'uniqueness',
        severity: 'high',
        column: undefined,
        affectedRowsCount: duplicateRows.length,
        description: `Detected ${duplicateRows.length} exact duplicate record tuple(s)`,
        explanation: `Identical row vectors distort aggregate sums, means, and predictive feature weights.`,
        sampleProblematicValues: duplicateRows.slice(0, 3).map(i => `Row #${i + 1}`),
        recommendedFix: `Deduplicate dataset preserving the primary occurrence`,
        recommendedMethod: 'remove_duplicates',
        isAnomaly: false,
      });
    }

    if (uniqueKeyCollisionsCount > 0) {
      issues.push({
        id: `uniq_key_collisions`,
        dimension: 'uniqueness',
        severity: 'high',
        column: uniqueKeyColumns?.join(', '),
        affectedRowsCount: uniqueKeyCollisionsCount,
        description: `Configured primary key (${uniqueKeyColumns?.join(', ')}) has ${uniqueKeyCollisionsCount} collision(s)`,
        explanation: `Unique key constraints must be strictly non-repeating across all entity records.`,
        sampleProblematicValues: [`${uniqueKeyCollisionsCount} key collision rows`],
        recommendedFix: `Enforce primary key uniqueness or refine compound key definitions`,
        recommendedMethod: 'remove_duplicates',
        isAnomaly: false,
      });
    }

    const uniquenessNumerator = Math.max(0, totalRows - totalUniquenessViolations);
    const uniquenessScore = totalRows > 0 ? Math.round((uniquenessNumerator / totalRows) * 100) : 0;
    const uniquenessStatus: AssessmentStatus = totalRows > 0 ? 'assessed' : 'not_applicable';

    // =========================================================================
    // 5. TIMELINESS CHECK
    // Evaluates non-decreasing chronological sequence and temporal sampling cadence
    // CRITICAL: If no timestamp column exists, status MUST BE 'not_applicable', score MUST NOT be 100!
    // =========================================================================
    const timestampCols = columns.filter(c => c.isTimestamp);
    let timelinessStatus: AssessmentStatus = 'not_applicable';
    let timelinessScore = 0;
    let timelinessNumerator = 0;
    let timelinessDenominator = 0;
    let timelinessDefectsCount = 0;
    let timelinessAnomalyCount = 0;
    let timelinessDesc = 'Not applicable (No timestamp column detected)';
    let timelinessCoverage: QualityAssessment['timestampCoverage'];

    if (timestampCols.length > 0) {
      timelinessStatus = 'assessed';
      const targetTimeCol = timestampCols[0].name;
      const parsedTimes: { idx: number; timestamp: number }[] = [];

      records.forEach((row, idx) => {
        const val = row[targetTimeCol];
        if (!isMissingValue(val)) {
          const t = Date.parse(String(val));
          if (!isNaN(t)) {
            parsedTimes.push({ idx, timestamp: t });
          }
        }
      });

      if (parsedTimes.length > 1) {
        timelinessDenominator = parsedTimes.length - 1;
        let outOfOrderCount = 0;
        let gapCount = 0;
        const gapDetails: string[] = [];

        // Check timestamp sequence
        for (let i = 1; i < parsedTimes.length; i++) {
          const prev = parsedTimes[i - 1].timestamp;
          const curr = parsedTimes[i].timestamp;

          // 1. Non-decreasing chronological sequence check (Confirmed Defect)
          if (curr < prev) {
            outOfOrderCount++;
            problematicRowIndices.add(parsedTimes[i].idx);
          }

          // 2. Expected sampling frequency interval check (Potential Temporal Anomaly)
          const deltaSec = (curr - prev) / 1000;
          if (deltaSec > settings.maxGapSeconds * 4) {
            gapCount++;
            problematicRowIndices.add(parsedTimes[i].idx);
            if (gapDetails.length < 2) {
              gapDetails.push(`${Math.round(deltaSec / 60)} min gap at row #${parsedTimes[i].idx + 1}`);
            }
          }
        }

        timelinessDefectsCount = outOfOrderCount;
        timelinessAnomalyCount = gapCount;

        if (outOfOrderCount > 0) {
          issues.push({
            id: `time_order_${targetTimeCol}`,
            dimension: 'timeliness',
            severity: 'high',
            column: targetTimeCol,
            affectedRowsCount: outOfOrderCount,
            description: `${outOfOrderCount} timestamp(s) are non-chronological / out of order in '${targetTimeCol}'`,
            explanation: `Time-series processing and lag-feature engineering require strictly non-decreasing timestamps.`,
            sampleProblematicValues: ['Timestamp reversal detected'],
            recommendedFix: `Sort records chronologically by '${targetTimeCol}'`,
            recommendedMethod: 'normalize_date_iso',
            isAnomaly: false, // Confirmed rule defect
          });
        }

        if (gapCount > 0) {
          issues.push({
            id: `time_gap_${targetTimeCol}`,
            dimension: 'timeliness',
            severity: 'low',
            column: targetTimeCol,
            affectedRowsCount: gapCount,
            description: `${gapCount} unexpected sampling gap(s) detected in '${targetTimeCol}' (> ${settings.maxGapSeconds * 4}s)`,
            explanation: `Telemetry interruptions indicate transmission dropouts or sensor offline intervals.`,
            sampleProblematicValues: gapDetails,
            recommendedFix: `Resample or forward-fill periodic metrics across outage window`,
            recommendedMethod: 'impute_forward_fill',
            isAnomaly: true, // Potential temporal anomaly
          });
        }

        timelinessNumerator = Math.max(0, timelinessDenominator - (outOfOrderCount + gapCount));
        timelinessScore = Math.round((timelinessNumerator / timelinessDenominator) * 100);
        timelinessDesc = `${timelinessNumerator}/${timelinessDenominator} valid temporal step transitions (${timelinessScore}%)`;

        // Build timestamp coverage stats
        const allTimestampsSorted = parsedTimes.map(p => p.timestamp).sort((a, b) => a - b);
        const minT = allTimestampsSorted[0];
        const maxT = allTimestampsSorted[allTimestampsSorted.length - 1];
        const spanHours = Number(((maxT - minT) / (1000 * 60 * 60)).toFixed(2));
        timelinessCoverage = {
          minTimestamp: new Date(minT).toISOString(),
          maxTimestamp: new Date(maxT).toISOString(),
          totalSpanHours: spanHours,
        };
      } else {
        timelinessStatus = 'not_applicable';
        timelinessDesc = 'Not applicable (Insufficient parsed timestamp records)';
      }
    }

    // =========================================================================
    // 6. PLAUSIBILITY CHECK
    // Physical domain rules (Confirmed defects) vs 1.5x IQR statistical envelopes (Anomalies)
    // CRITICAL: If no numeric columns or no bounds/data exist, status MUST BE 'not_applicable', score MUST NOT be 100!
    // =========================================================================
    let plausibilityStatus: AssessmentStatus = 'not_applicable';
    let plausibilityScore = 0;
    let plausibilityNumerator = 0;
    let plausibilityDenominator = 0;
    let plausibilityDefectsCount = 0;
    let plausibilityAnomaliesCount = 0;
    const plausibilityAffectedRows = new Set<number>();
    const plausibilityAffectedCols: string[] = [];
    let plausibilityDesc = 'Not applicable (No numeric domain rules or sufficient sample size)';

    const numericCols = columns.filter(c => c.inferredType === 'number');

    if (numericCols.length > 0) {
      let evaluatedColumnsWithBounds = 0;

      for (const col of numericCols) {
        // Match explicit domain boundary rules (e.g. temperature, humidity, voltage)
        const customRule = settings.customPlausibilityRules.find(r =>
          r.column.toLowerCase() === col.name.toLowerCase() ||
          col.name.toLowerCase().includes(r.column.toLowerCase())
        );

        let lowerBound = customRule?.min;
        let upperBound = customRule?.max;
        let isConfiguredDomainRule = (lowerBound !== undefined || upperBound !== undefined);

        // If no explicit domain rule, compute 1.5x IQR Tukey envelope if >= 10 values
        if (!isConfiguredDomainRule) {
          const numericVals = records
            .map(r => r[col.name])
            .filter(v => typeof v === 'number' && !isNaN(v))
            .sort((a, b) => a - b);

          if (numericVals.length >= 10) {
            const q1 = numericVals[Math.floor(numericVals.length * 0.25)];
            const q3 = numericVals[Math.floor(numericVals.length * 0.75)];
            const iqr = q3 - q1;
            if (iqr > 0) {
              lowerBound = q1 - settings.outlierIqrMultiplier * iqr;
              upperBound = q3 + settings.outlierIqrMultiplier * iqr;
            }
          }
        }

        if (lowerBound !== undefined || upperBound !== undefined) {
          evaluatedColumnsWithBounds++;
          const outlierIndices: number[] = [];
          const outlierSamples: number[] = [];

          records.forEach((row, idx) => {
            const val = row[col.name];
            if (!isMissingValue(val)) {
              const numVal = typeof val === 'number' ? val : Number(val);
              if (!isNaN(numVal)) {
                plausibilityDenominator++;
                if (
                  (lowerBound !== undefined && numVal < lowerBound) ||
                  (upperBound !== undefined && numVal > upperBound)
                ) {
                  outlierIndices.push(idx);
                  plausibilityAffectedRows.add(idx);
                  problematicRowIndices.add(idx);
                  if (outlierSamples.length < 3) outlierSamples.push(numVal);
                }
              }
            }
          });

          if (outlierIndices.length > 0) {
            plausibilityAffectedCols.push(col.name);
            if (isConfiguredDomainRule) {
              plausibilityDefectsCount += outlierIndices.length;
            } else {
              plausibilityAnomaliesCount += outlierIndices.length;
            }

            const boundsText = `[${lowerBound !== undefined ? lowerBound.toFixed(1) : '-∞'}, ${upperBound !== undefined ? upperBound.toFixed(1) : '+∞'}]`;
            issues.push({
              id: `plaus_${col.name}`,
              dimension: 'plausibility',
              severity: isConfiguredDomainRule ? 'high' : 'medium',
              column: col.name,
              affectedRowsCount: outlierIndices.length,
              description: `Column '${col.name}' has ${outlierIndices.length} ${isConfiguredDomainRule ? 'domain rule violation(s)' : 'statistical outlier(s)'}`,
              explanation: `${isConfiguredDomainRule ? 'Domain boundary rule' : '1.5x IQR envelope'}: ${boundsText}. Detected values deviate from expected physical parameters.`,
              sampleProblematicValues: outlierSamples,
              recommendedFix: isConfiguredDomainRule
                ? `Filter invalid physical readings or cap to domain interval ${boundsText}`
                : `Apply IQR capping or flag for scientific review`,
              recommendedMethod: 'cap_outliers_iqr',
              isAnomaly: !isConfiguredDomainRule, // Distinguish confirmed rule defect from statistical anomaly
            });
          }
        }
      }

      if (evaluatedColumnsWithBounds > 0 && plausibilityDenominator > 0) {
        plausibilityStatus = 'assessed';
        const totalPlausibilityViolations = plausibilityDefectsCount + plausibilityAnomaliesCount;
        plausibilityNumerator = Math.max(0, plausibilityDenominator - totalPlausibilityViolations);
        plausibilityScore = Math.round((plausibilityNumerator / plausibilityDenominator) * 100);
        plausibilityDesc = `${plausibilityNumerator}/${plausibilityDenominator} compliant numeric values (${plausibilityScore}%)`;
      }
    }

    // =========================================================================
    // COMPILE DIMENSION SCORES SUMMARY
    // =========================================================================
    const dimensionScores: Record<QualityDimensionType, DimensionScore> = {
      completeness: {
        dimension: 'completeness',
        score: completenessScore,
        evaluated: completenessStatus === 'assessed',
        status: completenessStatus,
        issuesCount: issues.filter(i => i.dimension === 'completeness').length,
        affectedRowsCount: completenessAffectedRows.size,
        affectedColumns: completenessAffectedCols,
        description: `${completenessNumerator}/${totalCells} populated cells (${completenessScore}%)`,
        benchmarkRule: 'Measures populated cells against null, NaN, and empty strings across all schema attributes.',
        numerator: completenessNumerator,
        denominator: totalCells,
        formulaDescription: '(Total Cells - Missing Cells) / (Total Cells) * 100',
        defectCount: totalMissingCells,
        potentialAnomalyCount: 0,
      },
      validity: {
        dimension: 'validity',
        score: validityScore,
        evaluated: validityStatus === 'assessed',
        status: validityStatus,
        issuesCount: issues.filter(i => i.dimension === 'validity').length,
        affectedRowsCount: validityAffectedRows.size,
        affectedColumns: validityAffectedCols,
        description: validityStatus === 'assessed'
          ? `${validityNumerator}/${validityEvaluatedCells} valid entries (${validityScore}%)`
          : 'Not applicable (No typed attributes evaluated)',
        benchmarkRule: 'Validates non-null values against inferred parser types (numeric, date, boolean). Missing cells are not double-penalized.',
        numerator: validityNumerator,
        denominator: validityEvaluatedCells,
        formulaDescription: '(Valid Populated Cells) / (Total Populated Evaluated Cells) * 100',
        defectCount: validityInvalidCells,
        potentialAnomalyCount: 0,
      },
      consistency: {
        dimension: 'consistency',
        score: consistencyScore,
        evaluated: consistencyStatus === 'assessed',
        status: consistencyStatus,
        issuesCount: issues.filter(i => i.dimension === 'consistency').length,
        affectedRowsCount: consistencyAffectedRows.size,
        affectedColumns: consistencyAffectedCols,
        description: consistencyStatus === 'assessed'
          ? `${consistencyNumerator}/${consistencyEvaluatedCells} consistent entries (${consistencyScore}%)`
          : 'Not applicable (No string/categorical attributes present)',
        benchmarkRule: 'Detects whitespace padding discrepancies and categorical casing fragmentation (e.g. UPPER vs lower).',
        numerator: consistencyNumerator,
        denominator: consistencyEvaluatedCells,
        formulaDescription: '(Consistent String Cells) / (Total String Cells) * 100',
        defectCount: consistencyDefectsCount,
        potentialAnomalyCount: 0,
      },
      uniqueness: {
        dimension: 'uniqueness',
        score: uniquenessScore,
        evaluated: uniquenessStatus === 'assessed',
        status: uniquenessStatus,
        issuesCount: issues.filter(i => i.dimension === 'uniqueness').length,
        affectedRowsCount: totalUniquenessViolations,
        affectedColumns: uniqueKeyColumns,
        description: `${uniquenessNumerator}/${totalRows} unique row vectors (${uniquenessScore}%)`,
        benchmarkRule: 'Identifies exact duplicate row tuples and primary key collisions across records.',
        numerator: uniquenessNumerator,
        denominator: totalRows,
        formulaDescription: '(Total Rows - Duplicate Rows) / (Total Rows) * 100',
        defectCount: totalUniquenessViolations,
        potentialAnomalyCount: 0,
      },
      timeliness: {
        dimension: 'timeliness',
        score: timelinessScore,
        evaluated: timelinessStatus === 'assessed',
        status: timelinessStatus,
        issuesCount: issues.filter(i => i.dimension === 'timeliness').length,
        affectedRowsCount: timelinessDefectsCount + timelinessAnomalyCount,
        affectedColumns: timestampCols.map(c => c.name),
        description: timelinessDesc,
        benchmarkRule: 'Monitors non-decreasing chronological order (confirmed defects) and expected sampling frequency (temporal gaps).',
        numerator: timelinessNumerator,
        denominator: timelinessDenominator,
        formulaDescription: '(Valid Chronological Intervals) / (Total Step Transitions) * 100',
        defectCount: timelinessDefectsCount,
        potentialAnomalyCount: timelinessAnomalyCount,
      },
      plausibility: {
        dimension: 'plausibility',
        score: plausibilityScore,
        evaluated: plausibilityStatus === 'assessed',
        status: plausibilityStatus,
        issuesCount: issues.filter(i => i.dimension === 'plausibility').length,
        affectedRowsCount: plausibilityAffectedRows.size,
        affectedColumns: plausibilityAffectedCols,
        description: plausibilityDesc,
        benchmarkRule: 'Evaluates values against configured domain bounds (defects) and 1.5x IQR statistical envelopes (potential anomalies).',
        numerator: plausibilityNumerator,
        denominator: plausibilityDenominator,
        formulaDescription: '(Plausible Values) / (Total Evaluated Numeric Values) * 100',
        defectCount: plausibilityDefectsCount,
        potentialAnomalyCount: plausibilityAnomaliesCount,
      },
    };

    // =========================================================================
    // OVERALL AGGREGATION RULE:
    // Unweighted arithmetic mean of only ASSESSED dimensions.
    // Dimensions marked 'not_applicable' or 'not_assessed' are NEVER awarded 100% and NEVER inflate the score.
    // =========================================================================
    const assessedDimensions = (Object.values(dimensionScores) as DimensionScore[]).filter(
      d => d.status === 'assessed'
    );
    const includedDimensions: QualityDimensionType[] = assessedDimensions.map(d => d.dimension);

    const overallScore = assessedDimensions.length > 0
      ? Math.round(assessedDimensions.reduce((sum, d) => sum + d.score, 0) / assessedDimensions.length)
      : 0;

    const problematicRowsCount = problematicRowIndices.size;
    const cleanRowsCount = Math.max(0, totalRows - problematicRowsCount);
    const overallNullPercentage = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(2)) : 0;

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
      includedDimensions,
      aggregationMethod: assessedDimensions.length > 0
        ? `Unweighted arithmetic mean of ${assessedDimensions.length} assessed dimension(s): ${includedDimensions.join(', ')}`
        : 'No applicable dimensions evaluated',
      duplicateRowCount: duplicateRows.length,
      totalNullCells: totalMissingCells,
      totalCells,
      overallNullPercentage,
      timestampCoverage: timelinessCoverage,
    };
  },
};
