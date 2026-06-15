import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sanitizedError } from '@/lib/apiSecurity'

// Public, unauthenticated, fire-and-forget. The homepage audience selector
// posts here on each pick so founder-versus-family interest accumulates from
// day one without an analytics vendor.
//
// Privacy by design: the ONLY thing recorded is the audience value and the
// server timestamp (the table default). No PII, no cookies, no IP, no user
// agent. Writes go through the service role; audience_selections has RLS on
// with no public policies, so nothing is ever readable from the client.

type Audience = 'founder' | 'family'

function isAudience(value: unknown): value is Audience {
  return value === 'founder' || value === 'family'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const audience =
      body && typeof body === 'object'
        ? (body as { audience?: unknown }).audience
        : undefined

    if (!isAudience(audience)) {
      return NextResponse.json({ error: 'Invalid audience.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('audience_selections')
      .insert({ audience })

    if (error) {
      return NextResponse.json(
        { error: sanitizedError(error, 'track-audience') },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizedError(err, 'track-audience') },
      { status: 500 },
    )
  }
}
