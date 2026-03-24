import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', req.url))
  response.cookies.delete('archivist-auth')
  return response
}
