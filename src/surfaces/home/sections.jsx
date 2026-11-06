import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform
} from 'framer-motion';
import {
  AlertCircle, ArrowRight, ArrowUpRight, BadgeCheck, Bike, Check, CheckCircle2, Eye, Lock, Menu, Minus, Plus,
  ShieldCheck, ShoppingBag, Store, WifiOff, X
} from 'lucide-react';
import { appLinks } from '../../config/surfaces';
import { BRAND } from '../../config/brand';
import { checkStoreSlug } from '../../lib/slugAvailability';
import { saveIntendedSlug } from '../../lib/intendedSlug';
import { slugifyStoreName } from '../../lib/merchantConstants';
import { Reveal, SplitWords, useMediaQuery, useSmoothScroll, useSpotlight } from './motion';
import {
  DashboardCard, OfflineMini, Phone, RiderScreen, RidesScreen, SecureMini, ShopScreen, StockMini, StorefrontMini, VerifiedMini
} from './mockups';

const IMG = {
  okada: '/images/home/rider-okada.jpg',
  motion: '/images/home/rider-motion.jpg',
  shopkeeper: '/images/home/shopkeeper.jpg',
  market: '/images/home/lagos-market.jpg',
  shopper: '/images/home/shopper.jpg',
  interior: '/images/home/shop-interior.jpg'
};

/* ── claim-a-store-address form (used in the hero and the closing call to action) ── */
const CLAIM_COPY = {
  available: (slug) => <><strong>{slug}.{BRAND.domain}</strong> is free right now — not held until you finish store setup.</>,
  taken: (slug) => <><strong>{slug}.{BRAND.domain}</strong> is already in use. Try another name.</>,
  reserved: (slug) => <><strong>{slug}</strong> is reserved. Pick a store name customers will recognise.</>,
  invalid: () => 'Use 2–30 letters, numbers, or hyphens. Don’t start or end with a hyphen.',
  error: (message) => message || 'Couldn’t check that address right now. Try again.'
};

function ClaimForm({ id, dark = true }) {
  const [subdomain, setSubdomain] = useState('');
  const [claim, setClaim] = useState(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const slug = slugifyStoreName(subdomain);
    setSubdomain(slug);
    setChecking(true);
    setClaim(null);
    const result = await checkStoreSlug(slug);
    setChecking(false);
    setClaim(result);
    if (result.status === 'available') saveIntendedSlug(result.slug);
  };

  return (
    <div className={`hm-claim ${dark ? 'dark' : ''}`}>
      <form className="hm-claim-form" onSubmit={submit}>
        <span className="hm-claim-prefix">https://</span>
        <input
          id={id}
          aria-label="Your store name"
          className="hm-claim-input"
          type="text"
          placeholder="your-store"
          value={subdomain}
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setSubdomain(e.target.value); setClaim(null); }}
        />
        <span className="hm-claim-suffix">.{BRAND.domain}</span>
        <button type="submit" className="hm-claim-btn" disabled={checking || !subdomain.trim()}>
          {checking ? 'Checking…' : 'Claim Free URL'}
        </button>
      </form>
      {claim && (
        <div className={`hm-claim-result ${claim.status === 'available' ? 'ok' : 'bad'}`} role="status">
          {claim.status === 'available' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>
            {claim.status === 'available' && CLAIM_COPY.available(claim.slug)}
            {claim.status === 'taken' && CLAIM_COPY.taken(claim.slug)}
            {claim.status === 'reserved' && CLAIM_COPY.reserved(claim.slug)}
            {claim.status === 'invalid' && CLAIM_COPY.invalid()}
            {claim.status === 'error' && CLAIM_COPY.error(claim.error)}
          </span>
          {claim.status === 'available' && <a href={appLinks.merchantSignup(claim.slug)}>Register now →</a>}
        </div>
      )}
    </div>
  );
}

/* ── navigation ─────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' }
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (event, href) => {
    if (!href.startsWith('#')) return;
    event.preventDefault();
    setOpen(false);
    scrollTo(href);
  };

  return (
    <header className={`hm-nav ${scrolled || open ? 'solid' : ''}`}>
      <div className="hm-container hm-nav-in">
        <a className="hm-logo" href={appLinks.marketing()} aria-label={`${BRAND.name} home`}>
          <span className="hm-logo-mark"><ShoppingBag size={16} /></span>
          <span>{BRAND.name}</span>
        </a>
        <nav className="hm-nav-links" aria-label="Main">
          {NAV_LINKS.map((l) => <a key={l.label} href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>)}
          <a href={appLinks.shop()}>Shop</a>
          <a href={appLinks.rides()}>Rides</a>
        </nav>
        <div className="hm-nav-cta">
          <a className="hm-link" href={appLinks.merchantLogin()}>Sign in</a>
          <a className="hm-btn hm-btn-primary hm-btn-sm" href={appLinks.start()}>Get started</a>
          <button type="button" className="hm-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="hm-sheet" aria-label="Mobile" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {NAV_LINKS.map((l) => <a key={l.label} href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>)}
            <a href={appLinks.shop()}>Shop</a>
            <a href={appLinks.rides()}>Rides</a>
            <a href={appLinks.merchantLogin()}>Sign in</a>
            <a className="hm-btn hm-btn-primary" href={appLinks.start()}>Get started</a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ── hero ───────────────────────────────────────────────────────────────── */
export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const ySlow = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const yMid = useTransform(scrollYProgress, [0, 1], [0, -130]);
  const yFast = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const glow = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  // gentle 3D tilt that follows the pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [5, -5]), { stiffness: 80, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-7, 7]), { stiffness: 80, damping: 18 });
  const onMove = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  return (
    <section className="hm-hero" ref={ref} onPointerMove={onMove}>
      <motion.div className="hm-hero-glow" style={{ opacity: glow }} aria-hidden="true" />
      <div className="hm-hero-grid" aria-hidden="true" />
      <div className="hm-container hm-hero-in">
        <div className="hm-hero-copy">
          <Reveal y={12}><span className="hm-pill"><i />Early access · Built for Nigeria</span></Reveal>
          <SplitWords className="hm-h1" text="The commerce network for your neighbourhood." accent={['neighbourhood']} delay={0.15} />
          <Reveal delay={0.55} className="hm-hero-sub">
            <p>Open a store in minutes. Order from shops nearby. Deliver — or ride — with people you can trust. One platform, built for the way Nigeria shops.</p>
          </Reveal>
          <Reveal delay={0.7}><ClaimForm id="hero-claim" /></Reveal>
          <Reveal delay={0.8} className="hm-hero-ctas">
            <a className="hm-btn hm-btn-primary" href={appLinks.merchantSignup()}><Store size={16} /> Open your store free <ArrowRight size={16} /></a>
            <a className="hm-btn hm-btn-glass" href={appLinks.shop()}>Start shopping</a>
          </Reveal>
          <Reveal delay={0.9}>
            <ul className="hm-hero-trust">
              <li><Check size={14} /> Free to start</li>
              <li><Check size={14} /> No hardware needed</li>
              <li><Check size={14} /> Card, transfer or cash</li>
            </ul>
          </Reveal>
        </div>

        <div className="hm-hero-stage" aria-hidden="true">
          <motion.div className="hm-hero-tilt" style={reduce ? undefined : { rotateX: rx, rotateY: ry }}>
            <motion.div className="hm-float hm-float-dash" style={{ y: ySlow }}>
              <Reveal y={50} delay={0.5}><DashboardCard /></Reveal>
            </motion.div>
            <motion.div className="hm-float hm-float-phone-a" style={{ y: yMid }}>
              <Reveal y={70} delay={0.65}><Phone><ShopScreen /></Phone></Reveal>
            </motion.div>
            <motion.div className="hm-float hm-float-phone-b" style={{ y: yFast }}>
              <Reveal y={90} delay={0.8}><Phone><RiderScreen /></Phone></Reveal>
            </motion.div>
          </motion.div>
        </div>
      </div>
      <div className="hm-scroll-cue" aria-hidden="true"><span /></div>
    </section>
  );
}

const MARQUEE = ['Storefronts', 'Counter till', 'Live stock', 'Verified riders', 'Passenger rides', 'Paystack payments', 'Offline-ready', 'Order tracking', 'Handover codes', 'Merchant analytics'];

export function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="hm-marquee" aria-hidden="true">
      <div className="hm-marquee-track">
        {items.map((t, i) => <span key={`${t}-${i}`}>{t}<i /></span>)}
      </div>
    </div>
  );
}

/* ── pinned storytelling: four experiences, one network ─────────────────── */
const STORY = [
  { key: 'stores', tag: 'For stores', title: 'Open a store in minutes.', text: 'Your own address, your own catalogue, your own orders — without hiring a developer.',
    points: ['A web address like your-store.stv.com', 'Live stock that updates as you sell', 'Orders, staff accounts, a counter till and analytics'], cta: { label: 'Open a store', href: () => appLinks.merchantSignup() }, screen: 'dash' },
  { key: 'shoppers', tag: 'For shoppers', title: 'Order from shops you trust.', text: 'Find stores near you, pay securely, and watch your order arrive.',
    points: ['Pay by card or bank transfer', 'Live order tracking with a handover code', 'Saved addresses for faster checkout'], cta: { label: 'Start shopping', href: () => appLinks.shop() }, screen: 'shop' },
  { key: 'riders', tag: 'For riders', title: 'Earn on your own terms.', text: 'Get verified once, then pick the deliveries that suit you.',
    points: ['See paid orders from stores in your area', 'Confirm pickup and delivery step by step', 'Request payouts straight to your bank'], cta: { label: 'Become a rider', href: () => appLinks.rider() }, screen: 'rider' },
  { key: 'rides', tag: 'Rides', title: 'Name your price.', text: 'Okada, keke or car — riders respond with offers and you choose.',
    points: ['Offer a fair price and compare riders', 'A start code keeps every trip secure', 'Pay your rider in cash at the end'], cta: { label: 'Book a ride', href: () => appLinks.rides() }, screen: 'rides' }
];

function ScreenFor({ kind }) {
  if (kind === 'dash') return <div className="hm-stage-dash"><DashboardCard /></div>;
  const Inner = { shop: ShopScreen, rider: RiderScreen, rides: RidesScreen }[kind];
  return <Phone className="hm-stage-phone"><Inner /></Phone>;
}

export function Story() {
  const ref = useRef(null);
  const desktop = useMediaQuery('(min-width: 960px)');
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.max(0, Math.min(STORY.length - 1, Math.floor(v * STORY.length))));
  });

  const header = (
    <div className="hm-section-head hm-center">
      <Reveal><span className="hm-eyebrow">One platform</span></Reveal>
      <Reveal delay={0.08}><h2 className="hm-h2">Four experiences. <span className="hm-accent-dark">One network.</span></h2></Reveal>
      <Reveal delay={0.16}><p className="hm-lead">Everything works together: a sale in a shop becomes a job for a rider, and a tracked delivery for the customer.</p></Reveal>
    </div>
  );

  if (!desktop || reduce) {
    return (
      <section id="platform" className="hm-section hm-light">
        <div className="hm-container">
          {header}
          <div className="hm-story-stack">
            {STORY.map((s) => (
              <Reveal key={s.key} className="hm-story-card">
                <span className="hm-tag">{s.tag}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <ul>{s.points.map((p) => <li key={p}><Check size={15} />{p}</li>)}</ul>
                <a className="hm-arrow-link" href={s.cta.href()}>{s.cta.label} <ArrowUpRight size={16} /></a>
                <div className="hm-story-card-screen"><ScreenFor kind={s.screen} /></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="platform" className="hm-story" ref={ref} style={{ height: `${STORY.length * 100 + 40}vh` }}>
      <div className="hm-story-sticky">
        <div className="hm-container hm-story-in">
          <div className="hm-story-left">
            {header}
            <div className="hm-story-list">
              <div className="hm-story-rail"><motion.i style={{ scaleY: lineScale }} /></div>
              {STORY.map((s, i) => (
                <div key={s.key} className={`hm-story-item ${i === active ? 'on' : ''}`}>
                  <span className="hm-tag">{s.tag}</span>
                  <h3>{s.title}</h3>
                  <div className="hm-story-more" aria-hidden={i !== active}>
                    <p>{s.text}</p>
                    <ul>{s.points.map((p) => <li key={p}><Check size={15} />{p}</li>)}</ul>
                    <a className="hm-arrow-link" href={s.cta.href()} tabIndex={i === active ? 0 : -1}>{s.cta.label} <ArrowUpRight size={16} /></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hm-story-right" aria-hidden="true">
            <div className="hm-story-halo" />
            {STORY.map((s, i) => (
              <motion.div
                key={s.key}
                className="hm-story-layer"
                animate={{ opacity: i === active ? 1 : 0, y: i === active ? 0 : i < active ? -40 : 40, scale: i === active ? 1 : 0.94 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <ScreenFor kind={s.screen} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── bento grid of capabilities ─────────────────────────────────────────── */
function Tile({ className = '', title, text, children, icon: Icon }) {
  const spotlight = useSpotlight();
  return (
    <Reveal className={`hm-tile ${className}`} {...spotlight}>
      <div className="hm-tile-glow" aria-hidden="true" />
      <div className="hm-tile-art">{children}</div>
      <div className="hm-tile-copy">
        <h3>{Icon && <Icon size={16} />} {title}</h3>
        <p>{text}</p>
      </div>
    </Reveal>
  );
}

export function Bento() {
  return (
    <section id="features" className="hm-section hm-ice">
      <div className="hm-container">
        <div className="hm-section-head hm-center">
          <Reveal><span className="hm-eyebrow">Built in</span></Reveal>
          <Reveal delay={0.08}><h2 className="hm-h2">Everything a neighbourhood business needs.</h2></Reveal>
          <Reveal delay={0.16}><p className="hm-lead">No stack of separate tools. Selling, stock, delivery and getting paid live in one place.</p></Reveal>
        </div>
        <div className="hm-bento">
          <Tile className="t-a" title="A storefront that is yours" text="Your own address and catalogue. Shoppers see what is genuinely in stock." icon={Store}><StorefrontMini /></Tile>
          <Tile className="t-b" title="A till that never stops" text="Ring up sales with no internet. They sync the moment you are back online." icon={WifiOff}><OfflineMini /></Tile>
          <Tile className="t-c" title="Stock you can trust" text="Every online and in-store sale updates the same shelf." icon={Eye}><StockMini /></Tile>
          <Tile className="t-d" title="Riders checked before they ride" text="Licence, vehicle papers and photo are reviewed by our team first." icon={BadgeCheck}><VerifiedMini /></Tile>
          <Tile className="t-e" title="Payments confirmed, not assumed" text="Card payments are verified with Paystack before an order is released." icon={Lock}><SecureMini /></Tile>
        </div>
      </div>
    </section>
  );
}

/* ── full-bleed photograph with parallax ────────────────────────────────── */
export function PhotoBand() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-9%', '9%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.05, 1.12]);

  return (
    <section className="hm-band" ref={ref}>
      <motion.img className="hm-band-img" src={IMG.market} alt="A busy street market in Lagos with vendors selling produce" loading="lazy" width="1800" height="1201" style={reduce ? undefined : { y, scale }} />
      <div className="hm-band-shade" aria-hidden="true" />
      <div className="hm-container hm-band-in">
        <Reveal><span className="hm-eyebrow light">Made for Nigeria</span></Reveal>
        <Reveal delay={0.08}><h2 className="hm-h2 light">Built for the way <span className="hm-accent">Nigeria shops.</span></h2></Reveal>
        <Reveal delay={0.16}><p className="hm-lead light">From kiosks and pharmacies to supermarkets — if you sell it on your street, you can sell it online, and a rider from your area can bring it to the door.</p></Reveal>
      </div>
    </section>
  );
}

/* ── pick your side ─────────────────────────────────────────────────────── */
const ROLES = [
  { img: IMG.shopkeeper, alt: 'A shopkeeper leaning on the counter of his kiosk', tag: 'Store owners', title: 'Put your shelf online.', cta: 'Open a store', href: () => appLinks.merchantSignup(), pos: '50% 30%' },
  { img: IMG.okada, alt: 'A courier carrying a delivery box on a motorcycle taxi', tag: 'Riders', title: 'Get paid to move your city.', cta: 'Become a rider', href: () => appLinks.rider(), pos: '50% 50%' },
  { img: IMG.shopper, alt: 'A smiling woman holding her phone', tag: 'Shoppers', title: 'Everything nearby, at your door.', cta: 'Start shopping', href: () => appLinks.shop(), pos: '50% 20%' }
];

export function Roles() {
  return (
    <section className="hm-section hm-light">
      <div className="hm-container">
        <div className="hm-section-head hm-center">
          <Reveal><span className="hm-eyebrow">Join in</span></Reveal>
          <Reveal delay={0.08}><h2 className="hm-h2">Pick your side of the street.</h2></Reveal>
        </div>
        <div className="hm-roles">
          {ROLES.map((r, i) => (
            <Reveal key={r.tag} delay={i * 0.1} className="hm-role-wrap">
              <a className="hm-role" href={r.href()}>
                <img src={r.img} alt={r.alt} loading="lazy" style={{ objectPosition: r.pos }} />
                <span className="hm-role-shade" aria-hidden="true" />
                <span className="hm-role-body">
                  <span className="hm-tag light">{r.tag}</span>
                  <strong>{r.title}</strong>
                  <span className="hm-role-cta">{r.cta} <ArrowUpRight size={16} /></span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── how it works ───────────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Pick your shop’s address', text: 'Choose a link like your-shop.stv.com and add your shop details. You are live.' },
  { n: '02', title: 'Add what you sell', text: 'Add products one by one or import a list. What is on your shelf is what shoppers see.' },
  { n: '03', title: 'Get paid, riders deliver', text: 'When an order is paid, a verified rider nearby can claim it and bring it to the door.' }
];

export function Steps() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 55%'] });
  const line = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 });
  return (
    <section id="how" className="hm-section hm-ice">
      <div className="hm-container">
        <div className="hm-section-head hm-center">
          <Reveal><span className="hm-eyebrow">How it works</span></Reveal>
          <Reveal delay={0.08}><h2 className="hm-h2">From shelf to doorstep in three steps.</h2></Reveal>
        </div>
        <div className="hm-steps" ref={ref}>
          <div className="hm-steps-line" aria-hidden="true"><motion.i style={{ scaleX: line }} /></div>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12} className="hm-step">
              <span className="hm-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── trust ──────────────────────────────────────────────────────────────── */
const TRUST = [
  { icon: BadgeCheck, title: 'Verified riders', text: 'Licence, vehicle papers and a photo are reviewed before a rider takes any job.' },
  { icon: Lock, title: 'Payments checked on our servers', text: 'A card payment only counts once it is confirmed with Paystack.' },
  { icon: ShieldCheck, title: 'Handover codes', text: 'Deliveries finish with the customer’s own 4-digit code, and rides start with the passenger’s code.' },
  { icon: Eye, title: 'Private documents', text: 'Rider documents are stored privately and only opened by our verification team.' },
  { icon: WifiOff, title: 'Works when the network does not', text: 'The counter till keeps selling offline and syncs when you reconnect.' },
  { icon: Bike, title: 'Track every order', text: 'Customers follow their order from the shop to their door, step by step.' }
];

export function Trust() {
  return (
    <section className="hm-section hm-dark">
      <div className="hm-container">
        <div className="hm-section-head hm-center">
          <Reveal><span className="hm-eyebrow light">Trust</span></Reveal>
          <Reveal delay={0.08}><h2 className="hm-h2 light">Trust is built in, <span className="hm-accent">not bolted on.</span></h2></Reveal>
        </div>
        <div className="hm-trust">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 0.08} className="hm-trust-item">
              <span className="hm-trust-icon"><t.icon size={20} /></span>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── pricing ────────────────────────────────────────────────────────────── */
const PLANS = [
  { name: 'Starter Store', who: 'Solo retailers and kiosks', monthly: '₦0', annual: '₦0', note: 'forever free', featured: false,
    features: ['1 storefront and live catalogue', 'Up to 150 products', 'Your own your-store.stv.com address', 'Rider delivery on every paid order', 'Order alerts and daily summaries'] },
  { name: 'Growth Merchant', who: 'Busy supermarkets and pharmacies', monthly: '₦18,500', annual: '₦14,800', note: '/month', featured: true,
    features: ['Unlimited products', 'Up to 5 staff accounts', 'Counter till add-on', 'Low-stock notifications', 'Cash, card and transfer'] },
  { name: 'Multi-Branch Pro', who: 'Retail chains and wholesalers', monthly: '₦52,000', annual: '₦41,600', note: '/month', featured: false,
    features: ['Up to 10 branches and warehouses', 'Custom domain', 'Cross-branch stock transfers', 'Granular staff permissions', 'Priority support'] }
];

export function Pricing() {
  const [billing, setBilling] = useState('monthly');
  const spotlight = useSpotlight();
  return (
    <section id="pricing" className="hm-section hm-light">
      <div className="hm-container">
        <div className="hm-section-head hm-center">
          <Reveal><span className="hm-eyebrow">Pricing</span></Reveal>
          <Reveal delay={0.08}><h2 className="hm-h2">Fair plans for every stage of growth.</h2></Reveal>
          <Reveal delay={0.16}><p className="hm-lead">No setup fees and no special hardware.</p></Reveal>
          <Reveal delay={0.2}>
            <div className="hm-early" role="note"><BadgeCheck size={16} /> Early access: every store is free while we open up. Paid plans start later, and we will tell you before anything changes.</div>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="hm-toggle" role="group" aria-label="Billing period">
              <button type="button" className={billing === 'monthly' ? 'on' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
              <button type="button" className={billing === 'annual' ? 'on' : ''} onClick={() => setBilling('annual')}>Annual <em>save ~20%</em></button>
            </div>
          </Reveal>
        </div>
        <div className="hm-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1} className={`hm-plan ${p.featured ? 'featured' : ''}`} {...spotlight}>
              {p.featured && <span className="hm-plan-flag">Most popular</span>}
              <h3>{p.name}</h3>
              <small>{p.who}</small>
              <div className="hm-plan-price"><b>{billing === 'monthly' ? p.monthly : p.annual}</b><span>{p.note}</span></div>
              <ul>{p.features.map((f) => <li key={f}><Check size={15} />{f}</li>)}</ul>
              <a className={`hm-btn ${p.featured ? 'hm-btn-primary' : 'hm-btn-outline'}`} href={appLinks.merchantSignup()}>Join early access</a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'What does my store’s web address look like?', a: `Every store gets its own address, such as your-store.${BRAND.domain}. It is your live catalogue, where shoppers see what is in stock and place orders.` },
  { q: 'How does delivery work?', a: 'When a customer pays, the order appears to verified riders in your area. One accepts it, collects it from your store, and completes the delivery by entering the customer’s 4-digit code. Customers follow progress on their order page.' },
  { q: 'Do I need a till or special hardware?', a: 'No. The storefront and dashboard run in a browser on a phone or computer. The counter till is optional and keeps working without internet.' },
  { q: 'How do I get paid?', a: 'Card payments are confirmed with Paystack and bank transfers are confirmed by you. Automatic payouts to stores are not live yet; early-access stores will be told before anything changes.' },
  { q: 'How do riders get paid?', a: 'Riders earn a fare per delivery plus tips, add their bank account, and request a payout in the app, which our team then settles. Ride fares are paid in cash by the passenger.' },
  { q: 'How are riders checked?', a: 'Every rider uploads their licence, vehicle papers and a photo. Our team reviews them before the rider can accept any delivery or ride, and can suspend a rider at any time.' },
  { q: 'Is it free?', a: 'Yes, while we are in early access. Paid plans for larger stores arrive later.' }
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="hm-section hm-ice">
      <div className="hm-container hm-faq-wrap">
        <div className="hm-section-head">
          <Reveal><span className="hm-eyebrow">FAQ</span></Reveal>
          <Reveal delay={0.08}><h2 className="hm-h2">Questions, answered.</h2></Reveal>
        </div>
        <div className="hm-faq">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`hm-faq-item ${open === i ? 'open' : ''}`}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{f.q}</span>
                {open === i ? <Minus size={18} /> : <Plus size={18} />}
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div className="hm-faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                    <p>{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── closing call to action + footer ────────────────────────────────────── */
export function FinalCta() {
  return (
    <section className="hm-cta">
      <img className="hm-cta-img" src={IMG.interior} alt="" loading="lazy" aria-hidden="true" />
      <div className="hm-cta-shade" aria-hidden="true" />
      <div className="hm-container hm-cta-in">
        <Reveal><h2 className="hm-h2 light">Open your store <span className="hm-accent">today.</span></h2></Reveal>
        <Reveal delay={0.1}><p className="hm-lead light">Claim your address first — it takes a few seconds, and it is free.</p></Reveal>
        <Reveal delay={0.2}><ClaimForm id="cta-claim" /></Reveal>
        <Reveal delay={0.3} className="hm-hero-ctas center">
          <a className="hm-btn hm-btn-primary" href={appLinks.merchantSignup()}>Register your store <ArrowRight size={16} /></a>
          <a className="hm-btn hm-btn-glass" href={appLinks.rider()}><Bike size={16} /> Become a rider</a>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="hm-footer">
      <div className="hm-container hm-footer-in">
        <div className="hm-footer-brand">
          <a className="hm-logo" href={appLinks.marketing()}><span className="hm-logo-mark"><ShoppingBag size={16} /></span><span>{BRAND.name}</span></a>
          <p>The commerce network for your neighbourhood. Stores, shoppers, riders and rides, in one place.</p>
        </div>
        <div><h4>Use {BRAND.name}</h4><a href={appLinks.merchantSignup()}>Open a store</a><a href={appLinks.shop()}>Shop nearby</a><a href={appLinks.rider()}>Ride and deliver</a><a href={appLinks.rides()}>Book a ride</a></div>
        <div><h4>Explore</h4><a href="#platform">Platform</a><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
        <div><h4>Account</h4><a href={appLinks.merchantLogin()}>Store sign in</a><a href={appLinks.riderLogin()}>Rider sign in</a><a href={appLinks.start()}>Get started</a></div>
      </div>
      <div className="hm-container hm-footer-base">
        <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
        <span>Photography via Pexels.</span>
      </div>
    </footer>
  );
}
