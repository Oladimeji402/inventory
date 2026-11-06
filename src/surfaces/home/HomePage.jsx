import { useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { BRAND } from '../../config/brand';
import { SmoothScroll } from './motion';
import { Bento, Faq, FinalCta, Footer, Hero, Marquee, Nav, PhotoBand, Pricing, Roles, Steps, Story, Trust } from './sections';
import './home.css';

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div className="hm-progress" style={{ scaleX }} aria-hidden="true" />;
}

export default function HomePage() {
  const reduce = useReducedMotion();

  useEffect(() => {
    document.title = `${BRAND.name} — the commerce network for your neighbourhood`;
  }, []);

  return (
    <SmoothScroll>
      <div className={`hm-root ${reduce ? 'reduce' : ''}`}>
        {!reduce && <ScrollProgress />}
        <Nav />
        <main>
          <Hero />
          <Marquee />
          <Story />
          <Bento />
          <PhotoBand />
          <Roles />
          <Steps />
          <Trust />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
