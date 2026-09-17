import { permanentRedirect } from 'next/navigation'

// Retired September 17, 2026. This page called signInWithOtp without
// shouldCreateUser: false, so any email typed here became a Supabase Auth user
// with no role and no archive. Nothing linked to it. Owners sign in at
// /archive-login, which sets shouldCreateUser: false. The URL is kept as a
// permanent redirect so held links and the legacy vault redirects do not 404.
// Do not restore a sign-in form here.
export default function LoginPage() {
  permanentRedirect('/archive-login')
}
