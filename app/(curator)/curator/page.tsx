import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

// SVG essence ring — matches archivist dashboard style
function EssenceRing({ percent }: { percent: number }) {
  const radius      = 36
  const stroke      = 4
  const normalised  = Math.min(100, Math.max(0, percent))
  const circumference = 2 * Math.PI * radius
  const dash        = (normalised / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90" aria-hidden="true">
          {/* Track */}
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke="rgba(255,179,71,0.1)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke="#FFB347"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-sans text-[1.15rem] font-bold text-amber tabular-nums">{normalised}%</span>
        </div>
      </div>
      <p className="font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted">
        Essence Complete
      </p>
    </div>
  )
}

export default async function CuratorHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('vault_id, full_name')
    .eq('id', user.id)
    .single()

  const firstName = (profile?.full_name ?? user.email ?? 'Curator').split(' ')[0]
  const vaultId   = profile?.vault_id ?? null

  // If vault linked — fetch vault data and session count
  let vault:        { display_name: string; essence_percent: number } | null = null
  let sessionCount  = 0

  if (vaultId) {
    const [{ data: vaultData }, { count }] = await Promise.all([
      supabase
        .from('vaults')
        .select('display_name, essence_percent')
        .eq('id', vaultId)
        .single(),
      supabase
        .from('essence_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('curator_id', user.id),
    ])

    vault        = vaultData ?? null
    sessionCount = count ?? 0
  }

  return (
    <div className="max-w-2xl mx-auto py-8">

      {/* Welcome heading */}
      <div className="mb-12">
        <p className="eyebrow mb-3">Curator Portal</p>
        <h1
          className="font-serif font-semibold text-text-primary tracking-[-0.03em] mb-3"
          style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)', lineHeight: '1' }}
        >
          Welcome, {firstName}.
        </h1>
        {vault ? (
          <p className="font-sans font-light text-[1rem] text-text-secondary leading-[1.8]">
            You are a Curator for{' '}
            <span className="text-text-primary font-medium">{vault.display_name}</span>.
          </p>
        ) : (
          <p className="font-sans font-light text-[1rem] text-text-secondary leading-[1.8]">
            Your account is active but not yet linked to a vault.
          </p>
        )}
      </div>

      {vault ? (
        /* ── Linked to vault ── */
        <div className="flex flex-col gap-8">

          {/* Essence ring + CTA */}
          <div className="glass-obsidian rounded-sm p-8 flex flex-col sm:flex-row items-center gap-8">
            <EssenceRing percent={vault.essence_percent ?? 0} />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-sans text-[0.68rem] font-bold tracking-[0.12em] uppercase text-text-muted mb-2">
                Archive
              </p>
              <p className="font-serif text-[1.35rem] font-semibold text-text-primary tracking-[-0.02em] mb-1">
                {vault.display_name}
              </p>
              <p className="font-sans text-[0.78rem] text-text-muted mb-6">
                {sessionCount === 0
                  ? 'You haven\'t sealed any memories yet.'
                  : `You have sealed ${sessionCount} ${sessionCount === 1 ? 'memory' : 'memories'} in this archive.`}
              </p>
              <Link href="/curator/essence" className="btn-monolith-amber inline-flex">
                Begin Essence Session →
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-obsidian rounded-sm px-6 py-5">
              <p className="font-sans text-[0.6rem] font-bold tracking-[0.14em] uppercase text-text-muted mb-2">
                Your Contributions
              </p>
              <p className="font-serif text-[2rem] font-semibold text-text-primary tabular-nums">
                {sessionCount}
              </p>
              <p className="font-sans text-[0.72rem] text-text-muted mt-0.5">memories sealed</p>
            </div>
            <div className="glass-obsidian rounded-sm px-6 py-5">
              <p className="font-sans text-[0.6rem] font-bold tracking-[0.14em] uppercase text-text-muted mb-2">
                Essence Progress
              </p>
              <p className="font-serif text-[2rem] font-semibold text-amber tabular-nums">
                {vault.essence_percent ?? 0}%
              </p>
              <p className="font-sans text-[0.72rem] text-text-muted mt-0.5">archive complete</p>
            </div>
          </div>

        </div>
      ) : (
        /* ── No vault linked ── */
        <div className="glass-obsidian rounded-sm px-8 py-10 border border-amber/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#FFB347" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-[1.1rem] font-semibold text-text-primary mb-1">
                Awaiting Vault Link
              </p>
              <p className="font-sans text-[0.82rem] text-text-secondary leading-[1.7]">
                Your invitation link hasn&apos;t been used yet. Check your email for your invitation link, or contact your vault&apos;s Legacy Guide.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
