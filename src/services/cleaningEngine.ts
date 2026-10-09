import { 
  Dataset, 
  CleaningOperationType, 
  CleaningRecommendation, 
  LineageRecord, 
  QualityIssue 
} from '../types';
import { QualityEngine } from './qualityEngine';
import { profileColumns } from './dataEngine';

let traceCounter = Math.floor(1000 + Math.random() * 9000);

export function generateTraceId(): string {
  traceCounter++;
  return `DP-${String(traceCounter).padStart(6, '0')}`;
}

export const CleaningEngine = {
  generateRecommendations(dataset: Dataset): CleaningRecommendation[] {
    const recommendations: CleaningRecommendation[] = [];
    const issues = dataset.qualityAssessment.issues;

    for (const issue of issues) {
      if (issue.dimension === 'completeness' && issue.column) {
        const colProfile = dataset.columns.find(c => c.name === issue.column);
        if (colProfile?.inferredType === 'number') {
          recommendations.push({
            id: `rec_${issue.id}_median`,
            column: issue.column,
            issueType: 'completeness',
            title: `Impute Missing in '${issue.column}' via Median`,
            description: `Replace ${issue.affectedRowsCount} missing values with column median (${colProfile.median ?? 'N/A'}). Robust against skewed data.`,
            method: 'impute_median',
            affectedCount: issue.affectedRowsCount,
            confidence: 94,
          });
          recommendations.push({
            id: `rec_${issue.id}_drop`,
            column: issue.column,
            issueType: 'completeness',
            title: `Drop Records with Missing '${issue.column}'`,
            description: `Filter out ${issue.affectedRowsCount} rows where '${issue.column}' is empty. Use only if missingness is non-ignorable.`,
            method: 'drop_missing_rows',
            affectedCount: issue.affectedRowsCount,
            confidence: 78,
          });
        } else {
          recommendations.push({
            id: `rec_${issue.id}_mode`,
            column: issue.column,
            issueType: 'completeness',
            title: `Impute Missing '${issue.column}' with Most Frequent Value`,
            description: `Replace blanks in categorical feature '${issue.column}' with the modal class.`,
            method: 'impute_mode',
            affectedCount: issue.affectedRowsCount,
            confidence: 88,
          });
        }
      } else if (issue.dimension === 'uniqueness') {
        recommendations.push({
          id: `rec_${issue.id}`,
          issueType: 'uniqueness',
          title: `Deduplicate Dataset`,
          description: `Eliminate ${issue.affectedRowsCount} redundant identical record tuple(s). Preserves the first instance.`,
          method: 'remove_duplicates',
          affectedCount: issue.affectedRowsCount,
          confidence: 99,
        });
      } else if (issue.dimension === 'consistency' && issue.column) {
        if (issue.id.includes('trim')) {
          recommendations.push({
            id: `rec_${issue.id}`,
            column: issue.column,
            issueType: 'consistency',
            title: `Trim Whitespace in '${issue.column}'`,
            description: `Strip leading and trailing spaces across ${issue.affectedRowsCount} entries for clean categorical grouping.`,
            method: 'trim_whitespace',
            affectedCount: issue.affectedRowsCount,
            confidence: 99,
          });
        } else if (issue.id.includes('case')) {
          recommendations.push({
            id: `rec_${issue.id}`,
            column: issue.column,
            issueType: 'consistency',
            title: `Standardize Letter Casing to Uppercase`,
            description: `Harmonize '${issue.column}' strings to uppercase to eliminate case-sensitive duplication.`,
            method: 'standardize_case_upper',
            affectedCount: issue.affectedRowsCount,
            confidence: 92,
          });
        }
      } else if (issue.dimension === 'plausibility' && issue.column) {
        recommendations.push({
          id: `rec_${issue.id}_cap`,
          column: issue.column,
          issueType: 'plausibility',
          title: `Cap Outliers in '${issue.column}' (IQR Envelope)`,
          description: `Winsorize ${issue.affectedRowsCount} extreme values to valid statistical interquartile thresholds without dropping rows.`,
          method: 'cap_outliers_iqr',
          affectedCount: issue.affectedRowsCount,
          confidence: 85,
        });
        recommendations.push({
          id: `rec_${issue.id}_flag`,
          column: issue.column,
          issueType: 'plausibility',
          title: `Flag Outliers for Audit`,
          description: `Add boolean indicator '_is_outlier_${issue.column}' without altering underlying telemetry measurements.`,
          method: 'flag_outliers',
          affectedCount: issue.affectedRowsCount,
          confidence: 95,
        });
      } else if (issue.dimension === 'validity' && issue.column) {
        recommendations.push({
          id: `rec_${issue.id}`,
          column: issue.column,
          issueType: 'validity',
          title: `Sanitize Data Type for '${issue.column}'`,
          description: `Coerce textual anomalies into compliant types or nulls for downstream processing.`,
          method: 'coerce_numeric',
          affectedCount: issue.affectedRowsCount,
          confidence: 90,
        });
      }
    }

    return recommendations;
  },

  previewOperation(
    records: Record<string, any>[],
    method: CleaningOperationType,
    column?: string,
    params?: Record<string, any>
  ): {
    previewRecords: Record<string, any>[];
    affectedCount: number;
    sampleBefore: string[];
    sampleAfter: string[];
  } {
    const working = JSON.parse(JSON.stringify(records)) as Record<string, any>[];
    const sampleBefore: string[] = [];
    const sampleAfter: string[] = [];
    let affectedCount = 0;

    switch (method) {
      case 'remove_duplicates': {
        const seen = new Set<string>();
        const deduped: Record<string, any>[] = [];
        working.forEach((row, i) => {
          const sig = JSON.stringify(row);
          if (!seen.has(sig)) {
            seen.add(sig);
            deduped.push(row);
          } else {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push(`Duplicate row #${i + 1}`);
          }
        });
        sampleAfter.push(`Removed ${affectedCount} duplicate row(s)`);
        return { previewRecords: deduped, affectedCount, sampleBefore, sampleAfter };
      }

      case 'impute_median':
      case 'impute_mean': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        const nums = working
          .map(r => r[column])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        let replacementValue = 0;
        if (nums.length > 0) {
          if (method === 'impute_median') {
            const mid = Math.floor(nums.length / 2);
            replacementValue = nums.length % 2 !== 0 ? nums[mid] : Number(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));
          } else {
            const sum = nums.reduce((a, b) => a + b, 0);
            replacementValue = Number((sum / nums.length).toFixed(2));
          }
        }

        working.forEach((row) => {
          const val = row[column];
          if (val === null || val === undefined || val === '' || String(val).trim() === '') {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push(val === '' ? '(empty)' : String(val));
            row[column] = replacementValue;
            if (sampleAfter.length < 3) sampleAfter.push(String(replacementValue));
          }
        });

        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      case 'impute_mode': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        const counts = new Map<string, number>();
        working.forEach(r => {
          const v = r[column];
          if (v !== null && v !== undefined && String(v).trim() !== '') {
            counts.set(String(v), (counts.get(String(v)) || 0) + 1);
          }
        });
        let modeVal = '';
        let maxC = 0;
        counts.forEach((c, v) => {
          if (c > maxC) {
            maxC = c;
            modeVal = v;
          }
        });

        working.forEach((row) => {
          const val = row[column];
          if (val === null || val === undefined || val === '' || String(val).trim() === '') {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push('(empty)');
            row[column] = modeVal;
            if (sampleAfter.length < 3) sampleAfter.push(modeVal);
          }
        });
        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      case 'drop_missing_rows': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        const filtered = working.filter((row, i) => {
          const val = row[column];
          const isMissing = val === null || val === undefined || val === '' || String(val).trim() === '';
          if (isMissing) {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push(`Row #${i + 1} (${val ?? 'null'})`);
          }
          return !isMissing;
        });
        sampleAfter.push(`Retained ${filtered.length} complete rows`);
        return { previewRecords: filtered, affectedCount, sampleBefore, sampleAfter };
      }

      case 'trim_whitespace': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        working.forEach(row => {
          const val = row[column];
          if (typeof val === 'string' && val !== val.trim()) {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push(`"${val}"`);
            row[column] = val.trim();
            if (sampleAfter.length < 3) sampleAfter.push(`"${val.trim()}"`);
          }
        });
        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      case 'standardize_case_upper': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        working.forEach(row => {
          const val = row[column];
          if (typeof val === 'string' && val !== val.toUpperCase()) {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push(val);
            row[column] = val.toUpperCase().trim();
            if (sampleAfter.length < 3) sampleAfter.push(val.toUpperCase().trim());
          }
        });
        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      case 'cap_outliers_iqr': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        const nums = working
          .map(r => r[column])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        if (nums.length < 4) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        working.forEach(row => {
          const val = row[column];
          if (typeof val === 'number') {
            if (val < lower) {
              affectedCount++;
              if (sampleBefore.length < 3) sampleBefore.push(String(val));
              row[column] = Number(lower.toFixed(2));
              if (sampleAfter.length < 3) sampleAfter.push(String(Number(lower.toFixed(2))));
            } else if (val > upper) {
              affectedCount++;
              if (sampleBefore.length < 3) sampleBefore.push(String(val));
              row[column] = Number(upper.toFixed(2));
              if (sampleAfter.length < 3) sampleAfter.push(String(Number(upper.toFixed(2))));
            }
          }
        });
        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      case 'flag_outliers': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        const flagCol = `_outlier_${column}`;
        const nums = working
          .map(r => r[column])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);
        const q1 = nums[Math.floor(nums.length * 0.25)] || 0;
        const q3 = nums[Math.floor(nums.length * 0.75)] || 100;
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        working.forEach(row => {
          const val = row[column];
          const isOut = typeof val === 'number' && (val < lower || val > upper);
          row[flagCol] = isOut;
          if (isOut) {
            affectedCount++;
            if (sampleBefore.length < 3) sampleBefore.push(`${column}=${val}`);
            if (sampleAfter.length < 3) sampleAfter.push(`${flagCol}=true`);
          }
        });
        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      case 'coerce_numeric': {
        if (!column) return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
        working.forEach(row => {
          const val = row[column];
          if (typeof val === 'string' && val.trim() !== '') {
            const num = Number(val.trim());
            if (!isNaN(num)) {
              affectedCount++;
              if (sampleBefore.length < 3) sampleBefore.push(`"${val}"`);
              row[column] = num;
              if (sampleAfter.length < 3) sampleAfter.push(String(num));
            } else {
              affectedCount++;
              if (sampleBefore.length < 3) sampleBefore.push(`"${val}" (corrupt)`);
              row[column] = null;
              if (sampleAfter.length < 3) sampleAfter.push('null');
            }
          }
        });
        return { previewRecords: working, affectedCount, sampleBefore, sampleAfter };
      }

      default:
        return { previewRecords: working, affectedCount: 0, sampleBefore: [], sampleAfter: [] };
    }
  },

  applyOperation(
    dataset: Dataset,
    method: CleaningOperationType,
    column?: string,
    reason?: string,
    performedBy: string = 'Authorized Analyst'
  ): { updatedDataset: Dataset; lineageRecord: LineageRecord } {
    const beforeScore = dataset.qualityAssessment.overallScore;
    const { previewRecords, affectedCount, sampleBefore, sampleAfter } = this.previewOperation(
      dataset.cleanedRecords,
      method,
      column
    );

    const traceId = generateTraceId();
    const updatedColumns = profileColumns(previewRecords);
    const updatedQuality = QualityEngine.assessQuality(previewRecords, updatedColumns);

    const lineageRecord: LineageRecord = {
      id: 'lin_' + Math.random().toString(36).substring(2, 9),
      traceId,
      datasetId: dataset.id,
      datasetName: dataset.name,
      columnName: column,
      affectedRowsCount: affectedCount,
      operationType: method,
      detectedIssue: `Quality rule remediation: ${method.replace(/_/g, ' ')}`,
      methodName: method,
      reason: reason || `User-approved data quality transformation via Cleaning Studio.`,
      originalSample: sampleBefore.length > 0 ? sampleBefore : ['Values before transformation'],
      transformedSample: sampleAfter.length > 0 ? sampleAfter : ['Transformed values'],
      timestamp: new Date().toISOString(),
      performedBy,
      scoreBefore: beforeScore,
      scoreAfter: updatedQuality.overallScore,
    };

    const updatedDataset: Dataset = {
      ...dataset,
      cleanedRecords: previewRecords,
      rowCount: previewRecords.length,
      columns: updatedColumns,
      qualityAssessment: updatedQuality,
      updatedAt: new Date().toISOString(),
      lineage: [lineageRecord, ...dataset.lineage],
    };

    return { updatedDataset, lineageRecord };
  },

  undoLastOperation(dataset: Dataset): Dataset | null {
    if (dataset.lineage.length === 0) return null;

    // To preserve immaculate raw snapshot, re-run all transformations except the most recent
    const remainingLineage = dataset.lineage.slice(1);
    
    // Start from immutable rawRecords snapshot
    let currentRecords = JSON.parse(JSON.stringify(dataset.rawRecords));

    // Replay remaining lineage in chronological order
    const chronologicalLineage = [...remainingLineage].reverse();
    for (const record of chronologicalLineage) {
      const { previewRecords } = this.previewOperation(
        currentRecords,
        record.operationType,
        record.columnName
      );
      currentRecords = previewRecords;
    }

    const updatedColumns = profileColumns(currentRecords);
    const updatedQuality = QualityEngine.assessQuality(currentRecords, updatedColumns);

    return {
      ...dataset,
      cleanedRecords: currentRecords,
      rowCount: currentRecords.length,
      columns: updatedColumns,
      qualityAssessment: updatedQuality,
      updatedAt: new Date().toISOString(),
      lineage: remainingLineage,
    };
  },
};
