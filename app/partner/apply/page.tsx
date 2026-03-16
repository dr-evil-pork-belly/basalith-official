'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnerApplyRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/partner#apply')
  }, [router])

  return null
}
