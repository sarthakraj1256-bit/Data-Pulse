import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  X,
  FlaskConical
} from 'lucide-react';
import { DataEngine, ParseResult } from '../services/dataEngine';
import { useDataset } from '../context/DatasetContext';

interface UploadPageProps {
  navigate: (path: string) => void;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB documented limit

export const UploadPage: React.FC<UploadPageProps> = ({ navigate }) => {
  const { saveNewDataset, loadSyntheticBenchmark } = useDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const [datasetName, setDatasetName] = useState('');
  const [datasetDesc, setDatasetDesc] = useState('');

  const handleFile = async (file: File) => {
    setParseError(null);

    // Validate size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setParseError(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 20 MB processing limit.`);
      return;
    }

    // Determine type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'json', 'xlsx', 'xls'].includes(ext || '')) {
      setParseError('Unsupported file format. Please upload a standard CSV, XLSX, or JSON file.');
      return;
    }

    setParsing(true);
    try {
      let result: ParseResult;
      if (ext === 'csv') {
        result = await DataEngine.parseCSV(file);
      } else if (ext === 'json') {
        result = await DataEngine.parseJSON(file);
      } else {
        result = await DataEngine.parseXLSX(file);
      }

      setParseResult(result);
      setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
      setDatasetDesc(`Ingested from ${file.name} (${(file.size / 1024).toFixed(1)} KB) on ${new Date().toLocaleDateString()}`);
    } catch (err: any) {
      setParseError(err?.message || 'Failed to parse file. Ensure contents conform to standard syntax.');
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult) return;
    const newDs = saveNewDataset(datasetName, datasetDesc, parseResult);
    navigate(`/app/datasets/${newDs.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
          Ingest & Profile Dataset
        </h1>
        <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
          Upload raw heterogeneous data. DataPulse creates an immutable raw snapshot and executes deterministic 6-dimension quality checks.
        </p>
      </div>

      {/* Upload Box / Drag & Drop */}
      {!parseResult ? (
        <div className="space-y-6">
          <div
            onDragEnter={e => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={e => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition-all bg-[#F8EFE5]/40 ${
              dragActive
                ? 'border-[#641B32] bg-[#F8EFE5] scale-[1.01]'
                : 'border-[#D9A0AE]/50 hover:border-[#641B32]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-[#FFF8EF] border border-[#D9A0AE]/30 flex items-center justify-center text-[#641B32] mx-auto mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#3D1023] mb-1">
              Drag & Drop your dataset here
            </h3>
            <p className="text-xs text-[#756772] max-w-sm mx-auto mb-6">
              Supported formats: <strong className="text-[#29212A]">CSV</strong>,{' '}
              <strong className="text-[#29212A]">XLSX</strong>, or{' '}
              <strong className="text-[#29212A]">JSON</strong> (Maximum size: 20 MB).
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="px-6 py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all shadow-md disabled:opacity-50"
            >
              {parsing ? 'Parsing and profiling...' : 'Browse Local Files'}
            </button>
          </div>

          {parseError && (
            <div className="p-4 rounded-xl bg-[#B4233D]/10 border border-[#B4233D]/30 flex items-start gap-3 text-xs text-[#B4233D]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ingestion Error: </span>
                {parseError}
              </div>
            </div>
          )}

          {/* Quick Benchmark Alternative */}
          <div className="p-5 rounded-2xl bg-[#FFF8EF] border border-[#D9A0AE]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F8EFE5] text-[#641B32]">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#29212A]">
                  Don't have a dataset ready?
                </h4>
                <p className="text-[11px] text-[#756772]">
                  Instantly load our controlled synthetic IoT telemetry benchmark with engineered anomalies.
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                const ds = await loadSyntheticBenchmark();
                navigate(`/app/datasets/${ds.id}`);
              }}
              className="px-4 py-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#FFF8EF] transition-colors shrink-0"
            >
              Load Synthetic Benchmark
            </button>
          </div>
        </div>
      ) : (
        /* Preview and Confirm Ingestion */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#D9A0AE]/30 mb-5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#277A58]" />
                <h3 className="font-serif font-bold text-base text-[#3D1023]">
                  File Successfully Parsed
                </h3>
              </div>
              <button
                onClick={() => setParseResult(null)}
                className="text-xs text-[#756772] hover:text-[#B4233D] flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span>Discard & Re-upload</span>
              </button>
            </div>

            {/* Ingestion Meta Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-6">
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/20">
                <span className="text-[10px] text-[#756772] uppercase font-mono block">Filename</span>
                <span className="font-bold text-[#29212A] truncate block">{parseResult.fileName}</span>
              </div>
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/20">
                <span className="text-[10px] text-[#756772] uppercase font-mono block">Format & Size</span>
                <span className="font-bold text-[#29212A] uppercase font-mono">
                  {parseResult.fileType} • {(parseResult.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/20">
                <span className="text-[10px] text-[#756772] uppercase font-mono block">Rows</span>
                <span className="font-bold text-[#29212A] font-mono">{parseResult.rowCount}</span>
              </div>
              <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#D9A0AE]/20">
                <span className="text-[10px] text-[#756772] uppercase font-mono block">Columns</span>
                <span className="font-bold text-[#29212A] font-mono">{parseResult.columnCount}</span>
              </div>
            </div>

            {/* Dataset naming inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#29212A] mb-1">
                  Dataset Display Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#29212A] mb-1">
                  Description / Context (Optional)
                </label>
                <input
                  type="text"
                  value={datasetDesc}
                  onChange={e => setDatasetDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32]"
                />
              </div>
            </div>

            {/* Inferred Schema Pill List */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-[#29212A] uppercase tracking-wider mb-2">
                Inferred Schema Attributes
              </h4>
              <div className="flex flex-wrap gap-2">
                {parseResult.columns.map(c => (
                  <div
                    key={c.name}
                    className="px-2.5 py-1 bg-[#FFF8EF] rounded-lg border border-[#D9A0AE]/30 text-xs flex items-center gap-1.5 font-mono"
                  >
                    <span className="font-semibold text-[#29212A]">{c.name}</span>
                    <span className="text-[10px] text-[#641B32] uppercase">({c.inferredType})</span>
                    {c.nullCount > 0 && (
                      <span className="text-[9px] px-1 bg-[#B4233D]/10 text-[#B4233D] rounded font-sans">
                        {c.nullCount} nulls
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation CTA */}
            <div className="pt-4 border-t border-[#D9A0AE]/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setParseResult(null)}
                className="px-4 py-2.5 rounded-xl border border-[#D9A0AE]/40 text-xs font-semibold text-[#756772] hover:bg-[#FFF8EF]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center gap-2 shadow-sm"
              >
                <span>Save Immutable Snapshot & Run Checks</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
