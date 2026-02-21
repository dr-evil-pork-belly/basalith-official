'use client';

import { useRef, useState, ReactNode, useEffect } from 'react';
import { motion, useInView, Variants, useMotionValue, animate } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Shield,
  Cpu,
  HardDrive,
  Globe,
  Share2,
  Layers,
  Eye,
  EyeOff,
  Wifi,
  Activity,
  Terminal,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Archive,
  GitMerge,
  Timer,
  Scan,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// npm install framer-motion lucide-react
//
// tailwind.config.ts extend:
//   fontFamily: {
//     display: ['Cormorant Garamond', 'serif'],
//     mono:    ['DM Mono', 'monospace'],
//   }
//
// app/layout.tsx <head>:
//   <link rel="preconnect" href="https://fonts.googleapis.com" />
//   <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
//
// Route: app/vault/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  obsidian:    '#0B0C0E',
  obsidianMid: '#0F1012',
  obsidianLt:  '#141618',
  obsidianCard:'#181A1D',
  obsidianBrd: '#1E2126',
  amber:       '#FFB347',
  amberDim:    '#C47A1E',
  amberGlow:   'rgba(255,179,71,0.07)',
  amberGlowMd: 'rgba(255,179,71,0.12)',
  amberBorder: 'rgba(255,179,71,0.20)',
  green:       '#22C55E',
  greenGlow:   'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.20)',
  red:         '#EF4444',
  white:       '#F0F2F5',
  mist:        'rgba(240,242,245,0.50)',
  fog:         'rgba(240,242,245,0.25)',
  hairline:    'rgba(240,242,245,0.07)',
  gridLine:    'rgba(240,242,245,0.04)',
};

// ── Variants ──────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 32 },
  visible: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: d },
  }),
};
const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: (d = 0) => ({
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut', delay: d },
  }),
};
const stagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const cardIn: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

// ── Scroll Reveal ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '', variants: v = fadeUp }:
  { children: ReactNode; delay?: number; className?: string; variants?: Variants }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -64px 0px' });
  return (
    <motion.div ref={ref} variants={v} initial="hidden"
      animate={inView ? 'visible' : 'hidden'} custom={delay} className={className}>
      {children}
    </motion.div>
  );
}

// ── Section Eyebrow ────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Reveal>
      <div className="flex items-center gap-3 mb-8">
        <span className="inline-block w-5 h-px" style={{ background: T.amberBorder }} />
        <p className="font-mono text-[0.55rem] tracking-[0.45em] uppercase"
          style={{ color: T.amber, opacity: 0.7 }}>{children}</p>
      </div>
    </Reveal>
  );
}

// ── Animated Counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '', decimals = 0 }:
  { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, { duration: 2.2, ease: 'easeOut' });
    const unsubscribe = count.on('change', v => {
      if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix;
    });
    return () => { controls.stop(); unsubscribe(); };
  }, [inView, to, suffix, decimals, count]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── ARCHITECTURAL GRID BACKGROUND ────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function ArchGrid({ className = '', uid = 'a' }: { className?: string; uid?: string }) {
  const small = `grid-small-${uid}`;
  const large = `grid-large-${uid}`;
  return (
    <div aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={small} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={T.gridLine} strokeWidth="0.5" />
          </pattern>
          <pattern id={large} width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill={`url(#${small})`} />
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(240,242,245,0.065)" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${large})`} />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── ARCHITECTURE DIAGRAM ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function ArchDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  const layers = [
    {
      label: 'PUBLIC INTERNET',
      sublabel: 'Untrusted zone',
      icon: Globe,
      color: T.red,
      bg: 'rgba(239,68,68,0.06)',
      border: 'rgba(239,68,68,0.18)',
      blocked: true,
    },
    {
      label: 'PROFESSIONAL FIREWALL',
      sublabel: 'Stateful deep-packet inspection · Zero-trust policy engine',
      icon: ShieldCheck,
      color: T.amber,
      bg: T.amberGlow,
      border: T.amberBorder,
      blocked: false,
    },
    {
      label: 'SOVEREIGN PERSONA LAYER',
      sublabel: 'Air-gapped AI weight isolation · No external API calls',
      icon: Cpu,
      color: T.amber,
      bg: T.amberGlow,
      border: T.amberBorder,
      blocked: false,
    },
    {
      label: '100-YEAR COLD STORAGE',
      sublabel: 'M-DISC archival · Encrypted at rest · Geographically distributed',
      icon: HardDrive,
      color: T.green,
      bg: T.greenGlow,
      border: T.greenBorder,
      blocked: false,
    },
    {
      label: 'YOUR DIGITAL DOUBLE',
      sublabel: 'Private · Immutable · Sovereign',
      icon: Scan,
      color: T.green,
      bg: T.greenGlow,
      border: T.greenBorder,
      blocked: false,
    },
  ];

  return (
    <motion.div ref={ref} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className="relative space-y-1">

      {layers.map((layer, i) => {
        const Icon = layer.icon;
        const isTop = i === 0;
        return (
          <motion.div key={layer.label} variants={cardIn}>
            {/* Connector line between layers */}
            {!isTop && (
              <div className="flex justify-center h-5 items-center">
                <div className="flex flex-col items-center gap-0.5">
                  {layer.blocked ? null : (
                    <>
                      <div className="w-px h-2" style={{ background: `linear-gradient(to bottom, ${layers[i-1].color}, ${layer.color})` }} />
                      <motion.div
                        animate={{ y: [-4, 4, -4] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: layer.color, opacity: 0.8 }} />
                      <div className="w-px h-2" style={{ background: layer.color, opacity: 0.3 }} />
                    </>
                  )}
                  {layer.blocked && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-px" style={{ background: T.red, opacity: 0.4 }} />
                      <div className="font-mono text-[0.42rem] tracking-widest uppercase"
                        style={{ color: T.red, opacity: 0.7 }}>BLOCKED</div>
                      <div className="w-8 h-px" style={{ background: T.red, opacity: 0.4 }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative rounded-sm border px-5 py-4 flex items-center gap-4
                            transition-colors duration-300 group hover:opacity-90"
              style={{ background: layer.bg, borderColor: layer.border }}>

              {/* Left accent */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-sm"
                style={{ background: layer.color, opacity: 0.6 }} />

              <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${layer.border}` }}>
                <Icon size={14} style={{ color: layer.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-mono text-[0.58rem] tracking-[0.2em] font-normal"
                  style={{ color: layer.color }}>{layer.label}</p>
                <p className="font-mono text-[0.5rem] tracking-wide mt-0.5"
                  style={{ color: T.fog }}>{layer.sublabel}</p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isTop ? (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.red }} />
                ) : (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: layer.color }} />
                )}
                <span className="font-mono text-[0.45rem] tracking-widest uppercase"
                  style={{ color: isTop ? T.red : layer.color, opacity: 0.7 }}>
                  {isTop ? 'DENIED' : 'ACTIVE'}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SECURITY EPOCH TIMELINE ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const epochs = [
  {
    era:    'Epoch I',
    range:  '2024 – 2027',
    phase:  'Raw Data Ingestion',
    status: 'current',
    items: [
      'Family media upload & organization',
      'Relationship labeling via Essence Games',
      'Metadata enrichment & voice capture',
      'Initial AI weight seeding',
    ],
    icon: Archive,
  },
  {
    era:    'Epoch II',
    range:  '2027 – 2035',
    phase:  'Persona Formation',
    status: 'near',
    items: [
      'Fine-tuned persona model compilation',
      'Emotional tone fingerprinting',
      'Multi-generational context weaving',
      'Sovereign weight isolation complete',
    ],
    icon: Cpu,
  },
  {
    era:    'Epoch III',
    range:  '2035 – 2075',
    phase:  'Living Archive',
    status: 'future',
    items: [
      'Real-time family contributions merged',
      'Cross-epoch memory consolidation',
      'Cold storage migration cycles',
      'Adaptive persona refinement',
    ],
    icon: Layers,
  },
  {
    era:    'Epoch IV',
    range:  '2075 – 2124+',
    phase:  'Conversational Agent',
    status: 'far',
    items: [
      'Full natural language conversation',
      'Descendant access controls unlocked',
      'Centennial memory integrity audit',
      'The Century Conversation begins',
    ],
    icon: Wifi,
  },
];

function EpochCard({ era, range, phase, status, items, icon: Icon }:
  typeof epochs[0]) {
  const isCurrent = status === 'current';
  const isNear = status === 'near';
  const color = isCurrent ? T.amber : isNear ? T.amber : T.fog;
  const opacity = status === 'far' ? 0.45 : status === 'future' ? 0.65 : 1;

  return (
    <motion.div variants={cardIn}
      className="relative flex-1 min-w-[220px] border rounded-sm p-6 overflow-hidden
                 transition-colors duration-500 group"
      style={{
        background: T.obsidianCard,
        borderColor: isCurrent ? T.amberBorder : T.hairline,
        opacity,
      }}>

      {/* Current epoch indicator */}
      {isCurrent && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="absolute top-3 right-3 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.amber }} />
          <span className="font-mono text-[0.42rem] tracking-widest uppercase"
            style={{ color: T.amber }}>LIVE</span>
        </motion.div>
      )}

      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: isCurrent
            ? `linear-gradient(90deg, transparent, ${T.amber}, transparent)`
            : `linear-gradient(90deg, transparent, ${T.hairline}, transparent)`,
        }} />

      <div className="w-9 h-9 rounded flex items-center justify-center border mb-5"
        style={{ borderColor: isCurrent ? T.amberBorder : T.hairline,
                 background: isCurrent ? T.amberGlow : 'transparent' }}>
        <Icon size={15} style={{ color: isCurrent ? T.amber : T.fog }} />
      </div>

      <p className="font-mono text-[0.52rem] tracking-[0.3em] uppercase mb-1"
        style={{ color: isCurrent ? T.amber : T.fog, opacity: 0.7 }}>{era}</p>
      <p className="font-mono text-[0.48rem] tracking-wide mb-3"
        style={{ color: T.fog, opacity: 0.5 }}>{range}</p>
      <h4 className="font-display text-[1.05rem] font-normal tracking-tight mb-4"
        style={{ color: T.white, fontFamily: "'Cormorant Garamond', serif" }}>{phase}</h4>

      <ul className="space-y-2">
        {items.map(item => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 size={10} className="flex-shrink-0 mt-0.5"
              style={{ color: isCurrent ? T.amber : T.fog, opacity: isCurrent ? 0.8 : 0.4 }} />
            <span className="font-mono text-[0.52rem] leading-relaxed tracking-wide"
              style={{ color: T.mist, opacity: isCurrent ? 0.8 : 0.5 }}>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function SecurityEpochTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });

  return (
    <div>
      {/* Progress bar */}
      <Reveal className="mb-6">
        <div className="relative h-1 rounded-full overflow-hidden"
          style={{ background: T.hairline }}>
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: '25%' } : { width: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="absolute left-0 top-0 bottom-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${T.amberDim}, ${T.amber})` }} />
          {/* Epoch markers */}
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full -translate-x-1/2"
              style={{ left: `${pct}%`, background: pct <= 25 ? T.amber : T.hairline,
                       border: `1px solid ${pct <= 25 ? T.amber : T.fog}`, opacity: pct <= 25 ? 1 : 0.4 }} />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-mono text-[0.46rem] tracking-widest uppercase"
            style={{ color: T.amber }}>Genesis · 2024</span>
          <span className="font-mono text-[0.46rem] tracking-widest uppercase"
            style={{ color: T.fog, opacity: 0.45 }}>Century Milestone · 2124</span>
        </div>
      </Reveal>

      {/* Cards */}
      <motion.div ref={ref} variants={stagger} initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px"
        style={{ background: T.hairline }}>
        {epochs.map(e => <EpochCard key={e.era} {...e} />)}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── TERMINAL LOG ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const terminalLines = [
  { delay: 0,    type: 'sys',  text: 'BASALITH VAULT SECURITY DAEMON v4.1.0' },
  { delay: 0.3,  type: 'sys',  text: 'Initializing sovereign enclave...' },
  { delay: 0.6,  type: 'ok',   text: '[OK] Air-gap verification: PASS' },
  { delay: 0.9,  type: 'ok',   text: '[OK] Weight isolation layer: ACTIVE' },
  { delay: 1.2,  type: 'ok',   text: '[OK] Cold storage integrity: VERIFIED' },
  { delay: 1.5,  type: 'ok',   text: '[OK] Firewall policy engine: RUNNING' },
  { delay: 1.8,  type: 'ok',   text: '[OK] Encryption at rest: AES-256-GCM' },
  { delay: 2.1,  type: 'warn', text: '[WARN] External network access: DISABLED BY DESIGN' },
  { delay: 2.4,  type: 'ok',   text: '[OK] Geo-distributed replica: 3/3 nodes online' },
  { delay: 2.7,  type: 'ok',   text: '[OK] M-DISC archival checksum: VALID' },
  { delay: 3.0,  type: 'sys',  text: 'Vault secure. Digital Double protected.' },
  { delay: 3.4,  type: 'blink',text: '█' },
];

function TerminalLog() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  const colorMap: Record<string, string> = {
    sys:  T.amber,
    ok:   T.green,
    warn: '#F59E0B',
    blink: T.amber,
  };

  return (
    <Reveal>
      <div className="relative rounded-sm border overflow-hidden"
        style={{ background: T.obsidianMid, borderColor: T.amberBorder }}>

        {/* Terminal chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: T.hairline, background: T.obsidianLt }}>
          <div className="flex gap-1.5">
            {[T.red, '#F59E0B', T.green].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Terminal size={11} style={{ color: T.fog }} />
            <span className="font-mono text-[0.5rem] tracking-widest uppercase"
              style={{ color: T.fog }}>vault-security — zsh</span>
          </div>
        </div>

        {/* Lines */}
        <div ref={ref} className="p-5 space-y-1.5 min-h-[220px]">
          {terminalLines.map((line, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.3, delay: line.delay, ease: 'easeOut' }}
              className="flex items-start gap-2">
              {line.type !== 'blink' && (
                <span className="font-mono text-[0.5rem] select-none flex-shrink-0 mt-0.5"
                  style={{ color: T.fog }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              )}
              {line.type === 'blink' ? (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="font-mono text-[0.58rem]"
                  style={{ color: T.amber }}>
                  █
                </motion.span>
              ) : (
                <span className="font-mono text-[0.58rem] leading-relaxed"
                  style={{ color: colorMap[line.type] }}>
                  {line.text}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── FEATURE CARDS ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Cpu,
    title: 'Sovereign Persona Architecture',
    tag: 'AI Isolation',
    body: 'Your Digital Double\'s AI weights live in a dedicated sovereign enclave — a hardware-isolated compute environment with no egress routes to the public internet. The model that holds your ancestor\'s voice cannot be queried, cloned, or extracted by any external service.',
    specs: [
      'Hardware-level memory encryption (TME)',
      'No external API surface',
      'Cryptographic attestation on boot',
      'Zero outbound network policy',
    ],
  },
  {
    icon: HardDrive,
    title: '100-Year Cold Storage',
    tag: 'Archival Strategy',
    body: 'Standard hard drives fail within 5 years. SSDs within 10. Basalith uses M-DISC archival technology — laser-etched synthetic stone rated for 1,000+ years — combined with triple-redundant, geographically distributed copies on three continents.',
    specs: [
      'M-DISC: 1,000-year rated longevity',
      'AES-256-GCM encryption at rest',
      '3-continent geo-redundancy',
      'Annual integrity hash verification',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Professional Firewall',
    tag: 'Zero-Trust Perimeter',
    body: 'A stateful, AI-assisted policy engine sits between the public internet and your private Digital Double. Every inbound request is authenticated, cryptographically signed, and evaluated against your personal access policy before any connection is permitted.',
    specs: [
      'Stateful deep-packet inspection',
      'Per-family access policy engine',
      'mTLS with certificate pinning',
      'Real-time anomaly detection',
    ],
  },
];

function FeatureCard({ icon: Icon, title, tag, body, specs }: typeof features[0]) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={cardIn}
      className="group relative border rounded-sm overflow-hidden transition-all duration-500
                 hover:border-[rgba(255,179,71,0.28)] cursor-pointer"
      style={{ background: T.obsidianCard, borderColor: T.hairline }}
      onClick={() => setOpen(o => !o)}>

      {/* Architectural corner accent */}
      <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
        style={{ borderTop: `1px solid ${T.amberBorder}`, borderRight: `1px solid ${T.amberBorder}` }} />
      <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none"
        style={{ borderBottom: `1px solid ${T.hairline}`, borderLeft: `1px solid ${T.hairline}` }} />

      {/* Top accent line */}
      <span className="absolute inset-x-0 top-0 h-[1.5px] origin-left scale-x-0
                       transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: `linear-gradient(90deg, ${T.amber}, transparent)` }} />

      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="w-11 h-11 rounded flex items-center justify-center border"
            style={{ borderColor: T.amberBorder, background: T.amberGlow, color: T.amber }}>
            <Icon size={18} />
          </div>
          <span className="font-mono text-[0.48rem] tracking-[0.3em] uppercase rounded-sm px-2 py-1"
            style={{ color: T.fog, border: `1px solid ${T.hairline}`, background: 'rgba(255,255,255,0.02)' }}>
            {tag}
          </span>
        </div>

        <h3 className="font-display text-[1.25rem] font-normal tracking-tight mb-3"
          style={{ color: T.white, fontFamily: "'Cormorant Garamond', serif" }}>{title}</h3>
        <p className="font-mono text-[0.62rem] leading-[1.8] mb-5"
          style={{ color: T.mist }}>{body}</p>

        {/* Expandable specs */}
        <motion.div animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="overflow-hidden">
          <div className="border-t pt-4 mt-2 space-y-2" style={{ borderColor: T.hairline }}>
            {specs.map(s => (
              <div key={s} className="flex items-center gap-2">
                <CheckCircle2 size={10} style={{ color: T.green, opacity: 0.8 }} />
                <span className="font-mono text-[0.52rem] tracking-wide"
                  style={{ color: T.mist, opacity: 0.7 }}>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <button className="flex items-center gap-1.5 font-mono text-[0.5rem] tracking-[0.25em]
                           uppercase mt-4 transition-opacity hover:opacity-80"
          style={{ color: T.amber, opacity: 0.65 }}>
          <Scan size={10} />
          {open ? 'Hide specs' : 'View specs'}
        </button>
      </div>
    </motion.div>
  );
}

function FeatureGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid grid-cols-1 md:grid-cols-3 gap-px"
      style={{ background: T.hairline }}>
      {features.map(f => <FeatureCard key={f.title} {...f} />)}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── STAT STRIP ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const stats = [
  { value: 1000, suffix: '+', label: 'Year M-DISC rated longevity', icon: HardDrive },
  { value: 256,  suffix: '-bit', label: 'AES encryption key length', icon: KeyRound },
  { value: 3,    suffix: 'x', label: 'Geo-redundant replica nodes', icon: Share2 },
  { value: 0,    suffix: ' external APIs', label: 'Zero egress to public internet', icon: EyeOff },
];

function StatStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid grid-cols-2 md:grid-cols-4 gap-px"
      style={{ background: T.hairline }}>
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <motion.div key={stat.label} variants={cardIn}
            className="px-8 py-10 flex flex-col gap-3"
            style={{ background: T.obsidianCard }}>
            <Icon size={16} style={{ color: T.amber, opacity: 0.6 }} />
            <div>
              <p className="font-mono font-light leading-none"
                style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: T.amber }}>
                {inView && <Counter to={stat.value} suffix={stat.suffix} />}
              </p>
            </div>
            <p className="font-mono text-[0.55rem] leading-relaxed tracking-wide"
              style={{ color: T.fog }}>{stat.label}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function VaultPage() {
  return (
    <main className="min-h-screen overflow-x-hidden"
      style={{ background: T.obsidian, color: T.white, fontFamily: "'Cormorant Garamond', serif" }}>

      {/* ── Global grid ──────────────────────────────────────────────────── */}
      <ArchGrid className="fixed z-0" />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <motion.nav variants={fadeIn} initial="hidden" animate="visible" custom={0.1}
        className="fixed top-0 inset-x-0 z-40 flex justify-between items-center
                   px-8 md:px-16 py-7"
        style={{ background: `linear-gradient(to bottom, ${T.obsidian}F5, transparent)` }}>
        <span className="font-mono text-[0.68rem] tracking-[0.38em] uppercase"
          style={{ color: T.amber }}>Basalith</span>
        <div className="flex items-center gap-2">
          <Lock size={12} style={{ color: T.amber }} />
          <span className="font-mono text-[0.56rem] tracking-[0.28em] uppercase"
            style={{ color: T.fog }}>The Vault</span>
        </div>
      </motion.nav>

      {/* ─────────────────────────────────────────────────────────────────
          ── 01 HERO ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center
                          text-center px-6 pt-32 pb-24 overflow-hidden z-10">

        {/* Cross-hair decoration */}
        <div aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: 1, height: '60vh', background: `linear-gradient(to bottom, transparent, ${T.amberBorder}, transparent)`, opacity: 0.3 }} />
        <div aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: '60vw', height: 1, background: `linear-gradient(to right, transparent, ${T.amberBorder}, transparent)`, opacity: 0.3 }} />

        {/* Amber core glow */}
        <div aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{ width: 600, height: 600,
                   background: `radial-gradient(circle, rgba(255,179,71,0.05) 0%, transparent 65%)` }} />

        {/* Vault icon */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.2} className="mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-sm flex items-center justify-center border mx-auto"
              style={{ borderColor: T.amberBorder, background: T.amberGlow }}>
              <Shield size={26} style={{ color: T.amber }} />
            </div>
            {/* Corner brackets */}
            {[
              'top-0 left-0 border-t border-l',
              'top-0 right-0 border-t border-r',
              'bottom-0 left-0 border-b border-l',
              'bottom-0 right-0 border-b border-r',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-3 h-3 ${cls}`}
                style={{ borderColor: T.amber, opacity: 0.5,
                         [cls.includes('top') ? 'top' : 'bottom']: -4,
                         [cls.includes('left') ? 'left' : 'right']: -4 }} />
            ))}
          </div>
        </motion.div>

        <motion.p variants={fadeIn} initial="hidden" animate="visible" custom={0.3}
          className="font-mono text-[0.55rem] tracking-[0.5em] uppercase mb-8"
          style={{ color: T.amber, opacity: 0.65 }}>The Vault — Security Architecture</motion.p>

        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.44}
          className="text-[clamp(2.6rem,7vw,7.5rem)] font-light leading-[0.93] tracking-tight mb-3 max-w-4xl">
          Absolute Trust.
        </motion.h1>
        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.57}
          className="text-[clamp(2.6rem,7vw,7.5rem)] font-light italic leading-[0.95] tracking-tight mb-10 max-w-4xl"
          style={{ color: T.amber }}>
          For 100 Years.
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0.7}
          className="font-mono text-[clamp(0.7rem,1.4vw,0.9rem)] font-light max-w-[560px] leading-[1.85] mb-14"
          style={{ color: T.mist }}>
          The Basalith Vault is a hardened, sovereign data architecture designed to
          protect your family&apos;s Digital Double against every threat — including
          the passage of time itself.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.84}
          className="flex flex-col sm:flex-row gap-4 items-center">
          <motion.a href="#initiate"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="group relative inline-flex items-center gap-3 font-mono text-[0.63rem]
                       tracking-[0.4em] uppercase px-12 py-[1.1rem] overflow-hidden rounded-sm
                       transition-colors duration-300 hover:text-[#0B0C0E]"
            style={{ color: T.amber, border: `1px solid ${T.amberBorder}` }}>
            <span className="absolute inset-0 origin-left scale-x-0 transition-transform
                             duration-300 ease-out group-hover:scale-x-100"
              style={{ background: T.amber }} />
            <span className="relative z-10 flex items-center gap-3">
              <Lock size={12} /> Initiate Vault Security
            </span>
          </motion.a>
          <a href="#architecture"
            className="font-mono text-[0.6rem] tracking-[0.35em] uppercase flex items-center gap-2
                       transition-opacity hover:opacity-80"
            style={{ color: T.fog }}>
            View Architecture <ArrowRight size={12} />
          </a>
        </motion.div>

        {/* Scroll cue */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={1.4}
          aria-hidden="true"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <motion.span animate={{ scaleY: [1, 1.2, 1], opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="block w-px h-12 origin-top"
            style={{ background: `linear-gradient(to bottom, ${T.amber}, transparent)` }} />
          <span className="font-mono text-[0.46rem] tracking-[0.4em] uppercase"
            style={{ color: `${T.amber}44` }}>Scroll</span>
        </motion.div>
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full relative z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${T.amberBorder}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 02 STAT STRIP ─────────────────────────────────────────────── */}
      <section className="relative z-10">
        <StatStrip />
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full relative z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${T.hairline}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 03 ARCHITECTURE DIAGRAM + TERMINAL ────────────────────────── */}
      <section id="architecture" className="py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>03 — Security Architecture</Eyebrow>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left: copy + diagram */}
            <div>
              <Reveal>
                <h2 className="text-[clamp(2.2rem,4vw,4.5rem)] font-light leading-[1.05] tracking-tight mb-6">
                  Seven layers between
                  <br />
                  <span className="italic" style={{ color: T.amber }}>them and your legacy.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="font-mono text-[0.65rem] leading-[1.85] mb-10" style={{ color: T.mist }}>
                  The Vault&apos;s defense-in-depth model isolates your Digital Double
                  behind a sequence of authenticated, encrypted, and hardware-enforced
                  barriers. No single point of failure. No external dependencies. No exceptions.
                </p>
              </Reveal>
              <ArchDiagram />
            </div>

            {/* Right: terminal */}
            <div className="space-y-8">
              <Reveal>
                <h3 className="font-display text-[1.4rem] font-light tracking-tight"
                  style={{ color: T.white, fontFamily: "'Cormorant Garamond', serif" }}>
                  Live Security Log
                </h3>
                <p className="font-mono text-[0.58rem] mt-1" style={{ color: T.fog }}>
                  Real-time output from the Vault security daemon
                </p>
              </Reveal>
              <TerminalLog />

              {/* Access control callout */}
              <Reveal delay={0.1}>
                <div className="border rounded-sm p-5 flex items-start gap-4"
                  style={{ borderColor: T.greenBorder, background: T.greenGlow }}>
                  <div className="flex-shrink-0 mt-0.5">
                    <Lock size={15} style={{ color: T.green }} />
                  </div>
                  <div>
                    <p className="font-mono text-[0.55rem] tracking-[0.25em] uppercase mb-1.5"
                      style={{ color: T.green }}>Access Control Model</p>
                    <p className="font-mono text-[0.58rem] leading-[1.75]" style={{ color: T.mist }}>
                      Your Digital Double responds only to identities you have explicitly
                      authorized. Each family member is issued a cryptographic key. Access
                      is time-limited, auditable, and revocable at any moment.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full relative z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${T.hairline}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 04 FEATURE CARDS ──────────────────────────────────────────── */}
      <section className="py-28 relative z-10"
        style={{ background: `linear-gradient(to bottom, transparent, rgba(255,179,71,0.02) 50%, transparent)` }}>
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>04 — Three Pillars of Defensibility</Eyebrow>
          <div className="max-w-xl mb-14">
            <Reveal>
              <h2 className="text-[clamp(2rem,3.8vw,4.2rem)] font-light leading-[1.07] tracking-tight">
                Not security as a feature.
                <br />
                <span className="italic" style={{ color: T.amber }}>
                  Security as the architecture.
                </span>
              </h2>
            </Reveal>
          </div>
          <FeatureGrid />
        </div>
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full relative z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${T.hairline}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 05 SECURITY EPOCH TIMELINE ────────────────────────────────── */}
      <section className="py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>05 — Security Epoch Timeline</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-end mb-16">
            <Reveal>
              <h2 className="text-[clamp(2rem,3.8vw,4.2rem)] font-light leading-[1.07] tracking-tight">
                From raw data today
                <br />
                <span className="italic" style={{ color: T.amber }}>
                  to a living voice in 2124.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-mono text-[0.64rem] leading-[1.85]" style={{ color: T.mist }}>
                The Vault is built on a 100-year security and capability roadmap. Each
                Epoch advances both the protection of your data and the richness of your
                Digital Double. You are currently in Epoch I.
              </p>
            </Reveal>
          </div>
          <SecurityEpochTimeline />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          ── 06 CTA ────────────────────────────────────────────────────── */}
      <section id="initiate" className="py-28 relative overflow-hidden z-10">

        {/* Grid inside CTA section */}
        <ArchGrid uid="b" />

        {/* Amber glow */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% 100%, rgba(255,179,71,0.06) 0%, transparent 65%)` }} />

        <div className="max-w-3xl mx-auto px-8 md:px-16 text-center relative z-10">
          <Reveal>
            <div className="w-16 h-16 rounded-sm flex items-center justify-center border mx-auto mb-10"
              style={{ borderColor: T.amberBorder, background: T.amberGlowMd }}>
              <Lock size={24} style={{ color: T.amber }} />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="text-[clamp(2.2rem,4.8vw,5rem)] font-light leading-[1.0] tracking-tight mb-6">
              Your family&apos;s legacy
              <br />
              <span className="italic" style={{ color: T.amber }}>deserves this level of protection.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="font-mono text-[0.65rem] leading-[1.85] max-w-xl mx-auto mb-14"
              style={{ color: T.mist }}>
              The Vault is not a product feature. It is the foundational promise
              of Basalith: that what your family builds today will be accessible,
              intact, and alive for every generation that follows — no matter what.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a href="mailto:vault@basalith.com"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center justify-center gap-3
                           font-mono text-[0.63rem] tracking-[0.4em] uppercase
                           px-14 py-[1.15rem] overflow-hidden rounded-sm
                           transition-colors duration-300 hover:text-[#0B0C0E]"
                style={{ color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                <span className="absolute inset-0 origin-left scale-x-0 transition-transform
                                 duration-300 ease-out group-hover:scale-x-100"
                  style={{ background: T.amber }} />
                <span className="relative z-10 flex items-center gap-3">
                  <Lock size={12} /> Initiate Vault Security
                </span>
              </motion.a>
            </div>
          </Reveal>

          {/* Trust indicators */}
          <Reveal delay={0.3}>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
              {[
                { icon: ShieldCheck, label: 'SOC 2 Type II Compliant' },
                { icon: KeyRound,    label: 'End-to-End Encrypted' },
                { icon: Eye,         label: 'Zero-Knowledge Architecture' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={11} style={{ color: T.amber, opacity: 0.6 }} />
                  <span className="font-mono text-[0.5rem] tracking-[0.25em] uppercase"
                    style={{ color: T.fog }}>{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t px-8 md:px-16 py-10 flex flex-col md:flex-row
                         justify-between items-center gap-4 relative z-10"
        style={{ borderColor: T.hairline }}>
        <span className="font-mono text-[0.66rem] tracking-[0.38em] uppercase"
          style={{ color: T.amber }}>Basalith</span>
        <p className="font-display text-sm italic"
          style={{ color: `${T.white}20`, fontFamily: "'Cormorant Garamond', serif" }}>
          Memory, made permanent.
        </p>
        <div className="flex items-center gap-2">
          <Lock size={11} style={{ color: T.amber, opacity: 0.5 }} />
          <p className="font-mono text-[0.52rem] tracking-[0.3em] uppercase"
            style={{ color: T.fog }}>The Vault</p>
        </div>
      </footer>
    </main>
  );
}