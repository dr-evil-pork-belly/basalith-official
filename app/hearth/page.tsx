'use client';

import { useRef, useState, ReactNode } from 'react';
import { motion, useInView, Variants, AnimatePresence } from 'framer-motion';
import {
  Users,
  Sparkles,
  ShieldCheck,
  Heart,
  ChevronRight,
  Star,
  BookOpen,
  Flame,
  TreePine,
  Clock,
  MessageCircle,
  Camera,
  ArrowRight,
  Play,
  CheckCircle2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// npm install framer-motion lucide-react
//
// tailwind.config.ts extend:
//   fontFamily: {
//     display: ['Cormorant Garamond', 'serif'],
//     mono:    ['DM Mono', 'monospace'],
//     body:    ['Lora', 'serif'],
//   }
//
// app/layout.tsx <head>:
//   <link rel="preconnect" href="https://fonts.googleapis.com" />
//   <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Mono:wght@300;400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
//
// Route: app/hearth/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  obsidian:     '#0E0D0B',
  obsidianMid:  '#141310',
  obsidianLt:   '#1C1A17',
  obsidianCard: '#201E1A',
  amber:        '#FFB347',
  amberWarm:    '#F5A030',
  amberDeep:    '#C47A1E',
  amberGlow:    'rgba(255,179,71,0.08)',
  amberGlowMd:  'rgba(255,179,71,0.14)',
  amberBorder:  'rgba(255,179,71,0.20)',
  amberText:    '#FFB347',
  cream:        '#F5EED8',
  white:        '#FFFFFF',
  mist:         'rgba(245,238,216,0.55)',
  fog:          'rgba(245,238,216,0.28)',
  hairline:     'rgba(245,238,216,0.08)',
};

// ── Variants ──────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 36 },
  visible: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: d },
  }),
};

const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: (d = 0) => ({
    opacity: 1,
    transition: { duration: 0.85, ease: 'easeOut', delay: d },
  }),
};

const stagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.13 } },
};

const cardIn: Variants = {
  hidden:  { opacity: 0, y: 28 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideLeft: Variants = {
  hidden:  { opacity: 0, x: 48 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1] },
  },
};

// ── Scroll Reveal ─────────────────────────────────────────────────────────────
function Reveal({
  children, delay = 0, className = '',
  variants: v = fadeUp,
}: {
  children: ReactNode; delay?: number; className?: string; variants?: Variants;
}) {
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
        <span className="inline-block w-6 h-px" style={{ background: T.amberBorder }} />
        <p className="font-mono text-[0.57rem] tracking-[0.45em] uppercase"
          style={{ color: T.amber, opacity: 0.75 }}>
          {children}
        </p>
      </div>
    </Reveal>
  );
}

// ── Hearth Glow ───────────────────────────────────────────────────────────────
// Reusable pulsing amber orb — the visual metaphor for warmth throughout the page
function HearthGlow({
  size = 600, opacity = 0.06, className = '',
}: { size?: number; opacity?: number; className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      animate={{ scale: [1, 1.08, 1], opacity: [opacity, opacity * 1.4, opacity] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size, height: size,
        background: `radial-gradient(circle, ${T.amber} 0%, transparent 70%)`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MOBILE APP MOCK — Essence Games ──────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const questPrompts = [
  {
    quest:    'Tell us the emotion in this moment.',
    hint:     'What was everyone feeling just before this was taken?',
    tag:      '🎭 Emotion Quest',
    xp:       '+40 XP',
    color:    '#C47A1E',
  },
  {
    quest:    'Who almost didn\'t make it to this gathering?',
    hint:     'Every family has a story like this. What\'s yours?',
    tag:      '🔍 Mystery Quest',
    xp:       '+55 XP',
    color:    '#7B5EA7',
  },
  {
    quest:    'What song was playing, or should have been?',
    hint:     'Name the soundtrack of this memory.',
    tag:      '🎵 Soundtrack Quest',
    xp:       '+35 XP',
    color:    '#2A7A5E',
  },
];

function EssenceGamesMock() {
  const [activeQuest, setActiveQuest] = useState(0);
  const [answered, setAnswered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });

  const current = questPrompts[activeQuest];

  return (
    <motion.div
      ref={ref}
      variants={slideLeft}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="relative"
    >
      {/* Outer ambient glow behind the phone */}
      <div aria-hidden="true" className="absolute inset-0 rounded-[3rem] blur-3xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 60%, ${T.amber}, transparent 65%)` }} />

      {/* Phone shell */}
      <div className="relative mx-auto w-[320px] sm:w-[360px]"
        style={{ filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.7))' }}>

        {/* Phone body */}
        <div className="relative rounded-[2.8rem] overflow-hidden border-2"
          style={{ borderColor: 'rgba(255,255,255,0.10)', background: '#0A0908' }}>

          {/* Notch bar */}
          <div className="flex items-center justify-between px-7 pt-4 pb-2">
            <span className="font-mono text-[0.5rem] tracking-widest" style={{ color: T.fog }}>9:41</span>
            <div className="w-20 h-5 rounded-full" style={{ background: '#111' }} />
            <div className="flex items-center gap-1">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-sm" style={{
                  width: 3, height: 3 + i * 2,
                  background: i < 3 ? T.amber : T.hairline,
                  opacity: i < 3 ? 0.8 : 0.3,
                }} />
              ))}
            </div>
          </div>

          {/* App header */}
          <div className="px-6 pb-3 flex items-center justify-between border-b"
            style={{ borderColor: T.hairline }}>
            <div className="flex items-center gap-2">
              <Flame size={14} style={{ color: T.amber }} />
              <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase"
                style={{ color: T.amber }}>Hearth</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: T.amberGlow, border: `1px solid ${T.amberBorder}` }}>
              <Star size={9} fill={T.amber} style={{ color: T.amber }} />
              <span className="font-mono text-[0.52rem]" style={{ color: T.amber }}>1,240 XP</span>
            </div>
          </div>

          {/* Photo area — rich gradient placeholder representing a family photo */}
          <div className="relative mx-5 mt-5 rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {/* Simulated warm family photo with gradients + shapes */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #3D2B1A 0%, #5C3A20 30%, #8B5A2B 60%, #4A2E18 100%)' }} />
            {/* Warm light source */}
            <div aria-hidden="true" className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 60% 50% at 65% 35%, rgba(255,179,71,0.35) 0%, transparent 65%)' }} />
            {/* Silhouette shapes suggesting people around a table */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
              {/* Table */}
              <ellipse cx="160" cy="195" rx="110" ry="18" fill="rgba(0,0,0,0.45)" />
              {/* Candle glow */}
              <ellipse cx="160" cy="145" rx="28" ry="34" fill="rgba(255,179,71,0.18)" />
              <rect x="155" y="135" width="10" height="22" rx="2" fill="rgba(255,200,100,0.55)" />
              <ellipse cx="160" cy="135" rx="6" ry="8" fill="rgba(255,220,120,0.7)" />
              {/* Person silhouettes */}
              {[
                { cx: 60, cy: 175 }, { cx: 110, cy: 168 }, { cx: 210, cy: 168 }, { cx: 260, cy: 175 },
              ].map((p, i) => (
                <g key={i}>
                  <circle cx={p.cx} cy={p.cy - 22} r="14" fill="rgba(30,20,10,0.75)" />
                  <ellipse cx={p.cx} cy={p.cy + 8} rx="18" ry="26" fill="rgba(30,20,10,0.65)" />
                </g>
              ))}
              {/* Child silhouette, smaller */}
              <circle cx="160" cy="174" r="10" fill="rgba(30,20,10,0.6)" />
              <ellipse cx="160" cy="192" rx="12" ry="18" fill="rgba(30,20,10,0.5)" />
            </svg>
            {/* Vignette */}
            <div aria-hidden="true" className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.55) 100%)' }} />
            {/* Year label */}
            <div className="absolute bottom-3 left-3 rounded-full px-2.5 py-0.5"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
              <span className="font-mono text-[0.5rem] tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Christmas 1994 · Gran's House
              </span>
            </div>
            {/* Camera icon */}
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
              <Camera size={12} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </div>
          </div>

          {/* Quest card */}
          <div className="mx-5 mt-4 rounded-2xl p-4 border"
            style={{
              background: `linear-gradient(135deg, ${T.obsidianCard}, #17140F)`,
              borderColor: T.amberBorder,
            }}>
            {/* Quest tag */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[0.5rem] tracking-[0.25em] uppercase rounded-full px-2.5 py-1"
                style={{
                  color: T.amber,
                  background: T.amberGlow,
                  border: `1px solid ${T.amberBorder}`,
                }}>
                {current.tag}
              </span>
              <motion.span
                key={activeQuest}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-mono text-[0.5rem] font-bold tracking-wide"
                style={{ color: T.amber }}>
                {current.xp}
              </motion.span>
            </div>

            {/* Quest question */}
            <AnimatePresence mode="wait">
              <motion.p
                key={activeQuest}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="font-display text-[1rem] font-medium leading-snug mb-1.5"
                style={{ color: T.cream, fontFamily: "'Cormorant Garamond', serif" }}>
                {current.quest}
              </motion.p>
            </AnimatePresence>

            <p className="font-body text-[0.7rem] leading-relaxed mb-4"
              style={{ color: T.mist, fontFamily: "'Lora', serif", fontStyle: 'italic' }}>
              {current.hint}
            </p>

            {/* Input row */}
            <div className="flex gap-2 items-center">
              <AnimatePresence mode="wait">
                {!answered ? (
                  <motion.div key="input" initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 border"
                    style={{ background: 'rgba(0,0,0,0.3)', borderColor: T.hairline }}>
                    <MessageCircle size={12} style={{ color: T.fog }} />
                    <span className="font-display text-[0.7rem] italic"
                      style={{ color: T.fog, fontFamily: "'Cormorant Garamond', serif" }}>
                      Share your memory...
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="answered" initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ background: 'rgba(255,179,71,0.10)', border: `1px solid ${T.amberBorder}` }}>
                    <CheckCircle2 size={12} style={{ color: T.amber }} />
                    <span className="font-mono text-[0.55rem] tracking-wide"
                      style={{ color: T.amber }}>Memory captured!</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (!answered) {
                    setAnswered(true);
                    setTimeout(() => {
                      setAnswered(false);
                      setActiveQuest(q => (q + 1) % questPrompts.length);
                    }, 1200);
                  }
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: T.amber }}>
                <ArrowRight size={14} style={{ color: T.obsidian }} />
              </motion.button>
            </div>
          </div>

          {/* Quest selector dots */}
          <div className="flex items-center justify-center gap-2 py-4">
            {questPrompts.map((_, i) => (
              <button key={i} onClick={() => { setActiveQuest(i); setAnswered(false); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: activeQuest === i ? 20 : 6,
                  height: 6,
                  background: activeQuest === i ? T.amber : T.hairline,
                }} />
            ))}
          </div>

          {/* Bottom nav bar */}
          <div className="flex items-center justify-around px-6 pb-6 pt-1 border-t"
            style={{ borderColor: T.hairline }}>
            {[
              { icon: Flame, label: 'Hearth', active: true },
              { icon: BookOpen, label: 'Archive' },
              { icon: TreePine, label: 'Tree' },
              { icon: Users, label: 'Family' },
            ].map(({ icon: Icon, label, active }) => (
              <button key={label} className="flex flex-col items-center gap-1">
                <Icon size={16} style={{ color: active ? T.amber : T.fog }} />
                <span className="font-mono text-[0.45rem] tracking-wide uppercase"
                  style={{ color: active ? T.amber : T.fog }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Bridge Cards ──────────────────────────────────────────────────────────────
const bridgeItems = [
  {
    icon: Play,
    title: 'Children play a quest',
    desc: 'A child as young as 8 can answer "What makes Grandma laugh?" — a 10-second moment that takes zero effort.',
    step: '01',
  },
  {
    icon: Sparkles,
    title: 'Data becomes depth',
    desc: 'Each answer adds an emotional layer to the ancestor\'s Digital Double — their humor, their warmth, their particular way of seeing the world.',
    step: '02',
  },
  {
    icon: BookOpen,
    title: 'History becomes personal',
    desc: 'The child who answered learns the story behind the photo. The ancestor\'s voice grows richer. The family\'s memory deepens on both sides.',
    step: '03',
  },
  {
    icon: TreePine,
    title: 'The tree grows both ways',
    desc: 'Generations before and after are connected through this simple act. Playing a game today shapes what a great-grandchild will experience in 2127.',
    step: '04',
  },
];

function BridgeCard({ icon: Icon, title, desc, step }: typeof bridgeItems[0]) {
  return (
    <motion.div
      variants={cardIn}
      className="group relative p-8 border rounded-sm overflow-hidden transition-colors duration-500
                 hover:border-[rgba(255,179,71,0.28)]"
      style={{ background: T.obsidianCard, borderColor: T.hairline }}
    >
      {/* Hover glow */}
      <div aria-hidden="true"
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-sm"
        style={{ background: `radial-gradient(ellipse 80% 70% at 20% 80%, ${T.amberGlow}, transparent)` }} />

      {/* Step number — large background text */}
      <span aria-hidden="true"
        className="absolute top-4 right-5 font-mono font-light select-none pointer-events-none"
        style={{ fontSize: '4.5rem', lineHeight: 1, color: T.hairline, letterSpacing: '-0.04em' }}>
        {step}
      </span>

      <div className="relative z-10">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border mb-6
                        transition-colors duration-300 group-hover:border-[rgba(255,179,71,0.45)]"
          style={{ borderColor: T.amberBorder, background: T.amberGlow, color: T.amber }}>
          <Icon size={16} />
        </div>
        <h3 className="font-display text-[1.2rem] font-normal tracking-tight mb-3"
          style={{ color: T.cream, fontFamily: "'Cormorant Garamond', serif" }}>
          {title}
        </h3>
        <p className="font-body text-[0.97rem] font-light leading-[1.82] italic"
          style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

function BridgeGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid grid-cols-1 md:grid-cols-2 gap-px"
      style={{ background: T.hairline }}>
      {bridgeItems.map((item) => <BridgeCard key={item.step} {...item} />)}
    </motion.div>
  );
}

// ── Pillar Cards ──────────────────────────────────────────────────────────────
const pillars = [
  {
    icon: Users,
    title: 'Built for Every Generation',
    desc: 'Quests adapt to the player\'s age. An 8-year-old answers in two words. A 45-year-old writes a paragraph. Both matter equally to the Digital Double.',
  },
  {
    icon: Sparkles,
    title: 'Gamification with Gravity',
    desc: 'XP, streaks, and family leaderboards make labeling feel like a game — but the output is an irreplaceable artifact of human memory.',
  },
  {
    icon: ShieldCheck,
    title: 'Sovereign & Secure',
    desc: 'Your family\'s data is never sold, never shared, never used to train external models. The Hearth is yours alone — encrypted, owned, and sovereign.',
  },
];

function PillarCard({ icon: Icon, title, desc }: typeof pillars[0]) {
  return (
    <motion.div variants={cardIn}
      className="group relative p-8 border rounded-sm overflow-hidden
                 transition-all duration-500 hover:border-[rgba(255,179,71,0.30)]"
      style={{ background: T.obsidianCard, borderColor: T.hairline }}>
      {/* Top accent line */}
      <span className="absolute inset-x-0 top-0 h-[1.5px] origin-left scale-x-0
                       transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: `linear-gradient(90deg, ${T.amber}, transparent)` }} />

      <div className="w-11 h-11 rounded-full flex items-center justify-center border mb-6
                      transition-colors duration-300 group-hover:border-[rgba(255,179,71,0.5)]"
        style={{ borderColor: T.amberBorder, background: T.amberGlow, color: T.amber }}>
        <Icon size={18} />
      </div>

      <h3 className="font-display text-[1.22rem] font-normal tracking-tight mb-3"
        style={{ color: T.cream, fontFamily: "'Cormorant Garamond', serif" }}>
        {title}
      </h3>
      <p className="font-body text-[0.97rem] font-light leading-[1.82] italic"
        style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
        {desc}
      </p>
    </motion.div>
  );
}

function PillarGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid grid-cols-1 md:grid-cols-3 gap-px"
      style={{ background: T.hairline }}>
      {pillars.map((p) => <PillarCard key={p.title} {...p} />)}
    </motion.div>
  );
}

// ── Ritual Steps ──────────────────────────────────────────────────────────────
const ritualSteps = [
  { num: '01', title: 'Open the Hearth', body: 'After dinner, a parent opens the app. Tonight\'s quest appears: a photo from 20 years before anyone at the table was born.' },
  { num: '02', title: 'Pass the phone', body: 'Each person answers a single question. The youngest gives a word. The eldest tells a story. Both are captured. Both are equal.' },
  { num: '03', title: 'Watch the Double grow', body: 'On screen, the ancestor\'s Digital Double adds a new layer. The family watches their history become more alive in real time.' },
  { num: '04', title: 'Carry it forward', body: 'The session ends. The data is secured. In 100 years, a great-grandchild will sit down and speak to the voice the family built tonight.' },
];

function RitualStep({ num, title, body }: typeof ritualSteps[0]) {
  return (
    <motion.div variants={cardIn} className="flex gap-5 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-full border flex items-center
                      justify-center font-mono text-[0.65rem] mt-0.5"
        style={{ borderColor: T.amberBorder, color: T.amber, background: T.amberGlow }}>
        {num}
      </div>
      <div>
        <h4 className="font-display text-[1.12rem] font-medium mb-1.5"
          style={{ color: T.cream, fontFamily: "'Cormorant Garamond', serif" }}>
          {title}
        </h4>
        <p className="font-body text-[0.97rem] font-light italic leading-[1.78]"
          style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
          {body}
        </p>
      </div>
    </motion.div>
  );
}

function RitualSteps() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {ritualSteps.map((s) => <RitualStep key={s.num} {...s} />)}
    </motion.div>
  );
}

// ── Quote Pull ────────────────────────────────────────────────────────────────
function PullQuote({ text, attribution }: { text: string; attribution: string }) {
  return (
    <Reveal>
      <div className="relative py-12 px-8 md:px-16 text-center">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${T.amberBorder}, transparent)` }} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${T.amberBorder}, transparent)` }} />

        <span aria-hidden="true"
          className="absolute top-4 left-8 font-display select-none pointer-events-none"
          style={{ fontSize: '6rem', lineHeight: 0.7, color: T.amberGlow,
                   fontFamily: "'Cormorant Garamond', serif" }}>
          &ldquo;
        </span>

        <p className="font-display text-[clamp(1.4rem,3vw,2.2rem)] font-light italic
                      leading-[1.5] max-w-3xl mx-auto relative z-10"
          style={{ color: T.cream, fontFamily: "'Cormorant Garamond', serif" }}>
          {text}
        </p>
        <p className="font-mono text-[0.57rem] tracking-[0.4em] uppercase mt-6"
          style={{ color: T.amber, opacity: 0.65 }}>
          — {attribution}
        </p>
      </div>
    </Reveal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function HearthPage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: T.obsidian,
        color: T.cream,
        fontFamily: "'Cormorant Garamond', serif",
      }}
    >
      {/* ── Grain overlay ──────────────────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 opacity-[0.20]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }} />

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <motion.nav
        variants={fadeIn} initial="hidden" animate="visible" custom={0.1}
        className="fixed top-0 inset-x-0 z-40 flex justify-between items-center
                   px-8 md:px-16 py-7 backdrop-blur-sm"
        style={{ background: `linear-gradient(to bottom, ${T.obsidian}F0, transparent)` }}
      >
        <span className="font-mono text-[0.68rem] tracking-[0.38em] uppercase"
          style={{ color: T.amber }}>Basalith</span>
        <div className="flex items-center gap-2">
          <Flame size={12} style={{ color: T.amber }} />
          <span className="font-mono text-[0.56rem] tracking-[0.28em] uppercase"
            style={{ color: T.fog }}>The Hearth</span>
        </div>
      </motion.nav>

      {/* ─────────────────────────────────────────────────────────────────
          ── 01 HERO ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center
                          text-center px-6 pt-32 pb-24 overflow-hidden">

        {/* Central Hearth Glow */}
        <HearthGlow size={900} opacity={0.055} className="left-1/2 top-[45%]" />

        {/* Secondary warm glows */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 50% 40% at 30% 70%, rgba(196,122,30,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 40% 35% at 75% 25%, rgba(255,179,71,0.05) 0%, transparent 55%)
            `,
          }} />

        {/* Decorative ring */}
        <div aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     rounded-full border pointer-events-none"
          style={{
            width: 640, height: 640,
            borderColor: 'rgba(255,179,71,0.05)',
            boxShadow: `0 0 80px 20px rgba(255,179,71,0.03)`,
          }} />
        <div aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     rounded-full border pointer-events-none"
          style={{ width: 920, height: 920, borderColor: 'rgba(255,179,71,0.03)' }} />

        {/* Flame icon */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.2}
          className="mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border mx-auto"
            style={{ borderColor: T.amberBorder, background: T.amberGlow }}>
            <Flame size={22} style={{ color: T.amber }} />
          </div>
        </motion.div>

        {/* Eyebrow */}
        <motion.p variants={fadeIn} initial="hidden" animate="visible" custom={0.32}
          className="font-mono text-[0.57rem] tracking-[0.5em] uppercase mb-10"
          style={{ color: T.amber, opacity: 0.7 }}>
          The Hearth
        </motion.p>

        {/* Main headline */}
        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.46}
          className="text-[clamp(2.8rem,7.5vw,7.5rem)] font-light leading-[0.93]
                     tracking-[-0.025em] mb-2 max-w-4xl">
          Where Memories
        </motion.h1>
        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.58}
          className="text-[clamp(2.8rem,7.5vw,7.5rem)] font-light italic leading-[0.95]
                     tracking-[-0.025em] mb-10 max-w-4xl"
          style={{ color: T.amber }}>
          Become Legacy.
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0.72}
          className="text-[clamp(1rem,1.8vw,1.32rem)] font-light italic max-w-[560px] leading-[1.85] mb-14"
          style={{
            color: T.mist,
            fontFamily: "'Lora', serif",
          }}>
          The Hearth transforms the quiet act of labeling a photograph into the most
          meaningful ritual a family can share — one that builds an ancestor&apos;s
          Digital Double while teaching the next generation who they come from.
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.86}
          className="flex flex-col sm:flex-row gap-4 items-center">
          <motion.a
            href="#essence-games"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group relative inline-flex items-center gap-3 font-mono text-[0.63rem]
                       tracking-[0.4em] uppercase px-12 py-[1.1rem] overflow-hidden rounded-sm
                       transition-colors duration-300 hover:text-[#0E0D0B]"
            style={{ color: T.amber, border: `1px solid ${T.amberBorder}` }}>
            <span className="absolute inset-0 origin-left scale-x-0 transition-transform
                             duration-300 ease-out group-hover:scale-x-100"
              style={{ background: T.amber }} />
            <span className="relative z-10 flex items-center gap-3">
              Explore the Hearth <ArrowRight size={13} />
            </span>
          </motion.a>
          <a href="#bridge"
            className="font-mono text-[0.6rem] tracking-[0.35em] uppercase flex items-center gap-2
                       transition-opacity duration-200 hover:opacity-80"
            style={{ color: T.fog }}>
            How it works <ChevronRight size={12} />
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={1.4}
          aria-hidden="true"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <motion.span
            animate={{ scaleY: [1, 1.2, 1], opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="block w-px h-12 origin-top"
            style={{ background: `linear-gradient(to bottom, ${T.amber}, transparent)` }} />
          <span className="font-mono text-[0.47rem] tracking-[0.4em] uppercase"
            style={{ color: `${T.amber}55` }}>Scroll</span>
        </motion.div>
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${T.amberBorder}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 02 ESSENCE GAMES ──────────────────────────────────────────── */}
      <section id="essence-games" className="py-28 relative overflow-hidden">

        {/* Section hearth glow — bottom right */}
        <HearthGlow size={700} opacity={0.05} className="right-0 bottom-0 translate-x-1/3 translate-y-1/3" />

        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>02 — Essence Games</Eyebrow>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left: copy */}
            <div>
              <Reveal>
                <h2 className="text-[clamp(2.4rem,4.5vw,5rem)] font-light leading-[1.04] tracking-tight mb-6">
                  Data labeling,
                  <br />
                  <span className="italic" style={{ color: T.amber }}>
                    disguised as love.
                  </span>
                </h2>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="text-[1.15rem] font-light italic leading-[1.88] mb-6"
                  style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
                  Essence Games are micro-quests that appear alongside a family photograph.
                  Each quest asks a single question designed to extract something the AI
                  cannot infer from pixels alone: the <em style={{ color: T.cream }}>feeling</em> of a moment.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <p className="text-[1.15rem] font-light italic leading-[1.88] mb-10"
                  style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
                  When a child answers &ldquo;Tell us the emotion in this moment,&rdquo; they
                  are not doing chores. They are building the voice of someone they love —
                  one answer at a time.
                </p>
              </Reveal>

              {/* Feature chips */}
              <Reveal delay={0.24}>
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: Clock,     label: '60 seconds per quest' },
                    { icon: Heart,     label: 'Emotion-first design' },
                    { icon: Sparkles,  label: 'XP & family leaderboards' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label}
                      className="flex items-center gap-2 rounded-full px-4 py-2 border font-mono text-[0.58rem] tracking-wide uppercase"
                      style={{ borderColor: T.amberBorder, background: T.amberGlow, color: T.fog }}>
                      <Icon size={11} style={{ color: T.amber }} />
                      {label}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Right: phone mock */}
            <EssenceGamesMock />
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <div className="max-w-5xl mx-auto px-8 md:px-16">
        <PullQuote
          text="The most powerful archive in human history will not be built by archivists. It will be built by families, at the dinner table, on a Tuesday night."
          attribution="Basalith founding principle"
        />
      </div>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${T.hairline}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 03 INTERGENERATIONAL BRIDGE ────────────────────────────────── */}
      <section id="bridge" className="py-28 relative overflow-hidden"
        style={{
          background: `linear-gradient(to bottom, transparent, rgba(255,179,71,0.025) 50%, transparent)`,
        }}>

        <HearthGlow size={600} opacity={0.045} className="left-1/2 top-1/2" />

        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>03 — The Intergenerational Bridge</Eyebrow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-28 items-end mb-16">
            <Reveal>
              <h2 className="text-[clamp(2.3rem,4.2vw,4.8rem)] font-light leading-[1.05] tracking-tight">
                Children play.
                <br />
                Ancestors
                <span className="italic" style={{ color: T.amber }}> live on.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="text-[1.15rem] font-light italic leading-[1.88]"
                style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
                When a child plays an Essence Game, something extraordinary happens on
                both sides of the bridge. The child learns who their ancestors were — not
                from a history lesson, but from the inside. And the ancestor&apos;s
                Digital Double becomes measurably more human. Both are changed.
              </p>
            </Reveal>
          </div>

          <BridgeGrid />
        </div>
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${T.hairline}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 04 THE RITUAL ─────────────────────────────────────────────── */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>04 — The Ritual</Eyebrow>

          <div className="max-w-xl mb-16">
            <Reveal>
              <h2 className="text-[clamp(2.2rem,3.9vw,4.5rem)] font-light leading-[1.06] tracking-tight mb-6">
                A Sunday night.
                <br />
                <span className="italic" style={{ color: T.amber }}>A permanent act.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-[1.12rem] font-light italic leading-[1.88]"
                style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
                This is what the Hearth looks like in practice — a ritual so simple
                a child can lead it, so profound that its effects last centuries.
              </p>
            </Reveal>
          </div>

          <RitualSteps />
        </div>
      </section>

      {/* Hairline */}
      <div aria-hidden="true" className="h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${T.hairline}, transparent)` }} />

      {/* ─────────────────────────────────────────────────────────────────
          ── 05 PILLARS ────────────────────────────────────────────────── */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <Eyebrow>05 — Built on Three Pillars</Eyebrow>

          <Reveal className="mb-14">
            <h2 className="text-[clamp(2rem,3.8vw,4.2rem)] font-light leading-[1.07] tracking-tight max-w-lg">
              Designed for{' '}
              <span className="italic" style={{ color: T.amber }}>families,</span>
              <br />
              not users.
            </h2>
          </Reveal>

          <PillarGrid />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          ── 06 CLOSING CTA ────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <HearthGlow size={800} opacity={0.07} className="left-1/2 bottom-0 translate-y-1/3" />

        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, rgba(255,179,71,0.06) 0%, transparent 65%)`,
          }} />

        <div className="max-w-3xl mx-auto px-8 md:px-16 text-center relative z-10">
          <Reveal>
            <div className="w-16 h-16 rounded-full flex items-center justify-center border mx-auto mb-10"
              style={{ borderColor: T.amberBorder, background: T.amberGlowMd }}>
              <Flame size={24} style={{ color: T.amber }} />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="text-[clamp(2.4rem,5vw,5.5rem)] font-light leading-[1.0] tracking-tight mb-6">
              Light the Hearth
              <br />
              <span className="italic" style={{ color: T.amber }}>in your family.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-[1.12rem] font-light italic leading-[1.88] max-w-xl mx-auto mb-14"
              style={{ color: T.mist, fontFamily: "'Lora', serif" }}>
              Every family has stories worth keeping. Every ancestor has a voice worth
              preserving. The Hearth gives your family the ritual to do it — together,
              joyfully, and permanently.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="mailto:hearth@basalith.xyz"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center justify-center gap-3
                           font-mono text-[0.63rem] tracking-[0.4em] uppercase
                           px-14 py-[1.15rem] overflow-hidden rounded-sm
                           transition-colors duration-300 hover:text-[#0E0D0B]"
                style={{ color: T.amber, border: `1px solid ${T.amberBorder}` }}>
                <span className="absolute inset-0 origin-left scale-x-0 transition-transform
                                 duration-300 ease-out group-hover:scale-x-100"
                  style={{ background: T.amber }} />
                <span className="relative z-10 flex items-center gap-3">
                  Begin Your Hearth <ArrowRight size={13} />
                </span>
              </motion.a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t px-8 md:px-16 py-10 flex flex-col md:flex-row
                         justify-between items-center gap-4"
        style={{ borderColor: T.hairline }}>
        <span className="font-mono text-[0.66rem] tracking-[0.38em] uppercase"
          style={{ color: T.amber }}>Basalith</span>
        <p className="font-display text-sm italic"
          style={{ color: `${T.cream}22`, fontFamily: "'Cormorant Garamond', serif" }}>
          Memory, made permanent.
        </p>
        <div className="flex items-center gap-2">
          <Flame size={11} style={{ color: T.amber, opacity: 0.5 }} />
          <p className="font-mono text-[0.52rem] tracking-[0.3em] uppercase"
            style={{ color: T.fog }}>
            The Hearth
          </p>
        </div>
      </footer>
    </main>
  );
}