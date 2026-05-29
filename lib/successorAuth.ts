import { NextRequest } from 'next/server'

export interface SuccessorSession {
  successorId:  string
  archiveId:    string
  name:         string
  organization: string | null
}

export function getSuccessorSession(request: NextRequest): SuccessorSession | null {
  try {
    const raw = request.cookies.get('successor_session')?.value
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.successorId || !parsed.archiveId) return null
    return parsed as SuccessorSession
  } catch {
    return null
  }
}
