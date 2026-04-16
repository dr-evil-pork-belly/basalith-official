import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ContributePage({
  params,
}: {
  params: { token: string }
}) {
  const token = params.token

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: contributor } = await admin
    .from('contributors')
    .select('id, name, archive_id, status')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!contributor) {
    notFound()
    return
  }

  const { data: archive } = await admin
    .from('archives')
    .select('id, name, family_name, owner_name, status')
    .eq('id', contributor.archive_id)
    .maybeSingle()

  if (!archive || archive.status !== 'active') {
    notFound()
    return
  }

  return (
    <div style={{
      background:  '#0A0908',
      minHeight:   '100vh',
      padding:     '2rem',
      color:       '#F0EDE6',
      fontFamily:  'Georgia, serif',
    }}>
      <p style={{
        fontFamily:    '"Courier New", monospace',
        fontSize:      '11px',
        letterSpacing: '4px',
        color:         '#C4A24A',
      }}>
        {archive.name.toUpperCase()}
      </p>
      <h1 style={{ fontSize: '2rem' }}>
        Welcome, {contributor.name?.split(' ')[0] ?? 'there'}.
      </h1>
      <p style={{ color: '#706C65', fontStyle: 'italic' }}>
        Contributor portal loading...
      </p>
      <p style={{ color: '#3A3830', fontSize: '0.8rem' }}>
        Archive: {archive.id} · Contributor: {contributor.id}
      </p>
    </div>
  )
}
