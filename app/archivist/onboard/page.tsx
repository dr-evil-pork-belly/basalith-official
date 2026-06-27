import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'

// The self-serve client submission form was retired. Onboarding now runs through
// the admin checkout flow (app/api/admin/checkout), where the Basalith team
// generates a family's founding checkout. This route is kept so the existing
// archivist navigation links still resolve, and shows a short notice.
export default async function OnboardPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '72px 24px', fontFamily: 'Georgia, serif', color: '#B8B4AB' }}>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: 11, letterSpacing: '0.3em', color: '#C4A24A', textTransform: 'uppercase', margin: '0 0 16px' }}>
        Onboarding
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 300, color: '#F0EDE6', margin: '0 0 16px', lineHeight: 1.25 }}>
        Client onboarding is handled directly with the Basalith team.
      </h1>
      <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.8, margin: 0 }}>
        New families are set up through Basalith. When you have a family ready,
        contact your Basalith administrator to generate their founding checkout.
        You do not need to submit anything here.
      </p>
    </div>
  )
}
