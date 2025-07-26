'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// Import des traductions depuis les fichiers JSON
import frTranslations from './fr.json'
import enTranslations from './en.json'
import esTranslations from './es.json'
import deTranslations from './de.json'
import itTranslations from './it.json'

export type Locale = 'fr' | 'en' | 'es' | 'de' | 'it'

// Combine les traductions importées
export const translations = {
  fr: frTranslations,
  en: enTranslations,
  es: esTranslations,
  de: deTranslations,
  it: itTranslations,
} as const

export const defaultLocale: Locale = 'fr'

export const locales: Locale[] = ['fr', 'en', 'es', 'de', 'it']

export const localeNames = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
} as const

// Fonction utilitaire pour obtenir une traduction
export function getTranslation(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.')
  let value: any = translations[locale]
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback vers le français si la clé n'existe pas
      value = translations.fr
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey]
        } else {
          return key // Retourne la clé si aucune traduction n'est trouvée
        }
      }
      break
    }
  }
  
  if (typeof value !== 'string') {
    return key
  }
  
  // Remplace les paramètres dans la traduction
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match
    })
  }
  
  return value
}

// React Context pour i18n

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  // Charger la langue depuis localStorage au montage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && savedLocale in translations) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = (key: string, params?: Record<string, string | number>) => {
    return getTranslation(locale, key, params)
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export default translations