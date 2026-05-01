// This file renders when notFound() is called anywhere under /contribute/
// The console.log below confirms it is this file being shown, not a global 404.
console.log('[contribute/not-found] rendering — notFound() was called in contribute route')

export default function NotFound() {
  return (
    <div style={{
      background:      '#0A0908',
      minHeight:       '100vh',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         '2rem',
      textAlign:       'center',
    }}>
      <p style={{
        fontFamily:    '"Courier New", monospace',
        fontSize:      '0.44rem',
        letterSpacing: '0.4em',
        color:         '#C4A24A',
        marginBottom:  '1.5rem',
      }}>
        BASALITH · XYZ
      </p>
      <h1 style={{
        fontFamily:   'Georgia, serif',
        fontSize:     '1.8rem',
        fontWeight:   700,
        color:        '#F0EDE6',
        marginBottom: '1rem',
        lineHeight:   1.3,
      }}>
        This link is no longer active.
      </h1>
      <p style={{
        fontFamily: 'Georgia, serif',
        fontSize:   '1rem',
        fontStyle:  'italic',
        color:      '#706C65',
        lineHeight: 1.8,
        maxWidth:   '400px',
      }}>
        If you believe this is an error,
        contact the archive owner directly.
      </p>
    </div>
  )
}
