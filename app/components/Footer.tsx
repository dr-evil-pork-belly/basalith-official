const COLS = [
  {
    heading: 'Product',
    links: ['Essence Mapping', 'Golden Dataset', 'Digital Clone', 'Legacy Plan'],
  },
  {
    heading: 'Legal',
    links: ['Estate Integration', 'Trust Compatibility', 'Data Ownership', 'Privacy Policy'],
  },
  {
    heading: 'Company',
    links: ['About Basalith', 'Journal', 'Careers', 'Contact'],
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
              {links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="font-sans text-[0.8rem] text-text-muted no-underline transition-colors duration-200 hover:text-text-secondary"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </footer>

      <div className="bg-obsidian-void border-t border-border-subtle px-8 md:px-16 lg:px-24 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="font-sans text-[0.72rem] text-text-muted">
          © {new Date().getFullYear()} Basalith Inc. All rights reserved.
        </p>
        <p className="font-sans text-[0.72rem] font-bold tracking-[0.14em] uppercase text-amber-dim">
          The Asset That Never Leaves.
        </p>
      </div>
    </>
  )
}