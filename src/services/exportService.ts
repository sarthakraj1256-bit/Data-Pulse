import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Dataset, PredictionResult } from '../types';

export const ExportService = {
  downloadCSV(records: Record<string, any>[], filename: string): void {
    const csv = Papa.unparse(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadJSON(data: any, filename: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadXLSX(records: Record<string, any>[], filename: string): void {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleaned Data');
    XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  },

  // Exports the cleaned dataset along with a comprehensive transformation summary as CSV
  downloadCleanedDatasetWithSummaryCSV(dataset: Dataset): void {
    const sections: string[] = [];

    // Header Metadata
    sections.push('=== DATAPULSE CLEANED DATASET EXPORT ===');
    sections.push(`Dataset Name,${dataset.name}`);
    sections.push(`Original Source File,${dataset.fileName}`);
    sections.push(`Current Version,${dataset.lineage.length > 0 ? dataset.lineage[dataset.lineage.length - 1].afterVersionId : 'v1.0.0-raw'}`);
    sections.push(`Exported Cleaned Rows,${dataset.cleanedRecords.length}`);
    sections.push(`Raw Ingest Rows,${dataset.rawRecords.length}`);
    sections.push(`Active Quality Score,${dataset.qualityAssessment.overallScore}%`);
    sections.push(`Export Timestamp,${new Date().toISOString()}`);
    sections.push('');

    // Transformation Summary
    sections.push('=== SESSION TRANSFORMATION AUDIT SUMMARY ===');
    sections.push('Trace ID,Operation,Target Column,Before Version,After Version,Changed Cells,Removed Rows,Destructive,Validation,Actor,Timestamp,Reason');
    if (dataset.lineage.length === 0) {
      sections.push('N/A,Pristine Raw State,None,v1.0.0-raw,v1.0.0-raw,0,0,NO,NEUTRAL,System,N/A,"No transformations applied (pristine raw data)"');
    } else {
      dataset.lineage.forEach(lin => {
        const valOutcome = (lin.validationOutcome || 'neutral').toUpperCase();
        sections.push(
          `${lin.traceId},${lin.methodName},${lin.columnName || 'ALL'},${lin.beforeVersionId || 'N/A'},${lin.afterVersionId || 'N/A'},${lin.changedCellsCount ?? (lin.isDestructive ? 0 : lin.affectedRowsCount)},${lin.removedRowsCount ?? (lin.isDestructive ? lin.affectedRowsCount : 0)},${lin.isDestructive ? 'YES' : 'NO'},${valOutcome},${lin.performedBy},${lin.timestamp},"${lin.reason.replace(/"/g, '""')}"`
        );
      });
    }
    sections.push('');

    // Cleaned Records Table
    sections.push('=== FINAL CLEANED DATA RECORDS ===');
    const recordsCsv = Papa.unparse(dataset.cleanedRecords);
    sections.push(recordsCsv);

    const csvContent = sections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DataPulse_${dataset.name.replace(/\s+/g, '_')}_cleaned.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Exports the cleaned dataset bundled with full transformation audit metadata as JSON
  downloadCleanedDatasetWithSummaryJSON(dataset: Dataset): void {
    const exportBundle = {
      exportMetadata: {
        application: 'DataPulse',
        exportType: 'Cleaned Dataset with Audit Trace',
        exportTimestamp: new Date().toISOString(),
        datasetId: dataset.id,
        datasetName: dataset.name,
        originalFileName: dataset.fileName,
        version: dataset.lineage.length > 0 ? dataset.lineage[dataset.lineage.length - 1].afterVersionId : 'v1.0.0-raw',
        overallQualityScore: dataset.qualityAssessment.overallScore,
        rawRowCount: dataset.rawRecords.length,
        cleanedRowCount: dataset.cleanedRecords.length,
        columnCount: dataset.columnCount,
        transformationCount: dataset.lineage.length,
      },
      transformationsSummary: dataset.lineage.map(lin => ({
        traceId: lin.traceId,
        operationType: lin.operationType,
        methodName: lin.methodName,
        columnName: lin.columnName ?? null,
        beforeVersionId: lin.beforeVersionId,
        afterVersionId: lin.afterVersionId,
        changedCellsCount: lin.changedCellsCount ?? (lin.isDestructive ? 0 : lin.affectedRowsCount),
        removedRowsCount: lin.removedRowsCount ?? (lin.isDestructive ? lin.affectedRowsCount : 0),
        isDestructive: lin.isDestructive,
        validationOutcome: lin.validationOutcome,
        params: lin.params ?? null,
        reason: lin.reason,
        performedBy: lin.performedBy,
        timestamp: lin.timestamp,
      })),
      qualityDimensionScores: dataset.qualityAssessment.dimensionScores,
      cleanedRecords: dataset.cleanedRecords,
    };

    this.downloadJSON(exportBundle, `DataPulse_${dataset.name.replace(/\s+/g, '_')}_cleaned.json`);
  },

  // Generates complete Analysis Insights & Predictive Model Summary as formatted CSV
  downloadAnalysisInsightsCSV(dataset: Dataset, predictionResult?: PredictionResult | null): void {
    const sections: string[] = [];

    // Header & Meta
    sections.push('=== DATAPULSE EXECUTIVE ANALYSIS & PREDICTION INSIGHTS ===');
    sections.push(`Dataset Name,${dataset.name}`);
    sections.push(`Original File,${dataset.fileName} (${(dataset.fileSize / 1024).toFixed(1)} KB)`);
    sections.push(`File Type,${dataset.fileType.toUpperCase()}`);
    sections.push(`Total Rows,${dataset.rowCount}`);
    sections.push(`Total Columns,${dataset.columnCount}`);
    sections.push(`Composite Quality Score,${dataset.qualityAssessment.overallScore}%`);
    sections.push(`Export Timestamp,${new Date().toISOString()}`);
    sections.push('');

    // Six Dimensions Evaluation
    sections.push('=== 6 QUALITY DIMENSIONS BENCHMARK ===');
    sections.push('Dimension,Score,Evaluated,Issues Count,Affected Rows,Benchmark Rule');
    Object.values(dataset.qualityAssessment.dimensionScores).forEach(dim => {
      sections.push(
        `${dim.dimension.toUpperCase()},${dim.evaluated ? `${dim.score}%` : 'N/E'},${dim.evaluated ? 'YES' : 'NO'},${dim.issuesCount},${dim.affectedRowsCount},"${dim.benchmarkRule.replace(/"/g, '""')}"`
      );
    });
    sections.push('');

    // Feature Descriptive Statistics
    sections.push('=== NUMERICAL ATTRIBUTES DISTRIBUTION ===');
    sections.push('Column,Type,Null %,Min,Median,Mean,Max,Std Dev,Unique Count');
    dataset.columns.forEach(col => {
      sections.push(
        `${col.name},${col.inferredType},${col.nullPercentage}%,${col.min ?? 'N/A'},${col.median ?? 'N/A'},${col.mean ?? 'N/A'},${col.max ?? 'N/A'},${col.stdDev ?? 'N/A'},${col.uniqueCount}`
      );
    });
    sections.push('');

    // Itemized Quality Issues
    sections.push('=== ACTIVE DETECTED DEFECTS ===');
    sections.push('Severity,Dimension,Target Column,Affected Rows,Description,Recommended Method');
    if (dataset.qualityAssessment.issues.length === 0) {
      sections.push('CLEAN,None,None,0,Zero active defects detected,None');
    } else {
      dataset.qualityAssessment.issues.forEach(iss => {
        sections.push(
          `${iss.severity.toUpperCase()},${iss.dimension},${iss.column || 'ALL'},${iss.affectedRowsCount},"${iss.description.replace(/"/g, '""')}",${iss.recommendedMethod}`
        );
      });
    }
    sections.push('');

    // Transformation Lineage Audit
    sections.push('=== DATA TRANSFORMATION TRACE LEDGER ===');
    sections.push('Trace ID,Method,Column,Affected Rows,Score Shift,Actor,Timestamp,Reason');
    if (dataset.lineage.length === 0) {
      sections.push('N/A,Original Raw State,None,0,Unchanged,N/A,N/A,Immutable snapshot preserved');
    } else {
      dataset.lineage.forEach(lin => {
        sections.push(
          `${lin.traceId},${lin.methodName},${lin.columnName || 'ALL'},${lin.affectedRowsCount},${lin.scoreBefore}% -> ${lin.scoreAfter}%,${lin.performedBy},${lin.timestamp},"${lin.reason.replace(/"/g, '""')}"`
        );
      });
    }
    sections.push('');

    // Predictive Model Insights (if executed)
    if (predictionResult) {
      sections.push('=== EXPERIMENTAL PREDICTIVE MODEL SUMMARY ===');
      sections.push(`Model Architecture,${predictionResult.config.modelType}`);
      sections.push(`Target Feature,${predictionResult.config.targetColumn}`);
      sections.push(`Train Split Ratio,${Math.round(predictionResult.config.trainSplitRatio * 100)}%`);
      sections.push(`Training Rows,${predictionResult.trainSize}`);
      sections.push(`Testing Rows,${predictionResult.testSize}`);
      sections.push(`Mean Absolute Error (MAE),${predictionResult.metrics.mae}`);
      sections.push(`Root Mean Squared Error (RMSE),${predictionResult.metrics.rmse}`);
      sections.push(`Coefficient of Determination (R2),${predictionResult.metrics.r2}`);
      sections.push(`Explained Variance,${predictionResult.metrics.explainedVariance}%`);
      sections.push(`Methodological Caveat,"${predictionResult.scientificCaveat.replace(/"/g, '""')}"`);
      sections.push('');

      if (predictionResult.forecastFuture && predictionResult.forecastFuture.length > 0) {
        sections.push('=== EXTRAPOLATED FORECAST STEPS ===');
        sections.push('Step,Projected Value,95% Lower Bound,95% Upper Bound');
        predictionResult.forecastFuture.forEach(f => {
          sections.push(`+${f.step},${f.predictedValue},${f.lowerBound},${f.upperBound}`);
        });
      }
    }

    const csvContent = sections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DataPulse_Analysis_Insights_${dataset.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Generates clean multi-page PDF document using jsPDF
  downloadQualityAuditPDF(dataset: Dataset, predictionResult?: PredictionResult | null): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    // Header burgundy accent block
    doc.setFillColor(100, 27, 50); // #641B32 Deep Burgundy
    doc.rect(0, 0, pageWidth, 8, 'F');

    // Title & Brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(61, 16, 35); // #3D1023
    doc.text('DATAPULSE', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(117, 103, 114); // #756772
    doc.text('FROM RAW DATA TO TRUSTED INTELLIGENCE', margin, y + 5);

    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, y + 2, { align: 'right' });
    doc.text('CONFIDENTIAL QUALITY AUDIT', pageWidth - margin, y + 6, { align: 'right' });

    y += 14;
    doc.setDrawColor(217, 160, 174); // #D9A0AE
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Section 1: Dataset Overview
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(100, 27, 50);
    doc.text('1. Dataset Overview & Composite Score', margin, y);
    y += 6;

    // Overview Card box
    doc.setFillColor(248, 239, 229); // #F8EFE5
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(41, 33, 42);
    doc.text(dataset.name, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(117, 103, 114);
    doc.text(`File: ${dataset.fileName} (${(dataset.fileSize / 1024).toFixed(1)} KB, ${dataset.fileType.toUpperCase()})`, margin + 4, y + 11);
    doc.text(`Rows: ${dataset.rowCount} (Raw: ${dataset.rawRecords.length}) • Columns: ${dataset.columnCount}`, margin + 4, y + 16);
    doc.text(`Benchmark Type: ${dataset.isSynthetic ? 'Controlled Synthetic Benchmark' : 'User Submitted Asset'}`, margin + 4, y + 21);

    // Score badge
    const score = dataset.qualityAssessment.overallScore;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    if (score >= 90) doc.setTextColor(39, 122, 88);
    else if (score >= 70) doc.setTextColor(183, 119, 34);
    else doc.setTextColor(180, 35, 61);

    doc.text(`${score}%`, pageWidth - margin - 6, y + 12, { align: 'right' });
    doc.setFontSize(7.5);
    doc.setTextColor(117, 103, 114);
    doc.text('Composite Score', pageWidth - margin - 6, y + 18, { align: 'right' });

    y += 30;

    // Section 2: Six Quality Dimensions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(100, 27, 50);
    doc.text('2. Algorithmic Quality Dimensions (6-D Matrix)', margin, y);
    y += 6;

    // Dimensions Table Header
    doc.setFillColor(240, 225, 230);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(61, 16, 35);
    doc.text('Dimension', margin + 3, y + 4.2);
    doc.text('Score', margin + 42, y + 4.2);
    doc.text('Status', margin + 62, y + 4.2);
    doc.text('Issues', margin + 85, y + 4.2);
    doc.text('Evaluation Criteria', margin + 105, y + 4.2);
    y += 6;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const dims = Object.values(dataset.qualityAssessment.dimensionScores);

    dims.forEach((d, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(255, 248, 239);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }

      doc.setTextColor(41, 33, 42);
      doc.text(d.dimension.toUpperCase(), margin + 3, y + 4.2);
      doc.text(d.evaluated ? `${d.score}%` : 'N/E', margin + 42, y + 4.2);

      if (!d.evaluated) {
        doc.setTextColor(117, 103, 114);
        doc.text('Unassessed', margin + 62, y + 4.2);
      } else if (d.score >= 90) {
        doc.setTextColor(39, 122, 88);
        doc.text('Passed', margin + 62, y + 4.2);
      } else {
        doc.setTextColor(180, 35, 61);
        doc.text('Defects Found', margin + 62, y + 4.2);
      }

      doc.setTextColor(41, 33, 42);
      doc.text(String(d.issuesCount), margin + 85, y + 4.2);
      doc.setTextColor(117, 103, 114);
      const critText = d.benchmarkRule.length > 45 ? d.benchmarkRule.substring(0, 42) + '...' : d.benchmarkRule;
      doc.text(critText, margin + 105, y + 4.2);

      y += 6;
    });

    y += 6;

    // Section 3: Data Transformation Lineage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(100, 27, 50);
    doc.text('3. Data Transformation Audit Ledger', margin, y);
    y += 6;

    if (dataset.lineage.length === 0) {
      doc.setFillColor(248, 239, 229);
      doc.roundedRect(margin, y, contentWidth, 12, 1, 1, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(117, 103, 114);
      doc.text('No cleaning operations have been applied to this dataset. It remains in raw state.', margin + 4, y + 7);
      y += 18;
    } else {
      // Lineage Table
      doc.setFillColor(240, 225, 230);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(61, 16, 35);
      doc.text('Trace ID', margin + 3, y + 4.2);
      doc.text('Method', margin + 30, y + 4.2);
      doc.text('Target', margin + 68, y + 4.2);
      doc.text('Affected', margin + 98, y + 4.2);
      doc.text('Score Shift', margin + 120, y + 4.2);
      doc.text('Timestamp', margin + 148, y + 4.2);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      dataset.lineage.slice(0, 6).forEach((lin, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(255, 248, 239);
          doc.rect(margin, y, contentWidth, 5.5, 'F');
        }

        doc.setTextColor(100, 27, 50);
        doc.text(lin.traceId, margin + 3, y + 3.8);
        doc.setTextColor(41, 33, 42);
        doc.text(lin.methodName.substring(0, 18), margin + 30, y + 3.8);
        doc.text((lin.columnName || 'ALL').substring(0, 14), margin + 68, y + 3.8);
        doc.text(`${lin.affectedRowsCount} rows`, margin + 98, y + 3.8);
        doc.setTextColor(39, 122, 88);
        doc.text(`${lin.scoreBefore}% -> ${lin.scoreAfter}%`, margin + 120, y + 3.8);
        doc.setTextColor(117, 103, 114);
        doc.text(new Date(lin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), margin + 148, y + 3.8);

        y += 5.5;
      });
      y += 6;
    }

    // Section 4: Predictive Model Insights (if executed)
    if (predictionResult) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(100, 27, 50);
      doc.text('4. Experimental Predictive Model Summary', margin, y);
      y += 6;

      doc.setFillColor(248, 239, 229);
      doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(41, 33, 42);
      doc.text(`Model: ${predictionResult.config.modelType.toUpperCase()} • Target: ${predictionResult.config.targetColumn}`, margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(117, 103, 114);
      doc.text(`MAE: ${predictionResult.metrics.mae}  |  RMSE: ${predictionResult.metrics.rmse}  |  R²: ${predictionResult.metrics.r2}  |  Variance: ${predictionResult.metrics.explainedVariance}%`, margin + 4, y + 11);
      doc.text(`Temporal Split: ${predictionResult.trainSize} train / ${predictionResult.testSize} test rows (Zero Data Leakage)`, margin + 4, y + 16.5);
      y += 28;
    }

    // Scientific Honesty Disclaimer footer on page
    const footerY = doc.internal.pageSize.getHeight() - 16;
    doc.setDrawColor(217, 160, 174);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(117, 103, 114);
    doc.text(
      'Scientific Honesty Protocol: DataPulse scores represent deterministic rule compliance. Predicted values are experimental.',
      margin,
      footerY
    );
    doc.text(
      'ISO/IEC 25012:2008 & Wang-Strong Grounded • Page 1 of 1',
      pageWidth - margin,
      footerY,
      { align: 'right' }
    );

    doc.save(`DataPulse_Quality_Audit_${dataset.name.replace(/\s+/g, '_')}.pdf`);
  },

  generateQualityReportMarkdown(dataset: Dataset): string {
    const q = dataset.qualityAssessment;
    const now = new Date().toISOString();

    let text = `# DATAPULSE — EXECUTIVE DATA QUALITY AUDIT REPORT\n`;
    text += `*Generated: ${now}*\n\n`;
    text += `## 1. DATASET OVERVIEW\n`;
    text += `- **Dataset Name:** ${dataset.name}\n`;
    text += `- **Original File:** ${dataset.fileName} (${(dataset.fileSize / 1024).toFixed(1)} KB, ${dataset.fileType.toUpperCase()})\n`;
    text += `- **Ingestion Date:** ${new Date(dataset.createdAt).toLocaleString()}\n`;
    text += `- **Row Count (Cleaned):** ${dataset.rowCount} rows (Raw: ${dataset.rawRecords.length} rows)\n`;
    text += `- **Column Count:** ${dataset.columnCount} columns\n`;
    text += `- **Synthetic Benchmark Label:** ${dataset.isSynthetic ? 'SYNTHETIC TEST BENCHMARK' : 'USER SUBMITTED'}\n\n`;

    text += `## 2. QUALITY DIMENSION EVALUATION\n`;
    text += `| Dimension | Score | Evaluated | Issues Found | Benchmark Criteria |\n`;
    text += `|---|---|---|---|---|\n`;
    for (const [key, dim] of Object.entries(q.dimensionScores)) {
      text += `| **${key.toUpperCase()}** | ${dim.evaluated ? `${dim.score}%` : 'N/E'} | ${dim.evaluated ? 'Yes' : 'No'} | ${dim.issuesCount} | ${dim.benchmarkRule} |\n`;
    }
    text += `\n**Overall Quality Score:** ${q.overallScore} / 100\n\n`;

    text += `## 3. IDENTIFIED QUALITY ISSUES\n`;
    if (q.issues.length === 0) {
      text += `No active quality defects detected across the six evaluated dimensions.\n\n`;
    } else {
      q.issues.forEach((issue, idx) => {
        text += `### Issue ${idx + 1}: ${issue.description} [${issue.severity.toUpperCase()}]\n`;
        text += `- **Dimension:** ${issue.dimension}\n`;
        text += `- **Target Column:** ${issue.column ?? 'Whole row tuple'}\n`;
        text += `- **Affected Rows:** ${issue.affectedRowsCount}\n`;
        text += `- **Technical Explanation:** ${issue.explanation}\n`;
        text += `- **Recommended Fix:** ${issue.recommendedFix}\n\n`;
      });
    }

    text += `## 4. APPLIED TRANSFORMATIONS (DATA LINEAGE AUDIT)\n`;
    if (dataset.lineage.length === 0) {
      text += `No cleaning operations have been applied to this dataset yet. It remains in raw ingested state.\n\n`;
    } else {
      text += `| Trace ID | Operation | Target Column | Affected Rows | Performed By | Timestamp |\n`;
      text += `|---|---|---|---|---|---|\n`;
      dataset.lineage.forEach(item => {
        text += `| \`${item.traceId}\` | ${item.methodName} | ${item.columnName ?? 'All'} | ${item.affectedRowsCount} | ${item.performedBy} | ${new Date(item.timestamp).toLocaleString()} |\n`;
      });
      text += `\n`;
    }

    text += `## 5. SCIENTIFIC HONESTY & METHODOLOGICAL LIMITATIONS\n`;
    text += `- A quality score of 100% does not imply objective omniscience or absolute ground truth; it confirms adherence to configured deterministic rules.\n`;
    text += `- Flagged plausibility outliers may represent authentic physical anomalies or extreme environmental occurrences rather than sensor corruption.\n`;
    text += `- Any predictive evaluations derived from this dataset represent experimental validation on controlled held-out splits and are not certified for production automated dispatch.\n`;

    return text;
  },

  downloadQualityReport(dataset: Dataset): void {
    const content = this.generateQualityReportMarkdown(dataset);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DataPulse_Quality_Audit_${dataset.name.replace(/\s+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
