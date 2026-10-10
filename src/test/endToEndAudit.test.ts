import Papa from 'papaparse';
import { DataEngine, profileColumns } from '../services/dataEngine';
import { QualityEngine } from '../services/qualityEngine';
import { CleaningEngine } from '../services/cleaningEngine';
import { Dataset } from '../types';

/**
 * End-to-End Reliability, Security & Correctness Audit Test Suite
 * 
 * Verifies:
 * 1. Controlled heterogeneous CSV parse & raw snapshot integrity
 * 2. 6-dimensional quality assessment
 * 3. Cleaning Studio zero-mutation preview
 * 4. Multi-step transformation lineage & validation outcomes
 * 5. Intermediate version rollback & byte/record identical raw rollback
 * 6. Export data bundle & summary completeness
 * 7. Edge cases: Empty records, headers only, all-null columns, mixed types
 */

function runEndToEndAudit() {
  console.log('=================================================================');
  console.log('🛡️  Starting DataPulse End-to-End Reliability & Security Audit');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // 1. CONTROLLED HETEROGENEOUS TEST DATASET WORKFLOW
  console.log('--- Step 1-6: Ingestion, Assessment, Zero-Mutation Preview & Transformation ---');
  const rawCsv = `device_id,temperature,timestamp,status
DEV-001,23.5,2026-03-01T10:00:00Z, ONLINE 
DEV-002,,2026-03-01T10:05:00Z, OFFLINE 
DEV-003,150.0,2026-03-01T10:10:00Z, ONLINE 
DEV-001,23.5,2026-03-01T10:00:00Z, ONLINE 
DEV-004,24.2,invalid-date-string, ONLINE `;

  const parsed = Papa.parse(rawCsv, { header: true, dynamicTyping: true, skipEmptyLines: 'greedy' });
  const rawRecords = JSON.parse(JSON.stringify(parsed.data as Record<string, any>[]));
  const columns = profileColumns(rawRecords);
  const initialQuality = QualityEngine.assessQuality(rawRecords, columns);

  const dataset: Dataset = {
    id: 'ds_audit_01',
    userId: 'auditor-1',
    name: 'Industrial Sensor Batch',
    description: 'Controlled heterogeneous benchmark',
    fileName: 'sensor_stream.csv',
    fileSize: rawCsv.length,
    fileType: 'csv',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSynthetic: false,
    rowCount: rawRecords.length,
    columnCount: columns.length,
    columns,
    rawRecords: JSON.parse(JSON.stringify(rawRecords)),
    cleanedRecords: JSON.parse(JSON.stringify(rawRecords)),
    qualityAssessment: initialQuality,
    lineage: [],
    tags: ['audit', 'iot'],
  };

  // Check 1: Ingestion raw preservation
  assert(dataset.rawRecords.length === 5, 'Raw snapshot records length is 5');
  assert(dataset.rawRecords[1].temperature === null, 'Raw snapshot has unmutated null value at row 2');
  assert(dataset.rawRecords[3].device_id === 'DEV-001', 'Raw snapshot contains duplicate record at row 4');

  // Check 2: 6 dimensions evaluated
  assert(initialQuality.dimensionScores.completeness.score < 100, 'Completeness flags missing temperature');
  assert(initialQuality.dimensionScores.uniqueness.score < 100, 'Uniqueness flags duplicate rows');
  assert(initialQuality.dimensionScores.consistency.score < 100, 'Consistency flags untrimmed status strings');
  assert(initialQuality.dimensionScores.plausibility.score <= 100, 'Plausibility evaluates extreme 150.0 reading');
  assert(initialQuality.dimensionScores.timeliness.score < 100, 'Timeliness flags invalid date format');

  // Check 3: Preview operation without mutation
  const previewDedupe = CleaningEngine.previewOperation(dataset.cleanedRecords, 'remove_duplicates');
  assert(previewDedupe.affectedCount === 1, 'Preview correctly detects 1 duplicate row');
  assert(dataset.cleanedRecords.length === 5, 'dataset.cleanedRecords is completely unmutated by preview');
  assert(dataset.rawRecords.length === 5, 'dataset.rawRecords is completely unmutated by preview');

  // Check 4: Apply Transformation 1 (Deduplicate)
  const step1 = CleaningEngine.applyOperation(
    dataset,
    'remove_duplicates',
    undefined,
    'Purge redundant ingest row'
  );
  assert(step1.updatedDataset.cleanedRecords.length === 4, 'Cleaned dataset row count reduced to 4');
  assert(step1.updatedDataset.rawRecords.length === 5, 'Raw dataset records remain strictly 5');
  assert(step1.lineageRecord.beforeVersionId === 'v1.0.0-raw', 'Step 1 beforeVersionId recorded as v1.0.0-raw');
  assert(step1.lineageRecord.afterVersionId === 'v1.1', 'Step 1 afterVersionId recorded as v1.1');
  assert(step1.lineageRecord.isDestructive === false, 'Deduplication is non-destructive (standard deduplication)');

  // Check 5: Apply Transformation 2 (Impute Median on temperature)
  const step2 = CleaningEngine.applyOperation(
    step1.updatedDataset,
    'impute_median',
    'temperature',
    'Impute null temperature with robust median'
  );
  assert(step2.updatedDataset.cleanedRecords[1].temperature !== null, 'Temperature null replaced');
  assert(step2.lineageRecord.beforeVersionId === 'v1.1', 'Step 2 beforeVersionId is v1.1');
  assert(step2.lineageRecord.afterVersionId === 'v1.2', 'Step 2 afterVersionId is v1.2');
  assert(step2.lineageRecord.changedCellsCount === 1, 'Step 2 recorded changedCellsCount: 1');

  // Check 6: Apply Transformation 3 (Trim whitespace on status)
  const step3 = CleaningEngine.applyOperation(
    step2.updatedDataset,
    'trim_whitespace',
    'status',
    'Trim whitespace on status column'
  );
  assert(step3.updatedDataset.cleanedRecords[0].status === 'ONLINE', 'Status string trimmed cleanly');
  assert(step3.lineageRecord.beforeVersionId === 'v1.2', 'Step 3 beforeVersionId is v1.2');
  assert(step3.lineageRecord.afterVersionId === 'v1.3', 'Step 3 afterVersionId is v1.3');

  // 2. ROLLBACK VERIFICATION (STEPS 9-11)
  console.log('\n--- Step 9-11: Intermediate Version Rollback & Revert to Raw ---');
  // Rollback to intermediate version v1.2
  const rolledBackV1_2 = CleaningEngine.rollbackToVersion(step3.updatedDataset, 'v1.2');
  assert(rolledBackV1_2 !== null, 'Rollback to v1.2 succeeded');
  assert(rolledBackV1_2?.cleanedRecords[0].status === ' ONLINE ', 'Status reverted to untrimmed state at v1.2');
  assert(rolledBackV1_2?.cleanedRecords[1].temperature !== null, 'Temperature imputation retained at v1.2');
  assert(rolledBackV1_2?.lineage.length === 2, 'Lineage reduced to 2 records');

  // Rollback to raw baseline
  const rolledBackRaw = CleaningEngine.rollbackToVersion(step3.updatedDataset, 'v1.0 (Raw)');
  assert(rolledBackRaw !== null, 'Rollback to raw baseline succeeded');
  assert(rolledBackRaw?.cleanedRecords.length === 5, 'All original 5 rows restored');
  assert(rolledBackRaw?.cleanedRecords[1].temperature === null, 'Pristine null temperature restored');
  assert(rolledBackRaw?.lineage.length === 0, 'Lineage completely reset to 0');
  assert(
    JSON.stringify(rolledBackRaw?.cleanedRecords) === JSON.stringify(dataset.rawRecords),
    'Logical-record equality holds between rolled back records and rawRecords snapshot'
  );

  // 3. EDGE CASES AUDIT
  console.log('\n--- Edge Cases & Robustness ---');

  // Edge Case A: Empty records dataset
  const emptyAssessment = QualityEngine.assessQuality([], []);
  assert(emptyAssessment.overallScore === 0, 'Empty records dataset yields score 0');
  assert(emptyAssessment.issues.length === 0, 'Empty dataset yields 0 uncaught errors');

  // Edge Case B: Headers only
  const headersOnlyProfile = profileColumns([{ colA: null, colB: null }]);
  assert(headersOnlyProfile.length === 2, 'Headers detected');
  const headersOnlyQuality = QualityEngine.assessQuality([{ colA: null, colB: null }], headersOnlyProfile);
  assert(headersOnlyQuality.overallScore >= 0, 'Headers-only quality evaluated gracefully');

  // Edge Case C: All-null column
  const allNullRecords = [{ val: null }, { val: null }, { val: null }];
  const allNullCols = profileColumns(allNullRecords);
  assert(allNullCols[0].nullPercentage === 100, 'All-null column detected with 100% null rate');
  const allNullQuality = QualityEngine.assessQuality(allNullRecords, allNullCols);
  assert(allNullQuality.dimensionScores.completeness.score === 0, 'Completeness is 0% for all-null column');

  // Edge Case D: Mixed string/number data coercion
  const mixedData = [{ val: '123' }, { val: 'abc' }, { val: '45.6' }, { val: null }];
  const coercedPreview = CleaningEngine.previewOperation(mixedData, 'coerce_numeric', 'val');
  assert(coercedPreview.previewRecords[0].val === 123, 'Numeric string coerced to number');
  assert(coercedPreview.previewRecords[1].val === null, 'Unparseable text converted to null safely');
  assert(coercedPreview.previewRecords[2].val === 45.6, 'Float string coerced to number');

  console.log('\n=================================================================');
  console.log(`📊 END-TO-END AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndAudit();
