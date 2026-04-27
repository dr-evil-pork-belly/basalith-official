import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED = ['en', 'zh', 'es', 'vi', 'tl', 'ko'] as const
type Locale = typeof SUPPORTED[number]

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw    = cookieStore.get('preferred_language')?.value ?? 'en'
  const locale = (SUPPORTED as readonly string[]).includes(raw) ? raw as Locale : 'en'

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
