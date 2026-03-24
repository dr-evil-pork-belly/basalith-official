const RESOURCES = [
  {
    title:  'Demo Account',
    desc:   'Your personal Basalith archive for live product demonstrations. Log in with your archivist credentials.',
    action: 'Access Demo',
    href:   '/dashboard',
  },
  {
    title:  'Proposal Builder',
    desc:   'Generate a custom-branded proposal document for any prospect. Coming soon.',
    action: 'Coming Soon',
    href:   '#',
  },
  {
    title:  'Social Content Library',
    desc:   'Pre-written posts, stories, and scripts for Instagram, LinkedIn, and Facebook.',
    action: 'Coming Soon',
    href:   '#',
  },
  {
    title:  'Brand Assets',
    desc:   'Basalith logos, sigil files, colour palette, and usage guidelines. Approved materials only.',
    action: 'Coming Soon',
    href:   '#',
  },
  {
    title:  'Presentation Deck',
    desc:   'The official Basalith prospect presentation. Use as-is. Do not modify without approval.',
    action: 'Coming Soon',
    href:   '#',
  },
  {
    title:  'Contact Support',
    desc:   'Direct line to the Archivist support team. Senior Archivists and above receive priority response.',
    action: 'Email Support',
    href:   'mailto:archivists@basalith.xyz',
  },
]

export default function ResourcesPage() {
  return (
    <div className="max-w-4xl">

      <div className="mb-10">
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Resources</p>
        <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Everything You Need
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RESOURCES.map(({ title, desc, action, href }) => (
          <div key={title} className="rounded-sm border border-border-subtle p-6 flex flex-col" style={{ background: '#111112' }}>
            <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#C4A24A' }}>{title}</p>
            <p className="font-serif text-[0.9rem] text-text-secondary leading-[1.75] flex-1 mb-5">{desc}</p>
            <a
              href={href}
              className={[
                'font-sans text-[0.72rem] font-medium tracking-[0.08em] no-underline transition-colors duration-200',
                href === '#'
                  ? 'text-text-muted cursor-default'
                  : 'text-text-primary hover:text-amber',
              ].join(' ')}
            >
              {action} {href !== '#' && '\u2192'}
            </a>
          </div>
        ))}
      </div>

    </div>
  )
}
