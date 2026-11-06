import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { motion, useReducedMotion } from 'framer-motion';

/* ── premium smooth scrolling (Lenis) ─────────────────────────────────────── */
const ScrollContext = createContext({ scrollTo: () => {} });
export const useSmoothScroll = () => useContext(ScrollContext);

export function SmoothScroll({ children }) {
  const reduce = useReducedMotion();
  const lenisRef = useRef(null);

  useEffect(() => {
    // Native scrolling is already smooth enough in tests, and is what reduced-motion users asked for.
    if (reduce || import.meta.env.MODE === 'test') return undefined;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduce]);

  const scrollTo = useCallback((target, options = {}) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -72, duration: 1.4, ...options });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [reduce]);

  const value = useMemo(() => ({ scrollTo }), [scrollTo]);
  return <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>;
}

/* ── reveal on scroll ─────────────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1];

export function Reveal({ children, delay = 0, y = 28, as = 'div', className, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Headline that rises in word by word. */
export function SplitWords({ text, className, delay = 0, as = 'h1', accent = [] }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.h1;
  const words = text.split(' ');
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
        <span className="hm-word" aria-hidden="true">
          <motion.span
            className={`hm-word-inner${accent.includes(word.replace(/[^\w]/g, '')) ? ' hm-accent' : ''}`}
            initial={reduce ? false : { y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1, delay: delay + i * 0.06, ease: EASE }}
          >
            {word}
          </motion.span>
        </span>
        {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  );
}

/** Counts up from 0 once it scrolls into view. */
export function CountUp({ to, prefix = '', suffix = '', duration = 1.6 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setValue(to);
      return undefined;
    }
    const el = ref.current;
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / (duration * 1000));
        setValue(Math.round(to * (1 - Math.pow(1 - t, 4))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    if (el) observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration, reduce]);

  return <span ref={ref}>{prefix}{value.toLocaleString('en-NG')}{suffix}</span>;
}

/** Spotlight that follows the pointer across a card (sets --mx / --my for CSS). */
export function useSpotlight() {
  return useMemo(() => ({
    onPointerMove: (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }
  }), []);
}

export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}
