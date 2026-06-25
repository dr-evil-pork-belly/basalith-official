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
              filling an oval (the full thumbprint), with a brain silhouette drawn
              as an overlay outline ON TOP. Ridges run through and past the brain
              line, not clipped to it (generated by scripts/fingerprint-field.js).
              Ridges flow to one delta; they do not share a center. */}
          <g className="hero-fp-breath" fill="none" stroke="rgb(184,150,62)" strokeOpacity={0.6} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 132.5 296.1 L 200.9 283.2 L 219.6 280.7 L 228.2 280.9 L 233.8 282.5 L 237.2 285.2 L 239.0 289.1 L 239.1 293.4 L 238.2 297.7 L 233.0 308.0 L 224.6 318.0 L 213.6 327.4 L 200.2 336.1 L 183.5 344.6 L 164.7 352.3 L 142.7 359.7" />
            <path d="M 219.0 287.6 L 172.9 300.6 L 133.4 309.8" />
            <path d="M 133.0 282.2 L 194.8 274.1 L 210.7 273.1 L 222.3 273.7" />
            <path d="M 230.3 289.5 L 209.6 300.0 L 188.2 308.9 L 163.4 317.1 L 134.0 324.9" />
            <path d="M 134.8 269.8 L 168.0 266.5 L 191.1 265.0 L 208.5 265.0 L 222.9 266.7 L 235.3 270.7 L 243.6 276.5 L 249.6 284.6 L 252.8 294.2 L 253.4 300.0 L 253.0 307.2 L 251.6 314.3 L 249.3 321.2 L 242.2 333.8 L 231.8 345.8 L 218.4 356.9 L 201.2 367.6 L 180.3 377.7 L 155.9 387.0" />
            <path d="M 244.4 314.6 L 239.7 323.6 L 232.7 332.9 L 223.4 342.0 L 213.0 349.9 L 200.7 357.6 L 186.5 364.9 L 170.6 371.8 L 151.5 378.6" />
            <path d="M 221.0 302.1 L 205.0 312.1 L 186.7 320.8 L 163.6 329.4 L 137.2 337.2" />
            <path d="M 186.8 328.2 L 165.2 336.7 L 138.9 345.0" />
            <path d="M 148.4 372.4 L 170.3 364.6" />
            <path d="M 137.7 255.7 L 171.0 253.9 L 195.6 253.9 L 214.4 255.7 L 229.9 259.4 L 236.6 262.1 L 243.0 265.6 L 252.9 273.9 L 260.3 284.7 L 263.1 291.4 L 265.0 298.3 L 266.0 305.5 L 266.1 314.2 L 265.2 321.4 L 263.4 328.4 L 260.7 335.2 L 256.5 342.8 L 246.7 355.3 L 232.7 367.9 L 214.5 379.8 L 192.6 391.0 L 167.0 401.2" />
            <path d="M 142.6 241.8 L 175.9 241.4 L 202.0 243.0 L 223.3 246.9 L 233.0 249.9 L 241.0 253.3 L 248.7 257.5 L 255.8 262.5 L 262.2 268.4 L 267.9 274.9 L 272.9 282.0 L 277.7 291.0 L 281.4 300.4 L 283.7 308.8 L 285.1 317.4 L 285.4 324.6 L 284.8 331.8 L 283.2 338.9 L 280.5 345.6 L 277.0 352.0 L 272.0 359.1 L 266.2 365.6 L 249.8 379.8 L 230.4 392.5 L 207.2 404.4 L 180.4 415.5" />
            <path d="M 278.5 324.1 L 276.7 334.1 L 273.1 343.6 L 268.0 352.3 L 260.7 361.4" />
            <path d="M 148.0 227.9 L 182.8 229.1 L 210.1 232.4 L 222.9 235.1 L 234.0 238.5 L 244.8 242.8 L 253.8 247.4 L 262.4 252.8 L 270.4 259.0 L 277.9 265.8 L 285.7 274.4 L 297.1 289.4 L 317.7 322.7 L 324.8 331.8 L 329.3 335.5 L 335.6 339.0 L 352.2 344.4" />
            <path d="M 293.9 297.2 L 302.6 317.1 L 305.6 326.8 L 307.2 335.3 L 307.3 341.1 L 306.4 345.4 L 304.0 350.6 L 299.9 356.6 L 292.2 365.2 L 281.5 375.0 L 268.9 384.8 L 255.6 393.7 L 241.9 401.8 L 226.4 409.7 L 209.3 417.5 L 191.7 424.5" />
            <path d="M 298.9 328.7 L 299.0 335.9 L 297.7 343.0 L 295.0 349.7 L 290.3 357.1" />
            <path d="M 185.3 401.5 L 202.6 393.9 L 218.0 385.9 L 231.6 377.5 L 244.3 367.9 L 253.7 358.9 L 261.8 348.7 L 267.5 338.6 L 271.2 327.6" />
            <path d="M 155.5 214.3 L 187.3 216.5 L 213.1 220.4 L 235.5 226.2 L 255.7 234.3 L 269.7 241.9 L 282.9 250.9 L 297.6 262.7 L 333.2 294.7 L 344.9 303.2 L 357.5 310.3" />
            <path d="M 305.3 278.8 L 322.2 296.8 L 332.8 306.7 L 343.3 314.4 L 356.0 321.2" />
            <path d="M 322.2 306.5 L 329.3 313.7 L 337.2 320.1 L 345.8 325.4 L 355.1 329.5" />
            <path d="M 314.0 333.8 L 317.8 343.2 L 319.6 345.4 L 329.5 347.8 L 349.4 351.4" />
            <path d="M 292.5 374.5 L 314.2 357.5 L 319.3 354.7 L 323.5 353.6" />
            <path d="M 281.0 358.4 L 285.9 351.2 L 289.0 344.7 L 291.1 337.8 L 292.1 330.6" />
            <path d="M 201.2 430.0 L 228.0 418.9 L 252.7 406.8 L 271.6 396.1 L 304.7 375.1 L 316.1 368.8 L 322.8 366.1 L 329.9 364.5 L 345.8 363.5" />
            <path d="M 162.5 395.6 L 180.2 388.9 L 196.0 381.8 L 210.1 374.4 L 223.6 365.8 L 233.9 357.8 L 243.2 348.6 L 250.2 339.4 L 255.8 329.3" />
            <path d="M 164.9 201.1 L 190.9 203.7 L 215.2 207.7 L 236.3 213.0 L 256.8 220.3 L 272.6 227.5 L 289.1 236.7 L 337.4 268.7 L 356.1 279.7" />
            <path d="M 319.3 264.9 L 339.4 279.3 L 356.7 289.8" />
            <path d="M 218.5 437.8 L 250.7 424.6 L 307.3 398.6 L 319.6 394.0 L 332.1 390.4" />
            <path d="M 297.2 395.5 L 318.4 386.1 L 336.6 381.2" />
            <path d="M 176.3 188.3 L 199.3 191.3 L 219.3 195.0 L 239.0 199.9 L 258.3 206.1 L 275.8 213.1 L 292.9 221.1 L 350.5 251.8" />
            <path d="M 332.3 249.9 L 353.9 261.9" />
            <path d="M 245.3 441.7 L 307.6 417.8" />
            <path d="M 189.6 176.2 L 226.7 182.8 L 245.0 187.4 L 261.6 192.4 L 294.2 204.6 L 340.5 225.5" />
            <path d="M 209.2 165.4 L 237.6 171.2 L 264.2 178.3 L 291.7 187.4 L 324.2 199.7" />
            <path d="M 242.2 158.3 L 267.5 164.7 L 295.3 173.0" />
            {/* Brain silhouette — overlay outline on top of the full print */}
            <path d="M 141.0 343.1 C 112.0 314.1 119.3 256.1 162.8 234.3 C 177.3 210.8 206.3 207.0 220.8 231.4 C 235.3 207.0 264.3 207.0 278.8 231.4 C 293.3 207.0 326.6 210.8 341.1 238.7 C 370.1 259.0 373.0 292.3 355.6 314.1 C 367.2 325.7 370.1 343.1 355.6 354.7 C 361.4 372.1 358.5 389.5 341.1 386.6 C 336.8 372.1 341.1 360.5 329.5 357.6 C 300.5 369.2 257.0 372.1 220.8 364.8 C 199.0 375.0 170.0 372.1 158.4 357.6 C 146.8 354.7 141.0 348.9 141.0 343.1 Z" strokeWidth={1.2} strokeOpacity={0.7} />
          </g>
          {/* Desktop caption (SVG). Hidden on mobile, where the slice crop is
              unreliable near y=560 — the HTML twin below renders it instead. */}
          <g className="hero-fp-caption-svg">
            <line x1="140" y1="548" x2="360" y2="548" stroke="rgba(184,150,62,0.2)" strokeWidth="0.5" />
            <text x="250" y="560" textAnchor="middle" fill="rgba(184,150,62,0.3)" fontSize="8" fontFamily="monospace" letterSpacing="4">
              THE COGNITIVE FINGERPRINT
            </text>
          </g>
        </svg>

        {/* Vignette */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,9,8,0.4) 100%)',
        }} />

        {/* Mobile caption twin — the SVG <text> at y=560 is sliced off the short,
            wide mobile panel by preserveAspectRatio="...slice", so we render an
            HTML caption that anchors near the bottom of the stacked panel. Hidden
            on desktop (the SVG <text> shows there); shown via the mobile query. */}
        <div className="hero-fp-caption-mobile" aria-hidden="true" style={{ display: 'none' }}>
          <span style={{ display: 'block', width: '120px', height: '1px', margin: '0 auto 12px', background: 'rgba(184,150,62,0.2)' }} />
          <span style={{
            fontFamily:    'var(--font-space-mono, "Space Mono", "Courier New", monospace)',
            fontSize:      '0.6rem',
            letterSpacing: '0.32em',
            textTransform: 'uppercase' as const,
            color:         'rgba(184,150,62,0.45)',
          }}>
            The Cognitive Fingerprint
          </span>
        </div>
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
          .hero-fp-caption-svg {
            display: none !important;
          }
          .hero-fp-caption-mobile {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            bottom: clamp(18px, 5vh, 30px) !important;
            text-align: center !important;
            z-index: 2 !important;
            pointer-events: none !important;
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
