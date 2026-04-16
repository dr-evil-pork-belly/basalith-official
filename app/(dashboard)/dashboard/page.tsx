import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 GB'
  if (bytes < 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`
  return `${(bytes / 1_099_511_627_776).toFixed(2)} TB`
}

function formatBytesShort(bytes: number): string {
  if (bytes === 0) return '0 GB'
  if (bytes < 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  return `${(bytes / 1_099_511_627_776).toFixed(1)} TB`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="glass-obsidian rounded-sm p-6 flex flex-col gap-2">
      <p className="font-sans text-[0.65rem] font-bold tracking-[0.18em] uppercase text-text-muted">{label}</p>
      <p className={[
        'font-serif font-semibold leading-none tracking-[-0.02em]',
        accent ? 'text-amber' : 'text-text-primary',
        'text-[2.25rem]',
      ].join(' ')}>
        {value}
      </p>
      {sub && <p className="font-sans text-[0.75rem] text-text-muted">{sub}</p>}
    </div>
  )
}

function StorageStatCard({
  used, limit, fileCount,
}: {
  used:      number
  limit:     number
  fileCount: number
}) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div className="glass-obsidian rounded-sm p-6 flex flex-col gap-2">
      <p className="font-sans text-[0.65rem] font-bold tracking-[0.18em] uppercase text-text-muted">Storage Used</p>
      <p className="font-serif font-semibold leading-none tracking-[-0.02em] text-text-primary text-[2.25rem]">
        {formatBytesShort(used)}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-[0.75rem] text-text-muted">of {formatBytesShort(limit)}</p>
        <p className="font-sans text-[0.72rem] text-text-muted tabular-nums">{fileCount.toLocaleString()} {fileCount === 1 ? 'file' : 'files'}</p>
      </div>
      {/* Progress bar */}
      <div className="h-px w-full bg-white/[0.06] rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-amber/60 rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    armed:     'bg-amber/10 text-amber border-amber/25',
    pending:   'bg-white/[0.04] text-text-muted border-border-subtle',
    triggered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    cancelled: 'bg-white/[0.02] text-text-muted/50 border-border-subtle',
  }
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 rounded-sm border font-sans text-[0.6rem] font-bold tracking-[0.12em] uppercase',
      styles[status] ?? styles.pending,
    ].join(' ')}>
      {status}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName = user.email?.split('@')[0].split('.')[0] ?? 'Legacy Guide'
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  // Fetch vault for this user
  const { data: vault } = await supabase
    .from('vaults')
    .select('*')
    .eq('archivist_id', user.id)
    .single()

  // Fetch curators count (accepted only)
  const { count: curatorCount } = vault
    ? await supabase
        .from('curators')
        .select('*', { count: 'exact', head: true })
        .eq('vault_id', vault.id)
        .eq('invite_accepted', true)
    : { count: 0 }

  // Fetch milestones (all, for count + activity feed)
  const { data: milestones } = vault
    ? await supabase
        .from('milestones')
        .select('id, title, trigger_type, status, created_at')
        .eq('vault_id', vault.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const armedCount = milestones?.filter(m => m.status === 'armed').length ?? 0

  // Fetch total file count
  const { count: fileCount } = vault
    ? await supabase
        .from('vault_files')
        .select('id', { count: 'exact', head: true })
        .eq('vault_id', vault.id)
    : { count: 0 }

  // Fetch recent vault notifications (curator seal events)
  const { data: notifications } = vault
    ? await supabase
        .from('vault_notifications')
        .select('id, created_at, type, curator_name, trait, choice_label, file_name, read')
        .eq('vault_id', vault.id)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] }

  // Build unified activity feed — last 5 items by created_at
  type ActivityItem =
    | { kind: 'notification'; id: string; created_at: string; curator_name: string; trait: string; choice_label: string; file_name: string; unread: boolean }
    | { kind: 'milestone'; id: string; created_at: string; title: string; trigger_type: string; status: string }

  const notificationItems: ActivityItem[] = (notifications ?? []).map((n: Record<string, unknown>) => ({
    kind:         'notification' as const,
    id:           n.id as string,
    created_at:   n.created_at as string,
    curator_name: (n.curator_name as string | null) ?? 'A curator',
    trait:        (n.trait as string | null) ?? '',
    choice_label: (n.choice_label as string | null) ?? '',
    file_name:    (n.file_name as string | null) ?? 'a memory',
    unread:       !(n.read as boolean),
  }))

  const milestoneItems: ActivityItem[] = (milestones ?? []).map((m: Record<string, unknown>) => ({
    kind:         'milestone' as const,
    id:           m.id as string,
    created_at:   m.created_at as string,
    title:        m.title as string,
    trigger_type: m.trigger_type as string,
    status:       m.status as string,
  }))

  const activityFeed = [...notificationItems, ...milestoneItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── A: Header ── */}
      <div className="mb-10">
        <p className="eyebrow mb-3">{getGreeting()}</p>
        <h1
          className="font-serif font-semibold text-text-primary leading-[1.0] tracking-[-0.03em] mb-2"
          style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}
        >
          {displayName}.
        </h1>
        {vault ? (
          <p className="font-sans text-[0.8rem] text-text-muted">
            Vault{' '}
            <span className="font-mono text-amber-dim">{vault.id}</span>
            {' '}·{' '}
            <span className={vault.status === 'active' ? 'text-emerald-400' : 'text-amber'}>
              {vault.status ?? 'pending'}
            </span>
          </p>
        ) : (
          <p className="font-sans text-[0.8rem] text-text-muted">
            Setting up your vault…
          </p>
        )}
      </div>

      {vault ? (
        <>
          {/* ── B: Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Essence Complete"
              value={`${vault.essence_percent ?? 0}%`}
              sub="Golden Dataset depth"
              accent
            />
            <StorageStatCard
              used={vault.storage_used_bytes ?? 0}
              limit={vault.storage_limit_bytes ?? 107_374_182_400}
              fileCount={fileCount ?? 0}
            />
            <StatCard
              label="Curators Active"
              value={String(curatorCount ?? 0)}
              sub="Accepted invitations"
            />
            <StatCard
              label="Milestones Armed"
              value={String(armedCount)}
              sub="Firewall controls active"
              accent={armedCount > 0}
            />
          </div>

          {/* ── C: Recent Activity ── */}
          <div className="mb-10">
            <p className="font-sans text-[0.65rem] font-bold tracking-[0.18em] uppercase text-text-muted mb-4">
              Recent Activity
            </p>
            {activityFeed.length === 0 ? (
              <div className="glass-obsidian rounded-sm px-6 py-8 text-center">
                <p className="font-sans text-[0.82rem] text-text-muted">No activity yet.</p>
                <a href="/dashboard/milestones" className="font-sans text-[0.78rem] text-amber-dim hover:text-amber transition-colors duration-200 mt-2 inline-block">
                  Add your first milestone →
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activityFeed.map(item => (
                  <div
                    key={item.id}
                    className="glass-obsidian rounded-sm px-6 py-4 flex items-center justify-between gap-4 relative overflow-hidden"
                  >
                    {/* Unread amber left border for notifications */}
                    {item.kind === 'notification' && item.unread && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber/70 rounded-r-full" />
                    )}
                    {item.kind === 'notification' ? (
                      <>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center flex-shrink-0">
                            <span className="ai-dot !w-[5px] !h-[5px]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-sans text-[0.85rem] font-medium text-text-primary truncate">
                              {item.curator_name}{' '}
                              <span className="font-normal text-text-muted">sealed</span>{' '}
                              {item.file_name}
                            </p>
                            <p className="font-sans text-[0.72rem] text-text-muted mt-0.5">
                              {item.trait} · {item.choice_label}
                            </p>
                          </div>
                        </div>
                        <span className="font-sans text-[0.68rem] text-text-muted flex-shrink-0">
                          {timeAgo(item.created_at)}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Milestone icon */}
                          <div className="w-7 h-7 rounded-sm border border-border-subtle bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 22V12m0-8v4M4.93 4.93l2.83 2.83M17.07 17.07l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83M17.07 6.93l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-muted" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="font-sans text-[0.85rem] font-medium text-text-primary truncate">
                              {item.title}
                            </p>
                            <p className="font-sans text-[0.72rem] text-text-muted mt-0.5">{item.trigger_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-sans text-[0.68rem] text-text-muted">
                            {timeAgo(item.created_at)}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── D: Quick actions ── */}
          <div className="flex items-center gap-4 flex-wrap">
            <p className="font-sans text-[0.65rem] font-bold tracking-[0.18em] uppercase text-text-muted w-full">
              Quick Actions
            </p>
            <a href="/dashboard/curators" className="btn-monolith-ghost">
              Invite Curator
            </a>
            <a href="/dashboard/milestones" className="btn-monolith-ghost">
              Add Milestone
            </a>
          </div>
        </>
      ) : (
        /* ── No vault yet ── */
        <div
          className="rounded-sm border border-border-amber p-10 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#221F14,#1D1B11)' }}
        >
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
          <div className="ai-badge mb-5 mx-auto w-fit"><span className="ai-dot" />Vault Preparation</div>
          <h2 className="font-serif text-[1.75rem] font-semibold text-text-primary tracking-[-0.02em] mb-3">
            Your Vault Is Being Prepared.
          </h2>
          <p className="font-sans font-light text-body-base text-text-secondary leading-[1.82] max-w-md mx-auto">
            Our team will be in touch within 24 hours to begin The Founding process
            and configure your archive.
          </p>
          <p className="font-sans text-[0.75rem] text-text-muted mt-6">
            Questions?{' '}
            <a href="mailto:legacy@basalith.xyz" className="text-amber-dim hover:text-amber transition-colors duration-200">
              legacy@basalith.xyz
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
