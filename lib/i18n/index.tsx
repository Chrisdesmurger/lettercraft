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

// Mapping des langues vers les pays les plus probables
export const localeToCountry: Record<Locale, string> = {
  fr: 'FR',
  en: 'US',
  es: 'ES', 
  de: 'DE',
  it: 'IT',
}

// Mapping étendu des codes de langues vers nos locales supportées
export const languageCodeToLocale: Record<string, Locale> = {
  'fr': 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'fr-BE': 'fr',
  'fr-CH': 'fr',
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-CA': 'en',
  'en-AU': 'en',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-AR': 'es',
  'de': 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
  'it': 'it',
  'it-IT': 'it',
  'it-CH': 'it',
}

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

// Fonctions de détection automatique
export function detectLanguageFromBrowser(): Locale {
  try {
    // 1. Essayer navigator.languages (ordre de préférence)
    if (typeof navigator !== 'undefined' && navigator.languages) {
      for (const lang of navigator.languages) {
        const cleanLang = lang.toLowerCase()
        if (languageCodeToLocale[cleanLang]) {
          return languageCodeToLocale[cleanLang]
        }
        // Essayer avec seulement le code de langue (fr au lieu de fr-FR)
        const baseLang = cleanLang.split('-')[0]
        if (languageCodeToLocale[baseLang]) {
          return languageCodeToLocale[baseLang]
        }
      }
    }

    // 2. Fallback sur navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const cleanLang = navigator.language.toLowerCase()
      if (languageCodeToLocale[cleanLang]) {
        return languageCodeToLocale[cleanLang]
      }
      const baseLang = cleanLang.split('-')[0]
      if (languageCodeToLocale[baseLang]) {
        return languageCodeToLocale[baseLang]
      }
    }

    // 3. Défaut
    return defaultLocale
  } catch (error) {
    console.log('Error detecting language:', error)
    return defaultLocale
  }
}

export function detectCountryFromLanguage(locale: Locale): string {
  // Utiliser le mapping langue -> pays
  return localeToCountry[locale] || 'FR'
}

export function detectCountryFromBrowserLanguage(): string {
  try {
    // 1. Essayer d'extraire le pays depuis navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const parts = navigator.language.split('-')
      if (parts.length > 1) {
        const countryCode = parts[1].toUpperCase()
        // Vérifier que c'est un code pays valide (2 lettres)
        if (countryCode.length === 2) {
          return countryCode
        }
      }
    }

    // 2. Essayer d'extraire depuis navigator.languages
    if (typeof navigator !== 'undefined' && navigator.languages) {
      for (const lang of navigator.languages) {
        const parts = lang.split('-')
        if (parts.length > 1) {
          const countryCode = parts[1].toUpperCase()
          if (countryCode.length === 2) {
            return countryCode
          }
        }
      }
    }

    // 3. Fallback: utiliser le mapping langue détectée -> pays
    const detectedLanguage = detectLanguageFromBrowser()
    return detectCountryFromLanguage(detectedLanguage)
  } catch (error) {
    console.log('Error detecting country from language:', error)
    return 'FR'
  }
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

  // Charger la langue depuis localStorage ou détecter automatiquement
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && savedLocale in translations) {
      setLocaleState(savedLocale)
    } else {
      // Si pas de langue sauvegardée, détecter automatiquement
      const detectedLocale = detectLanguageFromBrowser()
      setLocaleState(detectedLocale)
      localStorage.setItem('locale', detectedLocale)
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