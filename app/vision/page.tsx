'use client';

import { motion, useInView, Variants } from 'framer-motion';
import { useRef, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP REQUIRED
//
// 1. Install Framer Motion:
//    npm install framer-motion
//
// 2. tailwind.config.ts — extend theme:
//    theme: {
//      extend: {
//        colors: {
//          obsidian: '#1A1A1B',
//          amber:    '#FFB347',
//        },
//        fontFamily: {
//          display: ['Cormorant Garamond', 'serif'],
//          mono:    ['DM Mono', 'monospace'],
//        },
//      },
//    }
//
// 3. app/layout.tsx — add inside <head>:
//    <link rel="preconnect" href="https://fonts.googleapis.com" />
//    <link
//      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@300;400&display=swap"
//      rel="stylesheet"
//    />
// ─────────────────────────────────────────────────────────────────────────────

// ── Variants ──────────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 1, ease: 'easeOut', delay },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
};

const cardIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

// ── Scroll Reveal ─────────────────────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -70px 0px' });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Reveal>
      <p className="font-mono text-[0.58rem] tracking-[0.42em] uppercase text-[#FFB347]/60 mb-10 flex items-center gap-4">
        {children}
        <span className="inline-block w-10 h-px bg-[#FFB347]/25" />
      </p>
    </Reveal>
  );
}

// ── Feature Card ──────────────────────────────────────────────────────────────

function FeatureCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <motion.div
      variants={cardIn}
      className="group relative border border-white/[0.06] bg-white/[0.015] p-10 overflow-hidden
                 transition-colors duration-500 hover:bg-[#FFB347]/[0.04] hover:border-[#FFB347]/20"
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px] bg-[#FFB347] origin-left scale-x-0
                   transition-transform duration-500 ease-out group-hover:scale-x-100"
      />
      <span className="block font-mono text-[2.8rem] font-light leading-none mb-7
                       text-[#FFB347]/15 transition-colors duration-400 group-hover:text-[#FFB347]/35">
        {num}
      </span>
      <h3 className="font-display text-[1.25rem] font-normal tracking-tight text-white mb-3">
        {title}
      </h3>
      <p className="font-display text-[1rem] font-light text-white/45 leading-[1.8]">
        {body}
      </p>
    </motion.div>
  );
}

// ── Quote Block ───────────────────────────────────────────────────────────────

function QuoteBlock({
  quote,
  label,
  accent = false,
}: {
  quote: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <Reveal delay={accent ? 0.12 : 0}>
      <blockquote
        className={`relative pl-7 py-9 pr-7 mb-5 border-l-2
          ${accent
            ? 'border-[#FFB347] bg-gradient-to-r from-[#FFB347]/8 to-transparent'
            : 'border-white/10 bg-white/[0.015]'
          }`}
      >
        <span
          aria-hidden
          className="absolute -top-1 left-4 font-display text-[7rem] leading-none
                     text-[#FFB347]/10 select-none pointer-events-none"
        >
          &ldquo;
        </span>
        <p className="font-display text-[1.2rem] md:text-[1.35rem] font-light italic
                      leading-[1.82] text-white/75 relative z-10">
          {quote}
        </p>
        <footer
          className={`mt-5 font-mono text-[0.57rem] tracking-[0.32em] uppercase
            ${accent ? 'text-[#FFB347]' : 'text-white/25'}`}
        >
          {label}
        </footer>
      </blockquote>
    </Reveal>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

const timelineNodes = [
  { year: 'Today',  desc: 'You label memories',               active: true  },
  { year: '2030s',  desc: 'Children ask you anything',        active: false },
  { year: '2060s',  desc: "Grandchildren hear your voice",    active: false },
  { year: '2090s',  desc: 'Great-grandchildren discover you', active: false },
  { year: '2127',   desc: 'The Century Conversation',         active: false },
];

function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className="flex items-start overflow-x-auto pb-2"
    >
      {timelineNodes.map((node, i) => (
        <motion.div
          key={i}
          variants={cardIn}
          className="flex-1 text-center relative min-w-[90px]
                     after:content-[''] after:absolute after:top-[5px] after:left-1/2
                     after:w-full after:h-px after:bg-gradient-to-r
                     after:from-[#FFB347]/20 after:to-[#FFB347]/05
                     last:after:hidden"
        >
          <div
            className={`w-[10px] h-[10px] rounded-full mx-auto mb-3 relative z-10 ring-[3px]
              ${node.active
                ? 'bg-[#FFB347] ring-[#FFB347]/25'
                : 'bg-transparent ring-[#FFB347]/15'
              }`}
          />
          <p className="font-mono text-[0.62rem] text-[#FFB347] mb-[3px]">{node.year}</p>
          <p className="font-display text-[0.8rem] text-white/35 italic leading-snug px-2">
            {node.desc}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Conversation Scene ────────────────────────────────────────────────────────

function ConversationScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' });

  const messages = [
    {
      role: 'human' as const,
      speaker: 'Elara, age 24\nYour great-grandchild',
      text: '"I just got my first job. I\'m terrified. What were you like at 24? Were you ever actually scared, or were you just… confident?"',
    },
    {
      role: 'ai' as const,
      speaker: 'Your\nDigital Double',
      text: '"Scared? At 24 I was running on about 40% confidence and 60% pretending. There was this morning before a big presentation — I was so nervous I put my shirt on inside out and didn\'t notice until lunch. Your great-grandmother fixed it for me in the hallway and said \'you\'re going to be great.\' The thing is, I actually believed her. That\'s the whole secret: find someone who believes you first, and borrow it from them until yours shows up."',
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className="relative border border-[#FFB347]/12 p-8 md:p-14 mb-16"
    >
      <span
        className="absolute -top-[0.62rem] left-10 bg-[#1A1A1B] px-4
                   font-mono text-[0.5rem] tracking-[0.38em] uppercase text-[#FFB347]/45"
      >
        A Conversation — 2127
      </span>

      <div className="space-y-10">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            variants={cardIn}
            className="flex flex-col md:flex-row gap-4 md:gap-8 items-start"
          >
            <p
              className={`font-mono text-[0.55rem] tracking-[0.2em] uppercase
                          leading-[1.65] whitespace-pre-line pt-1 md:min-w-[118px]
                          ${msg.role === 'ai' ? 'text-[#FFB347]' : 'text-white/25'}`}
            >
              {msg.speaker}
            </p>
            <p className="font-display text-[1.15rem] md:text-[1.28rem] font-light italic
                          leading-[1.82] text-white/70 flex-1">
              {msg.text}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Stagger Feature Cards ─────────────────────────────────────────────────────

const features = [
  {
    num: '01',
    title: 'Relational Memory',
    body: "Every tag you apply — 'this is my son Marcus,' 'this is Grandma June, she never stopped laughing' — teaches the AI who each person was to you, and how that shaped the way you spoke about them.",
  },
  {
    num: '02',
    title: 'Tonal Fingerprint',
    body: 'How you describe your wedding differs from how you describe a fishing trip. That precise emotional range, captured across thousands of moments, becomes your Double\'s personality model.',
  },
  {
    num: '03',
    title: 'Humor Signature',
    body: 'Irony. Understatement. Self-deprecation. The exact brand of funny only people close to you recognize — learned from your captions, your stories, your asides. Timing included.',
  },
];

function FeatureGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#FFB347]/8"
    >
      {features.map((f) => (
        <FeatureCard key={f.num} {...f} />
      ))}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VisionPage() {
  return (
    <main className="bg-[#1A1A1B] text-white overflow-x-hidden min-h-screen selection:bg-[#FFB347]/25"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}>

      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.22]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <motion.nav
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        custom={0.1}
        className="fixed top-0 inset-x-0 z-40 flex justify-between items-center
                   px-8 md:px-16 py-7
                   bg-gradient-to-b from-[#1A1A1B]/90 to-transparent backdrop-blur-sm"
      >
        <span className="font-mono text-[0.68rem] tracking-[0.38em] uppercase text-[#FFB347]">
          Basalith
        </span>
        <span className="font-mono text-[0.56rem] tracking-[0.28em] uppercase text-white/25">
          The Vision
        </span>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center
                          text-center px-6 pt-32 pb-20 overflow-hidden">

        {/* Ambient radial glows */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 72% 58% at 50% 40%, rgba(255,179,71,0.07) 0%, transparent 68%),
              radial-gradient(ellipse 42% 38% at 12% 82%, rgba(139,58,42,0.09) 0%, transparent 60%),
              radial-gradient(ellipse 50% 45% at 88% 16%, rgba(255,179,71,0.045) 0%, transparent 55%)
            `,
          }}
        />

        <motion.p
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={0.3}
          className="font-mono text-[0.57rem] tracking-[0.5em] uppercase text-[#FFB347]/65 mb-10"
        >
          A New Kind of Immortality
        </motion.p>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.48}
          className="text-[clamp(3.8rem,9.5vw,9rem)] font-light leading-[0.9]
                     tracking-[-0.028em] mb-0"
        >
          You Are Not
        </motion.h1>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.62}
          className="text-[clamp(3.8rem,9.5vw,9rem)] font-light italic leading-[0.95]
                     tracking-[-0.028em] text-[#FFB347] mb-10"
        >
          A Memory.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.8}
          className="text-[clamp(1rem,1.75vw,1.32rem)] font-light text-white/45
                     max-w-[520px] leading-[1.82]"
        >
          Every family has stories no one wrote down. Voices that went quiet too
          soon. Basalith uses family-labeled memories to build a{' '}
          <span className="text-[#FFB347]/80">Digital Double</span> — a living AI
          persona that shares your memories, your voice, and your humor with
          generations to come.
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={1.4}
          aria-hidden
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.span
            animate={{ scaleY: [1, 1.18, 1], opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="block w-px h-14 bg-gradient-to-b from-[#FFB347] to-transparent origin-top"
          />
          <span className="font-mono text-[0.48rem] tracking-[0.38em] uppercase text-[#FFB347]/35">
            Scroll
          </span>
        </motion.div>
      </section>

      {/* ── 01 — The Digital Double ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 md:px-16 py-32">
        <SectionLabel>01 — The Digital Double</SectionLabel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-28 items-center">
          <Reveal>
            <h2 className="text-[clamp(2.6rem,4.8vw,5.2rem)] font-light leading-[1.06] tracking-tight">
              Not an archive.
              <br />
              Not a chatbot.
              <br />
              <span className="italic text-[#FFB347]">You — preserved.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="space-y-6 text-[1.15rem] font-light text-white/45 leading-[1.9]">
              <p>
                Most platforms store the{' '}
                <span className="text-white/65">artifacts</span> of a life:
                photographs, videos, disconnected voice notes. They preserve what
                happened without preserving how you experienced it.
              </p>
              <p>
                Basalith builds something fundamentally different. Every photo you
                label, every relationship you name, every story you annotate
                teaches an AI the{' '}
                <span className="text-white/65">relational grammar of your life</span>{' '}
                — who each person was to you, how that changed you, and how you
                would tell it.
              </p>
              <p>
                The result is a{' '}
                <span className="text-[#FFB347]/85 font-normal">Digital Double</span>
                : not a summary of who you were, but a functional AI persona that
                inhabits your memories and speaks from inside them — to anyone who
                comes looking, for as long as they come looking.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB347]/10 to-transparent" />

      {/* ── 02 — How It Learns Your Voice ────────────────────────────────── */}
      <section
        className="py-32"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(255,179,71,0.022) 50%, transparent)',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 md:px-16">
          <SectionLabel>02 — How It Learns Your Voice</SectionLabel>

          <div className="max-w-[640px] mb-16">
            <Reveal>
              <h2 className="text-[clamp(2.2rem,3.9vw,4.7rem)] font-light leading-[1.06] tracking-tight mb-6">
                Family labeling is the{' '}
                <em className="italic text-[#FFB347]">Context Layer.</em>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-[1.15rem] font-light text-white/45 leading-[1.88]">
                When you tag a face, caption a moment, or name the person in a
                story, you are doing far more than organizing a photo library. You
                are teaching Basalith the relational context it needs to know not
                just what happened, but{' '}
                <span className="text-white/65">how you would choose to tell it.</span>
              </p>
            </Reveal>
          </div>

          <FeatureGrid />
        </div>
      </section>

      {/* ── 03 — Storage vs. Digital Double ──────────────────────────────── */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-8 md:px-16 text-center">
          <SectionLabel>03 — The Difference</SectionLabel>

          <Reveal>
            <h2 className="text-[clamp(1.9rem,3.8vw,4rem)] font-light tracking-tight mb-5">
              The same photograph.
              <br />
              Two entirely different worlds.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[1.1rem] font-light text-white/38 max-w-sm mx-auto
                          leading-[1.8] mb-14">
              Cold storage versus a living Digital Double.
            </p>
          </Reveal>

          <QuoteBlock
            quote="Photo taken July 4th, 1987. Location: Lake Chesdin. Subjects: Robert, Patricia, and two unidentified children. Image quality: moderate."
            label="Standard Archive — What you get everywhere else"
          />
          <QuoteBlock
            accent
            quote="This is the Fourth of July we almost blew up the dock. Dad had bought twice the fireworks he was allowed and your grandfather told him: 'Bobby, that's not a firework, that's a structural concern.' We laughed until we cried. Then the dock caught fire a little bit and we laughed even harder. That was the summer we all understood — your father was going to be your father, no matter what anyone said about it."
            label="Digital Double — Basalith Generational Narrator"
          />
        </div>
      </section>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB347]/10 to-transparent" />

      {/* ── 04 — The Century Conversation ────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 90% 65% at 50% 100%, rgba(255,179,71,0.055) 0%, transparent 65%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 md:px-16 py-36">

          <Reveal>
            <p className="font-mono text-[0.57rem] tracking-[0.5em] uppercase text-[#FFB347]/65 mb-10">
              04 — The Long Game
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-[clamp(3rem,7vw,8rem)] font-light leading-[0.93]
                           tracking-[-0.032em] mb-16">
              The Century
              <em className="block italic text-[#FFB347]">Conversation.</em>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-24 mb-24
                          text-[1.15rem] font-light text-white/45 leading-[1.9]">
            <Reveal delay={0.1}>
              <p>
                Imagine a great-grandchild you will never meet — sitting down one
                afternoon with a question. Not about history.{' '}
                <span className="text-white/70">About you.</span>
              </p>
              <p className="mt-5">
                Not the sanitized version. The real one: how you took your
                coffee, what made you laugh until you couldn&apos;t breathe, what
                you were afraid of at 2 a.m.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <p>
                Every decision in Basalith is evaluated against one question:{' '}
                <span className="text-white/65 italic">
                  will this still hold meaning in one hundred years?
                </span>
              </p>
              <p className="mt-5">
                Storage degrades. Formats go obsolete. But a Digital Double —
                trained on the full, rich texture of a human life — carries
                something no file format can:{' '}
                <span className="text-[#FFB347]/80">
                  the feeling of the person themselves.
                </span>
              </p>
            </Reveal>
          </div>

          {/* Timeline */}
          <Reveal className="mb-24">
            <Timeline />
          </Reveal>

          {/* Conversation */}
          <ConversationScene />

          {/* CTA */}
          <Reveal>
            <div className="text-center border-t border-white/[0.06] pt-16">
              <p className="font-display text-xl md:text-[1.5rem] font-light italic
                            text-white/38 max-w-xl mx-auto leading-[1.82] mb-12">
                The time to build your Digital Double is now — while the memories
                are still vivid, while you can still hear exactly how that laugh
                sounded on the drive home.
              </p>

              <motion.a
                href="#"
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.975 }}
                className="group relative inline-flex items-center
                           font-mono text-[0.63rem] tracking-[0.42em] uppercase
                           text-[#FFB347] border border-[#FFB347]/45
                           px-12 py-[1.1rem] overflow-hidden
                           transition-colors duration-300 hover:text-[#1A1A1B]"
              >
                <span
                  className="absolute inset-0 bg-[#FFB347] origin-left scale-x-0
                             transition-transform duration-300 ease-out
                             group-hover:scale-x-100"
                />
                <span className="relative z-10">Begin Your Digital Double</span>
              </motion.a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] px-8 md:px-16 py-10
                         flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-mono text-[0.66rem] tracking-[0.38em] uppercase text-[#FFB347]">
          Basalith
        </span>
        <p className="font-display text-sm italic text-white/20">
          Memory, made permanent.
        </p>
      </footer>
    </main>
  );
}