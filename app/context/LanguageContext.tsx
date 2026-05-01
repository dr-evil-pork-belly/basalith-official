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

export function LanguageProvider({
  children,
  initialLocale = 'en',
}: {
  children:      ReactNode
  initialLocale?: string
}) {
  // initialLocale comes from the server (archive/contributor preferred_language).
  // useEffect then checks for a cookie which overrides it.
  const safeInitial: Locale = (LOCALES as readonly string[]).includes(initialLocale)
    ? (initialLocale as Locale)
    : 'en'

  const [locale, setLocaleState] = useState<Locale>(safeInitial)

  useEffect(() => {
    const match  = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
    const cookie = match?.[1] as Locale | undefined
    if (cookie && (LOCALES as readonly string[]).includes(cookie)) {
      setLocaleState(cookie)
    } else if (safeInitial !== 'en') {
      // No cookie yet — keep the server-provided locale and write it as a cookie
      // so it persists across navigation
      document.cookie = `lang=${safeInitial};path=/;max-age=31536000;SameSite=Lax`
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
