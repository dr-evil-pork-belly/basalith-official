import Image from 'next/image'
import Link from 'next/link'
import { CATEGORY_LINE } from '@/lib/copy'
import { mono, serif, StoneBlock } from './StonePrimitives'

// Direction 1d, slot 1: full-bleed photograph with the h1 overlaid on a scrim,
// then the light block carrying the category line, the sub copy, and the CTA.
//
// The rendered ratio is locked to the source, 3022:2083. At 390px that is
// 268.8px tall, 31px shorter than 1d's 300px placeholder. The layout adapts to
// the photograph, not the reverse.
//
// Scrim geometry is measured, not copied. 1d's two-stop gradient puts the top
// h1 line at 0.118 alpha, which lands on a blown highlight in this photograph
// (rgb(255,255,251) at css x=74 y=185) and measures 1.19:1. The three stops
// below hold a floor across the text band and still leave the upper 38% of the
// photograph clean. Measured worst case 7.88:1, mean 14.36:1.
const SCRIM =
  'linear-gradient(to top, rgba(20,18,15,0.88) 0%, rgba(20,18,15,0.74) 60%, rgba(20,18,15,0) 100%)'

export default function HomeHero() {
  return (
    <section aria-label="Basalith: knowledge transfer at a change of control">

      <div
        className="stone-bleed"
        style={{
          position:    'relative',
          width:       '100%',
          aspectRatio: '3022 / 2083',
        }}
      >
        <Image
          src="/hero-strata.jpg"
          alt="Folded rock strata in a gorge wall."
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />

        {/* Scrim sits over the lower 62% only. */}
        <div
          aria-hidden="true"
          style={{
            position:   'absolute',
            left:       0,
            right:      0,
            bottom:     0,
            height:     '62%',
            background: SCRIM,
          }}
        />

        <h1
          style={{
            ...serif,
            position:      'absolute',
            left:          0,
            right:         0,
            bottom:        0,
            margin:        0,
            padding:       'var(--stone-gutter)',
            fontSize:      'clamp(33px, 8.5vw, 46px)',
            fontWeight:    400,
            lineHeight:    1.07,
            letterSpacing: '-0.02em',
            color:         'var(--stone-invert-fg)',
            textWrap:      'pretty',
          }}
        >
          What built the company is not in the data room.
        </h1>
      </div>

      <StoneBlock>
        {/* Category line. Existing gold rule-and-text treatment, carried over
            from HeroSection. 1d has no eyebrow slot; this placement is approved. */}
        <p
          style={{
            ...mono,
            display:      'flex',
            alignItems:   'center',
            gap:          '12px',
            color:        'var(--color-gold)',
            margin:       0,
          }}
        >
          <span
            aria-hidden="true"
            style={{ display: 'block', width: '24px', height: '1px', background: 'var(--color-gold)', flexShrink: 0 }}
          />
          {CATEGORY_LINE}
        </p>

        <p
          style={{
            ...serif,
            fontSize:   '16px',
            fontWeight: 300,
            lineHeight: 1.5,
            color:      'var(--stone-body)',
            margin:     0,
            textWrap:   'pretty',
          }}
        >
          Basalith builds a cognitive reference model of the operator while they are still running the company. How they price risk, how they read people, the calls they make without thinking. It transfers with the business, through an acquisition or a succession.
        </p>

        <Link
          href="/succession"
          style={{
            ...mono,
            display:        'block',
            textAlign:      'center',
            textDecoration: 'none',
            fontSize:       '11px',
            color:          '#0A0908',
            background:     'var(--b2b-btn)',
            padding:        '15px',
            minHeight:      '48px',
            boxSizing:      'border-box',
          }}
        >
          For Business
        </Link>
      </StoneBlock>
    </section>
  )
}
