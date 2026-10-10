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

export interface PreviewResult {
  previewRecords: Record<string, any>[];
  affectedCount: number;
  affectedRowIndices: number[];
  sampleBefore: string[];
  sampleAfter: string[];
  removedRecords: Record<string, any>[];
  isDestructive: boolean;
  warningMessage?: string;
}

export function isDestructiveOperation(method: CleaningOperationType): boolean {
  return method === 'drop_missing_rows' || method === 'drop_outliers';
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
            isDestructive: false,
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
            isDestructive: true,
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
            isDestructive: false,
          });
          recommendations.push({
            id: `rec_${issue.id}_const`,
            column: issue.column,
            issueType: 'completeness',
            title: `Impute Missing '${issue.column}' with 'UNKNOWN'`,
            description: `Fill blanks with a constant placeholder label to preserve record volume.`,
            method: 'impute_constant',
            affectedCount: issue.affectedRowsCount,
            confidence: 80,
            previewParams: { constantValue: 'UNKNOWN' },
            isDestructive: false,
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
          isDestructive: false,
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
            isDestructive: false,
          });
        } else if (issue.id.includes('case')) {
          recommendations.push({
            id: `rec_${issue.id}_upper`,
            column: issue.column,
            issueType: 'consistency',
            title: `Standardize '${issue.column}' to Uppercase`,
            description: `Harmonize '${issue.column}' strings to uppercase to eliminate case-sensitive duplication.`,
            method: 'standardize_case_upper',
            affectedCount: issue.affectedRowsCount,
            confidence: 92,
            isDestructive: false,
          });
          recommendations.push({
            id: `rec_${issue.id}_lower`,
            column: issue.column,
            issueType: 'consistency',
            title: `Standardize '${issue.column}' to Lowercase`,
            description: `Harmonize '${issue.column}' strings to lowercase for canonical classification.`,
            method: 'standardize_case_lower',
            affectedCount: issue.affectedRowsCount,
            confidence: 90,
            isDestructive: false,
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
          isDestructive: false,
        });
        recommendations.push({
          id: `rec_${issue.id}_flag`,
          column: issue.column,
          issueType: 'plausibility',
          title: `Flag Outliers for Audit in '${issue.column}'`,
          description: `Add boolean indicator '_outlier_${issue.column}' without altering underlying telemetry measurements.`,
          method: 'flag_outliers',
          affectedCount: issue.affectedRowsCount,
          confidence: 95,
          isDestructive: false,
        });
        recommendations.push({
          id: `rec_${issue.id}_drop_out`,
          column: issue.column,
          issueType: 'plausibility',
          title: `Drop Outliers in '${issue.column}'`,
          description: `Remove ${issue.affectedRowsCount} anomalous records outside the IQR envelope.`,
          method: 'drop_outliers',
          affectedCount: issue.affectedRowsCount,
          confidence: 70,
          isDestructive: true,
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
          isDestructive: false,
        });
      } else if (issue.dimension === 'timeliness' && issue.column) {
        recommendations.push({
          id: `rec_${issue.id}_norm`,
          column: issue.column,
          issueType: 'timeliness',
          title: `Normalize Timestamps to ISO-8601 in '${issue.column}'`,
          description: `Standardize date and time strings into canonical ISO-8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).`,
          method: 'normalize_date_iso',
          affectedCount: issue.affectedRowsCount,
          confidence: 96,
          isDestructive: false,
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
  ): PreviewResult {
    const working = JSON.parse(JSON.stringify(records)) as Record<string, any>[];
    const sampleBefore: string[] = [];
    const sampleAfter: string[] = [];
    const affectedRowIndices: number[] = [];
    const removedRecords: Record<string, any>[] = [];
    let affectedCount = 0;
    const isDestructive = isDestructiveOperation(method);

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
            affectedRowIndices.push(i);
            removedRecords.push(row);
            if (sampleBefore.length < 3) sampleBefore.push(`Duplicate row #${i + 1}`);
          }
        });
        sampleAfter.push(`Retained ${deduped.length} unique rows; removed ${affectedCount} duplicate(s)`);
        return {
          previewRecords: deduped,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords,
          isDestructive: false,
          warningMessage: affectedCount > 0 ? `Will permanently purge ${affectedCount} duplicate record(s).` : undefined,
        };
      }

      case 'impute_median':
      case 'impute_mean': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
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

        working.forEach((row, i) => {
          const val = row[column];
          if (val === null || val === undefined || val === '' || String(val).trim() === '') {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(val === '' ? '(empty)' : String(val));
            row[column] = replacementValue;
            if (sampleAfter.length < 3) sampleAfter.push(String(replacementValue));
          }
        });

        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'impute_mode': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
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

        working.forEach((row, i) => {
          const val = row[column];
          if (val === null || val === undefined || val === '' || String(val).trim() === '') {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push('(empty)');
            row[column] = modeVal;
            if (sampleAfter.length < 3) sampleAfter.push(modeVal);
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'impute_constant': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        const constantVal = params?.constantValue ?? 'UNKNOWN';
        working.forEach((row, i) => {
          const val = row[column];
          if (val === null || val === undefined || val === '' || String(val).trim() === '') {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(val === '' ? '(empty)' : String(val));
            row[column] = constantVal;
            if (sampleAfter.length < 3) sampleAfter.push(String(constantVal));
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'impute_forward_fill': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        let lastVal: any = undefined;
        working.forEach((row, i) => {
          const val = row[column];
          if (val !== null && val !== undefined && val !== '' && String(val).trim() !== '') {
            lastVal = val;
          } else if (lastVal !== undefined) {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push('(empty)');
            row[column] = lastVal;
            if (sampleAfter.length < 3) sampleAfter.push(String(lastVal));
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'drop_missing_rows': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: true,
          };
        }
        const retained: Record<string, any>[] = [];
        working.forEach((row, i) => {
          const val = row[column];
          const isMissing = val === null || val === undefined || val === '' || String(val).trim() === '';
          if (isMissing) {
            affectedCount++;
            affectedRowIndices.push(i);
            removedRecords.push(row);
            if (sampleBefore.length < 3) sampleBefore.push(`Row #${i + 1} (${val ?? 'null'})`);
          } else {
            retained.push(row);
          }
        });
        sampleAfter.push(`Retained ${retained.length} rows; purged ${affectedCount} incomplete rows`);
        return {
          previewRecords: retained,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords,
          isDestructive: true,
          warningMessage: `DESTRUCTIVE OPERATION: ${affectedCount} record(s) will be permanently filtered out of this cleaned version.`,
        };
      }

      case 'trim_whitespace': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        working.forEach((row, i) => {
          const val = row[column];
          if (typeof val === 'string' && val !== val.trim()) {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(`"${val}"`);
            row[column] = val.trim();
            if (sampleAfter.length < 3) sampleAfter.push(`"${val.trim()}"`);
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'standardize_case_upper': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        working.forEach((row, i) => {
          const val = row[column];
          if (typeof val === 'string' && val !== val.toUpperCase()) {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(val);
            row[column] = val.toUpperCase().trim();
            if (sampleAfter.length < 3) sampleAfter.push(val.toUpperCase().trim());
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'standardize_case_lower': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        working.forEach((row, i) => {
          const val = row[column];
          if (typeof val === 'string' && val !== val.toLowerCase()) {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(val);
            row[column] = val.toLowerCase().trim();
            if (sampleAfter.length < 3) sampleAfter.push(val.toLowerCase().trim());
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'normalize_date_iso': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        working.forEach((row, i) => {
          const val = row[column];
          if (val !== null && val !== undefined && val !== '') {
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
              const iso = parsed.toISOString();
              if (String(val) !== iso) {
                affectedCount++;
                affectedRowIndices.push(i);
                if (sampleBefore.length < 3) sampleBefore.push(String(val));
                row[column] = iso;
                if (sampleAfter.length < 3) sampleAfter.push(iso);
              }
            }
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'clamp_range': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        const minBound = params?.min !== undefined ? Number(params.min) : -Infinity;
        const maxBound = params?.max !== undefined ? Number(params.max) : Infinity;

        working.forEach((row, i) => {
          const val = row[column];
          if (typeof val === 'number') {
            if (val < minBound) {
              affectedCount++;
              affectedRowIndices.push(i);
              if (sampleBefore.length < 3) sampleBefore.push(String(val));
              row[column] = minBound;
              if (sampleAfter.length < 3) sampleAfter.push(String(minBound));
            } else if (val > maxBound) {
              affectedCount++;
              affectedRowIndices.push(i);
              if (sampleBefore.length < 3) sampleBefore.push(String(val));
              row[column] = maxBound;
              if (sampleAfter.length < 3) sampleAfter.push(String(maxBound));
            }
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'cap_outliers_iqr': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        const nums = working
          .map(r => r[column])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        if (nums.length < 4) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        working.forEach((row, i) => {
          const val = row[column];
          if (typeof val === 'number') {
            if (val < lower) {
              affectedCount++;
              affectedRowIndices.push(i);
              if (sampleBefore.length < 3) sampleBefore.push(String(val));
              row[column] = Number(lower.toFixed(2));
              if (sampleAfter.length < 3) sampleAfter.push(String(Number(lower.toFixed(2))));
            } else if (val > upper) {
              affectedCount++;
              affectedRowIndices.push(i);
              if (sampleBefore.length < 3) sampleBefore.push(String(val));
              row[column] = Number(upper.toFixed(2));
              if (sampleAfter.length < 3) sampleAfter.push(String(Number(upper.toFixed(2))));
            }
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'drop_outliers': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: true,
          };
        }
        const nums = working
          .map(r => r[column])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        if (nums.length < 4) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: true,
          };
        }
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        const retained: Record<string, any>[] = [];
        working.forEach((row, i) => {
          const val = row[column];
          const isOut = typeof val === 'number' && (val < lower || val > upper);
          if (isOut) {
            affectedCount++;
            affectedRowIndices.push(i);
            removedRecords.push(row);
            if (sampleBefore.length < 3) sampleBefore.push(`Row #${i + 1} (${val})`);
          } else {
            retained.push(row);
          }
        });
        sampleAfter.push(`Retained ${retained.length} rows; purged ${affectedCount} outlier row(s)`);
        return {
          previewRecords: retained,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords,
          isDestructive: true,
          warningMessage: `DESTRUCTIVE OPERATION: ${affectedCount} row(s) flagged as statistical outliers will be deleted.`,
        };
      }

      case 'flag_outliers': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
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

        working.forEach((row, i) => {
          const val = row[column];
          const isOut = typeof val === 'number' && (val < lower || val > upper);
          row[flagCol] = isOut;
          if (isOut) {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(`${column}=${val}`);
            if (sampleAfter.length < 3) sampleAfter.push(`${flagCol}=true`);
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'coerce_numeric': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        working.forEach((row, i) => {
          const val = row[column];
          if (typeof val === 'string' && val.trim() !== '') {
            const num = Number(val.trim());
            if (!isNaN(num)) {
              affectedCount++;
              affectedRowIndices.push(i);
              if (sampleBefore.length < 3) sampleBefore.push(`"${val}"`);
              row[column] = num;
              if (sampleAfter.length < 3) sampleAfter.push(String(num));
            } else {
              affectedCount++;
              affectedRowIndices.push(i);
              if (sampleBefore.length < 3) sampleBefore.push(`"${val}" (corrupt)`);
              row[column] = null;
              if (sampleAfter.length < 3) sampleAfter.push('null');
            }
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      case 'custom_replace': {
        if (!column) {
          return {
            previewRecords: working,
            affectedCount: 0,
            affectedRowIndices: [],
            sampleBefore: [],
            sampleAfter: [],
            removedRecords: [],
            isDestructive: false,
          };
        }
        const targetVal = String(params?.targetValue ?? '');
        const replaceVal = params?.replacementValue ?? '';
        working.forEach((row, i) => {
          const val = String(row[column] ?? '');
          if (val === targetVal) {
            affectedCount++;
            affectedRowIndices.push(i);
            if (sampleBefore.length < 3) sampleBefore.push(`"${val}"`);
            row[column] = replaceVal;
            if (sampleAfter.length < 3) sampleAfter.push(`"${replaceVal}"`);
          }
        });
        return {
          previewRecords: working,
          affectedCount,
          affectedRowIndices,
          sampleBefore,
          sampleAfter,
          removedRecords: [],
          isDestructive: false,
        };
      }

      default:
        return {
          previewRecords: working,
          affectedCount: 0,
          affectedRowIndices: [],
          sampleBefore: [],
          sampleAfter: [],
          removedRecords: [],
          isDestructive: false,
        };
    }
  },

  applyOperation(
    dataset: Dataset,
    method: CleaningOperationType,
    column?: string,
    reason?: string,
    performedBy: string = 'Authorized Analyst',
    params?: Record<string, any>
  ): { updatedDataset: Dataset; lineageRecord: LineageRecord } {
    const beforeScore = dataset.qualityAssessment.overallScore;
    const {
      previewRecords,
      affectedCount,
      affectedRowIndices,
      sampleBefore,
      sampleAfter,
      removedRecords,
      isDestructive,
    } = this.previewOperation(
      dataset.cleanedRecords,
      method,
      column,
      params
    );

    const traceId = generateTraceId();
    const updatedColumns = profileColumns(previewRecords);
    const updatedQuality = QualityEngine.assessQuality(previewRecords, updatedColumns);

    const versionStep = dataset.lineage.length;
    const beforeVersionId = versionStep === 0 ? 'v1.0.0-raw' : `v${(1 + versionStep * 0.1).toFixed(1)}`;
    const afterVersionId = `v${(1 + (versionStep + 1) * 0.1).toFixed(1)}`;
    const validationOutcome =
      updatedQuality.overallScore > beforeScore
        ? 'improved'
        : updatedQuality.overallScore < beforeScore
        ? 'degraded'
        : 'neutral';

    const changedCellsCount = isDestructive ? 0 : affectedCount;
    const removedRowsCount = isDestructive ? removedRecords.length : 0;

    const lineageRecord: LineageRecord = {
      id: 'lin_' + Math.random().toString(36).substring(2, 9),
      traceId,
      datasetId: dataset.id,
      datasetName: dataset.name,
      columnName: column,
      affectedRowsCount: affectedCount,
      affectedRowIndices,
      changedCellsCount,
      removedRowsCount,
      params: params || undefined,
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
      beforeVersionId,
      afterVersionId,
      validationOutcome,
      isDestructive,
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
        record.columnName,
        record.params
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

  rollbackToVersion(dataset: Dataset, targetVersionId: string): Dataset | null {
    if (dataset.lineage.length === 0) return null;

    if (
      targetVersionId === 'v1.0 (Raw)' ||
      targetVersionId === 'v1.0' ||
      targetVersionId === 'v1.0.0-raw' ||
      targetVersionId.toLowerCase().includes('raw')
    ) {
      const rawCopy = JSON.parse(JSON.stringify(dataset.rawRecords));
      const updatedColumns = profileColumns(rawCopy);
      const updatedQuality = QualityEngine.assessQuality(rawCopy, updatedColumns);
      return {
        ...dataset,
        cleanedRecords: rawCopy,
        rowCount: rawCopy.length,
        columns: updatedColumns,
        qualityAssessment: updatedQuality,
        updatedAt: new Date().toISOString(),
        lineage: [],
      };
    }

    const targetIndex = dataset.lineage.findIndex(
      r => r.afterVersionId === targetVersionId
    );
    if (targetIndex === -1) return null;

    const remainingLineage = dataset.lineage.slice(targetIndex);

    let currentRecords = JSON.parse(JSON.stringify(dataset.rawRecords));
    const chronologicalLineage = [...remainingLineage].reverse();

    for (const record of chronologicalLineage) {
      const { previewRecords } = this.previewOperation(
        currentRecords,
        record.operationType,
        record.columnName,
        record.params
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
