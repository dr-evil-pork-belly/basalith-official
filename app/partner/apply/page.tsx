'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Held URL from the Guide era. /partner is the advisor door as of October 15,
// 2026 (docs/ADVISOR_DOOR_2026-10-15.md), so this lands on it directly. The old
// #apply hash pointed at a section that no longer exists.
export default function PartnerApplyRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/partner')
  }, [router])

  return null
}
