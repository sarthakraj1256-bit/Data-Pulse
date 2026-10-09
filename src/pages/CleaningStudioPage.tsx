import React, { useState } from 'react';
import {
  Wand2,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  GitBranch,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  Info,
  Check
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { CleaningEngine } from '../services/cleaningEngine';
import { CleaningRecommendation, CleaningOperationType } from '../types';

interface CleaningStudioPageProps {
  navigate: (path: string) => void;
}

export const CleaningStudioPage: React.FC<CleaningStudioPageProps> = ({ navigate }) => {
  const { currentDataset, applyCleaningOperation, undoCleaningOperation } = useDataset();
  const [selectedRec, setSelectedRec] = useState<CleaningRecommendation | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    affectedCount: number;
    sampleBefore: string[];
    sampleAfter: string[];
  } | null>(null);
  const [customReason, setCustomReason] = useState('');

  if (!currentDataset) {
    return (
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-10 text-center max-w-xl mx-auto">
        <Wand2 className="w-12 h-12 text-[#641B32] mx-auto mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#3D1023]">No Active Dataset</h2>
        <p className="text-xs text-[#756772] mt-1 mb-6">
          Please select or upload a dataset to run interactive cleaning operations.
        </p>
        <button
          onClick={() => navigate('/app/datasets')}
          className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold"
        >
          Open Dataset Library
        </button>
      </div>
    );
  }

  const recommendations = CleaningEngine.generateRecommendations(currentDataset);

  const handleOpenPreview = (rec: CleaningRecommendation) => {
    setSelectedRec(rec);
    const { affectedCount, sampleBefore, sampleAfter } = CleaningEngine.previewOperation(
      currentDataset.cleanedRecords,
      rec.method,
      rec.column
    );
    setPreviewData({ affectedCount, sampleBefore, sampleAfter });
    setCustomReason(`Remediated ${rec.issueType} on ${rec.column || 'dataset'} via ${rec.method}`);
    setPreviewModalOpen(true);
  };

  const handleApply = () => {
    if (!selectedRec) return;
    applyCleaningOperation(selectedRec.method, selectedRec.column, customReason);
    setPreviewModalOpen(false);
    setSelectedRec(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Cleaning Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Human-in-the-loop transformations with immutable raw preservation for{' '}
            <strong className="text-[#641B32]">{currentDataset.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => undoCleaningOperation()}
            disabled={currentDataset.lineage.length === 0}
            className="px-4 py-2 rounded-xl bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#F8EFE5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Last Action</span>
          </button>
          <button
            onClick={() => navigate('/app/lineage')}
            className="px-4 py-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#3D1023] font-semibold text-xs hover:bg-[#FFF8EF] transition-colors flex items-center gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>View Lineage Ledger ({currentDataset.lineage.length})</span>
          </button>
        </div>
      </div>

      {/* Human-in-the-Loop Process Banner */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[#641B32] font-bold">WORKFLOW:</span>
          <span className="text-[#29212A]">Detect</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#641B32] font-semibold">Recommend</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#29212A]">Review</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#277A58] font-semibold">Apply</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#29212A]">Validate</span>
          <span className="text-[#D9A0AE]">→</span>
          <span className="text-[#641B32] font-bold">Record Trace</span>
        </div>
        <div className="text-[11px] text-[#756772]">
          Current Score: <strong className="text-[#641B32]">{currentDataset.qualityAssessment.overallScore}%</strong>
        </div>
      </div>

      {/* Recommended Cleaning Operations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg text-[#3D1023] flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#641B32]" />
            Algorithmic Cleaning Recommendations ({recommendations.length})
          </h2>
          <span className="text-xs text-[#756772]">
            Deterministic rules based on 6-dimension evaluation
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-[#277A58]/5 border border-[#277A58]/20 rounded-2xl p-8 text-center text-xs text-[#277A58] space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <h3 className="font-bold text-sm">All Recommended Operations Complete</h3>
            <p className="text-[#756772] max-w-md mx-auto">
              No further automated cleaning actions are pending. The dataset conforms to all configured quality constraints.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(rec => (
              <div
                key={rec.id}
                className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-5 hover:border-[#641B32]/40 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] font-bold">
                      {rec.issueType}
                    </span>
                    <span className="text-[10px] font-mono text-[#277A58] font-bold">
                      {rec.confidence}% Confidence
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#29212A] mb-1">{rec.title}</h3>
                  <p className="text-xs text-[#756772] leading-relaxed mb-4">
                    {rec.description}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#756772] bg-[#F8EFE5] p-2 rounded-lg mb-4">
                    <span>Target: <strong>{rec.column || 'Whole table'}</strong></span>
                    <span>•</span>
                    <span>Affected: <strong>{rec.affectedCount} rows</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#D9A0AE]/20 flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => handleOpenPreview(rec)}
                    className="px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold hover:bg-[#3D1023] transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review & Preview</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review & Apply Modal */}
      {previewModalOpen && selectedRec && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D1023]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9A0AE]/30">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#641B32]" />
                <h3 className="font-serif font-bold text-lg text-[#3D1023]">
                  Review Transformation Action
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#641B32]/10 text-[#641B32] font-bold">
                {selectedRec.method}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#F8EFE5] rounded-xl space-y-1">
                <div className="font-bold text-[#29212A]">{selectedRec.title}</div>
                <div className="text-[#756772]">{selectedRec.description}</div>
                <div className="pt-1 text-[#641B32] font-mono text-[11px]">
                  Impacts {previewData.affectedCount} record(s) in '{selectedRec.column || 'entire dataset'}'
                </div>
              </div>

              {/* Before vs After Sample Diffs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#FFF8EF] border border-[#B4233D]/20 rounded-xl">
                  <span className="font-mono text-[10px] font-bold text-[#B4233D] block mb-1">
                    BEFORE TRANSFORMATION:
                  </span>
                  <div className="font-mono text-[11px] text-[#29212A] space-y-0.5">
                    {previewData.sampleBefore.map((s, i) => (
                      <div key={i} className="truncate">• {s}</div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[#FFF8EF] border border-[#277A58]/20 rounded-xl">
                  <span className="font-mono text-[10px] font-bold text-[#277A58] block mb-1">
                    AFTER TRANSFORMATION:
                  </span>
                  <div className="font-mono text-[11px] text-[#29212A] space-y-0.5">
                    {previewData.sampleAfter.map((s, i) => (
                      <div key={i} className="truncate">• {s}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Justification / Audit Reason */}
              <div>
                <label className="block text-xs font-semibold text-[#29212A] mb-1">
                  Audit Trace Reason (Preserved in DP-XXXXXX ledger)
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] focus:outline-none focus:border-[#641B32]"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#756772]">
                <ShieldCheck className="w-4 h-4 text-[#277A58] shrink-0" />
                <span>Original raw data remains preserved in immutable snapshot. Operation can be undone anytime.</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-4 border-t border-[#D9A0AE]/30 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#D9A0AE]/40 font-semibold text-[#756772] hover:bg-[#F8EFE5]"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold hover:bg-[#3D1023] transition-all flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Apply Transformation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
