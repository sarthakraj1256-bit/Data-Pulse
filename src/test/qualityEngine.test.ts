import { QualityEngine } from '../services/qualityEngine';
import { profileColumns } from '../services/dataEngine';
import { ColumnProfile, QualityConfigSettings } from '../types';

/**
 * Deterministic Test Suite for DataPulse Data Quality Engine
 * 
 * Verifies mathematical formulas, edge cases, anomaly distinction,
 * and deterministic scoring across all Six Core Quality Dimensions.
 */

function runQualityEngineTests() {
  console.log('=================================================================');
  console.log('🧪 Starting DataPulse Deterministic Quality Engine Tests');
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

  // TEST 1: Entirely Complete, Valid, and Clean Dataset (with timestamps & bounds)
  {
    console.log('--- Test Suite 1: Entirely Complete & Pristine Dataset ---');
    const records = [
      { timestamp: '2026-10-01T10:00:00Z', device_id: 'DEV-01', temperature: 20.5, status: 'ONLINE' },
      { timestamp: '2026-10-01T10:05:00Z', device_id: 'DEV-02', temperature: 21.0, status: 'ONLINE' },
      { timestamp: '2026-10-01T10:10:00Z', device_id: 'DEV-03', temperature: 21.5, status: 'ONLINE' },
      { timestamp: '2026-10-01T10:15:00Z', device_id: 'DEV-04', temperature: 22.0, status: 'ONLINE' },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns);

    assert(assessment.overallScore === 100, 'Clean dataset has 100% overall score', `Actual: ${assessment.overallScore}`);
    assert(assessment.dimensionScores.completeness.score === 100, 'Completeness is 100%');
    assert(assessment.dimensionScores.validity.score === 100, 'Validity is 100%');
    assert(assessment.dimensionScores.uniqueness.score === 100, 'Uniqueness is 100%');
    assert(assessment.dimensionScores.consistency.score === 100, 'Consistency is 100%');
    assert(assessment.dimensionScores.timeliness.score === 100, 'Timeliness is 100%');
    assert(assessment.issues.length === 0, 'Clean dataset produces 0 quality issues');
    assert(assessment.cleanRowsCount === 4, 'All 4 rows are clean');
    assert(assessment.problematicRowsCount === 0, '0 problematic rows');
  }

  // TEST 2: Missing Values & Completeness Formula
  {
    console.log('\n--- Test Suite 2: Missing Values & Completeness Calculation ---');
    // 5 rows, 2 columns = 10 cells. Exactly 3 missing values.
    const records = [
      { id: '1', score: 10 },
      { id: '2', score: null },        // 1 missing
      { id: '',  score: 30 },          // 1 missing (empty string)
      { id: '4', score: undefined },   // 1 missing
      { id: '5', score: 50 },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns);

    // Expected: totalCells = 10, missing = 3. Completeness = (10 - 3) / 10 * 100 = 70%
    assert(assessment.dimensionScores.completeness.score === 70, 'Completeness score is exactly 70%', `Actual: ${assessment.dimensionScores.completeness.score}`);
    assert(assessment.dimensionScores.completeness.numerator === 7, 'Numerator is 7 cells');
    assert(assessment.dimensionScores.completeness.denominator === 10, 'Denominator is 10 cells');
    assert(assessment.dimensionScores.completeness.defectCount === 3, 'Defect count is 3');
    assert(assessment.issues.some(i => i.dimension === 'completeness' && i.column === 'score'), 'Flags completeness issue on score column');
    assert(assessment.issues.some(i => i.dimension === 'completeness' && i.column === 'id'), 'Flags completeness issue on id column');
  }

  // TEST 3: Duplicate Records & Uniqueness Formula
  {
    console.log('\n--- Test Suite 3: Duplicate Records & Uniqueness Calculation ---');
    // 5 rows, row 1 and row 2 are identical, row 3 and row 4 are identical.
    const records = [
      { sensor: 'A', val: 100 },
      { sensor: 'A', val: 100 }, // duplicate 1
      { sensor: 'B', val: 200 },
      { sensor: 'B', val: 200 }, // duplicate 2
      { sensor: 'C', val: 300 },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns);

    // Expected: 5 rows, 2 duplicate instances. Uniqueness = (5 - 2) / 5 * 100 = 60%
    assert(assessment.dimensionScores.uniqueness.score === 60, 'Uniqueness score is exactly 60%', `Actual: ${assessment.dimensionScores.uniqueness.score}`);
    assert(assessment.dimensionScores.uniqueness.numerator === 3, 'Uniqueness numerator is 3 rows');
    assert(assessment.dimensionScores.uniqueness.denominator === 5, 'Uniqueness denominator is 5 rows');
    assert(assessment.duplicateRowCount === 2, 'Duplicate row count is 2');
    assert(assessment.issues.some(i => i.dimension === 'uniqueness'), 'Flags uniqueness duplicate records issue');
  }

  // TEST 4: Invalid Types, Parser Constraints & No Double Penalization
  {
    console.log('\n--- Test Suite 4: Invalid Types & Non-Double-Penalization ---');
    // Numeric column with 4 non-null entries, 1 is corrupt string "ERR_99".
    // Also 1 null entry to verify nulls are NOT counted as invalid type defects.
    const records = [
      { code: 'A', value: 10 },
      { code: 'B', value: 20 },
      { code: 'C', value: 'ERR_99' }, // invalid numeric
      { code: 'D', value: null },     // null cell (should be penalized in completeness, not validity)
      { code: 'E', value: 40 },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns);

    // In validity:
    // Non-null evaluated cells in typed column 'value' = 4 cells (10, 20, 'ERR_99', 40).
    // Invalid = 1 ('ERR_99').
    // Validity score = (4 - 1) / 4 * 100 = 75%
    const valDim = assessment.dimensionScores.validity;
    assert(valDim.score === 75, 'Validity score is 75% (3 of 4 populated typed cells)', `Actual: ${valDim.score}`);
    assert(valDim.numerator === 3, 'Validity numerator is 3');
    assert(valDim.denominator === 4, 'Validity denominator is 4');
    assert(valDim.defectCount === 1, 'Exactly 1 invalid type defect');
    assert(assessment.issues.some(i => i.dimension === 'validity' && i.column === 'value'), 'Flags validity issue on value column');
  }

  // TEST 5: Consistency (Casing Fragmentation & Untrimmed Whitespace)
  {
    console.log('\n--- Test Suite 5: Consistency (Casing & Whitespace) ---');
    const records = [
      { status: 'ONLINE' },
      { status: 'online' },      // casing variant
      { status: '  ONLINE  ' },  // untrimmed whitespace
      { status: 'OFFLINE' },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns);

    const conDim = assessment.dimensionScores.consistency;
    assert(conDim.status === 'assessed', 'Consistency is assessed');
    assert(conDim.score < 100, 'Consistency score is penalized', `Actual: ${conDim.score}`);
    assert(assessment.issues.some(i => i.id.includes('trim')), 'Detects untrimmed whitespace issue');
    assert(assessment.issues.some(i => i.id.includes('case')), 'Detects letter casing fragmentation issue');
  }

  // TEST 6: Plausibility (Domain Bound Violations vs Statistical Anomalies)
  {
    console.log('\n--- Test Suite 6: Plausibility & Anomaly Distinction ---');
    const settings: QualityConfigSettings = {
      completenessThreshold: 95,
      outlierIqrMultiplier: 1.5,
      maxGapSeconds: 300,
      customPlausibilityRules: [
        { column: 'temp_c', min: -40, max: 80 }
      ]
    };
    const records = [
      { temp_c: 22.0 },
      { temp_c: 23.5 },
      { temp_c: 195.0 }, // Violates max 80 (Confirmed defect: isAnomaly = false)
      { temp_c: 24.0 },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns, settings);

    const plausDim = assessment.dimensionScores.plausibility;
    assert(plausDim.status === 'assessed', 'Plausibility is assessed');
    assert(plausDim.score === 75, 'Plausibility score is 75% (3/4 valid)', `Actual: ${plausDim.score}`);
    const plausIssue = assessment.issues.find(i => i.dimension === 'plausibility');
    assert(plausIssue !== undefined, 'Found plausibility issue');
    assert(plausIssue?.isAnomaly === false, 'Explicit domain rule violation is marked as confirmed Rule Violation (isAnomaly: false)');
  }

  // TEST 7: Timeliness & Non-Applicable Dimension Handling
  {
    console.log('\n--- Test Suite 7: Timeliness & Honest Not-Applicable Score ---');
    // Dataset WITHOUT any timestamp column
    const nonTemporalRecords = [
      { sku: 'A1', price: 10 },
      { sku: 'A2', price: 20 },
      { sku: 'A3', price: 30 },
    ];
    const columnsNoTime = profileColumns(nonTemporalRecords);
    const assessmentNoTime = QualityEngine.assessQuality(nonTemporalRecords, columnsNoTime);

    const timeDim = assessmentNoTime.dimensionScores.timeliness;
    assert(timeDim.status === 'not_applicable', 'Timeliness status is not_applicable when no timestamp exists');
    assert(timeDim.evaluated === false, 'Timeliness evaluated is false');
    assert(timeDim.score === 0, 'Unassessed timeliness score is NOT falsely awarded 100%', `Actual: ${timeDim.score}`);
    assert(!assessmentNoTime.includedDimensions?.includes('timeliness'), 'Timeliness is excluded from overall score aggregation');

    // Dataset WITH timestamp reversals and gaps
    const temporalRecords = [
      { timestamp: '2026-10-01T10:00:00Z', val: 1 },
      { timestamp: '2026-10-01T09:00:00Z', val: 2 }, // Reversal (Confirmed defect)
      { timestamp: '2026-10-01T23:00:00Z', val: 3 }, // 14-hour gap (Potential anomaly)
    ];
    const columnsWithTime = profileColumns(temporalRecords);
    const assessmentWithTime = QualityEngine.assessQuality(temporalRecords, columnsWithTime);

    const timeDimWithTime = assessmentWithTime.dimensionScores.timeliness;
    assert(timeDimWithTime.status === 'assessed', 'Timeliness is assessed when timestamp column present');
    assert(timeDimWithTime.score < 100, 'Timeliness is penalized for order reversal and gap', `Actual: ${timeDimWithTime.score}`);
    assert(assessmentWithTime.issues.some(i => i.dimension === 'timeliness' && i.isAnomaly === false), 'Order reversal marked as confirmed defect');
    assert(assessmentWithTime.issues.some(i => i.dimension === 'timeliness' && i.isAnomaly === true), 'Large interval gap marked as potential anomaly');
  }

  // TEST 8: Empty Datasets (0 Rows, 0 Columns)
  {
    console.log('\n--- Test Suite 8: Empty Dataset Edge Case ---');
    const emptyRecords: Record<string, any>[] = [];
    const emptyColumns: ColumnProfile[] = [];
    const emptyAssessment = QualityEngine.assessQuality(emptyRecords, emptyColumns);

    assert(emptyAssessment.overallScore === 0, 'Empty dataset overall score is 0');
    assert(emptyAssessment.totalRows === 0, 'Total rows is 0');
    assert(emptyAssessment.cleanRowsCount === 0, 'Clean rows count is 0');
    assert(emptyAssessment.problematicRowsCount === 0, 'Problematic rows count is 0');
    assert(Object.values(emptyAssessment.dimensionScores).every(d => d.status === 'not_applicable'), 'All dimensions are marked not_applicable');
    assert(emptyAssessment.includedDimensions?.length === 0, '0 included dimensions');
  }

  // TEST 9: Mixed and Unsupported Types
  {
    console.log('\n--- Test Suite 9: Mixed & Unsupported Types ---');
    const records = [
      { mixed: 'valid_str', flag: true, num: 42 },
      { mixed: 12345,       flag: 'invalid_bool', num: 'NaN' },
      { mixed: null,        flag: false, num: 88 },
    ];
    const columns = profileColumns(records);
    const assessment = QualityEngine.assessQuality(records, columns);

    assert(assessment.overallScore > 0 && assessment.overallScore < 100, 'Handled mixed types deterministically', `Score: ${assessment.overallScore}`);
    assert(assessment.issues.length > 0, 'Flagged invalid boolean and NaN');
  }

  // TEST 10: Deterministic Output Consistency (Same Dataset = Same Result)
  {
    console.log('\n--- Test Suite 10: Deterministic Idempotence Consistency ---');
    const records = [
      { id: '1', val: 10, ts: '2026-10-01T10:00:00Z', cat: 'TEST' },
      { id: '2', val: 20, ts: '2026-10-01T10:05:00Z', cat: 'test' },
      { id: '3', val: null, ts: '2026-10-01T10:10:00Z', cat: 'TEST' },
    ];
    const columns = profileColumns(records);

    const run1 = QualityEngine.assessQuality(records, columns);
    const run2 = QualityEngine.assessQuality(records, columns);
    const run3 = QualityEngine.assessQuality(records, columns);

    assert(run1.overallScore === run2.overallScore && run2.overallScore === run3.overallScore, 'Overall scores match across repeated evaluations');
    assert(run1.issues.length === run2.issues.length && run2.issues.length === run3.issues.length, 'Issue counts match across repeated evaluations');
    assert(JSON.stringify(run1.dimensionScores) === JSON.stringify(run2.dimensionScores), 'Dimension scores match identically across repeated evaluations');
  }

  console.log('\n=================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQualityEngineTests();
