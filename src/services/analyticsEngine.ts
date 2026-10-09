import { ColumnProfile } from '../types';

export interface CorrelationItem {
  colA: string;
  colB: string;
  coefficient: number; // -1 to 1
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  label: string;
  count: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label: string;
}

export const AnalyticsEngine = {
  computeCorrelations(records: Record<string, any>[], numericCols: string[]): CorrelationItem[] {
    if (numericCols.length < 2 || records.length < 3) return [];

    const correlations: CorrelationItem[] = [];

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const colA = numericCols[i];
        const colB = numericCols[j];

        const pairs: [number, number][] = [];
        for (const row of records) {
          const a = row[colA];
          const b = row[colB];
          if (typeof a === 'number' && typeof b === 'number' && !isNaN(a) && !isNaN(b)) {
            pairs.push([a, b]);
          }
        }

        if (pairs.length < 3) continue;

        const n = pairs.length;
        const meanA = pairs.reduce((acc, p) => acc + p[0], 0) / n;
        const meanB = pairs.reduce((acc, p) => acc + p[1], 0) / n;

        let numerator = 0;
        let denomA = 0;
        let denomB = 0;

        for (const [a, b] of pairs) {
          const diffA = a - meanA;
          const diffB = b - meanB;
          numerator += diffA * diffB;
          denomA += diffA * diffA;
          denomB += diffB * diffB;
        }

        const denom = Math.sqrt(denomA * denomB);
        const r = denom === 0 ? 0 : Number((numerator / denom).toFixed(3));

        correlations.push({ colA, colB, coefficient: r });
      }
    }

    return correlations;
  },

  computeHistogram(records: Record<string, any>[], column: string, binsCount: number = 8): HistogramBin[] {
    const values = records
      .map(r => r[column])
      .filter(v => typeof v === 'number' && !isNaN(v)) as number[];

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return [{ binStart: min, binEnd: max, label: `${min}`, count: values.length }];
    }

    const step = (max - min) / binsCount;
    const bins: HistogramBin[] = [];

    for (let i = 0; i < binsCount; i++) {
      const bStart = min + i * step;
      const bEnd = min + (i + 1) * step;
      bins.push({
        binStart: Number(bStart.toFixed(2)),
        binEnd: Number(bEnd.toFixed(2)),
        label: `${bStart.toFixed(1)} - ${bEnd.toFixed(1)}`,
        count: 0,
      });
    }

    for (const v of values) {
      let assigned = false;
      for (let i = 0; i < binsCount; i++) {
        if (i === binsCount - 1 ? v >= bins[i].binStart && v <= bins[i].binEnd : v >= bins[i].binStart && v < bins[i].binEnd) {
          bins[i].count++;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        bins[binsCount - 1].count++;
      }
    }

    return bins;
  },

  extractTimeSeries(
    records: Record<string, any>[],
    timeCol: string,
    valueCol: string
  ): TimeSeriesPoint[] {
    const points: TimeSeriesPoint[] = [];

    records.forEach((r, idx) => {
      const tRaw = r[timeCol];
      const v = r[valueCol];
      if (tRaw && typeof v === 'number' && !isNaN(v)) {
        const timeParsed = new Date(String(tRaw));
        const formatted = isNaN(timeParsed.getTime()) 
          ? `pt-${idx + 1}` 
          : timeParsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        points.push({
          timestamp: String(tRaw),
          value: v,
          label: formatted,
        });
      }
    });

    return points;
  },
};
