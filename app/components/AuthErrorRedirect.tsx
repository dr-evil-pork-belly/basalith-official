'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthErrorRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (window.location.hash.includes('error=')) {
      router.replace('/login?error=link_expired')
    }
  }, [router])

  return null
}
