const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Essence Mapping', href: '#' },
      { label: 'Golden Dataset', href: '#' },
      { label: 'Digital Clone', href: '#' },
      { label: 'Legacy Plan', href: '#' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Estate Integration', href: '#' },
      { label: 'Trust Compatibility', href: '#' },
      { label: 'Data Ownership',     href: '/data-ownership' },
      { label: 'Privacy Policy',     href: '/privacy-policy' },
      { label: 'Terms of Service',   href: '/terms'          },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Basalith', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export default function Footer() {
  return (
    <>
      <footer className="bg-obsidian-void border-t border-border-subtle px-8 md:px-16 lg:px-24 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 items-start">
        <div>
          <span className="block font-sans text-[0.82rem] font-bold tracking-[0.24em] uppercase text-text-primary mb-3">
            Basalith
          </span>
          <p className="font-sans text-[0.8rem] leading-[1.72] text-text-muted max-w-[240px]">
            The archive of a life, governed with the same seriousness as an estate.
            We build for legacy.
          </p>
        </div>

        {COLS.map(({ heading, links }) => (
          <div key={heading}>
            <h4 className="font-sans text-[0.58rem] font-bold tracking-[0.2em] uppercase text-text-muted mb-4">
              {heading}
            </h4>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              {links.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="font-sans text-[0.8rem] text-text-muted no-underline transition-colors duration-200 hover:text-text-secondary">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </footer>

      <div className="bg-obsidian-void border-t border-border-subtle px-8 md:px-16 lg:px-24 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="font-sans text-[0.72rem] text-text-muted">
          © {new Date().getFullYear()} Heritage Nexus Inc. All rights reserved.
        </p>
        <p className="font-sans text-[0.72rem] font-bold tracking-[0.14em] uppercase text-amber-dim">
          The Asset That Never Leaves.
        </p>
      </div>
    </>
  )
}