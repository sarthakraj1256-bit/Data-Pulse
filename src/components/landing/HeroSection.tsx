import React, { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Database, Wand2, GitBranch, AlertTriangle } from 'lucide-react';

interface HeroSectionProps {
  navigate: (path: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ navigate }) => {
  const [activeStep, setActiveStep] = useState<number>(2); // 0 to 5

  const steps = [
    { key: 'COLLECT', label: 'Collect', desc: 'CSV, XLSX & JSON ingestion with immutable raw snapshots' },
    { key: 'PROFILE', label: 'Profile', desc: 'Automated type inference and distribution baselines' },
    { key: 'CLEAN', label: 'Clean', desc: 'Human-in-the-loop imputation and outlier harmonization' },
    { key: 'VALIDATE', label: 'Validate', desc: 'Deterministic 6-dimension algorithmic rules' },
    { key: 'TRACE', label: 'Trace', desc: 'Granular DP-xxxxxx audit lineage for every changed cell' },
    { key: 'ANALYZE', label: 'Analyze', desc: 'Distributions, correlations, and experimental forecasting' },
  ];

  return (
    <section className="relative pt-12 pb-20 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#D9A0AE]/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Editorial Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#641B32] text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#B94B68]" />
          <span>Full-Stack Data Quality & Traceability Platform</span>
        </div>

        {/* Main Heading */}
        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#3D1023] leading-[1.08] max-w-4xl mx-auto">
          Raw Data. <br className="hidden sm:inline" />
          <span className="text-[#641B32] italic font-serif">Refined Into Trust.</span>
        </h1>

        {/* Supporting text */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-[#756772] max-w-2xl mx-auto leading-relaxed">
          Discover data-quality issues, clean with confidence, and understand every transformation before your data drives a decision.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-sm hover:bg-[#3D1023] hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <span>Explore DataPulse</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('workflow');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#F8EFE5] text-[#3D1023] border border-[#D9A0AE]/50 font-bold text-sm hover:bg-[#FFF8EF] hover:border-[#641B32]/40 transition-colors"
          >
            See How It Works
          </button>
        </div>

        {/* Compact Workflow Bar */}
        <div id="workflow" className="mt-16 pt-8 border-t border-[#D9A0AE]/30 max-w-4xl mx-auto">
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#756772] mb-4">
            Unified Traceability Lifecycle
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {steps.map((st, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  key={st.key}
                  onClick={() => setActiveStep(idx)}
                  className={`p-2.5 rounded-xl text-center border transition-all ${
                    isSelected
                      ? 'bg-[#641B32] border-[#3D1023] text-[#FFF8EF] shadow-md scale-102'
                      : 'bg-[#F8EFE5] border-[#D9A0AE]/30 text-[#756772] hover:bg-[#FFF8EF] hover:text-[#29212A]'
                  }`}
                >
                  <div className="text-[10px] font-mono opacity-80">{idx + 1}</div>
                  <div className="font-bold text-xs">{st.label}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[#756772] italic">
            {steps[activeStep].label}: {steps[activeStep].desc}
          </p>
        </div>

        {/* Live Interactive UI Preview Card */}
        <div className="mt-12 text-left bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-3xl p-4 sm:p-6 shadow-xl max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-[#D9A0AE]/30 gap-2">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#B4233D]" />
              <span className="w-3 h-3 rounded-full bg-[#B77722]" />
              <span className="w-3 h-3 rounded-full bg-[#277A58]" />
              <span className="font-mono text-xs text-[#756772] ml-2 font-medium">
                telemetry_sample.csv • Quality Profile
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#277A58]/10 text-[#277A58] font-bold border border-[#277A58]/20">
                Score: 94 / 100
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#641B32]/10 text-[#641B32] font-semibold border border-[#641B32]/20">
                Trace ID: DP-000184
              </span>
            </div>
          </div>

          {/* Interactive Inspection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#756772] mb-1">
                Completeness
              </div>
              <div className="text-xl font-bold text-[#277A58]">98.2%</div>
              <div className="text-[10px] text-[#756772] mt-1">
                1 missing humidity cell imputed via median (46.2%)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#756772] mb-1">
                Plausibility
              </div>
              <div className="text-xl font-bold text-[#277A58]">96.0%</div>
              <div className="text-[10px] text-[#756772] mt-1">
                1 extreme outlier flagged (189.5°C vs 85.0°C limit)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#756772] mb-1">
                Uniqueness
              </div>
              <div className="text-xl font-bold text-[#277A58]">100%</div>
              <div className="text-[10px] text-[#756772] mt-1">
                Redundant duplicate row tuple #5 eliminated
              </div>
            </div>
          </div>

          {/* Audit Trace Snippet */}
          <div className="bg-[#F8EFE5] rounded-xl p-3 border border-[#D9A0AE]/30 font-mono text-[11px] space-y-1">
            <div className="text-[#641B32] font-bold flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span>[AUDIT TRACE] Why did DataPulse transform this record?</span>
            </div>
            <div className="text-[#29212A]">
              • Row #3 [humidity_pct]: (null) → 46.2% | Reason: Median imputation across valid class subset
            </div>
            <div className="text-[#29212A]">
              • Row #5: Exact duplicate eliminated | Trace: DP-000185
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
