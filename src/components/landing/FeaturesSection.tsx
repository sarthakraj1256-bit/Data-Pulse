import React from 'react';
import {
  FileSpreadsheet,
  Cpu,
  Fingerprint,
  SlidersHorizontal,
  History,
  TrendingUp,
  Radio,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Clock,
  Gauge
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const dimensions = [
    {
      title: '1. Completeness',
      desc: 'Detects NULL, NaN, empty strings, and missing attributes. Accurately reports missing percentage by column.',
      icon: CheckCircle,
      badge: 'Core Metric',
    },
    {
      title: '2. Validity',
      desc: 'Verifies strict conformance to inferred data types, regex formats, and standard ISO timestamps.',
      icon: ShieldCheck,
      badge: 'Schema Integrity',
    },
    {
      title: '3. Consistency',
      desc: 'Flags contradictory categorical casing (ONLINE vs online), inconsistent units, and accidental whitespace.',
      icon: SlidersHorizontal,
      badge: 'Data Parity',
    },
    {
      title: '4. Uniqueness',
      desc: 'Identifies exact tuple duplication and redundant primary keys with transparent row indexing.',
      icon: Fingerprint,
      badge: 'Deduplication',
    },
    {
      title: '5. Timeliness',
      desc: 'Evaluates chronological monotonic ordering, unexpected gaps, and telemetry packet delays.',
      icon: Clock,
      badge: 'Temporal Check',
    },
    {
      title: '6. Plausibility',
      desc: 'Enforces domain physics boundaries and 1.5x IQR statistical envelopes to isolate true anomalies.',
      icon: Gauge,
      badge: 'Domain Guard',
    },
  ];

  const features = [
    {
      title: 'Multi-Format Ingestion Engine',
      desc: 'Native client-side parsing for CSV, XLSX workbooks, and structured JSON files with instant schema inference and file integrity validation.',
      icon: FileSpreadsheet,
    },
    {
      title: 'Immutable Raw Snapshots',
      desc: 'Original ingested bytes are immutably preserved in isolated storage. Cleaning operations create branched states that never overwrite raw truth.',
      icon: History,
    },
    {
      title: 'Interactive Cleaning Studio',
      desc: 'Human-in-the-loop workflow: Detect → Recommend → Review → Apply → Validate. Preview before/after values and undo transformations with 1 click.',
      icon: SlidersHorizontal,
    },
    {
      title: 'DP-XXXXXX Traceability Ledger',
      desc: 'Every altered record is assigned an immutable trace ID, recording the exact reason, original value, cleaning algorithm, and acting user.',
      icon: Fingerprint,
    },
    {
      title: 'Exploratory Statistical Analytics',
      desc: 'Real-time Pearson correlation matrix, dynamic histograms, box-plot IQR bounds, and missingness distribution visualizations.',
      icon: TrendingUp,
    },
    {
      title: 'IoT Telemetry Pipeline (Planned)',
      desc: 'Designed for upcoming ESP32 microcontroller streaming via MQTT (DHT22, capacitive moisture, BME280). Clear separation between planned and live hardware.',
      icon: Radio,
    },
  ];

  return (
    <section id="features" className="py-20 bg-[#F8EFE5]/50 border-t border-b border-[#D9A0AE]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#641B32]">
            Comprehensive Data Quality Architecture
          </span>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-[#3D1023]">
            Engineered for Precision & Traceability
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#756772]">
            Every feature is deterministic, accountable, and transparent. We eliminate the guesswork from data preparation.
          </p>
        </div>

        {/* 6 Dimensions Grid */}
        <div id="dimensions" className="mb-20">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#3D1023] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#641B32]" />
              The Six Algorithmic Quality Dimensions
            </h3>
            <span className="text-xs font-mono text-[#756772]">
              Deterministic Assessment Matrix
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dimensions.map(dim => {
              const Icon = dim.icon;
              return (
                <div
                  key={dim.title}
                  className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-6 hover:border-[#641B32]/40 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/30 flex items-center justify-center text-[#641B32]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D9A0AE]/20 text-[#641B32] font-semibold">
                      {dim.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-[#29212A] mb-2">{dim.title}</h4>
                  <p className="text-xs text-[#756772] leading-relaxed">{dim.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl p-6 transition-all hover:border-[#B94B68]/40"
              >
                <div className="w-10 h-10 rounded-xl bg-[#641B32]/10 border border-[#641B32]/20 flex items-center justify-center text-[#641B32] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-[#29212A] mb-2">{f.title}</h4>
                <p className="text-xs text-[#756772] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
