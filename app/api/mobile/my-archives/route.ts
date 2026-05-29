import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body as { email?: string }

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const [ownedResult, contributorResult] = await Promise.all([
      // Query A — archives this email owns
      supabaseAdmin
        .from('archives')
        .select('id, name, preferred_language, current_streak, tier')
        .eq('email', email),

      // Query B — archives this email contributes to (via contributors table)
      supabaseAdmin
        .from('contributors')
        .select('id, name, archive_id, archives!inner(id, name, preferred_language, current_streak, tier)')
        .eq('email', email),
    ])

    type ArchiveRow = {
      id:                 string
      name:               string
      preferred_language: string | null
      current_streak:     number | null
      tier:               string | null
    }

    type ContributorRow = {
      id:          string
      name:        string | null
      archive_id:  string
      archives:    ArchiveRow[]
    }

    const owned       = (ownedResult.data ?? []) as ArchiveRow[]
    const contribs    = (contributorResult.data ?? []) as unknown as ContributorRow[]
    const ownedIds    = new Set(owned.map(a => a.id))

    type ArchiveOut = {
      id:                string
      name:              string
      preferredLanguage: string | null
      streak:            number
      tier:              string | null
      role:              'owner' | 'contributor'
      contributorId?:    string
    }

    const archives: ArchiveOut[] = [
      ...owned.map(a => ({
        id:                a.id,
        name:              a.name,
        preferredLanguage: a.preferred_language ?? null,
        streak:            a.current_streak ?? 0,
        tier:              a.tier ?? null,
        role:              'owner' as const,
      })),
      ...contribs
        .filter(c => !ownedIds.has(c.archive_id) && c.archives.length > 0)
        .map(c => {
          const a = c.archives[0]
          return {
            id:                a.id,
            name:              a.name,
            preferredLanguage: a.preferred_language ?? null,
            streak:            a.current_streak ?? 0,
            tier:              a.tier ?? null,
            role:              'contributor' as const,
            contributorId:     c.id,
          }
        }),
    ]

    return NextResponse.json({ archives })
  } catch (error: unknown) {
    console.error('[my-archives] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ archives: [] })
  }
}
