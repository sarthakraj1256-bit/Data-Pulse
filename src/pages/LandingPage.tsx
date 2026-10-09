import React from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { ResearchSection } from '../components/landing/ResearchSection';
import { LandingFooter } from '../components/landing/LandingFooter';

interface LandingPageProps {
  navigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#29212A] flex flex-col">
      <LandingNavbar navigate={navigate} />
      <main className="flex-1">
        <HeroSection navigate={navigate} />
        <FeaturesSection />
        <ResearchSection />
      </main>
      <LandingFooter navigate={navigate} />
    </div>
  );
};
