'use client'

import { useLang }    from '@/app/components/LangProvider'
import { t, Locale } from '@/lib/i18n'

export function useTranslation() {
  const locale = useLang()
  return {
    locale,
    t: (key: string) => t(key, locale),
  }
}

export type { Locale }
