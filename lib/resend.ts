import { Resend } from 'resend'

// Lazy singleton — throws at runtime if RESEND_API_KEY is not set,
// not at module evaluation time (safe for build without the key).
let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Convenience alias matching the pattern used throughout the codebase
export const resend = {
  emails: {
    send: (...args: Parameters<Resend['emails']['send']>) =>
      getResend().emails.send(...args),
  },
}
