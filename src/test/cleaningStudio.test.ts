import { CleaningEngine, isDestructiveOperation } from '../services/cleaningEngine';
import { QualityEngine } from '../services/qualityEngine';
import { profileColumns } from '../services/dataEngine';
import { Dataset, QualityConfigSettings } from '../types';

/**
 * Deterministic Integration Test Suite for DataPulse Cleaning Studio
 * 
 * Verifies preview without mutation, approved transformations,
 * raw data immutability, lineage recording, versioning, and recovery.
 */

function runCleaningStudioTests() {
  console.log('=================================================================');
  console.log('🧪 Starting DataPulse Cleaning Studio End-to-End Tests');
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

  // Helper to create a test dataset
  function createTestDataset(records: Record<string, any>[]): Dataset {
    const rawCopy = JSON.parse(JSON.stringify(records));
    const columns = profileColumns(records);
    const qualityAssessment = QualityEngine.assessQuality(records, columns);

    return {
      id: 'ds_test_' + Math.random().toString(36).substring(2, 7),
      userId: 'test-user-123',
      name: 'Test IoT Dataset',
      description: 'Dataset for testing cleaning operations',
      fileName: 'test_iot.csv',
      fileSize: 1024,
      fileType: 'csv',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynthetic: false,
      rowCount: records.length,
      columnCount: columns.length,
      columns,
      rawRecords: rawCopy,
      cleanedRecords: JSON.parse(JSON.stringify(records)),
      qualityAssessment,
      lineage: [],
      tags: ['test'],
    };
  }

  // TEST 1: Preview without mutation
  {
    console.log('--- Test Suite 1: Preview Before Applying (Zero Mutation) ---');
    const records = [
      { id: 1, temp: 20.5 },
      { id: 2, temp: null },
      { id: 3, temp: 22.5 },
    ];
    const ds = createTestDataset(records);
    const originalCleanedJson = JSON.stringify(ds.cleanedRecords);
    const originalRawJson = JSON.stringify(ds.rawRecords);

    const preview = CleaningEngine.previewOperation(
      ds.cleanedRecords,
      'impute_median',
      'temp'
    );

    assert(preview.affectedCount === 1, 'Preview accurately identifies 1 affected null row');
    assert(preview.previewRecords[1].temp === 21.5, 'Preview calculates median replacement (21.5)');
    assert(
      JSON.stringify(ds.cleanedRecords) === originalCleanedJson,
      'Original dataset.cleanedRecords is completely unmutated by preview'
    );
    assert(
      JSON.stringify(ds.rawRecords) === originalRawJson,
      'Original dataset.rawRecords is completely unmutated by preview'
    );
  }

  // TEST 2: Missing Value Handling & Quality Reassessment
  {
    console.log('\n--- Test Suite 2: Missing Value Imputation & Quality Reassessment ---');
    const records = [
      { id: 1, val: 10 },
      { id: 2, val: null },
      { id: 3, val: 30 },
      { id: 4, val: null },
      { id: 5, val: 50 },
    ];
    const ds = createTestDataset(records);
    const initialScore = ds.qualityAssessment.overallScore;

    const { updatedDataset, lineageRecord } = CleaningEngine.applyOperation(
      ds,
      'impute_median',
      'val',
      'Imputed missing values via median'
    );

    assert(
      updatedDataset.cleanedRecords.every(r => r.val !== null),
      'All null values replaced in cleaned records'
    );
    assert(
      updatedDataset.qualityAssessment.dimensionScores.completeness.score === 100,
      'Completeness score re-evaluated to 100% by Quality Engine'
    );
    assert(
      updatedDataset.qualityAssessment.overallScore >= initialScore,
      'Overall quality score improved or maintained'
    );
    assert(lineageRecord.scoreBefore === initialScore, 'Lineage recorded accurate scoreBefore');
    assert(
      lineageRecord.scoreAfter === updatedDataset.qualityAssessment.overallScore,
      'Lineage recorded accurate scoreAfter'
    );
    assert(
      lineageRecord.validationOutcome === 'improved',
      'Validation outcome flagged as improved'
    );
  }

  // TEST 3: Duplicate Elimination & Trace Recording
  {
    console.log('\n--- Test Suite 3: Deduplication & Version Tracking ---');
    const records = [
      { dev: 'A', reading: 100 },
      { dev: 'A', reading: 100 }, // duplicate
      { dev: 'B', reading: 200 },
    ];
    const ds = createTestDataset(records);
    assert(ds.qualityAssessment.dimensionScores.uniqueness.score < 100, 'Uniqueness initially flagged duplicate');

    const { updatedDataset, lineageRecord } = CleaningEngine.applyOperation(
      ds,
      'remove_duplicates',
      undefined,
      'Removed exact duplicate row'
    );

    assert(updatedDataset.rowCount === 2, 'Row count reduced from 3 to 2');
    assert(
      updatedDataset.qualityAssessment.dimensionScores.uniqueness.score === 100,
      'Uniqueness score improved to 100%'
    );
    assert(lineageRecord.beforeVersionId === 'v1.0.0-raw', 'Lineage recorded beforeVersionId v1.0.0-raw');
    assert(lineageRecord.afterVersionId === 'v1.1', 'Lineage recorded afterVersionId v1.1');
    assert(lineageRecord.traceId.startsWith('DP-'), 'Lineage assigned valid DP- trace ID');
  }

  // TEST 4: String Format Normalization (Whitespace & Letter Casing)
  {
    console.log('\n--- Test Suite 4: String Normalization (Trim & Case) ---');
    const records = [
      { status: '  ONLINE  ' },
      { status: 'online' },
      { status: 'OFFLINE' },
    ];
    const ds = createTestDataset(records);

    // Apply trim
    const step1 = CleaningEngine.applyOperation(ds, 'trim_whitespace', 'status');
    assert(
      step1.updatedDataset.cleanedRecords[0].status === 'ONLINE',
      'Whitespace trimmed from string'
    );

    // Apply uppercase
    const step2 = CleaningEngine.applyOperation(step1.updatedDataset, 'standardize_case_upper', 'status');
    assert(
      step2.updatedDataset.cleanedRecords[1].status === 'ONLINE',
      'String casing normalized to uppercase'
    );
    assert(
      step2.updatedDataset.lineage.length === 2,
      'Both operations appended chronologically to lineage ledger'
    );
  }

  // TEST 5: Timestamp Normalization to ISO-8601
  {
    console.log('\n--- Test Suite 5: Timestamp Normalization ---');
    const records = [
      { ts: '2026/10/01 10:00:00', val: 1 },
      { ts: '10-01-2026 11:00:00', val: 2 },
    ];
    const ds = createTestDataset(records);

    const { updatedDataset } = CleaningEngine.applyOperation(
      ds,
      'normalize_date_iso',
      'ts',
      'Normalized timestamps to ISO-8601'
    );

    assert(
      updatedDataset.cleanedRecords[0].ts.includes('T') && updatedDataset.cleanedRecords[0].ts.endsWith('Z'),
      'First record normalized to standard ISO-8601 timestamp'
    );
  }

  // TEST 6: Configured Range Validation & Clamping
  {
    console.log('\n--- Test Suite 6: Configured Range Clamping ---');
    const records = [
      { temp: -50.0 }, // below min -40
      { temp: 25.0 },
      { temp: 95.0 },  // above max 80
    ];
    const ds = createTestDataset(records);

    const { updatedDataset, lineageRecord } = CleaningEngine.applyOperation(
      ds,
      'clamp_range',
      'temp',
      'Clamped sensor temperature to [-40, 80]',
      'Analyst',
      { min: -40, max: 80 }
    );

    assert(updatedDataset.cleanedRecords[0].temp === -40, 'Clamped minimum value to -40');
    assert(updatedDataset.cleanedRecords[2].temp === 80, 'Clamped maximum value to 80');
    assert(lineageRecord.affectedRowsCount === 2, 'Lineage recorded 2 affected rows');
  }

  // TEST 7: Outlier Detection & Capping (IQR Envelope)
  {
    console.log('\n--- Test Suite 7: Outlier Treatment (IQR Capping) ---');
    const records = [
      { val: 10 }, { val: 12 }, { val: 11 }, { val: 13 },
      { val: 12 }, { val: 14 }, { val: 11 }, { val: 13 },
      { val: 999 }, // Extreme outlier
    ];
    const ds = createTestDataset(records);

    const { updatedDataset } = CleaningEngine.applyOperation(
      ds,
      'cap_outliers_iqr',
      'val',
      'Winsorized extreme outlier via IQR'
    );

    assert(
      updatedDataset.cleanedRecords[8].val < 100,
      'Extreme outlier (999) capped to valid IQR boundary'
    );
  }

  // TEST 8: Destructive Operations Identification & Execution
  {
    console.log('\n--- Test Suite 8: Destructive Operations Approval Flag ---');
    assert(
      isDestructiveOperation('drop_missing_rows') === true,
      'drop_missing_rows flagged as destructive'
    );
    assert(
      isDestructiveOperation('drop_outliers') === true,
      'drop_outliers flagged as destructive'
    );
    assert(
      isDestructiveOperation('impute_median') === false,
      'impute_median flagged as non-destructive'
    );

    const records = [
      { id: 1, val: 10 },
      { id: 2, val: null },
      { id: 3, val: 30 },
    ];
    const ds = createTestDataset(records);

    const { updatedDataset, lineageRecord } = CleaningEngine.applyOperation(
      ds,
      'drop_missing_rows',
      'val',
      'Explicitly approved drop of incomplete rows'
    );

    assert(updatedDataset.rowCount === 2, 'Destructive operation dropped 1 row');
    assert(lineageRecord.isDestructive === true, 'Lineage record flagged isDestructive: true');
  }

  // TEST 9: Raw Data Preservation & Reversible Rollback
  {
    console.log('\n--- Test Suite 9: Raw Data Immutability & Undo Recovery ---');
    const records = [
      { id: 1, val: 10 },
      { id: 2, val: null },
      { id: 3, val: 30 },
    ];
    const ds = createTestDataset(records);
    const initialRawCount = ds.rawRecords.length;

    // Apply operation
    const transformed = CleaningEngine.applyOperation(ds, 'impute_median', 'val').updatedDataset;
    assert(
      transformed.rawRecords.length === initialRawCount,
      'Raw snapshot preserved intact after cleaning operation'
    );
    assert(
      transformed.rawRecords[1].val === null,
      'Raw snapshot contains pristine null value, uncorrupted'
    );

    // Rollback operation
    const undone = CleaningEngine.undoLastOperation(transformed);
    assert(undone !== null, 'undoLastOperation succeeded');
    assert(undone?.cleanedRecords[1].val === null, 'Dataset state restored to pristine null');
    assert(undone?.lineage.length === 0, 'Lineage reverted to baseline');
  }

  // TEST 10: Multi-step Lineage Versioning & Arbitrary Version Rollback
  {
    console.log('\n--- Test Suite 10: Multi-step Lineage Versioning & Arbitrary Version Rollback ---');
    const records = [
      { id: 1, val: 10, category: ' ALPHA ' },
      { id: 2, val: null, category: ' BETA ' },
      { id: 3, val: 30, category: ' GAMMA ' },
      { id: 4, val: null, category: ' DELTA ' },
    ];
    const ds = createTestDataset(records);

    // Step 1: Impute median
    const step1 = CleaningEngine.applyOperation(ds, 'impute_median', 'val');
    assert(step1.lineageRecord.beforeVersionId === 'v1.0.0-raw', 'Step 1 beforeVersionId is v1.0.0-raw');
    assert(step1.lineageRecord.afterVersionId === 'v1.1', 'Step 1 afterVersionId is v1.1');
    assert(step1.lineageRecord.changedCellsCount === 2, 'Step 1 recorded changedCellsCount: 2');
    assert(step1.lineageRecord.removedRowsCount === 0, 'Step 1 recorded removedRowsCount: 0');
    assert(step1.lineageRecord.isDestructive === false, 'Step 1 is non-destructive');

    // Step 2: Trim whitespace with params
    const step2 = CleaningEngine.applyOperation(
      step1.updatedDataset,
      'trim_whitespace',
      'category',
      'Standardize strings',
      'Lead Engineer',
      { preserveInternalSpaces: true }
    );
    assert(step2.lineageRecord.beforeVersionId === 'v1.1', 'Step 2 beforeVersionId is v1.1');
    assert(step2.lineageRecord.afterVersionId === 'v1.2', 'Step 2 afterVersionId is v1.2');
    assert(step2.lineageRecord.params?.preserveInternalSpaces === true, 'Step 2 stored custom params');
    assert(step2.updatedDataset.lineage.length === 2, 'Dataset now tracks 2 lineage records');

    // Step 3: Rollback to v1.1
    const rolledBackToV1_1 = CleaningEngine.rollbackToVersion(step2.updatedDataset, 'v1.1');
    assert(rolledBackToV1_1 !== null, 'rollbackToVersion to v1.1 succeeded');
    assert(rolledBackToV1_1?.lineage.length === 1, 'Lineage reduced back to 1 record after rollback');
    assert(
      rolledBackToV1_1?.cleanedRecords[0].category === ' ALPHA ',
      'Category whitespace reverted to untrimmed state at v1.1'
    );
    assert(
      rolledBackToV1_1?.cleanedRecords[1].val === 20,
      'Val median imputation preserved at v1.1'
    );

    // Step 4: Rollback to raw v1.0
    const rolledBackToRaw = CleaningEngine.rollbackToVersion(step2.updatedDataset, 'v1.0 (Raw)');
    assert(rolledBackToRaw !== null, 'rollbackToVersion to v1.0 (Raw) succeeded');
    assert(rolledBackToRaw?.lineage.length === 0, 'Lineage completely reset to 0');
    assert(
      rolledBackToRaw?.cleanedRecords[1].val === null,
      'Null value completely restored in cleanedRecords'
    );
    assert(
      rolledBackToRaw?.cleanedRecords.length === 4,
      'All original 4 rows present in raw state'
    );
  }

  // TEST 11: Export Cleaned Dataset with Transformation Summary
  {
    console.log('\n--- Test Suite 11: Cleaned Dataset Export with Transformation Summary ---');
    const records = [
      { id: 101, sensor_reading: 15.2, status: ' ACTIVE ' },
      { id: 102, sensor_reading: null, status: ' INACTIVE ' },
      { id: 103, sensor_reading: 25.8, status: ' ACTIVE ' },
    ];
    const ds = createTestDataset(records);

    // Apply transformation 1
    const t1 = CleaningEngine.applyOperation(ds, 'impute_mean', 'sensor_reading', 'Impute missing sensor with mean');
    // Apply transformation 2
    const t2 = CleaningEngine.applyOperation(t1.updatedDataset, 'trim_whitespace', 'status', 'Trim whitespace in status string');

    assert(t2.updatedDataset.lineage.length === 2, 'Dataset tracks 2 transformation steps');
    assert(t2.updatedDataset.cleanedRecords[1].sensor_reading === 20.5, 'Imputed mean correctly calculated as 20.5');
    assert(t2.updatedDataset.cleanedRecords[0].status === 'ACTIVE', 'Whitespace trimmed properly');

    // Verify metadata bundle structure
    const lineageSummary = t2.updatedDataset.lineage.map(lin => ({
      traceId: lin.traceId,
      operation: lin.operationType,
      methodName: lin.methodName,
      column: lin.columnName,
      beforeVersion: lin.beforeVersionId,
      afterVersion: lin.afterVersionId,
      changedCells: lin.changedCellsCount,
      removedRows: lin.removedRowsCount,
      destructive: lin.isDestructive,
    }));

    assert(lineageSummary.length === 2, 'Lineage summary has 2 records');
    // lineage is stored most-recent first: [t2, t1]
    assert(lineageSummary[1].changedCells === 1, 'First operation (t1) changed 1 cell');
    assert(lineageSummary[0].changedCells === 3, 'Second operation (t2) changed 3 cells');
    assert(lineageSummary[0].destructive === false, 'Non-destructive flagged accurately');
    assert(t2.updatedDataset.rawRecords[1].sensor_reading === null, 'Raw source remains pristine during export assembly');
  }

  console.log('\n=================================================================');
  console.log(`📊 CLEANING STUDIO TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCleaningStudioTests();
