'use client';

import { useRef, ReactNode } from 'react';
import { motion, useInView, useScroll, useTransform, Variants } from 'framer-motion';
import {
  Shield,
  Users,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Star,
  Lock,
  Award,
  Layers,
  Globe,
  Eye,
  ChevronRight,
  Percent,
  Repeat2,
  Package,
  GraduationCap,
  BadgeCheck,
  HeartHandshake,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES:  npm install framer-motion lucide-react
//
// tailwind.config.ts  →  theme.extend:
//   fontFamily: {
//     display: ['Cormorant Garamond', 'serif'],
//     mono:    ['DM Mono', 'monospace'],
//   }
//
// app/layout.tsx  →  inside <head>:
//   <link rel="preconnect" href="https://fonts.googleapis.com" />
//   <link
//     href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=DM+Mono:wght@300;400&display=swap"
//     rel="stylesheet"
//   />
//
// Route: app/circle/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  obsidian:    '#1A1A1B',
  obsidianDk:  '#111112',
  obsidianMd:  '#1F1F20',
  obsidianLt:  '#252527',
  obsidianBd:  '#2C2C2E',
  amber:       '#FFB347',
  amberWarm:   '#F59E0B',
  amberDeep:   '#C47A1E',
  amberGlow:   'rgba(255,179,71,0.08)',
  amberGlowMd: 'rgba(255,179,71,0.14)',
  amberBorder: 'rgba(255,179,71,0.22)',
  amberText:   '#FFB347',
  white:       '#F4F1EA',
  mist:        'rgba(244,241,234,0.55)',
  fog:         'rgba(244,241,234,0.28)',
  hairline:    'rgba(244,241,234,0.08)',
  hairlineDim: 'rgba(244,241,234,0.04)',
  green:       '#4ADE80',
  greenGlow:   'rgba(74,222,128,0.08)',
};

// ── Motion Variants ───────────────────────────────────────────────────────────
const vFadeUp: Variants = {
  hidden:  { opacity: 0, y: 44 },
  visible: (delay: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay },
  }),
};
const vFadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.85, ease: 'easeOut', delay },
  }),
};
const vStagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.13 } },
};
const vCardIn: Variants = {
  hidden:  { opacity: 0, y: 28 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

// ── Scroll Reveal Wrapper ─────────────────────────────────────────────────────
function Reveal({
  children, delay = 0, className = '',
  variants = vFadeUp, margin = '0px 0px -80px 0px',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variants?: Variants;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: margin as Parameters<typeof useInView>[1]['margin'] });
  return (
    <motion.div ref={ref} variants={variants} initial="hidden"
      animate={inView ? 'visible' : 'hidden'} custom={delay} className={className}>
      {children}
    </motion.div>
  );
}

// ── Stagger Reveal Container ──────────────────────────────────────────────────
function StaggerReveal({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return (
    <motion.div
      ref={ref}
      variants={vStagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ── Eyebrow Label ─────────────────────────────────────────────────────────────
function Eyebrow({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <Reveal delay={0} className={`mb-7 flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
      <span className="block w-5 h-px flex-shrink-0" style={{ background: C.amberBorder }} />
      <span
        className="font-mono text-[0.55rem] tracking-[0.5em] uppercase"
        style={{ color: C.amber, opacity: 0.72 }}
      >
        {children}
      </span>
    </Reveal>
  );
}

// ── Hairline Divider ──────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      className="w-full h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${C.amberBorder}, transparent)` }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── HERO PARALLAX BACKGROUND ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function HeroBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* Parallax amber orb */}
      <motion.div
        style={{ y }}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 900, height: 900,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -58%)',
            background: `radial-gradient(circle, rgba(255,179,71,0.09) 0%, transparent 68%)`,
          }}
        />
      </motion.div>

      {/* Geometric grid */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(${C.white} 1px, transparent 1px),
            linear-gradient(90deg, ${C.white} 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Diagonal rule — monolithic architectural accent */}
      <div aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: 0, left: '62%', width: 1, height: '100%',
          background: `linear-gradient(to bottom, transparent, ${C.amberBorder}, transparent)`,
          opacity: 0.4,
          transform: 'rotate(8deg) scaleY(1.2)',
          transformOrigin: 'top',
        }}
      />

      {/* Bottom gradient fade */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${C.obsidian})` }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── COMPENSATION GRID ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const compRows = [
  {
    model:   'Activation Bounty',
    type:    'Upfront',
    rate:    '20%',
    trigger: 'On confirmed subscription activation',
    note:    'Paid within 72 hours of member onboarding',
    icon:    Percent,
    accent:  C.amber,
    glow:    C.amberGlow,
    border:  C.amberBorder,
  },
  {
    model:   'Sovereign Residual',
    type:    'Monthly · Perpetual',
    rate:    '10%',
    trigger: 'Every billing cycle the referral remains active',
    note:    'Compounds indefinitely — no cap, no expiry',
    icon:    Repeat2,
    accent:  C.green,
    glow:    C.greenGlow,
    border:  'rgba(74,222,128,0.22)',
  },
];

function CompensationGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });

  return (
    <div ref={ref} className="space-y-px" style={{ background: C.hairline }}>
      {/* Table header */}
      <motion.div
        variants={vFadeIn} initial="hidden"
        animate={inView ? 'visible' : 'hidden'} custom={0}
        className="grid grid-cols-[2fr_1fr_1.5fr_2fr] gap-px font-mono text-[0.52rem]
                   tracking-[0.32em] uppercase"
        style={{ background: C.obsidianLt }}
      >
        {['Revenue Model', 'Rate', 'Trigger', 'Terms'].map((h, i) => (
          <div key={h}
            className={`px-6 py-4 ${i >= 3 ? 'hidden md:block' : ''}`}
            style={{ color: C.fog, background: C.obsidianLt }}
          >
            {h}
          </div>
        ))}
      </motion.div>

      {/* Data rows */}
      <motion.div
        variants={vStagger} initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="space-y-px"
      >
        {compRows.map((row) => {
          const Icon = row.icon;
          return (
            <motion.div
              key={row.model}
              variants={vCardIn}
              className="group grid grid-cols-[2fr_1fr_1.5fr_2fr] gap-px items-center
                         transition-colors duration-400"
              style={{ background: C.hairlineDim }}
            >
              {/* Model name */}
              <div
                className="px-6 py-7 flex items-center gap-4 transition-colors duration-300"
                style={{ background: C.obsidianMd }}
              >
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-sm flex items-center justify-center border"
                  style={{ borderColor: row.border, background: row.glow, color: row.accent }}
                >
                  <Icon size={15} />
                </div>
                <div>
                  <p
                    className="font-display text-[1.05rem] font-normal tracking-tight leading-snug"
                    style={{ color: C.white, fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {row.model}
                  </p>
                  <p
                    className="font-mono text-[0.48rem] tracking-[0.28em] uppercase mt-0.5"
                    style={{ color: C.fog }}
                  >
                    {row.type}
                  </p>
                </div>
              </div>

              {/* Rate */}
              <div
                className="px-6 py-7 transition-colors duration-300"
                style={{ background: C.obsidianMd }}
              >
                <span
                  className="font-mono font-light leading-none"
                  style={{ fontSize: '2rem', color: row.accent }}
                >
                  {row.rate}
                </span>
              </div>

              {/* Trigger */}
              <div
                className="px-6 py-7 transition-colors duration-300"
                style={{ background: C.obsidianMd }}
              >
                <span
                  className="font-mono text-[0.58rem] leading-[1.75] tracking-wide"
                  style={{ color: C.mist }}
                >
                  {row.trigger}
                </span>
              </div>

              {/* Terms — hidden on mobile */}
              <div
                className="hidden md:block px-6 py-7 transition-colors duration-300"
                style={{ background: C.obsidianMd }}
              >
                <span
                  className="font-mono text-[0.55rem] leading-[1.8] italic tracking-wide"
                  style={{ color: C.fog }}
                >
                  {row.note}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer bar */}
      <motion.div
        variants={vFadeIn} initial="hidden"
        animate={inView ? 'visible' : 'hidden'} custom={0.5}
        className="flex items-center justify-between px-6 py-4"
        style={{ background: C.obsidianLt }}
      >
        <p className="font-mono text-[0.52rem] tracking-[0.28em] uppercase" style={{ color: C.fog }}>
          All earnings tracked live in your Advocate Dashboard
        </p>
        <div className="flex items-center gap-2" style={{ color: C.amber }}>
          <Lock size={10} />
          <span className="font-mono text-[0.5rem] tracking-[0.25em] uppercase" style={{ color: C.amber, opacity: 0.7 }}>
            Auditable · Immutable
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Earning Scenario ──────────────────────────────────────────────────────────
function EarningScenario() {
  const scenarios = [
    { families: 10,  plan: 199,  activation: '$398',  monthly: '$199',  label: '10 families' },
    { families: 25,  plan: 199,  activation: '$995',  monthly: '$498',  label: '25 families' },
    { families: 50,  plan: 199,  activation: '$1,990', monthly: '$995',  label: '50 families' },
  ];

  return (
    <StaggerReveal className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: C.hairline }}>
      {scenarios.map((s) => (
        <motion.div
          key={s.label}
          variants={vCardIn}
          className="p-8 flex flex-col gap-4"
          style={{ background: C.obsidianMd }}
        >
          <p className="font-mono text-[0.52rem] tracking-[0.35em] uppercase" style={{ color: C.fog }}>
            {s.label} · ${s.plan}/yr
          </p>
          <div>
            <p className="font-mono text-[0.5rem] tracking-widest uppercase mb-1" style={{ color: C.amber, opacity: 0.7 }}>
              Activation (once)
            </p>
            <p className="font-mono font-light" style={{ fontSize: '1.9rem', color: C.amber }}>
              {s.activation}
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.5rem] tracking-widest uppercase mb-1" style={{ color: C.green, opacity: 0.7 }}>
              Residual (monthly)
            </p>
            <p className="font-mono font-light" style={{ fontSize: '1.9rem', color: C.green }}>
              {s.monthly}
            </p>
          </div>
          <p className="font-mono text-[0.5rem] tracking-wide italic" style={{ color: C.fog, opacity: 0.6 }}>
            Illustrative · Actual varies by plan
          </p>
        </motion.div>
      ))}
    </StaggerReveal>
  );
}

// ── Toolkit Cards ─────────────────────────────────────────────────────────────
const toolkitItems = [
  {
    icon: GraduationCap,
    title: 'Online Training',
    body: 'A 2-day immersive Zoom program. You leave a certified Basalith Guardian — trained in legacy acquisition, family trust-building, and the full Sovereign Persona methodology.',
    tag: 'Certification',
  },
  {
    icon: Package,
    title: 'Heritage Kits',
    body: 'Hand-assembled physical kits shipped directly to your referred families. Each contains archival-grade media, a personal onboarding letter, and a QR-coded activation card — the tactile beginning of a 100-year legacy.',
    tag: 'Physical Asset',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Ground-Truth Protocols',
    body: 'A proprietary evidence framework that ensures every memory captured passes our authenticity standard. Your families get peace of mind. Your Digital Doubles get irreversible credibility.',
    tag: 'Methodology',
  },
  {
    icon: Globe,
    title: 'Global Advocate Network',
    body: 'Private access to the Circle: a global community of Guardians. Monthly briefings, early feature access, and a direct line to the Basalith founding team. You are not a reseller. You are a co-architect.',
    tag: 'Community',
  },
  {
    icon: Eye,
    title: 'Real-Time Earnings Dashboard',
    body: 'Track every activation, every residual, every compounding dollar — in real time. Full audit trail, exportable reports, and sovereign custody of your own compensation data.',
    tag: 'Transparency',
  },
  {
    icon: Layers,
    title: 'Co-Marketing Assets',
    body: 'High-fidelity presentation decks, family-facing landing pages, and personalized video content — all branded to your identity as a Guardian. You pitch with authority because your materials demand it.',
    tag: 'Brand Support',
  },
];

function ToolkitCard({ icon: Icon, title, body, tag }: typeof toolkitItems[0]) {
  return (
    <motion.div
      variants={vCardIn}
      className="group relative border rounded-sm p-8 overflow-hidden
                 transition-all duration-500 hover:border-[rgba(255,179,71,0.30)]"
      style={{ background: C.obsidianMd, borderColor: C.hairline }}
    >
      {/* Hover top accent */}
      <span
        className="absolute inset-x-0 top-0 h-[1.5px] origin-left scale-x-0
                   transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: `linear-gradient(90deg, ${C.amber}, transparent)` }}
      />
      {/* Corner accent — architectural detail */}
      <div
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
        style={{ borderTop: `1px solid ${C.hairline}`, borderRight: `1px solid ${C.hairline}` }}
      />

      <div className="flex items-start justify-between mb-6">
        <div
          className="w-11 h-11 rounded-sm flex items-center justify-center border
                     transition-colors duration-300 group-hover:border-[rgba(255,179,71,0.42)]"
          style={{ borderColor: C.amberBorder, background: C.amberGlow, color: C.amber }}
        >
          <Icon size={18} />
        </div>
        <span
          className="font-mono text-[0.47rem] tracking-[0.3em] uppercase px-2.5 py-1 rounded-sm border"
          style={{ color: C.fog, borderColor: C.hairline, background: 'rgba(255,255,255,0.02)' }}
        >
          {tag}
        </span>
      </div>

      <h3
        className="font-display text-[1.22rem] font-normal tracking-tight mb-3"
        style={{ color: C.white, fontFamily: "'Cormorant Garamond', serif" }}
      >
        {title}
      </h3>
      <p
        className="font-mono text-[0.6rem] leading-[1.82] tracking-wide"
        style={{ color: C.mist }}
      >
        {body}
      </p>
    </motion.div>
  );
}

// ── Mission Pillar ────────────────────────────────────────────────────────────
const missionPillars = [
  {
    num:  '01',
    heading: 'Memory is the only artifact that cannot be replicated.',
    body: 'Unlike property, unlike wealth, unlike influence — a person\'s exact voice, humor, and way of seeing the world exists exactly once. When it is gone, it is gone completely. Basalith exists because that is unacceptable.',
  },
  {
    num:  '02',
    heading: 'Every generation that does not act loses the one before it.',
    body: 'The greatest archive of human experience ever assembled is disappearing at the rate of one elderly person every 18 seconds. The families who wait for the "right time" lose it permanently. You change that equation.',
  },
  {
    num:  '03',
    heading: 'The Guardians are the last line of preservation.',
    body: 'Technology alone cannot compel families to act. Trust can. Relationships can. You — as a Circle Advocate — are the human bridge between a family\'s hesitation and a century of protected legacy.',
  },
];

function MissionPillar({ num, heading, body }: typeof missionPillars[0]) {
  return (
    <motion.div
      variants={vCardIn}
      className="grid grid-cols-[auto_1fr] gap-8 items-start py-10 border-b last:border-b-0"
      style={{ borderColor: C.hairline }}
    >
      <span
        className="font-mono text-[0.55rem] tracking-[0.3em] uppercase pt-1 flex-shrink-0 w-8"
        style={{ color: C.amber, opacity: 0.55 }}
      >
        {num}
      </span>
      <div>
        <h3
          className="font-display text-[1.45rem] md:text-[1.7rem] font-normal
                     tracking-[0.01em] leading-[1.25] mb-4"
          style={{ color: C.white, fontFamily: "'Cormorant Garamond', serif" }}
        >
          {heading}
        </h3>
        <p
          className="font-mono text-[0.62rem] leading-[1.85] tracking-wide max-w-2xl"
          style={{ color: C.mist }}
        >
          {body}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function CirclePage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden antialiased"
      style={{
        background: C.obsidian,
        color: C.white,
        fontFamily: "'Cormorant Garamond', serif",
      }}
    >
      {/* ── Grain overlay ──────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.18]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <motion.nav
        variants={vFadeIn} initial="hidden" animate="visible" custom={0.1}
        className="fixed top-0 inset-x-0 z-40 flex justify-between items-center
                   px-8 md:px-16 py-7 backdrop-blur-sm"
        style={{ background: `linear-gradient(to bottom, ${C.obsidian}F2, transparent)` }}
      >
        <span
          className="font-mono text-[0.68rem] tracking-[0.38em] uppercase"
          style={{ color: C.amber }}
        >
          Basalith
        </span>
        <div className="flex items-center gap-2">
          <Shield size={12} style={{ color: C.amber }} />
          <span
            className="font-mono text-[0.56rem] tracking-[0.28em] uppercase"
            style={{ color: C.fog }}
          >
            The Circle
          </span>
        </div>
      </motion.nav>

      {/* ─────────────────────────────────────────────────────────────────
          ── 01  HERO ──────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center items-start
                   px-8 md:px-16 lg:px-24 pt-36 pb-28 overflow-hidden"
      >
        <HeroBackground />

        {/* Content */}
        <div className="relative z-10 max-w-4xl">
          {/* Pill badge */}
          <motion.div
            variants={vFadeIn} initial="hidden" animate="visible" custom={0.2}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 border mb-10"
            style={{ borderColor: C.amberBorder, background: C.amberGlow }}
          >
            <Star size={10} fill={C.amber} style={{ color: C.amber }} />
            <span
              className="font-mono text-[0.55rem] tracking-[0.35em] uppercase"
              style={{ color: C.amber }}
            >
              Basalith Circle — Guardian Program
            </span>
          </motion.div>

          {/* Headline */}
          <div className="overflow-hidden mb-2">
            <motion.h1
              variants={vFadeUp} initial="hidden" animate="visible" custom={0.35}
              className="font-display font-light leading-[0.9] tracking-[0.2em]"
              style={{
                fontSize: 'clamp(3.2rem, 8.5vw, 9rem)',
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Build Your
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-12">
            <motion.h1
              variants={vFadeUp} initial="hidden" animate="visible" custom={0.5}
              className="font-display font-light italic leading-[0.92] tracking-[0.2em]"
              style={{
                fontSize: 'clamp(3.2rem, 8.5vw, 9rem)',
                fontFamily: "'Cormorant Garamond', serif",
                color: C.amber,
              }}
            >
              Legacy.
            </motion.h1>
          </div>

          <motion.p
            variants={vFadeUp} initial="hidden" animate="visible" custom={0.65}
            className="font-mono text-[clamp(0.68rem,1.3vw,0.85rem)] leading-[1.85]
                       max-w-[580px] mb-14 tracking-wide"
            style={{ color: C.mist }}
          >
            The Basalith Circle is an invitation-only network of Guardians —
            researchers, parents, and trust leaders — who believe the loss of
            human memory is a civilizational crisis worth solving. You protect
            theirs. We protect you.
          </motion.p>

          {/* CTA pair */}
          <motion.div
            variants={vFadeUp} initial="hidden" animate="visible" custom={0.8}
            className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
          >
            <motion.a
              href="/apply"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative inline-flex items-center gap-3 font-mono text-[0.63rem]
                         tracking-[0.4em] uppercase px-12 py-[1.1rem] overflow-hidden rounded-sm
                         transition-colors duration-300 hover:text-[#1A1A1B]"
              style={{ color: C.amber, border: `1px solid ${C.amberBorder}` }}
            >
              <span
                className="absolute inset-0 origin-left scale-x-0 transition-transform
                           duration-300 ease-out group-hover:scale-x-100"
                style={{ background: C.amber }}
              />
              <span className="relative z-10 flex items-center gap-3">
                Apply to the Circle <ArrowRight size={13} />
              </span>
            </motion.a>

            <a
              href="#mission"
              className="font-mono text-[0.6rem] tracking-[0.35em] uppercase
                         flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: C.fog }}
            >
              Our mission <ChevronRight size={12} />
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          variants={vFadeIn} initial="hidden" animate="visible" custom={1.5}
          aria-hidden="true"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.span
            animate={{ scaleY: [1, 1.2, 1], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="block w-px h-14 origin-top"
            style={{ background: `linear-gradient(to bottom, ${C.amber}, transparent)` }}
          />
          <span
            className="font-mono text-[0.46rem] tracking-[0.4em] uppercase"
            style={{ color: `${C.amber}44` }}
          >
            Scroll
          </span>
        </motion.div>
      </section>

      <Divider />

      {/* ─────────────────────────────────────────────────────────────────
          ── 02  THE MISSION ───────────────────────────────────────────── */}
      <section id="mission" className="py-32 relative">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 80% 50%, rgba(255,179,71,0.04) 0%, transparent 65%)`,
          }}
        />

        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>02 — The Mission</Eyebrow>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16 lg:gap-28 items-start">
            {/* Left: headline */}
            <div className="lg:sticky lg:top-32">
              <Reveal>
                <h2
                  className="font-display font-light leading-[1.05] tracking-[0.2em]"
                  style={{
                    fontSize: 'clamp(2.4rem, 4.5vw, 5rem)',
                    fontFamily: "'Cormorant Garamond', serif",
                  }}
                >
                  A moral
                  <br />
                  <span className="italic" style={{ color: C.amber }}>
                    imperative.
                  </span>
                </h2>
              </Reveal>
              <Reveal delay={0.1} className="mt-6">
                <p
                  className="font-mono text-[0.65rem] leading-[1.9] tracking-wide max-w-sm"
                  style={{ color: C.mist }}
                >
                  The loss of personal memory is not a storage problem.
                  It is a human crisis — and it accelerates every day.
                  Circle Advocates are the ones who decide to act.
                </p>
              </Reveal>
              <Reveal delay={0.18} className="mt-10">
                <div
                  className="border-l-2 pl-6 py-1"
                  style={{ borderColor: C.amberBorder }}
                >
                  <p
                    className="font-display text-[1.3rem] font-light italic leading-[1.5]"
                    style={{ color: C.white, fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    &ldquo;Every elder who passes without a Digital Double
                    takes a universe of irreplaceable experience with them.&rdquo;
                  </p>
                  <p
                    className="font-mono text-[0.52rem] tracking-[0.3em] uppercase mt-4"
                    style={{ color: C.amber, opacity: 0.65 }}
                  >
                    — Basalith Founding Charter
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Right: pillars */}
            <StaggerReveal className="divide-y" style={{ borderColor: C.hairline }}>
              {missionPillars.map((p) => (
                <MissionPillar key={p.num} {...p} />
              ))}
            </StaggerReveal>
          </div>
        </div>
      </section>

      <Divider />

      {/* ─────────────────────────────────────────────────────────────────
          ── 03  COMPENSATION MODEL ────────────────────────────────────── */}
      <section
        id="compensation"
        className="py-32 relative"
        style={{
          background: `linear-gradient(to bottom, transparent, rgba(255,179,71,0.02) 50%, transparent)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>03 — Compensation Model</Eyebrow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-28 items-end mb-14">
            <Reveal>
              <h2
                className="font-display font-light leading-[1.04] tracking-[0.2em]"
                style={{
                  fontSize: 'clamp(2.2rem,4vw,4.8rem)',
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                Two streams.
                <br />
                <span className="italic" style={{ color: C.amber }}>
                  One permanent asset.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p
                className="font-mono text-[0.64rem] leading-[1.88] tracking-wide"
                style={{ color: C.mist }}
              >
                Advocates earn immediately on activation and indefinitely on
                loyalty. The Sovereign Residual is deliberately uncapped —
                the earlier you join, the deeper your compounding base becomes.
              </p>
            </Reveal>
          </div>

          {/* Compensation table */}
          <Reveal delay={0.1} className="mb-14">
            <div
              className="overflow-hidden border rounded-sm"
              style={{ borderColor: C.amberBorder }}
            >
              {/* Top amber accent line */}
              <div
                className="h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
                }}
              />
              <CompensationGrid />
            </div>
          </Reveal>

          {/* Earning scenarios */}
          <Reveal delay={0.12}>
            <p
              className="font-mono text-[0.55rem] tracking-[0.38em] uppercase mb-5"
              style={{ color: C.fog }}
            >
              Illustrative earnings scenarios
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="overflow-hidden rounded-sm border" style={{ borderColor: C.hairline }}>
              <EarningScenario />
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* ─────────────────────────────────────────────────────────────────
          ── 04  ADVOCATE TOOLKIT ──────────────────────────────────────── */}
      <section id="toolkit" className="py-32 relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 20% 60%, rgba(255,179,71,0.03) 0%, transparent 60%)`,
          }}
        />

        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>04 — Advocate Toolkit</Eyebrow>

          <div className="mb-14">
            <Reveal>
              <h2
                className="font-display font-light leading-[1.05] tracking-[0.2em] max-w-xl"
                style={{
                  fontSize: 'clamp(2.2rem,4vw,4.8rem)',
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                Everything you need
                <br />
                <span className="italic" style={{ color: C.amber }}>
                  to protect a legacy.
                </span>
              </h2>
            </Reveal>
          </div>

          <StaggerReveal
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px rounded-sm overflow-hidden"
            style={{ background: C.hairline }}
          >
            {toolkitItems.map((item) => (
              <ToolkitCard key={item.title} {...item} />
            ))}
          </StaggerReveal>
        </div>
      </section>

      <Divider />

      {/* ─────────────────────────────────────────────────────────────────
          ── 05  TRUST SIGNALS ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <StaggerReveal
            className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-sm overflow-hidden"
            style={{ background: C.hairline }}
          >
            {[
              { icon: HeartHandshake, label: 'Invite-Only Program',     sub: 'Every Advocate is personally vetted' },
              { icon: Award,          label: 'Guardian Certified',       sub: 'Zoom training & credentialing' },
              { icon: TrendingUp,     label: 'Uncapped Residuals',       sub: 'No ceiling on Sovereign income' },
              { icon: Lock,           label: 'Sovereign Data Promise',   sub: 'Zero third-party data sharing' },
            ].map(({ icon: Icon, label, sub }) => (
              <motion.div
                key={label}
                variants={vCardIn}
                className="px-8 py-10 flex flex-col gap-3"
                style={{ background: C.obsidianMd }}
              >
                <Icon size={16} style={{ color: C.amber, opacity: 0.65 }} />
                <p
                  className="font-display text-[1.05rem] font-normal leading-tight tracking-tight"
                  style={{ color: C.white, fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {label}
                </p>
                <p
                  className="font-mono text-[0.54rem] leading-relaxed tracking-wide"
                  style={{ color: C.fog }}
                >
                  {sub}
                </p>
              </motion.div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      <Divider />

      {/* ─────────────────────────────────────────────────────────────────
          ── 06  FINAL CTA ─────────────────────────────────────────────── */}
      <section className="py-36 relative overflow-hidden">
        {/* Ambient glow — large, low opacity */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 65% at 50% 100%, rgba(255,179,71,0.08) 0%, transparent 65%),
              radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,179,71,0.04) 0%, transparent 60%)
            `,
          }}
        />

        {/* Concentric rings */}
        {[540, 760, 980].map((s) => (
          <div
            key={s}
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none"
            style={{
              width: s, height: s,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -35%)',
              border: `1px solid rgba(255,179,71,0.04)`,
            }}
          />
        ))}

        <div className="max-w-3xl mx-auto px-8 md:px-16 text-center relative z-10">
          {/* Icon */}
          <Reveal className="mb-10">
            <div
              className="w-16 h-16 rounded-sm border flex items-center justify-center mx-auto"
              style={{ borderColor: C.amberBorder, background: C.amberGlowMd }}
            >
              <Shield size={26} style={{ color: C.amber }} />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <p
              className="font-mono text-[0.55rem] tracking-[0.52em] uppercase mb-8"
              style={{ color: C.amber, opacity: 0.65 }}
            >
              Seats are limited · Application required
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <h2
              className="font-display font-light leading-[0.97] tracking-[0.2em] mb-8"
              style={{
                fontSize: 'clamp(2.6rem, 5.5vw, 6rem)',
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Ready to become
              <br />
              <span className="italic" style={{ color: C.amber }}>
                a Guardian?
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p
              className="font-mono text-[0.64rem] leading-[1.88] tracking-wide
                         max-w-xl mx-auto mb-14"
              style={{ color: C.mist }}
            >
              Applications are reviewed personally by the Basalith founding team.
              We admit Advocates who share our conviction that human memory is
              among the most important things we can protect — and who have the
              relationships to prove it.
            </p>
          </Reveal>

          {/* Pulsing CTA button */}
          <Reveal delay={0.28}>
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                {/* Pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-sm pointer-events-none"
                  style={{ border: `1px solid ${C.amber}`, margin: '-8px' }}
                />
                <motion.div
                  animate={{ scale: [1, 1.36, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                  className="absolute inset-0 rounded-sm pointer-events-none"
                  style={{ border: `1px solid ${C.amber}`, margin: '-18px' }}
                />

                <motion.a
                  href="/apply"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="group relative inline-flex items-center justify-center gap-3
                             font-mono text-[0.65rem] tracking-[0.45em] uppercase
                             px-16 py-[1.25rem] overflow-hidden rounded-sm
                             transition-colors duration-300 hover:text-[#1A1A1B]"
                  style={{ color: C.amber, border: `1px solid ${C.amberBorder}` }}
                >
                  <span
                    className="absolute inset-0 origin-left scale-x-0 transition-transform
                               duration-300 ease-out group-hover:scale-x-100"
                    style={{ background: C.amber }}
                  />
                  <span className="relative z-10 flex items-center gap-3">
                    Initiate Your Application <ArrowRight size={14} />
                  </span>
                </motion.a>
              </div>

              {/* Trust micro-copy */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
                {[
                  { icon: CheckCircle2, text: 'No fee to apply' },
                  { icon: Users,        text: 'Community of Guardians' },
                  { icon: BookOpen,     text: 'Full training provided' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon size={11} style={{ color: C.amber, opacity: 0.55 }} />
                    <span
                      className="font-mono text-[0.5rem] tracking-[0.28em] uppercase"
                      style={{ color: C.fog }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="border-t px-8 md:px-16 py-10 flex flex-col md:flex-row
                   justify-between items-center gap-5"
        style={{ borderColor: C.hairline }}
      >
        <span
          className="font-mono text-[0.66rem] tracking-[0.38em] uppercase"
          style={{ color: C.amber }}
        >
          Basalith
        </span>
        <p
          className="font-display text-sm italic"
          style={{ color: `${C.white}20`, fontFamily: "'Cormorant Garamond', serif" }}
        >
          Memory, made permanent.
        </p>
        <div className="flex items-center gap-2">
          <Shield size={11} style={{ color: C.amber, opacity: 0.45 }} />
          <p
            className="font-mono text-[0.52rem] tracking-[0.3em] uppercase"
            style={{ color: C.fog }}
          >
            The Circle
          </p>
        </div>
      </footer>
    </main>
  );
}