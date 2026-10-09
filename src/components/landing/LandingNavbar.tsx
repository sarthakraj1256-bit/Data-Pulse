import React, { useState } from 'react';
import { FlaskConical, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LandingNavbarProps {
  navigate: (path: string) => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Product', href: '#workflow' },
    { label: 'Features', href: '#features' },
    { label: 'Six Dimensions', href: '#dimensions' },
    { label: 'Research', href: '#research' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFF8EF]/85 backdrop-blur-md border-b border-[#D9A0AE]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#641B32] to-[#3D1023] flex items-center justify-center text-[#FFF8EF] shadow-md group-hover:scale-105 transition-transform">
            <FlaskConical className="w-5 h-5 text-[#FFF8EF]" />
          </div>
          <div>
            <span className="font-serif font-extrabold text-xl tracking-tight text-[#3D1023]">
              DataPulse
            </span>
            <span className="block text-[10px] font-mono tracking-widest uppercase text-[#756772] -mt-1">
              Raw Data → Trusted Intelligence
            </span>
          </div>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link.href)}
              className="text-xs uppercase tracking-wider font-semibold text-[#756772] hover:text-[#641B32] transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop CTA actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/app')}
              className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-all flex items-center gap-2 shadow-sm"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-xs font-bold text-[#641B32] hover:text-[#3D1023] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-5 py-2.5 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-all flex items-center gap-2 shadow-sm"
              >
                <span>Start Exploring</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[#641B32] hover:bg-[#F8EFE5]"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#D9A0AE]/30 bg-[#FFF8EF] px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-2">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.href)}
                className="w-full text-left py-2 text-sm font-semibold text-[#29212A] hover:text-[#641B32]"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#D9A0AE]/30 flex flex-col gap-2.5">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="w-full py-3 rounded-xl bg-[#641B32] text-[#FFF8EF] text-center text-sm font-bold shadow-sm"
              >
                Go to Workspace
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 text-center text-sm font-bold text-[#641B32] border border-[#641B32]/30 rounded-xl"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-2.5 text-center text-sm font-bold bg-[#641B32] text-[#FFF8EF] rounded-xl shadow-sm"
                >
                  Start Exploring
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
