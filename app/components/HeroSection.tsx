'use client'

import Link from 'next/link'
import { CATEGORY_LINE } from '@/lib/copy'

const MONO: React.CSSProperties = {
  fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
  fontSize:      'var(--text-caption)',
  letterSpacing: '0.35em',
  textTransform: 'uppercase' as const,
}

export default function HeroSection() {
  return (
    <section
      aria-label="Basalith: Heritage archive"
      style={{
        minHeight:           '100svh',
        display:             'grid',
        gridTemplateColumns: '55fr 45fr',
        background:          'var(--color-bg)',
      }}
    >
      {/* ── Left: Text ── */}
      <div
        className="hero-text-col"
        style={{
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'center',
          padding:        'clamp(120px,14vw,180px) clamp(24px,6vw,80px) clamp(80px,10vw,120px)',
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            ...MONO,
            color:        'var(--color-gold-on-light)',
            display:      'flex',
            alignItems:   'center',
            gap:          '12px',
            marginBottom: '32px',
            opacity:      0,
            animation:    'lineReveal 600ms cubic-bezier(0.16,1,0.3,1) 0ms both',
          }}
        >
          <span style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }} aria-hidden="true" />
          {CATEGORY_LINE}
        </p>

        {/* Display headline — two lines */}
        <h1
          style={{
            fontFamily:    'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:      'var(--text-display)',
            fontWeight:    300,
            lineHeight:    1.04,
            letterSpacing: '-0.025em',
            color:         'var(--color-text-primary)',
            margin:        '0 0 20px',
          }}
        >
          <span className="headline-line headline-line-1">What built the company</span>
          <span className="headline-line headline-line-2">is not in the data room.</span>
        </h1>

        {/* Sub copy */}
        <p
          style={{
            fontFamily:  'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)',
            fontSize:    '1.15rem',
            fontStyle:   'italic',
            fontWeight:  300,
            lineHeight:  1.9,
            color:       'var(--color-text-secondary)',
            maxWidth:    '500px',
            margin:      '0 0 44px',
            opacity:     0,
            animation:   'lineReveal 700ms cubic-bezier(0.16,1,0.3,1) 500ms both',
          }}
        >
          Basalith builds a cognitive reference model of the operator while they are still running the company. How they price risk, how they read people, the calls they make without thinking. It transfers with the business, through an acquisition or a succession.
        </p>

        {/* Primary CTA → the business flagship. */}
        <Link
          href="/succession"
          style={{
            ...MONO,
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '10px',
            alignSelf:      'flex-start',
            textDecoration: 'none',
            color:          '#0A0908',
            background:     'var(--b2b-btn)',
            padding:        '14px 28px',
            opacity:        0,
            animation:      'lineReveal 600ms cubic-bezier(0.16,1,0.3,1) 700ms both',
            transition:     'background 250ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--b2b-btn-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--b2b-btn)' }}
        >
          For Business
          <span aria-hidden="true" style={{ fontSize: '0.9rem', lineHeight: 1 }}>&rarr;</span>
        </Link>
      </div>

      {/* ── Right: Dark archive art ── */}
      <div
        aria-hidden="true"
        className="hero-image-col"
        style={{
          position:  'relative',
          overflow:  'hidden',
          minHeight: 'clamp(400px, 60vh, 900px)',
          background: '#1A1510',
        }}
      >
        {/* Dark warm gradient base */}
        <div style={{
          position: 'absolute',
          inset:    0,
          background: [
            'radial-gradient(ellipse at 40% 50%, rgba(184,150,62,0.2) 0%, transparent 60%)',
            'radial-gradient(ellipse at 80% 20%, rgba(184,150,62,0.1) 0%, transparent 50%)',
            'linear-gradient(160deg, #2A2018 0%, #1A1510 40%, #0F0D0A 100%)',
          ].join(', '),
        }} />

        {/* Gold frame + cognitive fingerprint */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 500 700"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect x="32" y="32" width="436" height="636" fill="none" stroke="rgba(184,150,62,0.4)" strokeWidth="1" />
          <rect x="48" y="48" width="404" height="604" fill="none" stroke="rgba(184,150,62,0.2)" strokeWidth="0.5" />
          <line x1="32"  y1="72"  x2="72"  y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="72"  y1="32"  x2="72"  y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="72"  x2="468" y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="32"  x2="428" y2="72"  stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="32"  y1="628" x2="72"  y2="628" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="72"  y1="628" x2="72"  y2="668" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="628" x2="468" y2="628" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          <line x1="428" y1="628" x2="428" y2="668" stroke="rgba(184,150,62,0.6)" strokeWidth="1.5" />
          {/* Cognitive fingerprint — streamlines of a loop+delta orientation field
              clipped to a brain silhouette, plus the brain outline
              (generated by scripts/fingerprint-field.js). Ridges flow to one delta;
              they do not share a center. */}
          <g className="hero-fp-breath" fill="none" stroke="rgb(184,150,62)" strokeOpacity={0.6} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 123.9 297.5 L 199.4 283.5 L 216.7 280.9 L 225.3 280.7 L 231.1 281.5 L 235.0 283.2 L 238.0 286.4 L 239.0 289.1 L 239.1 293.4 L 238.2 297.7 L 236.0 303.0 L 229.5 312.6 L 219.3 322.9 L 207.7 331.5 L 192.6 340.2 L 175.5 348.1 L 155.1 355.7" />
            <path d="M 217.4 287.2 L 168.4 300.4 L 125.9 309.7" />
            <path d="M 126.1 284.6 L 193.6 275.3 L 209.5 274.1 L 221.1 274.4" />
            <path d="M 230.5 288.7 L 205.4 300.1 L 183.7 308.3 L 158.8 316.0 L 129.3 323.4" />
            <path d="M 129.0 272.6 L 183.8 267.1 L 201.2 266.4 L 214.2 266.8 L 225.7 268.6 L 233.9 271.4 L 241.3 276.0 L 247.0 282.5 L 249.6 287.7 L 251.2 293.2 L 251.6 304.8 L 248.5 317.4 L 242.7 329.1 L 233.7 340.5 L 221.9 351.2 L 207.6 361.0 L 189.7 370.6" />
            <path d="M 226.9 297.3 L 211.5 308.1 L 190.9 318.7 L 166.5 328.1 L 137.4 336.9" />
            <path d="M 242.8 315.2 L 238.5 322.8 L 233.4 329.8 L 226.4 337.2 L 218.7 343.8 L 209.3 350.5 L 199.3 356.5 L 175.8 367.8" />
            <path d="M 204.6 319.0 L 191.7 325.8 L 177.1 332.1 L 160.8 338.1 L 141.4 344.1" />
            <path d="M 136.3 259.4 L 184.0 256.7 L 200.0 256.9 L 214.4 258.3 L 227.2 261.0 L 236.6 264.6 L 245.2 270.0 L 251.5 276.0 L 257.7 285.7 L 261.4 296.7 L 262.5 309.7 L 260.5 322.6 L 255.8 334.7 L 248.7 345.7 L 239.0 356.4 L 227.9 365.7" />
            <path d="M 147.0 246.2 L 171.6 245.6 L 190.4 246.1 L 206.3 247.4 L 220.6 249.9 L 233.1 253.7 L 243.6 258.6 L 253.2 265.1 L 260.5 272.2 L 268.1 282.7 L 274.1 295.9 L 277.3 310.0 L 277.7 323.0 L 275.6 334.4 L 270.5 346.4 L 263.2 357.2 L 253.2 367.6" />
            <path d="M 269.2 334.3 L 265.7 342.2 L 261.2 349.6" />
            <path d="M 164.2 233.4 L 184.5 234.2 L 201.8 235.8 L 216.1 238.2 L 230.1 241.9 L 242.3 246.6 L 253.8 252.7 L 263.2 259.5 L 272.7 268.4 L 283.6 282.0 L 292.4 296.9 L 299.8 314.3 L 303.9 329.6 L 304.5 338.3 L 302.7 346.8 L 297.6 355.6 L 288.1 366.5" />
            <path d="M 287.6 301.1 L 290.8 310.7 L 292.9 320.7 L 293.5 329.3 L 292.7 338.0 L 290.6 344.9 L 286.7 352.7 L 280.8 360.9 L 273.9 368.4" />
            <path d="M 240.3 363.4 L 250.6 353.2 L 259.1 341.4" />
            <path d="M 271.3 356.6 L 278.8 344.2 L 281.4 337.4 L 282.9 330.3" />
            <path d="M 174.9 221.3 L 196.5 223.4 L 216.5 226.8" />
            <path d="M 224.8 227.6 L 237.2 231.4 L 249.4 236.3 L 261.0 242.2 L 272.0 249.2 L 282.4 257.1 L 292.1 265.8 L 322.2 297.2 L 333.9 308.0 L 347.0 317.0 L 362.8 324.3" />
            <path d="M 294.5 276.8 L 319.8 308.7 L 330.7 320.2 L 337.7 325.4 L 345.3 329.7 L 364.3 336.6" />
            <path d="M 308.8 304.8 L 320.9 322.9 L 325.7 328.3 L 330.1 332.1 L 336.3 335.9 L 342.9 338.8 L 362.4 344.4" />
            <path d="M 312.4 321.9 L 319.4 334.5 L 322.1 337.9 L 325.4 340.7 L 330.7 343.2 L 337.6 345.4 L 358.8 350.0" />
            <path d="M 314.6 338.5 L 316.0 344.1 L 315.4 346.9 L 309.0 354.8 L 297.6 365.9" />
            <path d="M 214.8 367.2 L 231.1 355.2 L 243.2 342.7" />
            <path d="M 235.5 217.9 L 257.3 226.0 L 279.2 237.3 L 297.4 249.2 L 339.4 280.1 L 351.7 287.7 L 364.6 294.5" />
            <path d="M 306.8 263.8 L 338.4 289.3 L 350.6 297.2 L 362.1 303.3" />
            <path d="M 341.8 299.1 L 358.1 308.6" />
            <path d="M 317.5 355.2 L 322.9 353.3 L 328.7 353.0 L 354.7 355.6" />
            <path d="M 336.3 361.5 L 356.6 362.1" />
            <path d="M 284.2 225.9 L 301.9 235.8 L 342.9 260.5 L 364.7 271.9" />
            <path d="M 341.5 266.8 L 365.7 279.9" />
            <path d="M 339.2 373.7 L 358.1 372.9" />
            <path d="M 295.2 217.8 L 349.4 245.5" />
            <path d="M 347.8 256.2 L 360.8 262.8" />
            {/* Brain silhouette */}
            <path d="M 141.0 343.1 C 112.0 314.1 119.3 256.1 162.8 234.3 C 177.3 210.8 206.3 207.0 220.8 231.4 C 235.3 207.0 264.3 207.0 278.8 231.4 C 293.3 207.0 326.6 210.8 341.1 238.7 C 370.1 259.0 373.0 292.3 355.6 314.1 C 367.2 325.7 370.1 343.1 355.6 354.7 C 361.4 372.1 358.5 389.5 341.1 386.6 C 336.8 372.1 341.1 360.5 329.5 357.6 C 300.5 369.2 257.0 372.1 220.8 364.8 C 199.0 375.0 170.0 372.1 158.4 357.6 C 146.8 354.7 141.0 348.9 141.0 343.1 Z" strokeWidth={1.4} strokeOpacity={0.72} />
          </g>
          <line x1="140" y1="548" x2="360" y2="548" stroke="rgba(184,150,62,0.2)" strokeWidth="0.5" />
          <text x="250" y="560" textAnchor="middle" fill="rgba(184,150,62,0.3)" fontSize="8" fontFamily="monospace" letterSpacing="4">
            THE COGNITIVE FINGERPRINT
          </text>
        </svg>

        {/* Vignette */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,9,8,0.4) 100%)',
        }} />
      </div>

      {/* Mobile: text above, image below */}
      <style>{`
        .hero-fp-breath{transform-box:fill-box;transform-origin:center;animation:heroFpBreath 10s ease-in-out infinite;}
        @keyframes heroFpBreath{0%{transform:translate(0,0) scale(1)}50%{transform:translate(2px,-1.6px) scale(1.02)}100%{transform:translate(0,0) scale(1)}}
        @media (prefers-reduced-motion:reduce){.hero-fp-breath{animation:none;}}
        @media (max-width: 767px) {
          section[aria-label="Basalith: Heritage archive"] {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto clamp(240px, 40vh, 320px) !important;
            min-height: unset !important;
          }
          .hero-text-col {
            order: 1 !important;
            padding-top: max(100px, calc(env(safe-area-inset-top, 0px) + 80px)) !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
            padding-bottom: 32px !important;
            width: 100% !important;
          }
          .hero-image-col {
            order: 2 !important;
            min-height: unset !important;
            height: clamp(240px, 40vh, 320px) !important;
            width: 100% !important;
          }
          .hero-ctas {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .hero-ctas a {
            width: 100% !important;
            text-align: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
          }
        }
      `}</style>
    </section>
  )
}
