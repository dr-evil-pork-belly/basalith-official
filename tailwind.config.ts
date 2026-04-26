import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    // ─── FONTS ────────────────────────────────────────────────────────────
    fontFamily: {
      serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
      sans:  ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
    },

    // ─── COLORS ───────────────────────────────────────────────────────────
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',

      obsidian: {
        DEFAULT: '#1A1A1B',
        deep:    '#111112',
        void:    '#0C0C0D',
      },
      basalt: {
        DEFAULT: '#4A4E51',
        light:   '#737A7F',
        mid:     '#5C6166',
        dark:    '#2D2F31',
      },
      amber: {
        DEFAULT: '#FFB347',
        light:   '#FFCA7A',
        dim:     '#C47D1A',
        whisper: 'rgba(255,179,71,0.07)',
      },
      surface: {
        0: '#1A1A1B',
        1: '#222224',
        2: '#2A2A2D',
        3: '#323235',
        4: '#3A3A3E',
      },
      text: {
        primary:   '#F0F0EE',
        secondary: '#9DA3A8',
        muted:     '#5C6166',
        amber:     '#FFB347',
        inverse:   '#1A1A1B',
      },
      border: {
        subtle:  'rgba(255,255,255,0.06)',
        default: 'rgba(255,255,255,0.10)',
        strong:  'rgba(255,255,255,0.18)',
        amber:   'rgba(255,179,71,0.35)',
      },
    },

    // ─── SPACING ──────────────────────────────────────────────────────────
    spacing: {
      px:    '1px',
      0:     '0',
      0.5:   '0.125rem',
      1:     '0.25rem',
      1.5:   '0.375rem',
      2:     '0.5rem',
      2.5:   '0.625rem',
      3:     '0.75rem',
      3.5:   '0.875rem',
      4:     '1rem',
      4.5:   '1.125rem',
      5:     '1.25rem',
      6:     '1.5rem',
      7:     '1.75rem',
      8:     '2rem',
      9:     '2.25rem',
      10:    '2.5rem',
      11:    '2.75rem',
      12:    '3rem',
      14:    '3.5rem',
      16:    '4rem',
      18:    '4.5rem',
      20:    '5rem',
      24:    '6rem',
      28:    '7rem',
      32:    '8rem',
      36:    '9rem',
      40:    '10rem',
      48:    '12rem',
      56:    '14rem',
      64:    '16rem',
      72:    '18rem',
      80:    '20rem',
      96:    '24rem',
    },

    // ─── FONT SIZE ────────────────────────────────────────────────────────
    fontSize: {
      'data-xs':    ['0.625rem',  { lineHeight: '1rem',    letterSpacing: '0.12em' }],
      'data-sm':    ['0.6875rem', { lineHeight: '1rem',    letterSpacing: '0.16em' }],
      'data-base':  ['0.75rem',   { lineHeight: '1.25rem', letterSpacing: '0.10em' }],
      'body-sm':    ['0.875rem',  { lineHeight: '1.6rem',  letterSpacing: '0.01em' }],
      'body-base':  ['1.0625rem', { lineHeight: '1.75rem', letterSpacing: '0.005em'}],
      'body-lg':    ['1.1875rem', { lineHeight: '1.9rem',  letterSpacing: '0em'    }],
      'heading-sm': ['1.75rem',   { lineHeight: '1.2',     letterSpacing: '-0.02em'}],
      'heading-md': ['2.5rem',    { lineHeight: '1.1',     letterSpacing: '-0.025em'}],
      'heading-lg': ['3.5rem',    { lineHeight: '1.05',    letterSpacing: '-0.03em'}],
      'heading-xl': ['5rem',      { lineHeight: '0.95',    letterSpacing: '-0.035em'}],
      'display':    ['clamp(3.5rem,8vw,7rem)', { lineHeight: '0.9', letterSpacing: '-0.04em' }],
    },

    fontWeight: {
      thin:      '100',
      light:     '300',
      regular:   '400',
      medium:    '500',
      semibold:  '600',
      bold:      '700',
      extrabold: '800',
    },

    // ─── BORDER RADIUS ────────────────────────────────────────────────────
    borderRadius: {
      none:  '0',
      sm:    '2px',
      DEFAULT:'4px',
      md:    '6px',
      lg:    '12px',
      full:  '9999px',
    },

    // ─── SHADOWS ──────────────────────────────────────────────────────────
    boxShadow: {
      none:           'none',
      sm:             '0 1px 3px rgba(0,0,0,0.4)',
      DEFAULT:        '0 4px 16px rgba(0,0,0,0.5)',
      md:             '0 8px 24px rgba(0,0,0,0.6)',
      lg:             '0 16px 48px rgba(0,0,0,0.7)',
      xl:             '0 24px 64px rgba(0,0,0,0.8)',
      'amber-sm':     '0 0 8px rgba(255,179,71,0.25)',
      'amber-md':     '0 0 20px rgba(255,179,71,0.4), 0 0 40px rgba(255,179,71,0.15)',
      'amber-lg':     '0 0 40px rgba(255,179,71,0.5), 0 0 80px rgba(255,179,71,0.2)',
      'monolith':     '0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
      'monolith-hover':'0 12px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10)',
      'glass-inset':  'inset 0 1px 0 rgba(255,255,255,0.08)',
    },

    // ─── BACKDROP BLUR ────────────────────────────────────────────────────
    backdropBlur: {
      none: '0',
      sm:   '6px',
      DEFAULT:'12px',
      md:   '16px',
      lg:   '24px',
      xl:   '40px',
    },

    // ─── TRANSITIONS ──────────────────────────────────────────────────────
    transitionTimingFunction: {
      DEFAULT:   'cubic-bezier(0.4,0,0.2,1)',
      linear:    'linear',
      in:        'cubic-bezier(0.4,0,1,1)',
      out:       'cubic-bezier(0,0,0.2,1)',
      snap:      'cubic-bezier(0.16,1,0.3,1)',
      heritage:  'cubic-bezier(0.25,0.1,0.0,1)',
      weight:    'cubic-bezier(0.68,-0.2,0.265,1.35)',
    },

    // ─── KEYFRAMES ────────────────────────────────────────────────────────
    keyframes: {
      // The Spark — Lucent Amber AI pulse
      spark: {
        '0%,100%': {
          boxShadow: '0 0 6px rgba(255,179,71,0.15), 0 0 12px rgba(255,179,71,0.08)',
          opacity: '0.85',
        },
        '50%': {
          boxShadow: '0 0 20px rgba(255,179,71,0.6), 0 0 40px rgba(255,179,71,0.3), 0 0 80px rgba(255,179,71,0.12)',
          opacity: '1',
        },
      },
      'spark-text': {
        '0%,100%': { textShadow: '0 0 8px rgba(255,179,71,0.2)',  color: '#FFB347' },
        '50%':     { textShadow: '0 0 24px rgba(255,179,71,0.8), 0 0 48px rgba(255,179,71,0.3)', color: '#FFCA7A' },
      },
      'spark-border': {
        '0%,100%': { borderColor: 'rgba(255,179,71,0.2)' },
        '50%':     { borderColor: 'rgba(255,179,71,0.7)' },
      },
      // Reveals
      'fade-up': {
        from: { opacity: '0', transform: 'translateY(24px)' },
        to:   { opacity: '1', transform: 'translateY(0)' },
      },
      'fade-in': {
        from: { opacity: '0' },
        to:   { opacity: '1' },
      },
      'reveal-line': {
        from: { transform: 'scaleX(0)' },
        to:   { transform: 'scaleX(1)' },
      },
      // Artifact motion
      'slow-drift': {
        '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
        '33%':     { transform: 'translateY(-14px) rotate(0.3deg)' },
        '66%':     { transform: 'translateY(8px) rotate(-0.2deg)' },
      },
      'counter-drift': {
        '0%,100%': { transform: 'translateY(0)' },
        '50%':     { transform: 'translateY(10px)' },
      },
      // Marquee scroll
      marquee: {
        from: { transform: 'translateX(0)' },
        to:   { transform: 'translateX(-50%)' },
      },
      // Pulse ring
      'pulse-ring': {
        '0%':   { transform: 'scale(1)',   opacity: '0.5' },
        '100%': { transform: 'scale(2.2)', opacity: '0'   },
      },
    },

    // ─── ANIMATION PRESETS ────────────────────────────────────────────────
    animation: {
      spark:          'spark 3s ease-in-out infinite',
      'spark-slow':   'spark 5s ease-in-out infinite',
      'spark-text':   'spark-text 3s ease-in-out infinite',
      'spark-border': 'spark-border 3s ease-in-out infinite',
      'fade-up':      'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
      'fade-in':      'fade-in 0.6s ease forwards',
      'reveal-line':  'reveal-line 1.6s cubic-bezier(0.16,1,0.3,1) forwards',
      'slow-drift':   'slow-drift 14s ease-in-out infinite',
      'counter-drift':'counter-drift 12s ease-in-out infinite',
      'pulse-ring':   'pulse-ring 3.5s ease-out infinite',
      marquee:        'marquee 28s linear infinite',
    },

    extend: {
      // Portal design system utilities used by archive/* client components.
      colors: {
        gold:          '#C4A24A',
        'white-ghost': '#E8E8EE',
        monolith:      '#141416',
        obsidian:      '#0C0B09',
      },
      fontFamily: {
        compute: ['"Space Mono"', '"Courier New"', 'monospace'],
        legacy:  ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
    },
  },

  plugins: [
    plugin(({ addBase, addComponents, addUtilities }) => {

      // ── BASE RESETS ─────────────────────────────────────────────────────
      addBase({
        '*, *::before, *::after': { boxSizing: 'border-box' },
        'html': {
          fontSize: '16px',
          scrollBehavior: 'smooth',
          textRendering: 'optimizeLegibility',
        },
        '::selection': {
          background: 'rgba(255,179,71,0.22)',
          color: '#F0F0EE',
        },
        '::-webkit-scrollbar':       { width: '4px' },
        '::-webkit-scrollbar-track': { background: '#0C0C0D' },
        '::-webkit-scrollbar-thumb': { background: '#2D2F31', borderRadius: '2px' },
        ':focus-visible': {
          outline: '2px solid #FFB347',
          outlineOffset: '3px',
          borderRadius: '2px',
        },
      })

      // ── GLASSMORPHISM ────────────────────────────────────────────────────
      addUtilities({
        '.glass-void': {
          background: 'rgba(26,26,27,0.35)',
          backdropFilter: 'blur(6px) saturate(120%)',
          WebkitBackdropFilter: 'blur(6px) saturate(120%)',
          border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)',
        },
        '.glass-obsidian': {
          background: 'rgba(34,34,37,0.65)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 12px 40px rgba(0,0,0,0.6)',
        },
        '.glass-basalt': {
          background: 'rgba(42,42,46,0.75)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 16px 48px rgba(0,0,0,0.65)',
        },
        '.glass-amber': {
          background: 'rgba(40,30,15,0.62)',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
          border: '1px solid rgba(255,179,71,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,179,71,0.08), 0 0 40px rgba(255,179,71,0.07), 0 12px 40px rgba(0,0,0,0.6)',
        },
      })

      // ── SCROLL REVEAL ────────────────────────────────────────────────────
      addUtilities({
        '.reveal': {
          opacity: '0',
          transform: 'translateY(22px)',
          transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
        },
        '.reveal.in-view': {
          opacity: '1',
          transform: 'translateY(0)',
        },
        // Stagger delays for sibling reveals
        '.reveal-delay-1': { transitionDelay: '80ms'  },
        '.reveal-delay-2': { transitionDelay: '160ms' },
        '.reveal-delay-3': { transitionDelay: '240ms' },
        '.reveal-delay-4': { transitionDelay: '320ms' },
        '.reveal-delay-5': { transitionDelay: '400ms' },
        '.reveal-delay-6': { transitionDelay: '480ms' },
      })

      // ── DIVIDERS ─────────────────────────────────────────────────────────
      addUtilities({
        '.divider': {
          height: '1px',
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 30%,rgba(255,255,255,0.08) 70%,transparent)',
          border: 'none',
        },
        '.divider-amber': {
          height: '1px',
          background: 'linear-gradient(90deg,transparent,rgba(255,179,71,0.4) 30%,rgba(255,179,71,0.4) 70%,transparent)',
          border: 'none',
        },
      })

      // ── COMPONENTS ───────────────────────────────────────────────────────
      addComponents({

        // Eyebrow label
        '.eyebrow': {
          fontFamily: 'var(--font-public-sans), system-ui, sans-serif',
          fontSize: '0.6875rem',
          fontWeight: '700',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#C47D1A',
        },

        // AI badge
        '.ai-badge': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.625rem',
          borderRadius: '2px',
          border: '1px solid rgba(255,179,71,0.25)',
          background: 'rgba(40,30,15,0.5)',
          fontFamily: 'var(--font-public-sans), system-ui, sans-serif',
          fontSize: '0.625rem',
          fontWeight: '700',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#FFB347',
          animation: 'spark-border 3s ease-in-out infinite',
        },

        // AI dot
        '.ai-dot': {
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#FFB347',
          animation: 'spark 2.5s ease-in-out infinite',
          flexShrink: '0',
        },

        // Monolith button — dark/default
        '.btn-monolith': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
          padding: '0.9rem 2.25rem',
          fontFamily: 'var(--font-public-sans), system-ui, sans-serif',
          fontSize: '0.8125rem',
          fontWeight: '600',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          color: '#F0F0EE',
          borderRadius: '2px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg,#323235 0%,#222224 60%,#1C1C1E 100%)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 220ms cubic-bezier(0.68,-0.2,0.265,1.35), box-shadow 220ms ease, background 220ms ease, border-color 220ms ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0', left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)',
          },
          '&:hover': {
            background: 'linear-gradient(180deg,#3A3A3E 0%,#2A2A2D 60%,#222224 100%)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10)',
            borderColor: 'rgba(255,255,255,0.15)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            background: 'linear-gradient(180deg,#1C1C1E 0%,#222224 100%)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            transform: 'translateY(2px)',
            transition: 'all 80ms ease',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px #FFB347, 0 6px 20px rgba(0,0,0,0.6)',
          },
          '&:disabled': { opacity: '0.4', cursor: 'not-allowed', pointerEvents: 'none' },
        },

        // Monolith button — amber / CTA
        '.btn-monolith-amber': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
          padding: '0.9rem 2.25rem',
          fontFamily: 'var(--font-public-sans), system-ui, sans-serif',
          fontSize: '0.8125rem',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          color: '#1A1A1B',
          borderRadius: '2px',
          border: '1px solid rgba(255,179,71,0.6)',
          background: 'linear-gradient(180deg,#FFCA7A 0%,#FFB347 50%,#E09535 100%)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.6), 0 0 24px rgba(255,179,71,0.25), inset 0 1px 0 rgba(255,255,255,0.35)',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 220ms cubic-bezier(0.68,-0.2,0.265,1.35), box-shadow 220ms ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0', left: '10%', right: '10%', height: '1px',
            background: 'rgba(255,255,255,0.5)',
          },
          '&:hover': {
            background: 'linear-gradient(180deg,#FFD494 0%,#FFC060 50%,#FFB347 100%)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.7), 0 0 44px rgba(255,179,71,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            background: 'linear-gradient(180deg,#E09535 0%,#FFB347 100%)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            transform: 'translateY(2px)',
            transition: 'all 80ms ease',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px #F0F0EE, 0 0 24px rgba(255,179,71,0.4)',
          },
          '&:disabled': { opacity: '0.4', cursor: 'not-allowed', pointerEvents: 'none' },
        },

        // Monolith button — ghost / outline
        '.btn-monolith-ghost': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          position: 'relative',
          padding: '0.9rem 2.25rem',
          fontFamily: 'var(--font-public-sans), system-ui, sans-serif',
          fontSize: '0.8125rem',
          fontWeight: '600',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          color: '#9DA3A8',
          borderRadius: '2px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          transition: 'color 220ms ease, border-color 220ms ease, background 220ms ease',
          '&:hover': {
            color: '#F0F0EE',
            borderColor: 'rgba(255,255,255,0.28)',
            background: 'rgba(255,255,255,0.04)',
          },
          '&:active': { transform: 'translateY(1px)' },
          '&:focus-visible': { outline: 'none', boxShadow: '0 0 0 2px #FFB347' },
        },
      })
    }),
  ],
}

export default config