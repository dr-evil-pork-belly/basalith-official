const PLACEHOLDER = [
  { rank: 1,  name: 'J. Whitmore',    closings: 18, tier: 'Estate',  residual: '$5,184' },
  { rank: 2,  name: 'M. Calloway',    closings: 14, tier: 'Dynasty', residual: '$10,752' },
  { rank: 3,  name: 'S. Pemberton',   closings: 12, tier: 'Estate',  residual: '$3,456' },
  { rank: 4,  name: 'A. Harrington',  closings: 9,  tier: 'Archive', residual: '$864'   },
  { rank: 5,  name: 'R. Montague',    closings: 7,  tier: 'Estate',  residual: '$2,016' },
]

export default function LeaderboardPage() {
  return (
    <div className="max-w-3xl">

      <div className="mb-10">
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Leaderboard</p>
        <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          Current Rankings
        </h1>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <p className="font-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-text-muted">This Month</p>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <div className="rounded-sm border border-border-subtle overflow-hidden mb-10" style={{ background: '#111112' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Rank', 'Archivist', 'Closings', 'Top Tier', 'Annual Residual'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-sans text-[0.58rem] font-bold tracking-[0.14em] uppercase text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER.map(({ rank, name, closings, tier, residual }, i) => (
                <tr
                  key={rank}
                  style={i < PLACEHOLDER.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}
                >
                  <td className="px-5 py-4">
                    <span
                      className="font-serif font-semibold"
                      style={{ fontSize: '1.1rem', color: rank === 1 ? '#C4A24A' : '#5C6166', letterSpacing: '-0.02em' }}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-sans text-[0.85rem] font-medium text-text-primary">{name}</td>
                  <td className="px-5 py-4 font-sans text-[0.85rem] text-text-secondary">{closings}</td>
                  <td className="px-5 py-4 font-sans text-[0.78rem] text-text-muted">{tier}</td>
                  <td className="px-5 py-4 font-sans text-[0.85rem] font-medium" style={{ color: '#C4A24A' }}>{residual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-sm border border-border-subtle px-6 py-5 text-center" style={{ background: '#111112' }}>
        <p className="font-serif italic text-text-muted" style={{ fontSize: '0.9rem' }}>
          Leaderboard updates weekly. Your position will appear once you record your first closing.
        </p>
      </div>

    </div>
  )
}
