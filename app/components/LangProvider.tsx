'use client'

import { createContext, useContext } from 'react'
import type { Locale } from '@/lib/i18n'

const LangContext = createContext<Locale>('en')

export function LangProvider({
  lang,
  children,
}: {
  lang:     Locale
  children: React.ReactNode
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export function useLang(): Locale {
  return useContext(LangContext)
}
