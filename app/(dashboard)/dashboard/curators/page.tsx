import { permanentRedirect } from 'next/navigation'

// Retired September 20, 2026. This was the April era "vault" product: a
// separate dashboard, curator and join flow that the archive portal replaced.
// Nothing had linked here since May, proxy.ts never gated it, its own client
// gate redirected to /login (a 308 since September 17), and it linked to
// /dashboard/vault, which has no page. The URL is kept as a 308 so held links
// do not 404; the group can be deleted after the redirect has lived a few
// months. Do not reuse these routes.
export default function RetiredPage() {
  permanentRedirect('/archive/contributors')
}
