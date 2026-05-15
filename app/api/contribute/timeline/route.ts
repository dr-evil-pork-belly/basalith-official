import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const DECADES = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]

function estimateDecade(eraStr: string | null): number | null {
  if (!eraStr) return null
  const m = eraStr.match(/\b(19\d0|20[012]\d)\b/) || eraStr.match(/\b(\d{4})\b/)
  if (!m) return null
  return Math.floor(parseInt(m[1]) / 10) * 10
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const contributor = await getContributorByToken(token)
  if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const archiveId = contributor.archive_id as string

  const [{ data: photos }, { data: dates }] = await Promise.all([
    supabaseAdmin.from('photographs').select('id, ai_era_estimate, decade').eq('archive_id', archiveId),
    supabaseAdmin.from('significant_dates').select('id, year, label, person_name, date_type').eq('archive_id', archiveId).eq('active', true),
  ])

  const timeline = DECADES.map(decade => {
    const nextDecade = decade + 10

    const decadePhotos = (photos ?? []).filter(p => {
      if (p.decade) return parseInt(p.decade) === decade
      return estimateDecade(p.ai_era_estimate) === decade
    })

    const decadeDates = (dates ?? []).filter(d => d.year && d.year >= decade && d.year < nextDecade)
    const coverage    = Math.min(decadePhotos.length * 5 + decadeDates.length * 10, 100)

    return {
      decade,
      label:      `${decade}s`,
      coverage,
      status:     coverage === 0 ? 'empty' : coverage < 20 ? 'sparse' : coverage < 50 ? 'growing' : 'rich',
      photoCount: decadePhotos.length,
      dateCount:  decadeDates.length,
    }
  }).filter(d => d.coverage > 0 || d.decade >= 1960)

  // Weakest 3 for the contributor teaser
  const weakest3 = [...timeline].sort((a, b) => a.coverage - b.coverage).slice(0, 3)

  return NextResponse.json({ timeline, weakest3, archiveId })
}
