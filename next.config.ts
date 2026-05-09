import type { NextConfig } from 'next'

const securityHeaders = [
  {
    key:   'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key:   'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key:   'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key:   'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key:   'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
  {
    // Prevent browsers from caching sensitive API responses
    key:   'Cache-Control',
    value: 'no-store',
  },
]

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      {
        // Apply to all routes
        source:  '/(.*)',
        headers: securityHeaders.filter(h => h.key !== 'Cache-Control'),
      },
      {
        // Cache-Control: no-store only for API routes
        source:  '/api/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
