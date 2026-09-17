import { permanentRedirect } from 'next/navigation'

// Retired September 17, 2026. This page called supabase.auth.signUp with a
// password, so any email typed here became a Supabase Auth user with no role
// and no archive. Nothing linked to it. There is no self-registration on
// basalith.ai; owners sign in at /archive-login. The URL is kept as a
// permanent redirect so held links do not 404. Do not restore a sign-up form
// here.
export default function RegisterPage() {
  permanentRedirect('/archive-login')
}
