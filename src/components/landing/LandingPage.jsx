import React, { useState } from 'react';
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
import RegistrationModal from './RegistrationModal';
import RiderSignupModal from './RiderSignupModal';
import Footer from './Footer';

export default function LandingPage({ onLaunchPOS, onOpenMerchantPortal, onOpenRiderPortal, onOpenMarketplace }) {
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [riderModalOpen, setRiderModalOpen] = useState(false);
  const [selectedInitialSlug, setSelectedInitialSlug] = useState('');

  const handleOpenStoreModal = (slug = '') => {
    setSelectedInitialSlug(slug);
    setStoreModalOpen(true);
  };

  const handleOpenRiderModal = () => {
    setRiderModalOpen(true);
  };

  const handleScrollToLiveDemo = () => {
    const el = document.querySelector('#live-demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-root">
      {/* Top Navigation */}
      <Navbar 
        onOpenStoreModal={() => handleOpenStoreModal()}
        onOpenRiderModal={handleOpenRiderModal}
        onOpenMarketplace={onOpenMarketplace}
      />

      {/* Hero Section with Network Visuals */}
      <HeroSection 
        onOpenStoreModal={handleOpenStoreModal}
        onOpenRiderModal={handleOpenRiderModal}
        onOpenLiveDemo={handleScrollToLiveDemo}
      />

      {/* 3-Sided Ecosystem Pillars */}
      <EcosystemPillars 
        onOpenStoreModal={handleOpenStoreModal}
        onOpenRiderModal={handleOpenRiderModal}
        onOpenMarketplace={onOpenMarketplace}
      />

      {/* Interactive Hands-on Sandbox & Live Dispatch Simulator */}
      <InteractiveLiveDemoWidget />

      {/* Subdomain Architecture & Edge DNS Resolver */}
      <SubdomainArchitectureSection 
        onOpenStoreModal={handleOpenStoreModal}
        onOpenRiderModal={handleOpenRiderModal}
      />

      {/* Interactive ROI / Savings & Rider Earnings Calculator */}
      <InteractiveCalculator 
        onOpenStoreModal={handleOpenStoreModal}
        onOpenRiderModal={handleOpenRiderModal}
      />

      {/* 3-Step Walkthrough */}
      <HowItWorksSteps 
        onOpenStoreModal={handleOpenStoreModal}
      />

      {/* Social Proof & Case Studies */}
      <TestimonialsSection />

      {/* Transparent Pricing Plans */}
      <PricingSection 
        onOpenStoreModal={handleOpenStoreModal}
        onOpenRiderModal={handleOpenRiderModal}
      />

      {/* Frequently Asked Questions */}
      <FAQSection />

      {/* Footer */}
      <Footer 
        onOpenStoreModal={handleOpenStoreModal}
        onOpenRiderModal={handleOpenRiderModal}
        onOpenMarketplace={onOpenMarketplace}
      />

      {/* Interactive Modals */}
      <RegistrationModal 
        isOpen={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        initialSlug={selectedInitialSlug}
        onOpenMerchantPortal={onOpenMerchantPortal}
      />

      <RiderSignupModal 
        isOpen={riderModalOpen}
        onClose={() => setRiderModalOpen(false)}
        onOpenRiderPortal={onOpenRiderPortal}
      />
    </div>
  );
}
