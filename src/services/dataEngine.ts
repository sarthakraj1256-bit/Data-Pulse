import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnProfile } from '../types';

export interface ParseResult {
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xlsx' | 'json';
  records: Record<string, any>[];
  columns: ColumnProfile[];
  rowCount: number;
  columnCount: number;
}

export function inferColumnType(values: any[]): 'number' | 'date' | 'boolean' | 'string' {
  const nonNulls = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) return 'string';

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  for (const val of nonNulls.slice(0, 100)) {
    if (typeof val === 'boolean' || val === 'true' || val === 'false') {
      boolCount++;
      continue;
    }

    if (typeof val === 'number') {
      numCount++;
      continue;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Check if numeric
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        numCount++;
        continue;
      }
      // Check if valid date
      const timestamp = Date.parse(trimmed);
      if (!isNaN(timestamp) && (trimmed.includes('-') || trimmed.includes('/') || trimmed.includes('T'))) {
        dateCount++;
        continue;
      }
    }
  }

  const sampleLen = Math.min(nonNulls.length, 100);
  if (numCount / sampleLen > 0.7) return 'number';
  if (dateCount / sampleLen > 0.7) return 'date';
  if (boolCount / sampleLen > 0.7) return 'boolean';
  return 'string';
}

export function profileColumns(records: Record<string, any>[]): ColumnProfile[] {
  if (records.length === 0) return [];
  const keys = Object.keys(records[0] || {});
  const rowCount = records.length;

  return keys.map(key => {
    const rawValues = records.map(r => r[key]);
    const inferredType = inferColumnType(rawValues);

    let nullCount = 0;
    const uniqueSet = new Set<string>();
    const numericValues: number[] = [];

    for (const val of rawValues) {
      if (val === null || val === undefined || val === '' || String(val).trim() === '') {
        nullCount++;
      } else {
        uniqueSet.add(String(val));
        if (inferredType === 'number') {
          const num = typeof val === 'number' ? val : parseFloat(String(val));
          if (!isNaN(num)) {
            numericValues.push(num);
          }
        }
      }
    }

    const nullPercentage = Number(((nullCount / rowCount) * 100).toFixed(2));
    const uniqueCount = uniqueSet.size;

    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let stdDev: number | undefined;
    let outlierCount: number | undefined;

    if (inferredType === 'number' && numericValues.length > 0) {
      numericValues.sort((a, b) => a - b);
      min = numericValues[0];
      max = numericValues[numericValues.length - 1];
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      mean = Number((sum / numericValues.length).toFixed(3));

      const mid = Math.floor(numericValues.length / 2);
      median = numericValues.length % 2 !== 0
        ? numericValues[mid]
        : Number(((numericValues[mid - 1] + numericValues[mid]) / 2).toFixed(3));

      const variance = numericValues.reduce((acc, curr) => acc + Math.pow(curr - (mean || 0), 2), 0) / numericValues.length;
      stdDev = Number(Math.sqrt(variance).toFixed(3));

      // Deterministic Tukey 1.5x IQR Outlier Detection
      if (numericValues.length >= 10) {
        const q1 = numericValues[Math.floor(numericValues.length * 0.25)];
        const q3 = numericValues[Math.floor(numericValues.length * 0.75)];
        const iqr = q3 - q1;
        if (iqr > 0) {
          const lowerFence = q1 - 1.5 * iqr;
          const upperFence = q3 + 1.5 * iqr;
          outlierCount = numericValues.filter(v => v < lowerFence || v > upperFence).length;
        } else {
          outlierCount = 0;
        }
      } else {
        outlierCount = 0;
      }
    }

    const lowerKey = key.toLowerCase();
    const isTimestamp = inferredType === 'date' || lowerKey.includes('time') || lowerKey.includes('date');
    const isPotentialId = (lowerKey.includes('id') || lowerKey.includes('code')) && uniqueCount > rowCount * 0.9;

    return {
      name: key,
      inferredType,
      nullCount,
      nullPercentage,
      uniqueCount,
      sampleValues: rawValues.slice(0, 5),
      min,
      max,
      mean,
      median,
      stdDev,
      outlierCount,
      isPotentialId,
      isTimestamp,
    };
  });
}

export interface DatasetProfileSummary {
  rowCount: number;
  columnCount: number;
  rawRowCount: number;
  totalCells: number;
  totalNullCells: number;
  nullRate: number;
  duplicateRowCount: number;
  columns: ColumnProfile[];
  timestampCoverage?: {
    minTimestamp?: string;
    maxTimestamp?: string;
    totalSpanHours?: number;
    medianIntervalSeconds?: number;
  };
}

export function calculateDatasetProfile(
  records: Record<string, any>[],
  rawRecords?: Record<string, any>[]
): DatasetProfileSummary {
  const rowCount = records.length;
  const rawRowCount = rawRecords ? rawRecords.length : rowCount;
  const columns = profileColumns(records);
  const columnCount = columns.length;
  const totalCells = rowCount * columnCount;
  const totalNullCells = columns.reduce((acc, c) => acc + c.nullCount, 0);
  const nullRate = totalCells > 0 ? Number(((totalNullCells / totalCells) * 100).toFixed(2)) : 0;

  // Duplicate records check
  const seenSignatures = new Set<string>();
  let duplicateRowCount = 0;
  for (const row of records) {
    const sig = JSON.stringify(row);
    if (seenSignatures.has(sig)) {
      duplicateRowCount++;
    } else {
      seenSignatures.add(sig);
    }
  }

  // Timestamp coverage if timestamp column exists
  const timestampCols = columns.filter(c => c.isTimestamp);
  let timestampCoverage: DatasetProfileSummary['timestampCoverage'];

  if (timestampCols.length > 0 && rowCount > 0) {
    const timeCol = timestampCols[0].name;
    const validTimestamps: number[] = [];

    for (const row of records) {
      const val = row[timeCol];
      if (val) {
        const t = Date.parse(String(val));
        if (!isNaN(t)) {
          validTimestamps.push(t);
        }
      }
    }

    if (validTimestamps.length > 0) {
      validTimestamps.sort((a, b) => a - b);
      const minT = validTimestamps[0];
      const maxT = validTimestamps[validTimestamps.length - 1];
      const spanHours = Number(((maxT - minT) / (1000 * 60 * 60)).toFixed(2));

      // Calculate median interval between consecutive sorted samples
      let medianIntervalSeconds: number | undefined;
      if (validTimestamps.length > 1) {
        const intervals: number[] = [];
        for (let i = 1; i < validTimestamps.length; i++) {
          intervals.push((validTimestamps[i] - validTimestamps[i - 1]) / 1000);
        }
        intervals.sort((a, b) => a - b);
        const midIdx = Math.floor(intervals.length / 2);
        medianIntervalSeconds = intervals[midIdx];
      }

      timestampCoverage = {
        minTimestamp: new Date(minT).toISOString(),
        maxTimestamp: new Date(maxT).toISOString(),
        totalSpanHours: spanHours,
        medianIntervalSeconds,
      };
    }
  }

  return {
    rowCount,
    columnCount,
    rawRowCount,
    totalCells,
    totalNullCells,
    nullRate,
    duplicateRowCount,
    columns,
    timestampCoverage,
  };
}

export const DataEngine = {
  async parseCSV(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            reject(new Error('The uploaded CSV file contains no data or could not be read.'));
            return;
          }
          const records = results.data as Record<string, any>[];
          const columns = profileColumns(records);
          resolve({
            fileName: file.name,
            fileSize: file.size,
            fileType: 'csv',
            records,
            columns,
            rowCount: records.length,
            columnCount: columns.length,
          });
        },
        error: (error) => {
          reject(new Error(`CSV Parsing failed: ${error.message}`));
        },
      });
    });
  },

  async parseJSON(file: File): Promise<ParseResult> {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON format. Please ensure the file contains valid JSON syntax.');
    }

    let records: Record<string, any>[] = [];
    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (parsed && typeof parsed === 'object') {
      // Find the first array property
      const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (arrayKey) {
        records = parsed[arrayKey];
      } else {
        records = [parsed];
      }
    }

    if (records.length === 0) {
      throw new Error('The JSON file contains no structured records.');
    }

    const columns = profileColumns(records);
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'json',
      records,
      columns,
      rowCount: records.length,
      columnCount: columns.length,
    };
  },

  async parseXLSX(file: File): Promise<ParseResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('The Excel workbook contains no readable sheets.');
    }
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (records.length === 0) {
      throw new Error('The selected Excel sheet contains no rows.');
    }

    const columns = profileColumns(records);
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'xlsx',
      records,
      columns,
      rowCount: records.length,
      columnCount: columns.length,
    };
  },

  parseCSVString(csvContent: string, name: string = 'synthetic_benchmark.csv'): ParseResult {
    const results = Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
    });
    const records = results.data as Record<string, any>[];
    const columns = profileColumns(records);
    return {
      fileName: name,
      fileSize: new Blob([csvContent]).size,
      fileType: 'csv',
      records,
      columns,
      rowCount: records.length,
      columnCount: columns.length,
    };
  },
};
