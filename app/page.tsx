'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Shield,
  User,
  Mail,
  ChevronDown,
  FileText,
  ArrowRight,
  CheckCircle2,
  Star,
  Lock,
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
//     href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&display=swap"
//     rel="stylesheet"
//   />
//
// Route: app/apply/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

// ── Tokens ─────────────────────────────────────────────────────────────────────
const C = {
  obsidian:    '#1A1A1B',
  obsidianMd:  '#1F1F21',
  obsidianLt:  '#252527',
  obsidianBd:  '#2C2C2F',
  amber:       '#FFB347',
  amberDeep:   '#C47A1E',
  amberGlow:   'rgba(255,179,71,0.07)',
  amberGlowMd: 'rgba(255,179,71,0.13)',
  amberBorder: 'rgba(255,179,71,0.22)',
  amberFocus:  'rgba(255,179,71,0.40)',
  white:       '#F4F1EA',
  mist:        'rgba(244,241,234,0.55)',
  fog:         'rgba(244,241,234,0.28)',
  hairline:    'rgba(244,241,234,0.08)',
  error:       '#F87171',
  errorGlow:   'rgba(248,113,113,0.10)',
};

// ── Framer Variants ────────────────────────────────────────────────────────────
const vPage: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.2 } },
};

const vField: Variants = {
  hidden:  { opacity: 0, y: 32, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
  exit:    {
    opacity: 0, y: -20, filter: 'blur(4px)',
    transition: { duration: 0.4, ease: 'easeIn' },
  },
};

const vSuccess: Variants = {
  hidden:  { opacity: 0, scale: 0.92, y: 24 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
};

const vPulse: Variants = {
  hidden:  { scale: 1, opacity: 0.5 },
  visible: {
    scale:   [1, 1.22, 1],
    opacity: [0.5, 0, 0.5],
    transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────
type ProfileType = '' | 'Researcher' | 'Content Creator' | 'Family Architect' | 'Community Leader';

interface FormState {
  name:           string;
  email:          string;
  profile:        ProfileType;
  legacyStatement: string;
}

interface Errors {
  name?:           string;
  email?:          string;
  profile?:        string;
  legacyStatement?: string;
}

const PROFILES: ProfileType[] = [
  'Researcher',
  'Content Creator',
  'Family Architect',
  'Community Leader',
];

const PROFILE_DESCRIPTIONS: Record<string, string> = {
  'Researcher':         'Academic or independent researcher in memory, genealogy, or preservation',
  'Content Creator':    'Storyteller, journalist, or digital creator with a trust-based audience',
  'Family Architect':   'Parent or family steward committed to multi-generational legacy',
  'Community Leader':   'Organizer, pastor, or civic figure with deep community relationships',
};

// ── Validation ─────────────────────────────────────────────────────────────────
function validate(form: FormState): Errors {
  const e: Errors = {};
  if (!form.name.trim())
    e.name = 'Your name is required.';
  if (!form.email.trim())
    e.email = 'An email address is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = 'Please enter a valid email address.';
  if (!form.profile)
    e.profile = 'Select the role that best describes you.';
  if (!form.legacyStatement.trim())
    e.legacyStatement = 'Your legacy statement is required.';
  else if (form.legacyStatement.trim().length < 60)
    e.legacyStatement = 'Please write at least 60 characters — we read every word.';
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── FIELD SHELL ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function FieldShell({
  label, icon: Icon, error, children, hint,
}: {
  label:    string;
  icon:     React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  error?:   string;
  children: React.ReactNode;
  hint?:    string;
}) {
  return (
    <motion.div variants={vField} className="space-y-2">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <Icon size={11} style={{ color: error ? C.error : C.amber, opacity: 0.75, flexShrink: 0 }} />
        <label
          className="font-mono text-[0.55rem] tracking-[0.4em] uppercase"
          style={{ color: error ? C.error : C.fog }}
        >
          {label}
        </label>
      </div>

      {/* Input wrapper */}
      <div
        className="relative rounded-sm transition-all duration-300"
        style={{
          background: C.obsidianLt,
          border: `1px solid ${error ? C.error : C.amberBorder}`,
          boxShadow: error ? `0 0 0 1px ${C.errorGlow}` : 'none',
        }}
      >
        {children}
      </div>

      {/* Error / hint */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-[0.52rem] tracking-wide"
            style={{ color: C.error }}
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[0.5rem] tracking-wide"
            style={{ color: C.fog, opacity: 0.6 }}
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Shared input styles ────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width:           '100%',
  background:      'transparent',
  border:          'none',
  outline:         'none',
  color:           C.white,
  fontFamily:      "'Cormorant Garamond', serif",
  fontSize:        '1.05rem',
  fontWeight:      300,
  padding:         '14px 16px',
  letterSpacing:   '0.01em',
  caretColor:      C.amber,
};

// ─────────────────────────────────────────────────────────────────────────────
// ── SUCCESS CARD ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function SuccessCard({ name }: { name: string }) {
  return (
    <motion.div
      variants={vSuccess}
      initial="hidden"
      animate="visible"
      className="relative flex flex-col items-center text-center"
    >
      {/* Outer pulse ring */}
      <div className="relative mb-10">
        <motion.div
          variants={vPulse}
          initial="hidden"
          animate="visible"
          className="absolute inset-0 rounded-sm pointer-events-none"
          style={{ border: `1px solid ${C.amber}`, margin: '-10px' }}
        />
        <motion.div
          variants={vPulse}
          initial="hidden"
          animate="visible"
          style={{
            border: `1px solid ${C.amber}`,
            margin: '-22px',
            animationDelay: '0.4s',
          }}
          className="absolute inset-0 rounded-sm pointer-events-none"
        />

        {/* Icon box */}
        <div
          className="w-20 h-20 rounded-sm flex items-center justify-center border relative z-10"
          style={{
            borderColor:  C.amber,
            background:   C.amberGlowMd,
            boxShadow:    `0 0 48px rgba(255,179,71,0.15), inset 0 0 24px rgba(255,179,71,0.05)`,
          }}
        >
          <CheckCircle2 size={34} style={{ color: C.amber }} />
        </div>
      </div>

      {/* Card body */}
      <div
        className="relative w-full rounded-sm border px-8 py-10 overflow-hidden"
        style={{
          borderColor: C.amber,
          background:  C.obsidianLt,
          boxShadow:   `0 0 80px rgba(255,179,71,0.08), inset 0 0 40px rgba(255,179,71,0.03)`,
        }}
      >
        {/* Top amber glow line */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)` }}
        />
        {/* Corner accents */}
        {[
          'top-0 left-0 border-t-2 border-l-2',
          'top-0 right-0 border-t-2 border-r-2',
          'bottom-0 left-0 border-b-2 border-l-2',
          'bottom-0 right-0 border-b-2 border-r-2',
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-5 h-5 pointer-events-none ${cls}`}
            style={{ borderColor: C.amber }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <p
            className="font-mono text-[0.52rem] tracking-[0.48em] uppercase mb-5"
            style={{ color: C.amber, opacity: 0.7 }}
          >
            Application Received
          </p>

          <h2
            className="font-display font-light leading-[1.08] tracking-tight mb-5"
            style={{
              fontSize:   'clamp(1.7rem, 3.5vw, 2.6rem)',
              color:      C.white,
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            Application Submitted.
          </h2>

          <div
            className="w-12 h-px mx-auto mb-5"
            style={{ background: C.amberBorder }}
          />

          <p
            className="font-display text-[1.12rem] font-light italic leading-[1.7] mb-8 max-w-sm mx-auto"
            style={{ color: C.mist, fontFamily: "'Cormorant Garamond', serif" }}
          >
            The Guardians will review your profile within{' '}
            <span style={{ color: C.amber }}>48 hours</span>.
          </p>

          <p
            className="font-mono text-[0.56rem] leading-relaxed tracking-wide max-w-xs mx-auto"
            style={{ color: C.fog }}
          >
            {name ? `${name}, we` : 'We'} have received your legacy statement.
            A member of the founding team will reach out with next steps.
          </p>

          {/* Trust micro-row */}
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {[
              { icon: Lock, text: 'Data encrypted' },
              { icon: Shield, text: 'Privately reviewed' },
              { icon: Star, text: 'Founding team only' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon size={10} style={{ color: C.amber, opacity: 0.55 }} />
                <span
                  className="font-mono text-[0.48rem] tracking-[0.28em] uppercase"
                  style={{ color: C.fog }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function ApplyPage() {
  const [form, setForm] = useState<FormState>({
    name:            '',
    email:           '',
    profile:         '',
    legacyStatement: '',
  });
  const [errors, setErrors]       = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focused, setFocused]     = useState<string | null>(null);

  const set = (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      if (errors[field]) setErrors(err => ({ ...err, [field]: undefined }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    // Simulate async submission
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setSubmitted(true);
  };

  const selectProfile = (p: ProfileType) => {
    setForm(f => ({ ...f, profile: p }));
    setErrors(err => ({ ...err, profile: undefined }));
    setDropdownOpen(false);
  };

  const charCount = form.legacyStatement.length;
  const charTarget = 200;

  // Focus ring style
  const focusRing = (field: string): React.CSSProperties =>
    focused === field
      ? { boxShadow: `0 0 0 2px ${C.amberFocus}`, borderColor: C.amber }
      : {};

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center
                 px-5 py-20 relative overflow-hidden"
      style={{ background: C.obsidian, fontFamily: "'Cormorant Garamond', serif" }}
    >
      {/* ── Background atmosphere ──────────────────────────────────────── */}
      {/* Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Central amber orb */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 800, height: 800,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,179,71,0.05) 0%, transparent 65%)',
        }}
      />
      {/* Grid texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(${C.white} 1px, transparent 1px), linear-gradient(90deg, ${C.white} 1px, transparent 1px)`,
          backgroundSize:  '64px 64px',
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="fixed top-0 inset-x-0 z-40 flex justify-between items-center px-8 py-6"
        style={{ background: `linear-gradient(to bottom, ${C.obsidian}F0, transparent)` }}
      >
        <a
          href="/circle"
          className="font-mono text-[0.66rem] tracking-[0.38em] uppercase transition-opacity hover:opacity-70"
          style={{ color: C.amber }}
        >
          Basalith
        </a>
        <div className="flex items-center gap-2">
          <Shield size={12} style={{ color: C.amber, opacity: 0.6 }} />
          <span className="font-mono text-[0.54rem] tracking-[0.28em] uppercase" style={{ color: C.fog }}>
            Apply
          </span>
        </div>
      </motion.div>

      {/* ── Content container ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[640px]">

        <AnimatePresence mode="wait">

          {/* ─── FORM STATE ────────────────────────────────────────────── */}
          {!submitted && (
            <motion.div
              key="form"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -30, transition: { duration: 0.4, ease: 'easeIn' } }}
              variants={vPage}
            >
              {/* Page header */}
              <motion.div variants={vField} className="text-center mb-12">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 border mb-8"
                  style={{ borderColor: C.amberBorder, background: C.amberGlow }}
                >
                  <Star size={10} fill={C.amber} style={{ color: C.amber }} />
                  <span
                    className="font-mono text-[0.52rem] tracking-[0.35em] uppercase"
                    style={{ color: C.amber }}
                  >
                    Basalith Circle — Guardian Application
                  </span>
                </div>

                <h1
                  className="font-display font-light leading-[0.95] tracking-[-0.01em] mb-4"
                  style={{
                    fontSize:   'clamp(2.4rem, 5.5vw, 4rem)',
                    color:      C.white,
                    fontFamily: "'Cormorant Garamond', serif",
                  }}
                >
                  Apply to
                  <br />
                  <span className="italic" style={{ color: C.amber }}>
                    The Circle.
                  </span>
                </h1>

                <p
                  className="font-mono text-[0.62rem] leading-[1.85] tracking-wide max-w-sm mx-auto"
                  style={{ color: C.mist }}
                >
                  Each application is reviewed personally. There is no algorithm here —
                  only people who take legacy seriously.
                </p>
              </motion.div>

              {/* ── Form ─────────────────────────────────────────────── */}
              <form onSubmit={handleSubmit} noValidate className="space-y-7">

                {/* Name */}
                <FieldShell
                  label="Full Name"
                  icon={User}
                  error={errors.name}
                  hint="As you'd like to be addressed by the founding team"
                >
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={set('name')}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    autoComplete="name"
                    style={{
                      ...inputBase,
                      ...focusRing('name'),
                      borderRadius: '2px',
                    }}
                  />
                </FieldShell>

                {/* Email */}
                <FieldShell
                  label="Email Address"
                  icon={Mail}
                  error={errors.email}
                  hint="Used only for your application review — never shared"
                >
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set('email')}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    autoComplete="email"
                    style={{
                      ...inputBase,
                      ...focusRing('email'),
                      borderRadius: '2px',
                    }}
                  />
                </FieldShell>

                {/* Advocate Profile — Custom dropdown */}
                <motion.div variants={vField} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield size={11} style={{ color: errors.profile ? C.error : C.amber, opacity: 0.75 }} />
                    <label
                      className="font-mono text-[0.55rem] tracking-[0.4em] uppercase"
                      style={{ color: errors.profile ? C.error : C.fog }}
                    >
                      Advocate Profile
                    </label>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(o => !o)}
                      className="w-full flex items-center justify-between rounded-sm
                                 transition-all duration-300"
                      style={{
                        padding:     '14px 16px',
                        background:  C.obsidianLt,
                        border:      `1px solid ${errors.profile ? C.error : dropdownOpen ? C.amber : C.amberBorder}`,
                        boxShadow:   dropdownOpen ? `0 0 0 2px ${C.amberFocus}` : 'none',
                        color:       form.profile ? C.white : C.fog,
                        fontFamily:  "'Cormorant Garamond', serif",
                        fontSize:    '1.05rem',
                        fontWeight:  300,
                        letterSpacing: '0.01em',
                        cursor:      'pointer',
                        textAlign:   'left',
                      }}
                    >
                      <span>{form.profile || 'Select your advocate role…'}</span>
                      <motion.span
                        animate={{ rotate: dropdownOpen ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <ChevronDown size={14} style={{ color: C.amber, opacity: 0.7 }} />
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scaleY: 0.92 }}
                          animate={{ opacity: 1, y: 0, scaleY: 1 }}
                          exit={{ opacity: 0, y: -8, scaleY: 0.92 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="absolute inset-x-0 top-full mt-1 z-30 rounded-sm overflow-hidden"
                          style={{
                            border:     `1px solid ${C.amberBorder}`,
                            background: C.obsidianBd,
                            transformOrigin: 'top',
                            boxShadow:  '0 12px 40px rgba(0,0,0,0.5)',
                          }}
                        >
                          {PROFILES.map((p, i) => (
                            <motion.button
                              key={p}
                              type="button"
                              onClick={() => selectProfile(p)}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="w-full text-left px-5 py-4 flex flex-col gap-0.5
                                         transition-colors duration-200 group"
                              style={{
                                background:   form.profile === p ? C.amberGlowMd : 'transparent',
                                borderBottom: i < PROFILES.length - 1 ? `1px solid ${C.hairline}` : 'none',
                                cursor:       'pointer',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = C.amberGlow)}
                              onMouseLeave={e => (e.currentTarget.style.background = form.profile === p ? C.amberGlowMd : 'transparent')}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className="font-display text-[1rem] font-normal"
                                  style={{ color: form.profile === p ? C.amber : C.white, fontFamily: "'Cormorant Garamond', serif" }}
                                >
                                  {p}
                                </span>
                                {form.profile === p && (
                                  <CheckCircle2 size={13} style={{ color: C.amber }} />
                                )}
                              </div>
                              <span
                                className="font-mono text-[0.5rem] tracking-wide leading-relaxed"
                                style={{ color: C.fog }}
                              >
                                {PROFILE_DESCRIPTIONS[p]}
                              </span>
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {errors.profile && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-[0.52rem] tracking-wide"
                        style={{ color: C.error }}
                      >
                        {errors.profile}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Legacy Statement */}
                <FieldShell
                  label="Legacy Statement"
                  icon={FileText}
                  error={errors.legacyStatement}
                  hint="Minimum 60 characters — write as though speaking to the founding team directly"
                >
                  <div className="relative">
                    <textarea
                      placeholder="Why do you believe in sovereign data preservation? What does legacy mean to you, and to the families you would serve?"
                      value={form.legacyStatement}
                      onChange={set('legacyStatement')}
                      onFocus={() => setFocused('legacy')}
                      onBlur={() => setFocused(null)}
                      rows={6}
                      style={{
                        ...inputBase,
                        ...focusRing('legacy'),
                        borderRadius: '2px',
                        resize:       'vertical',
                        minHeight:    '140px',
                        lineHeight:   '1.75',
                      }}
                    />
                    {/* Character progress */}
                    <div
                      className="absolute bottom-3 right-3 flex items-center gap-2"
                    >
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ width: 48, background: C.hairline }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width:      `${Math.min((charCount / charTarget) * 100, 100)}%`,
                            background: charCount >= 60 ? C.amber : C.error,
                          }}
                        />
                      </div>
                      <span
                        className="font-mono text-[0.46rem] tabular-nums"
                        style={{ color: charCount >= 60 ? C.fog : C.error }}
                      >
                        {charCount}
                      </span>
                    </div>
                  </div>
                </FieldShell>

                {/* Submit */}
                <motion.div variants={vField} className="pt-3">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className="group relative w-full font-mono text-[0.63rem] tracking-[0.42em]
                               uppercase rounded-sm overflow-hidden transition-all duration-300"
                    style={{
                      padding:       '18px 24px',
                      color:         loading ? C.fog : C.amber,
                      border:        `1px solid ${loading ? C.hairline : C.amberBorder}`,
                      background:    loading ? C.obsidianLt : 'transparent',
                      cursor:        loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {/* Fill sweep on hover */}
                    {!loading && (
                      <span
                        className="absolute inset-0 origin-left scale-x-0 transition-transform
                                   duration-300 ease-out group-hover:scale-x-100"
                        style={{ background: C.amber }}
                      />
                    )}

                    <span
                      className="relative z-10 flex items-center justify-center gap-3
                                 transition-colors duration-300 group-hover:text-[#1A1A1B]"
                    >
                      {loading ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="inline-block w-3.5 h-3.5 rounded-full border-t border-r"
                            style={{ borderColor: C.amber }}
                          />
                          Submitting application…
                        </>
                      ) : (
                        <>
                          Submit Your Application
                          <ArrowRight size={13} />
                        </>
                      )}
                    </span>
                  </motion.button>

                  {/* Privacy note */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-center font-mono text-[0.48rem] tracking-[0.25em]
                               uppercase mt-4 flex items-center justify-center gap-2"
                    style={{ color: C.fog, opacity: 0.6 }}
                  >
                    <Lock size={9} style={{ color: C.amber, opacity: 0.5 }} />
                    Your application is encrypted and reviewed by the founding team only
                  </motion.p>
                </motion.div>

              </form>
            </motion.div>
          )}

          {/* ─── SUCCESS STATE ─────────────────────────────────────────── */}
          {submitted && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <SuccessCard name={form.name.split(' ')[0]} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}