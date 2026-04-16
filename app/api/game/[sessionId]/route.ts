import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ── GET — session details + leaderboard ───────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    const { data: session, error } = await supabaseAdmin
      .from('memory_game_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get archive info
    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('name, family_name, owner_name')
      .eq('id', session.archive_id)
      .maybeSingle()

    // Get signed URLs for all photos (1 hour)
    const photoIds: string[] = session.photograph_ids ?? []
    const photoUrls: Record<string, string> = {}
    const photoMeta: Record<string, { ai_era_estimate?: string }> = {}

    const { data: photos } = await supabaseAdmin
      .from('photographs')
      .select('id, storage_path, ai_era_estimate')
      .in('id', photoIds)

    for (const photo of photos ?? []) {
      const { data: signed } = await supabaseAdmin
        .storage
        .from('photographs')
        .createSignedUrl(photo.storage_path, 3600)
      if (signed?.signedUrl) photoUrls[photo.id] = signed.signedUrl
      photoMeta[photo.id] = { ai_era_estimate: photo.ai_era_estimate }
    }

    // Get contribution counts per photo
    const { data: contributions } = await supabaseAdmin
      .from('memory_game_contributions')
      .select('photograph_id, contributor_name, contributor_email')
      .eq('session_id', sessionId)

    const contribPerPhoto: Record<string, number> = {}
    const countMap: Record<string, number> = {}

    for (const c of contributions ?? []) {
      if (c.photograph_id) {
        contribPerPhoto[c.photograph_id] = (contribPerPhoto[c.photograph_id] || 0) + 1
      }
      const key = c.contributor_name || c.contributor_email
      countMap[key] = (countMap[key] || 0) + 1
    }

    const leaderboard = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    const isActive = session.status === 'active' && new Date(session.closes_at) > new Date()

    return NextResponse.json({
      session: {
        id:             session.id,
        status:         isActive ? 'active' : session.status,
        closesAt:       session.closes_at,
        totalMemories:  session.total_memories,
        photographIds:  photoIds,
      },
      archive: {
        name:       archive?.name ?? '',
        familyName: archive?.family_name ?? '',
        ownerName:  archive?.owner_name ?? '',
      },
      photoUrls,
      photoMeta,
      contribPerPhoto,
      leaderboard,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST — submit a memory ─────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { photographId, contributorEmail, contributorName, memoryText } = await req.json()

    if (!photographId || !memoryText || memoryText.trim().length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify session is active
    const { data: session } = await supabaseAdmin
      .from('memory_game_sessions')
      .select('id, archive_id, status, closes_at, total_memories')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'active' || new Date(session.closes_at) <= new Date()) {
      return NextResponse.json({ error: 'This game has closed' }, { status: 410 })
    }

    // Save to memory_game_contributions
    const { data: contribution, error: contribError } = await supabaseAdmin
      .from('memory_game_contributions')
      .insert({
        session_id:        sessionId,
        archive_id:        session.archive_id,
        photograph_id:     photographId,
        contributor_email: contributorEmail || 'anonymous@basalith.xyz',
        contributor_name:  contributorName  || 'A family member',
        memory_text:       memoryText.trim(),
      })
      .select()
      .single()

    if (contribError) throw new Error(contribError.message)

    // Save to labels table — feeds entity immediately
    const { data: label } = await supabaseAdmin
      .from('labels')
      .insert({
        archive_id:          session.archive_id,
        photograph_id:       photographId,
        labelled_by:         contributorName || 'A family member',
        what_was_happening:  memoryText.trim(),
        is_primary_label:    false,
        essence_status:      'pending',
      })
      .select()
      .single()

    // Link label back to contribution
    if (label && contribution) {
      await supabaseAdmin
        .from('memory_game_contributions')
        .update({ label_id: label.id })
        .eq('id', contribution.id)
    }

    // Increment session total_memories
    await supabaseAdmin
      .from('memory_game_sessions')
      .update({ total_memories: (session.total_memories ?? 0) + 1 })
      .eq('id', sessionId)

    // Return updated leaderboard
    const { data: allContribs } = await supabaseAdmin
      .from('memory_game_contributions')
      .select('contributor_name, contributor_email')
      .eq('session_id', sessionId)

    const countMap: Record<string, number> = {}
    for (const c of allContribs ?? []) {
      const key = c.contributor_name || c.contributor_email
      countMap[key] = (countMap[key] || 0) + 1
    }
    const leaderboard = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      success:      true,
      contributionId: contribution?.id,
      leaderboard,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Game submission error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
