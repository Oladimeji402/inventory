import React from 'react';
import './LandingPage.css';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import EcosystemPillars from './EcosystemPillars';
import InteractiveLiveDemoWidget from './InteractiveLiveDemoWidget';
import SubdomainArchitectureSection from './SubdomainArchitectureSection';
import InteractiveCalculator from './InteractiveCalculator';
import HowItWorksSteps from './HowItWorksSteps';
import TestimonialsSection from './TestimonialsSection';
import PricingSection from './PricingSection';
import FAQSection from './FAQSection';
import Footer from './Footer';

export default function LandingPage() {
  const handleScrollToLiveDemo = () => {
    document.querySelector('#live-demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page-root">
      <Navbar />
      <HeroSection onOpenLiveDemo={handleScrollToLiveDemo} />
      <EcosystemPillars />
      <InteractiveLiveDemoWidget />
      <SubdomainArchitectureSection />
      <InteractiveCalculator />
      <HowItWorksSteps />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
