import React from 'react';
import { FlaskConical, Github, Shield, Heart } from 'lucide-react';

interface LandingFooterProps {
  navigate: (path: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-[#3D1023] text-[#FFF8EF] border-t border-[#641B32]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#641B32] flex items-center justify-center text-[#FFF8EF] border border-[#D9A0AE]/20">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-lg tracking-tight">DataPulse</span>
            </div>
            <p className="text-xs text-[#D9A0AE] leading-relaxed">
              From Raw Data to Trusted Intelligence. Transforming heterogeneous datasets into validated, traceable analytics.
            </p>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#D9A0AE] font-bold">
              Product Suite
            </h4>
            <ul className="space-y-2 text-xs text-[#FFF8EF]/80">
              <li>
                <button onClick={() => navigate('/signup')} className="hover:text-[#FFF8EF] transition-colors">
                  Ingestion Studio
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/signup')} className="hover:text-[#FFF8EF] transition-colors">
                  Quality Profiler (6 Dimensions)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/signup')} className="hover:text-[#FFF8EF] transition-colors">
                  DP-Traceability Ledger
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/signup')} className="hover:text-[#FFF8EF] transition-colors">
                  Experimental Prediction
                </button>
              </li>
            </ul>
          </div>

          {/* Methodological Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#D9A0AE] font-bold">
              Standards & Integrity
            </h4>
            <ul className="space-y-2 text-xs text-[#FFF8EF]/80">
              <li>Wang & Strong Taxonomy</li>
              <li>ISO/IEC 25012:2008 Conformity</li>
              <li>Deterministic Algorithmic Rules</li>
              <li>Zero Silent Modifications</li>
              <li>Immutable Raw Snapshots</li>
            </ul>
          </div>

          {/* Team & Integrity */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#D9A0AE] font-bold">
              Platform Governance
            </h4>
            <p className="text-xs text-[#D9A0AE] leading-relaxed">
              DataPulse is built with client-side cryptographic isolation. Data processing executes deterministically on the client node without external telemetry egress.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#277A58]">
              <span className="w-2 h-2 rounded-full bg-[#277A58]" />
              <span>Security & Sandboxing Active</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#641B32] flex flex-col sm:flex-row items-center justify-between text-xs text-[#D9A0AE]/80 gap-4">
          <p>© {new Date().getFullYear()} DataPulse Research Team. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="hover:text-[#FFF8EF] transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} className="hover:text-[#FFF8EF] transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
