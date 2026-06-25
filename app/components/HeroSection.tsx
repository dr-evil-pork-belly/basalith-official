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
          {/* Cognitive fingerprint — evenly-spaced streamlines of a loop+delta
              orientation field (generated by scripts/fingerprint-field.js).
              Ridges flow and recurve toward one delta; they do not share a center. */}
          <g className="hero-fp-breath" fill="none" stroke="rgb(184,150,62)" strokeOpacity={0.6} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 135.2 326.8 L 160.6 316.0 L 182.5 304.8 L 199.9 294.3 L 228.5 274.5 L 237.3 269.4 L 241.4 268.0 L 245.7 268.2 L 248.1 269.7 L 250.2 273.5 L 251.5 279.1 L 251.7 287.8 L 248.6 306.4 L 242.1 324.0 L 232.2 340.0 L 219.4 353.8 L 203.4 366.3 L 183.5 378.2 L 159.9 389.4" />
            <path d="M 227.3 283.0 L 207.7 300.2 L 187.6 314.5 L 164.8 327.2 L 138.4 339.1" />
            <path d="M 222.0 271.3 L 174.7 296.6 L 154.9 305.5 L 133.3 314.0" />
            <path d="M 241.6 274.8 L 231.5 288.9 L 222.2 300.1 L 212.0 310.4 L 201.0 319.8 L 188.0 329.1 L 174.4 337.3 L 158.9 345.3 L 141.7 352.9" />
            <path d="M 132.0 302.0 L 167.2 288.6 L 219.0 265.8" />
            <path d="M 224.3 262.3 L 237.0 259.7 L 247.1 260.7 L 251.1 262.4 L 255.8 265.8 L 262.8 274.9 L 269.4 291.0 L 273.7 310.8 L 275.2 332.5 L 273.4 349.8 L 270.0 359.3 L 265.5 366.8 L 258.9 374.4 L 249.1 383.0 L 236.0 392.1 L 220.9 400.8 L 204.1 409.2 L 185.4 417.3" />
            <path d="M 238.9 289.5 L 232.5 300.8 L 224.1 312.6 L 215.4 322.4 L 204.7 332.2 L 193.2 340.9 L 179.7 349.4 L 164.3 357.6 L 147.2 365.4" />
            <path d="M 263.2 292.4 L 264.6 312.6 L 262.6 331.3 L 257.8 346.5 L 249.6 360.2 L 237.7 372.8 L 221.4 385.0 L 200.1 397.2 L 175.0 408.7" />
            <path d="M 234.6 309.1 L 228.3 318.8 L 221.1 327.9 L 213.0 336.2 L 203.1 344.6 L 180.0 359.8 L 150.0 374.3" />
            <path d="M 258.1 316.3 L 254.7 330.4 L 249.7 342.5 L 242.7 353.5 L 234.1 363.3 L 222.0 373.6 L 207.6 383.4 L 189.8 393.1 L 170.0 402.2" />
            <path d="M 219.4 258.0 L 204.2 262.8 L 133.2 288.2" />
            <path d="M 134.3 274.9 L 193.9 256.6 L 216.4 250.9 L 226.4 249.4 L 236.6 249.1 L 245.2 250.1 L 252.2 252.1 L 258.7 255.1 L 264.8 259.0 L 277.3 271.1 L 287.6 285.1 L 309.3 319.4 L 321.1 334.1 L 333.1 344.6 L 347.9 353.7" />
            <path d="M 279.9 285.2 L 300.9 329.8 L 309.8 344.7 L 315.5 351.3 L 323.3 357.7 L 332.0 363.0 L 342.4 368.1" />
            <path d="M 284.9 309.9 L 296.6 347.3 L 300.0 355.3 L 303.1 360.2 L 308.3 365.2 L 314.5 369.0 L 337.2 378.4" />
            <path d="M 286.4 336.8 L 288.5 352.6 L 288.5 362.8 L 286.7 368.3 L 281.2 375.0 L 266.4 386.6 L 245.4 399.6 L 220.9 412.1 L 194.3 423.6" />
            <path d="M 136.2 261.1 L 186.8 248.0 L 212.3 242.9 L 234.0 241.5 L 244.1 242.6 L 252.6 244.6 L 265.8 250.4 L 280.0 260.4 L 291.6 271.4 L 327.2 309.6 L 340.4 320.8 L 354.9 330.5" />
            <path d="M 316.2 307.8 L 333.7 325.1 L 352.7 338.4" />
            <path d="M 292.5 371.7 L 294.8 369.9 L 319.4 378.5" />
            <path d="M 246.3 406.3 L 282.3 387.5 L 294.5 382.9 L 300.2 382.3 L 307.5 382.8 L 331.6 388.0" />
            <path d="M 206.2 430.0 L 233.1 419.0 L 274.1 400.8 L 287.7 395.8 L 296.2 393.8 L 304.9 393.1 L 326.5 395.1" />
            <path d="M 140.0 247.1 L 184.0 237.6 L 211.2 233.5 L 234.4 233.1 L 244.4 234.3 L 254.3 236.6 L 269.2 242.2 L 285.5 251.7 L 299.4 262.2 L 335.0 291.9 L 357.7 307.5" />
            <path d="M 334.5 299.5 L 357.0 315.3" />
            <path d="M 224.4 436.3 L 261.3 423.1 L 279.3 417.5 L 294.9 414.1 L 310.7 412.5" />
            <path d="M 283.0 410.0 L 300.0 406.6 L 317.4 406.0" />
            <path d="M 144.3 233.1 L 182.9 226.4 L 210.3 223.5 L 233.4 223.7 L 253.5 226.8 L 271.4 232.5 L 289.7 241.4 L 356.6 284.7" />
            <path d="M 256.0 438.4 L 279.8 432.1" />
            <path d="M 150.5 219.1 L 183.6 214.7 L 209.6 212.9 L 232.8 213.5 L 254.3 216.7 L 273.8 222.2 L 292.6 229.9 L 312.0 239.7 L 353.7 263.1" />
            <path d="M 160.3 204.9 L 189.1 202.3 L 213.8 201.6 L 235.5 202.8 L 255.6 205.8 L 275.2 210.7 L 294.4 217.4 L 315.7 226.5 L 348.4 242.2" />
            <path d="M 170.6 191.1 L 195.2 189.9 L 217.0 190.0 L 237.2 191.5 L 255.9 194.1 L 274.3 198.1 L 293.8 203.8 L 339.8 221.4" />
            <path d="M 184.5 177.7 L 222.2 178.2 L 256.8 182.0 L 290.7 189.5 L 328.1 201.3" />
            <path d="M 205.0 164.9 L 231.1 166.3 L 257.0 169.4 L 282.7 174.1 L 309.4 180.8" />
            <path d="M 245.6 155.1 L 270.0 158.6" />
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
