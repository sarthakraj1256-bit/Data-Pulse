export interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  role: 'analyst' | 'engineer' | 'admin' | 'viewer';
  createdAt: string;
  avatarUrl?: string;
}

export type QualityDimensionType = 
  | 'completeness'
  | 'validity'
  | 'consistency'
  | 'uniqueness'
  | 'timeliness'
  | 'plausibility';

export type AssessmentStatus = 'assessed' | 'not_assessed' | 'not_applicable';

export interface QualityIssue {
  id: string;
  dimension: QualityDimensionType;
  severity: 'high' | 'medium' | 'low';
  column?: string;
  affectedRowsCount: number;
  description: string;
  explanation: string;
  sampleProblematicValues: (string | number | null)[];
  recommendedFix: string;
  recommendedMethod: CleaningOperationType;
  isAnomaly?: boolean; // Distinguishes confirmed rule violations (false) from potential statistical anomalies (true)
}

export interface DimensionScore {
  dimension: QualityDimensionType;
  score: number; // 0 to 100
  evaluated: boolean;
  status: AssessmentStatus;
  issuesCount: number;
  affectedRowsCount: number;
  affectedColumns?: string[];
  description: string;
  benchmarkRule: string;
  numerator?: number;
  denominator?: number;
  formulaDescription?: string;
  defectCount?: number;
  potentialAnomalyCount?: number;
}

export interface QualityAssessment {
  overallScore: number; // 0 - 100
  evaluatedAt: string;
  dimensionScores: Record<QualityDimensionType, DimensionScore>;
  issues: QualityIssue[];
  totalRows: number;
  totalColumns: number;
  cleanRowsCount: number;
  problematicRowsCount: number;
  completenessPercent: number;
  validityPercent: number;
  uniquenessPercent: number;
  includedDimensions?: QualityDimensionType[];
  aggregationMethod?: string;
  duplicateRowCount?: number;
  totalNullCells?: number;
  totalCells?: number;
  overallNullPercentage?: number;
  timestampCoverage?: {
    minTimestamp?: string;
    maxTimestamp?: string;
    totalSpanHours?: number;
    medianIntervalSeconds?: number;
  };
}

export type CleaningOperationType =
  | 'drop_missing_rows'
  | 'impute_mean'
  | 'impute_median'
  | 'impute_mode'
  | 'impute_constant'
  | 'impute_forward_fill'
  | 'remove_duplicates'
  | 'flag_outliers'
  | 'cap_outliers_iqr'
  | 'drop_outliers'
  | 'trim_whitespace'
  | 'standardize_case_upper'
  | 'standardize_case_lower'
  | 'normalize_date_iso'
  | 'coerce_numeric'
  | 'custom_replace';

export interface CleaningRecommendation {
  id: string;
  column?: string;
  issueType: QualityDimensionType;
  title: string;
  description: string;
  method: CleaningOperationType;
  affectedCount: number;
  confidence: number;
  previewParams?: Record<string, any>;
}

export interface LineageRecord {
  id: string;
  traceId: string; // e.g. DP-000184
  datasetId: string;
  datasetName: string;
  columnName?: string;
  affectedRowsCount: number;
  operationType: CleaningOperationType;
  detectedIssue: string;
  methodName: string;
  reason: string;
  originalSample: string[];
  transformedSample: string[];
  timestamp: string;
  performedBy: string;
  scoreBefore?: number;
  scoreAfter?: number;
}

export interface ColumnProfile {
  name: string;
  inferredType: 'number' | 'string' | 'date' | 'boolean';
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  sampleValues: any[];
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  outlierCount?: number;
  isPotentialId?: boolean;
  isTimestamp?: boolean;
}

export interface Dataset {
  id: string;
  userId: string;
  name: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xlsx' | 'json';
  createdAt: string;
  updatedAt: string;
  isSynthetic: boolean;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  rawRecords: Record<string, any>[]; // Immutable snapshot
  cleanedRecords: Record<string, any>[]; // Current working state
  qualityAssessment: QualityAssessment;
  lineage: LineageRecord[];
  tags?: string[];
}

export interface PredictionConfig {
  targetColumn: string;
  featureColumns: string[];
  modelType: 'linear_trend' | 'moving_average' | 'anomaly_zscore';
  trainSplitRatio: number; // e.g. 0.8
  forecastHorizonSteps: number;
}

export interface PredictionMetric {
  mae: number;
  rmse: number;
  r2: number;
  explainedVariance: number;
}

export interface PredictionResult {
  config: PredictionConfig;
  evaluatedAt: string;
  trainSize: number;
  testSize: number;
  metrics: PredictionMetric;
  actualVsPredicted: {
    index: number;
    timestamp?: string;
    actual: number;
    predicted: number;
    residual: number;
  }[];
  forecastFuture?: {
    step: number;
    predictedValue: number;
    lowerBound: number;
    upperBound: number;
  }[];
  anomaliesDetected?: {
    rowIndex: number;
    value: number;
    zScore: number;
    isAnomaly: boolean;
  }[];
  scientificCaveat: string;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface QualityConfigSettings {
  completenessThreshold: number; // e.g. 95%
  outlierIqrMultiplier: number; // e.g. 1.5
  maxGapSeconds: number; // e.g. 300 seconds
  customPlausibilityRules: {
    column: string;
    min?: number;
    max?: number;
  }[];
}

export type AuditActionType =
  | 'DATASET_UPLOADED'
  | 'BENCHMARK_LOADED'
  | 'QUALITY_EVALUATED'
  | 'TRANSFORMATION_APPLIED'
  | 'TRANSFORMATION_UNDONE'
  | 'EXPORT_GENERATED'
  | 'PREDICTION_EXECUTED'
  | 'SETTINGS_UPDATED'
  | 'DATASET_DELETED'
  | 'DATASET_BULK_DELETED'
  | 'DATASET_TAGS_UPDATED'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_REGISTERED';

export type AuditCategoryType =
  | 'ingestion'
  | 'transformation'
  | 'quality'
  | 'export'
  | 'prediction'
  | 'security'
  | 'settings';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditActionType;
  category: AuditCategoryType;
  description: string;
  timestamp: string;
  datasetId?: string;
  datasetName?: string;
  traceId?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'success' | 'warning' | 'alert';
}
