// This file renders when notFound() is called anywhere under /contribute/
// The console.log below confirms it is this file being shown, not a global 404.
console.log('[contribute/not-found] rendering: notFound() was called in contribute route')

export default function NotFound() {
  return (
    <div className="portal-threshold" style={{
      background:      'var(--invert-bg)',
      minHeight:       '100vh',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         '2rem',
      textAlign:       'center',
    }}>
      <p style={{
        fontFamily: 'var(--portal-mono)',
        fontSize: '11px',
        letterSpacing: '0.4em',
        color:         'var(--invert-gold)',
        marginBottom:  '1.5rem',
      }}>
        BASALITH
      </p>
      <h1 style={{
        fontFamily: 'var(--portal-serif)',
        fontSize:     '1.8rem',
        fontWeight:   700,
        color:        'var(--invert-fg)',
        marginBottom: '1rem',
        lineHeight:   1.3,
      }}>
        This link is no longer active.
      </h1>
      <p style={{
        fontFamily: 'var(--portal-serif)',
        fontSize:   '1rem',
        fontStyle:  'italic',
        color:      'var(--invert-dim)',
        lineHeight: 1.8,
        maxWidth:   '400px',
      }}>
        If you believe this is an error,
        contact the owner directly.
      </p>
    </div>
  )
}
