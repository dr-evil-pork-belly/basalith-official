import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Marketing Toolkit — Basalith Guide Portal' }

const C = {
  surface: '#111110', border: 'rgba(255,255,255,0.06)',
  gold: '#C4A24A', text: '#F0EDE6', muted: '#9DA3A8', dim: '#5C6166', ghost: '#3A3F44',
}

const BUCKET = 'https://zmoauexzjfjloqxrkuma.supabase.co/storage/v1/object/public/guide-resources'

const BRAND_ASSETS = [
  { label: 'Basalith Logo · PNG',         file: 'basalith-logo.png',           ext: 'PNG' },
  { label: 'Basalith Logo · SVG',         file: 'basalith-logo.svg',           ext: 'SVG' },
  { label: 'Color Palette Guide',         file: 'basalith-color-palette.pdf',  ext: 'PDF' },
  { label: 'Typography Guide',            file: 'basalith-typography.pdf',     ext: 'PDF' },
  { label: 'Photography Style Guide',     file: 'basalith-photo-guide.pdf',    ext: 'PDF' },
  { label: 'Business Card Template',      file: 'business-card-template.zip',  ext: 'ZIP' },
  { label: 'Email Signature Template',    file: 'email-signature-template.zip', ext: 'ZIP' },
]

const PRESENTATIONS = [
  { label: 'The Basalith Story',          file: 'basalith-story.pdf',          ext: 'PDF' },
  { label: 'Product Overview Deck',       file: 'product-overview-deck.pdf',   ext: 'PDF' },
  { label: 'Pricing Guide',              file: 'pricing-guide.pdf',           ext: 'PDF' },
  { label: 'FAQ for Prospects',           file: 'prospect-faq.pdf',            ext: 'PDF' },
]

function DownloadRow({ label, file, ext, disabled }: { label: string; file: string; ext: string; disabled?: boolean }) {
  const url = `${BUCKET}/${file}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.border}`, gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.52rem', letterSpacing: '0.1em', color: C.gold, background: 'rgba(196,162,74,0.08)', border: '1px solid rgba(196,162,74,0.15)', padding: '3px 7px', flexShrink: 0 }}>{ext}</span>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: C.muted }}>{label}</p>
      </div>
      {disabled ? (
        <span style={{ fontFamily: 'Courier New, monospace', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ghost }}>Coming Soon</span>
      ) : (
        <a href={url} download style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '6px 12px' }}>
          Download →
        </a>
      )}
    </div>
  )
}

export default async function MarketingPage() {
  const cookieStore = await cookies()
  if (!cookieStore.get('archivist-id')?.value) redirect('/archivist-login')

  return (
    <div style={{ padding: 'clamp(24px,5vw,48px)', maxWidth: '800px' }}>

      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.dim, marginBottom: '6px' }}>Marketing</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 300, color: C.text, marginBottom: '12px' }}>Your Marketing Toolkit</h1>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1rem', color: C.muted, lineHeight: 1.7 }}>
          Everything you need to present Basalith with confidence. All materials are approved and ready to use.
        </p>
      </div>

      {/* Brand Assets */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: C.dim, marginBottom: '16px' }}>Brand Assets</p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {BRAND_ASSETS.map((a, i) => (
            <DownloadRow key={a.file} {...a} disabled={i > 1} />
          ))}
        </div>
      </div>

      {/* Presentations */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: C.dim, marginBottom: '16px' }}>Presentations</p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {PRESENTATIONS.map(a => (
            <DownloadRow key={a.file} {...a} disabled />
          ))}
        </div>
      </div>

      {/* Invitation Box */}
      <div style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.15)', padding: '24px 28px' }}>
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: C.gold, marginBottom: '10px' }}>The Invitation Box</p>
        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: C.muted, lineHeight: 1.7, marginBottom: '16px' }}>
          A physical invitation that guides send to warm prospects. Contains the founding session guide, a personal note template, and branded materials. Delivered in two business days.
        </p>
        <button disabled style={{ fontFamily: 'Courier New, monospace', fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.ghost, background: 'transparent', border: `1px solid ${C.border}`, padding: '10px 20px', cursor: 'not-allowed', opacity: 0.5 }}>
          Order Invitation Boxes → Coming Soon
        </button>
      </div>
    </div>
  )
}
