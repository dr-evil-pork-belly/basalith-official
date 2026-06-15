// Shared scroll helper for the homepage. Targets the selector section (#audience)
// and respects the user's reduced-motion preference. Used by HeroSection's cue
// and ContrastDemo's "Switch path" control.
export function scrollToAudience() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('audience')?.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
  })
}
