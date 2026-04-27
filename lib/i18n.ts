import enMessages  from '../messages/en.json'
import zhMessages  from '../messages/zh.json'
import yueMessages from '../messages/yue.json'
import jaMessages  from '../messages/ja.json'
import esMessages  from '../messages/es.json'
import viMessages  from '../messages/vi.json'
import tlMessages  from '../messages/tl.json'
import koMessages  from '../messages/ko.json'

export type Locale = 'en' | 'zh' | 'yue' | 'ja' | 'es' | 'vi' | 'tl' | 'ko'

export const LOCALES: Locale[] = ['en', 'zh', 'yue', 'ja', 'es', 'vi', 'tl', 'ko']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messages: Record<Locale, any> = {
  en:  enMessages,
  zh:  zhMessages,
  yue: yueMessages,
  ja:  jaMessages,
  es:  esMessages,
  vi:  viMessages,
  tl:  tlMessages,
  ko:  koMessages,
}

export function t(key: string, locale: Locale = 'en'): string {
  const resolve = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = obj
    for (const k of keys) {
      cur = cur?.[k]
      if (cur === undefined) return undefined
    }
    return typeof cur === 'string' ? cur : undefined
  }

  const parts = key.split('.')
  return (
    resolve(messages[locale] ?? messages.en, parts) ??
    resolve(messages.en, parts) ??
    key
  )
}
