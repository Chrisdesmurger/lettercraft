'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Locale = 'fr' | 'en' | 'es' | 'de' | 'it'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const translations = {
  fr: {
    'metadata.title': 'LetterCraft - Générateur de lettres de motivation IA',
    'metadata.description': 'Créez des lettres de motivation personnalisées et professionnelles avec l\'intelligence artificielle',
    'navigation.dashboard': 'Dashboard',
    'navigation.generator': 'Générateur',
    'navigation.letters': 'Mes Lettres',
    'navigation.profile': 'Profil',
    'steps.profile.title': 'Votre profil',
    'steps.profile.description': 'Parlez-nous de vous et de vos objectifs',
    'steps.cv.title': 'Votre CV',
    'steps.cv.description': 'Importez votre CV pour extraire vos expériences',
    'steps.jobOffer.title': 'L\'offre d\'emploi',
    'steps.jobOffer.description': 'Ajoutez l\'offre qui vous intéresse',
    'steps.generate.title': 'Génération',
    'steps.generate.description': 'Personnalisez et générez votre lettre',
    'steps.preview.title': 'Aperçu',
    'steps.preview.description': 'Relisez et téléchargez votre lettre',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.continue': 'Continuer',
    'common.finish': 'Terminer',
    'common.error': 'Erreur',
    'common.success': 'Succès',
  },
  en: {
    'metadata.title': 'LetterCraft - AI Cover Letter Generator',
    'metadata.description': 'Create personalized and professional cover letters with artificial intelligence',
    'navigation.dashboard': 'Dashboard',
    'navigation.generator': 'Generator',
    'navigation.letters': 'My Letters',
    'navigation.profile': 'Profile',
    'steps.profile.title': 'Your Profile',
    'steps.profile.description': 'Tell us about yourself and your goals',
    'steps.cv.title': 'Your CV',
    'steps.cv.description': 'Import your CV to extract your experiences',
    'steps.jobOffer.title': 'Job Offer',
    'steps.jobOffer.description': 'Add the job offer that interests you',
    'steps.generate.title': 'Generation',
    'steps.generate.description': 'Customize and generate your letter',
    'steps.preview.title': 'Preview',
    'steps.preview.description': 'Review and download your letter',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.finish': 'Finish',
    'common.error': 'Error',
    'common.success': 'Success',
  },
  es: {
    'metadata.title': 'LetterCraft - Generador de cartas de presentación con IA',
    'metadata.description': 'Crea cartas de presentación personalizadas y profesionales con inteligencia artificial',
    'navigation.dashboard': 'Panel',
    'navigation.generator': 'Generador',
    'navigation.letters': 'Mis Cartas',
    'navigation.profile': 'Perfil',
    'steps.profile.title': 'Tu Perfil',
    'steps.profile.description': 'Cuéntanos sobre ti y tus objetivos',
    'steps.cv.title': 'Tu CV',
    'steps.cv.description': 'Importa tu CV para extraer tus experiencias',
    'steps.jobOffer.title': 'Oferta de Empleo',
    'steps.jobOffer.description': 'Añade la oferta de empleo que te interesa',
    'steps.generate.title': 'Generación',
    'steps.generate.description': 'Personaliza y genera tu carta',
    'steps.preview.title': 'Vista previa',
    'steps.preview.description': 'Revisa y descarga tu carta',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.continue': 'Continuar',
    'common.finish': 'Terminar',
    'common.error': 'Error',
    'common.success': 'Éxito',
  },
  de: {
    'metadata.title': 'LetterCraft - KI-Anschreiben-Generator',
    'metadata.description': 'Erstellen Sie personalisierte und professionelle Anschreiben mit künstlicher Intelligenz',
    'navigation.dashboard': 'Dashboard',
    'navigation.generator': 'Generator',
    'navigation.letters': 'Meine Briefe',
    'navigation.profile': 'Profil',
    'steps.profile.title': 'Ihr Profil',
    'steps.profile.description': 'Erzählen Sie uns von sich und Ihren Zielen',
    'steps.cv.title': 'Ihr Lebenslauf',
    'steps.cv.description': 'Importieren Sie Ihren Lebenslauf, um Ihre Erfahrungen zu extrahieren',
    'steps.jobOffer.title': 'Stellenausschreibung',
    'steps.jobOffer.description': 'Fügen Sie das Stellenangebot hinzu, das Sie interessiert',
    'steps.generate.title': 'Generierung',
    'steps.generate.description': 'Personalisieren und generieren Sie Ihren Brief',
    'steps.preview.title': 'Vorschau',
    'steps.preview.description': 'Überprüfen und laden Sie Ihren Brief herunter',
    'common.next': 'Weiter',
    'common.previous': 'Zurück',
    'common.loading': 'Lädt...',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.continue': 'Fortfahren',
    'common.finish': 'Beenden',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
  },
  it: {
    'metadata.title': 'LetterCraft - Generatore di lettere di presentazione con IA',
    'metadata.description': 'Crea lettere di presentazione personalizzate e professionali con intelligenza artificiale',
    'navigation.dashboard': 'Dashboard',
    'navigation.generator': 'Generatore',
    'navigation.letters': 'Le Mie Lettere',
    'navigation.profile': 'Profilo',
    'steps.profile.title': 'Il Tuo Profilo',
    'steps.profile.description': 'Parlaci di te e dei tuoi obiettivi',
    'steps.cv.title': 'Il Tuo CV',
    'steps.cv.description': 'Importa il tuo CV per estrarre le tue esperienze',
    'steps.jobOffer.title': 'Offerta di Lavoro',
    'steps.jobOffer.description': 'Aggiungi l\'offerta di lavoro che ti interessa',
    'steps.generate.title': 'Generazione',
    'steps.generate.description': 'Personalizza e genera la tua lettera',
    'steps.preview.title': 'Anteprima',
    'steps.preview.description': 'Verifica e scarica la tua lettera',
    'common.next': 'Avanti',
    'common.previous': 'Indietro',
    'common.loading': 'Caricamento...',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.continue': 'Continua',
    'common.finish': 'Termina',
    'common.error': 'Errore',
    'common.success': 'Successo',
  },
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    // Get locale from cookie or localStorage
    const saved = localStorage.getItem('locale') as Locale
    if (saved && Object.keys(translations).includes(saved)) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const t = (key: string, params?: Record<string, string>) => {
    const translation = translations[locale][key as keyof typeof translations[typeof locale]] || key
    
    if (params) {
      return Object.entries(params).reduce((str, [param, value]) => {
        return str.replace(`{${param}}`, value)
      }, translation as string)
    }
    
    return translation as string
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}