import { permanentRedirect } from 'next/navigation'

// The B2B succession demo moved out of the Guide-gated /archivist tree to a
// public, login-free URL at /succession/demo. This 308 keeps old links working.
export default function ArchivistSuccessionDemoRedirect() {
  permanentRedirect('/succession/demo')
}
