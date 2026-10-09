import React from 'react';
import { BookOpen, ExternalLink, ShieldAlert, Award } from 'lucide-react';

export const ResearchSection: React.FC = () => {
  const citations = [
    {
      authors: 'Wang, R. Y., & Strong, D. M.',
      year: '1996',
      title: 'Beyond Accuracy: What Data Quality Means to Data Consumers',
      journal: 'Journal of Management Information Systems, 12(4), 5–33',
      doiUrl: 'https://doi.org/10.1080/07421222.1996.11518099',
      relevance: 'Foundational framework establishing multidimensional data quality taxonomy beyond mere scalar correctness.',
    },
    {
      authors: 'Batini, C., Cappiello, C., Francalanci, C., & Maurino, A.',
      year: '2009',
      title: 'Methodologies for Data Quality Assessment and Improvement',
      journal: 'ACM Computing Surveys, 41(3), 1–52',
      doiUrl: 'https://doi.org/10.1145/1541880.1541883',
      relevance: 'Systematic comparison of algorithmic profiling techniques for completeness, consistency, and deduplication.',
    },
    {
      authors: 'International Organization for Standardization',
      year: '2008',
      title: 'ISO/IEC 25012:2008 — Software product Quality Requirements and Evaluation (SQuaRE) — Data Quality Model',
      journal: 'ISO Standards Catalogue',
      doiUrl: 'https://www.iso.org/standard/35736.html',
      relevance: 'Standard definition of inherent and system-dependent data quality characteristics: validity, accuracy, and credibility.',
    },
  ];

  return (
    <section id="research" className="py-20 bg-[#FFF8EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-[#641B32]" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#641B32]">
            Methodology & Scientific Foundations
          </span>
        </div>

        <h2 className="font-serif text-3xl font-bold text-[#3D1023] mb-4">
          Peer-Reviewed Foundations & Academic Grounding
        </h2>

        <p className="text-sm text-[#756772] leading-relaxed mb-8">
          DataPulse does not treat data cleaning as an ad-hoc heuristic. Our 6-dimension evaluation matrix is grounded in peer-reviewed data quality literature and standardized ISO engineering models.
        </p>

        {/* Scientific Honesty Notice Banner */}
        <div className="mb-10 p-5 rounded-2xl bg-[#F8EFE5] border-l-4 border-[#B77722] border-t border-r border-b border-[#D9A0AE]/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#B77722] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-[#29212A]">Scientific Honesty Protocol</h4>
              <p className="text-[#756772] leading-relaxed">
                The current public demonstration runs on a <strong>controlled synthetic telemetry benchmark</strong> with engineered edge cases (nulls, duplicates, IQR outliers, timestamp jumps). In-situ physical ESP32 sensor ingestion and live MQTT broker pipelines are marked as <strong>Planned Roadmap</strong>. DataPulse never fabricates live sensor readings or claims production-grade accuracy without verified physical calibration.
              </p>
            </div>
          </div>
        </div>

        {/* Citations List */}
        <div className="space-y-4">
          {citations.map((cite, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#F8EFE5]/60 border border-[#D9A0AE]/30 hover:border-[#641B32]/30 transition-all text-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-[#29212A]">
                    {cite.authors} ({cite.year}). <span className="italic font-serif">"{cite.title}"</span>. {cite.journal}.
                  </div>
                  <div className="text-[#756772] text-[11px] pt-1">
                    <span className="font-medium text-[#641B32]">DataPulse Integration:</span> {cite.relevance}
                  </div>
                </div>

                <a
                  href={cite.doiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] hover:bg-[#641B32] hover:text-[#FFF8EF] transition-all flex items-center gap-1 font-mono text-[10px] shrink-0"
                >
                  <span>DOI</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
