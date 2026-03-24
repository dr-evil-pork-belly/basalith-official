export default function ArchivistDashboard() {
  const stats = [
    { label: 'Total Closings',  value: '—', sub: 'All time'       },
    { label: 'This Month',      value: '—', sub: 'Current period' },
    { label: 'Residual Income', value: '—', sub: 'Monthly run rate' },
  ]

  return (
    <div className="max-w-4xl">

      <div className="mb-10">
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>
          Welcome back
        </p>
        <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Archivist Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-sm border border-border-subtle px-6 py-5"
            style={{ background: '#111112' }}
          >
            <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted mb-3">{label}</p>
            <p className="font-serif font-semibold text-text-primary mb-1" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>{value}</p>
            <p className="font-sans text-[0.68rem] text-text-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-sm border border-border-subtle mb-8" style={{ background: '#111112' }}>
        <div className="px-6 py-4 border-b border-border-subtle">
          <p className="font-sans text-[0.62rem] font-bold tracking-[0.18em] uppercase text-text-muted">Recent Activity</p>
        </div>
        <div className="px-6 py-10 text-center">
          <p className="font-serif italic text-text-muted" style={{ fontSize: '0.95rem' }}>
            No activity yet. Add your first prospect to get started.
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <a href="/archivist/pipeline" className="btn-monolith-amber">View Pipeline →</a>
        <a href="/archivist/earnings" className="btn-monolith-ghost">Earnings &amp; Commissions</a>
        <a href="/archivist/training" className="btn-monolith-ghost">Training</a>
      </div>

    </div>
  )
}
