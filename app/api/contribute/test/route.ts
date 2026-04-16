import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return Response.json({ error: 'No token provided' })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Test 1: count all contributors
  const { count } = await admin
    .from('contributors')
    .select('*', { count: 'exact', head: true })

  // Test 2: find by token (with status filter)
  const { data, error } = await admin
    .from('contributors')
    .select('id, name, status, access_token, archive_id')
    .eq('access_token', token)
    .maybeSingle()

  // Test 3: find by token without status filter
  const { data: data3, error: error3 } = await admin
    .from('contributors')
    .select('id, name, status, access_token, archive_id')
    .eq('access_token', token)
    .limit(5)

  // Test 4: sample contributors (first 5, token preview)
  const { data: data2, error: error2 } = await admin
    .from('contributors')
    .select('id, name, status')
    .limit(5)

  // Test 5: check if access_token column exists by selecting it on first row
  const { data: colCheck, error: colError } = await admin
    .from('contributors')
    .select('access_token')
    .limit(1)

  return Response.json({
    supabaseUrl:       process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40),
    serviceKeySet:     !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    tokenReceived:     token.substring(0, 10) + '...',
    tokenLength:       token.length,
    totalContributors: count,
    tokenSearch: {
      found:       !!data,
      contributor: data ? {
        id:         data.id,
        name:       data.name,
        status:     data.status,
        archiveId:  data.archive_id,
        tokenMatch: data.access_token === token,
        tokenPreview: (data.access_token ?? '').substring(0, 10),
      } : null,
      error: error?.message ?? null,
    },
    tokenSearchNoStatusFilter: {
      count:  data3?.length ?? 0,
      rows:   (data3 ?? []).map((r: any) => ({ id: r.id, name: r.name, status: r.status })),
      error:  error3?.message ?? null,
    },
    sampleContributors: {
      rows:  (data2 ?? []).map((r: any) => ({ id: r.id, name: r.name, status: r.status })),
      error: error2?.message ?? null,
    },
    accessTokenColumnCheck: {
      hasColumn:    colCheck !== null && !colError,
      firstRowToken: colCheck?.[0]
        ? (colCheck[0] as any).access_token?.substring(0, 10) ?? 'null'
        : 'no rows',
      error: colError?.message ?? null,
    },
  })
}
