import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/structuredData'

// basalith.ai served no robots.txt at all before this file. A 404 there does
// not block anything, since absence means full access, so nothing was being
// turned away. What was missing is the sitemap declaration, and on a site with
// almost no inbound links, link discovery is the only other way in.
//
// This is deliberately permissive. Google states in its own documentation that
// a page qualifies for AI Overviews and AI Mode by being indexed and snippet
// eligible, with no extra file or markup required, so there is nothing to opt
// into here and nothing worth blocking. Google-Extended is left unset, which
// means grounding in Google's other systems stays allowed. Setting it to
// disallow would remove us from Gemini grounding, which is the opposite of
// what we want.
//
// The one real exclusion is the authenticated and internal surface. None of it
// should be crawled, none of it renders anything useful to a stranger, and
// several of those paths redirect to a login.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow: [
          '/api/',
          '/archive/',
          '/archive-login',
          '/succession/portal/',
          '/succession/login',
          '/contribute/',
          '/witness/',
          '/god/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host:    SITE_URL,
  }
}
