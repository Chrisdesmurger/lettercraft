'use client'

import { useEffect } from 'react'
import { useI18n } from '@/lib/i18n-context'

export default function DynamicMetadata() {
  const { t, locale } = useI18n()

  useEffect(() => {
    // Update document title
    document.title = t('metadata.title')
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', t('metadata.description'))
    }
    
    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords) {
      metaKeywords.setAttribute('content', t('metadata.keywords'))
    }
    
    // Update OpenGraph title
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', t('metadata.title'))
    }
    
    // Update OpenGraph description
    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) {
      ogDescription.setAttribute('content', t('metadata.description'))
    }
    
    // Update language attribute
    document.documentElement.lang = locale
    
    // Update OpenGraph locale
    const ogLocale = document.querySelector('meta[property="og:locale"]')
    if (ogLocale) {
      const localeMap: { [key: string]: string } = {
        'fr': 'fr_FR',
        'en': 'en_US',
        'es': 'es_ES',
        'de': 'de_DE',
        'it': 'it_IT'
      }
      ogLocale.setAttribute('content', localeMap[locale] || 'fr_FR')
    }
  }, [t, locale])

  return null
}