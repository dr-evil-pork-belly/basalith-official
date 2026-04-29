'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { t as tFn, LOCALES, type Locale } from '@/lib/i18n'

export type { Locale }

interface LangCtx {
  locale:    Locale
  setLocale: (l: Locale) => void
  t:         (key: string) => string
}

const LanguageContext = createContext<LangCtx>({
  locale:    'en',
  setLocale: () => {},
  t:         (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with 'en'; useEffect reads the actual cookie without hydration mismatch
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
    const cookie = match?.[1] as Locale | undefined
    if (cookie && (LOCALES as readonly string[]).includes(cookie)) {
      setLocaleState(cookie)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `lang=${newLocale};path=/;max-age=31536000;SameSite=Lax`
  }

  const t = (key: string) => tFn(key, locale)

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LangCtx {
  return useContext(LanguageContext)
}
