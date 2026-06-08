import { permanentRedirect } from 'next/navigation'

// The Data Custodianship Reserve was retired. Archive continuity now rests on
// owner ownership and full export at any time, documented at /data-ownership.
export default function CustodianshipPage() {
  permanentRedirect('/data-ownership')
}
