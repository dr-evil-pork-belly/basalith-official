import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/structuredData'
import { ANSWERS, answerPath } from '@/lib/answers'

// Public marketing routes only.
//
// This list is deliberately short. It contains the homepage, every route the
// footer links, the two routes the FAQ links, and the new /what-is-basalith
// page. It deliberately leaves out routes that exist in app/ but that could
// not be confirmed live from the filesystem alone: /asset, /press, /partner,
// /continuity, /custodianship, /posthumous-archive, /privacy-policy,
// /join-archivists, /login, /register, /resume, /game and the dead (auth),
// (curator) and (dashboard) route groups.
//
// A sitemap that lists a URL which 404s or 308s is worse than a short sitemap,
// because it teaches a crawler that this file is unreliable. Add a route here
// only after confirming it returns 200 in production.

type Entry = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }

const ROUTES: Entry[] = [
  { path: '/',                  priority: 1.0, changeFrequency: 'monthly' },
  { path: '/what-is-basalith',  priority: 0.9, changeFrequency: 'monthly' },
  { path: '/answers',           priority: 0.9, changeFrequency: 'monthly' },
  { path: '/succession',        priority: 0.9, changeFrequency: 'monthly' },
  { path: '/families',          priority: 0.8, changeFrequency: 'monthly' },
  { path: '/method',            priority: 0.8, changeFrequency: 'monthly' },
  { path: '/founding-session',  priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing',           priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq',               priority: 0.8, changeFrequency: 'monthly' },
  { path: '/succession/demo',   priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about',             priority: 0.6, changeFrequency: 'yearly'  },
  { path: '/integrity',         priority: 0.6, changeFrequency: 'monthly' },
  { path: '/security',          priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/data-ownership',    priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/contact',           priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/apply',             priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/begin',             priority: 0.5, changeFrequency: 'yearly'  },
  { path: '/privacy',           priority: 0.3, changeFrequency: 'yearly'  },
  { path: '/terms',             priority: 0.3, changeFrequency: 'yearly'  },
]

export default function sitemap(): MetadataRoute.Sitemap {
  // One timestamp per build. Per-route dates would be a claim about when each
  // page last changed, and nothing in the repo tracks that, so a real build
  // date is the honest value.
  const lastModified = new Date()

  // Answer pages come from lib/answers.ts rather than being listed again here,
  // so a page cannot exist in one place and be missing from the other.
  const answers: Entry[] = ANSWERS.map(({ slug }) => ({
    path:            answerPath(slug),
    priority:        0.7,
    changeFrequency: 'monthly',
  }))

  return [...ROUTES, ...answers].map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
