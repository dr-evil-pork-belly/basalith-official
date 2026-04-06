import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'
import { NextRequest, NextResponse } from 'next/server'

const MILESTONE_NUMBERS = [1, 5, 10, 25, 50, 100, 250, 500]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      archiveId,
      photoBase64,
      photoName,
      whatWasHappening,
      legacyNote,
      yearTaken,
      seasonTaken,
      location,
      peopleTagged,
      invitedContributor,
      labelledBy,
    } = body

    // Validate archiveId — skip real DB ops when not configured
    if (!archiveId || archiveId === 'will-be-set-after-db-setup') {
      return NextResponse.json({ success: true, mock: true })
    }

    // ── 1. Upload photograph to Storage (if photo provided) ──────────────────
    let storagePath: string | null = null
    if (photoBase64) {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
      const buffer     = Buffer.from(base64Data, 'base64')
      const ext        = (photoName?.split('.').pop() || 'jpg').toLowerCase()
      const path       = `${archiveId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('photographs')
        .upload(path, buffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: false,
        })

      if (!uploadError) storagePath = path
      // If upload fails, continue without photo — label is still saved
    }

    // ── 2. Create photograph record ──────────────────────────────────────────
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photographs')
      .insert({
        archive_id:    archiveId,
        storage_path:  storagePath,
        original_name: photoName || null,
        status:        'labelled',
      })
      .select('id')
      .single()

    if (photoError) throw photoError

    // ── 3. Fire filter agent if photo was uploaded ────────────────────────────
    if (storagePath) {
      inngest.send({
        name: 'photo/uploaded',
        data: {
          photographId: photo.id,
          archiveId,
          storagePath,
          uploadedBy: labelledBy || 'owner',
        },
      }).catch(() => {}) // non-fatal — agent pipeline is background
    }

    // ── 4. Create label record ────────────────────────────────────────────────
    const { error: labelError } = await supabaseAdmin
      .from('labels')
      .insert({
        photograph_id:        photo.id,
        archive_id:           archiveId,
        labelled_by:          labelledBy || 'owner',
        what_was_happening:   whatWasHappening || null,
        legacy_note:          legacyNote       || null,
        year_taken:           yearTaken        ? parseInt(String(yearTaken), 10) : null,
        season_taken:         seasonTaken      || null,
        location:             location         || null,
        people_tagged:        Array.isArray(peopleTagged) ? peopleTagged : [],
        invited_contributor:  invitedContributor || null,
      })

    if (labelError) throw labelError

    // ── 4. Upsert people ─────────────────────────────────────────────────────
    if (Array.isArray(peopleTagged) && peopleTagged.length > 0) {
      for (const name of peopleTagged as string[]) {
        if (!name.trim()) continue
        const { data: existing } = await supabaseAdmin
          .from('people')
          .select('id, photo_count')
          .eq('archive_id', archiveId)
          .eq('name', name.trim())
          .maybeSingle()

        if (existing) {
          await supabaseAdmin
            .from('people')
            .update({ photo_count: existing.photo_count + 1 })
            .eq('id', existing.id)
        } else {
          await supabaseAdmin
            .from('people')
            .insert({ archive_id: archiveId, name: name.trim(), photo_count: 1 })
        }
      }
    }

    // ── 5. Update decade coverage ─────────────────────────────────────────────
    if (yearTaken) {
      const yr     = parseInt(String(yearTaken), 10)
      const decade = `${Math.floor(yr / 10) * 10}s`
      const { data: existing } = await supabaseAdmin
        .from('decade_coverage')
        .select('id, photo_count, labelled_count')
        .eq('archive_id', archiveId)
        .eq('decade', decade)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin
          .from('decade_coverage')
          .update({ photo_count: existing.photo_count + 1, labelled_count: existing.labelled_count + 1 })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin
          .from('decade_coverage')
          .insert({ archive_id: archiveId, decade, photo_count: 1, labelled_count: 1 })
      }
    }

    // ── 6. Update archive totals + streak ────────────────────────────────────
    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('labelled_photos, total_photos, current_streak, longest_streak, last_label_date')
      .eq('id', archiveId)
      .single()

    if (!archive) throw new Error('Archive not found')

    const today            = new Date().toISOString().split('T')[0]
    const yesterday        = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    const isConsecutiveDay = archive.last_label_date === yesterday
    const isSameDay        = archive.last_label_date === today
    const newStreak        = isSameDay ? archive.current_streak : isConsecutiveDay ? archive.current_streak + 1 : 1
    const newTotal         = archive.labelled_photos + 1

    await supabaseAdmin
      .from('archives')
      .update({
        labelled_photos: newTotal,
        total_photos:    archive.total_photos + 1,
        current_streak:  newStreak,
        longest_streak:  Math.max(archive.longest_streak, newStreak),
        last_label_date: today,
      })
      .eq('id', archiveId)

    // ── 7. Check milestones ───────────────────────────────────────────────────
    const hitMilestone = MILESTONE_NUMBERS.find(m => m === newTotal) ?? null

    if (hitMilestone) {
      await supabaseAdmin
        .from('milestones')
        .insert({ archive_id: archiveId, milestone_count: hitMilestone, shown: false })
    }

    return NextResponse.json({
      success:          true,
      photographId:     photo.id,
      archiveDepth:     newTotal,
      streak:           newStreak,
      milestoneReached: hitMilestone,
    })

  } catch (err) {
    console.error('[archive/save]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
