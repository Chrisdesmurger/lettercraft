import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useUser } from '@/hooks/useUser'
import { useUserCVs } from '@/hooks/useUserCVs'
import { usePreGenerationQuotaCheck } from '@/hooks/useQuota'
import type { Tables } from '@/lib/supabase-client'

export type JobOffer = Tables<'job_offers'>
export type QuestionnaireResponse = Tables<'letter_questionnaire_responses'>
export type GeneratedLetter = Tables<'generated_letters'>

export interface LetterGenerationFlow {
  step: 'job_offer' | 'questionnaire' | 'generation' | 'preview'
  jobOffer?: JobOffer
  questionnaireResponse?: QuestionnaireResponse
  generatedLetter?: GeneratedLetter
  isLoading: boolean
  error: string | null
}

export interface QuestionnaireData {
  motivation: string
  experience_highlight: {
    experience_id: string
    experience_title: string
    key_points: string[]
  }
  skills_match: string[]
  company_values: string
  additional_context?: string
  language?: string
}

export function useLetterGeneration() {
  const { user } = useUser()
  const { cvs } = useUserCVs()
  const { executeWithQuotaCheck } = usePreGenerationQuotaCheck()
  const [flow, setFlow] = useState<LetterGenerationFlow>({
    step: 'job_offer',
    isLoading: false,
    error: null
  })

  const activeCV = cvs.find(cv => cv.is_active)

  const resetFlow = useCallback(() => {
    // Nettoyer le localStorage du questionnaire pour éviter les conflits
    if (typeof window !== 'undefined') {
      localStorage.removeItem('questionnaire-progress')
    }
    
    setFlow({
      step: 'job_offer',
      isLoading: false,
      error: null
    })
  }, [])

  const analyzeJobOffer = useCallback(async (jobOfferText: string, sourceUrl?: string) => {
    if (!user) {
      setFlow(prev => ({ ...prev, error: 'Utilisateur non authentifié' }))
      return
    }

    setFlow(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Analyser l'offre d'emploi via OpenAI
      const response = await fetch('/api/analyze-job-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobOfferText, sourceUrl })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse de l\'offre d\'emploi')
      }

      const analyzedData = await response.json()

      // Sauvegarder l'offre d'emploi analysée
      const { data: jobOffer, error: insertError } = await supabase
        .from('job_offers')
        .insert({
          user_id: user.id,
          title: analyzedData.title,
          company: analyzedData.company,
          description: analyzedData.description,
          requirements: analyzedData.requirements,
          location: analyzedData.location,
          salary_range: analyzedData.salary_range,
          employment_type: analyzedData.employment_type,
          source_url: sourceUrl,
          extracted_keywords: analyzedData.keywords,
          language: analyzedData.language
        })
        .select()
        .single()

      if (insertError) throw insertError

      setFlow(prev => ({
        ...prev,
        step: 'questionnaire',
        jobOffer,
        isLoading: false
      }))

    } catch (error) {
      setFlow(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }, [user])

  const submitQuestionnaire = useCallback(async (responses: QuestionnaireData) => {
    if (!user || !flow.jobOffer || !activeCV) {
      setFlow(prev => ({ ...prev, error: 'Données manquantes pour le questionnaire' }))
      return null
    }

    setFlow(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Sauvegarder les réponses du questionnaire
      const { data: questionnaireResponse, error: insertError } = await supabase
        .from('letter_questionnaire_responses')
        .insert({
          user_id: user.id,
          job_offer_id: flow.jobOffer.id,
          cv_id: activeCV.id,
          motivation: responses.motivation,
          experience_highlight: responses.experience_highlight,
          skills_match: responses.skills_match,
          company_values: responses.company_values,
          additional_context: responses.additional_context,
          language: responses.language
        })
        .select()
        .single()

      if (insertError) throw insertError

      setFlow(prev => ({
        ...prev,
        step: 'generation',
        questionnaireResponse,
        isLoading: false
      }))
      
      // Retourner la réponse pour pouvoir l'utiliser directement
      return questionnaireResponse

    } catch (error) {
      setFlow(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
      return null
    }
  }, [user, flow.jobOffer, activeCV])

  const generateLetter = useCallback(async (settings?: any, questionnaireResponseParam?: any) => {
    // Utiliser le paramètre passé ou celui du flow
    const questionnaireResponse = questionnaireResponseParam || flow.questionnaireResponse
    
    if (!user || !flow.jobOffer || !questionnaireResponse || !activeCV) {
      setFlow(prev => ({ ...prev, error: 'Données manquantes pour la génération' }))
      return
    }

    setFlow(prev => ({ ...prev, isLoading: true, error: null }))

    // Utiliser executeWithQuotaCheck pour vérifier les quotas et incrémenter automatiquement
    const success = await executeWithQuotaCheck(async () => {
      // Générer la lettre via OpenAI
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/generate-personalized-letter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          jobOffer: flow.jobOffer || null,
          questionnaireResponse: questionnaireResponse,
          cvData: activeCV,
          settings: {
            language: questionnaireResponse.language || settings?.language || 'fr',
            tone: settings?.tone || 'professionnel',
            length: settings?.length || 'moyen',
            ...settings
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }

      const generationResult = await response.json()

      // Sauvegarder la lettre générée
      const { data: generatedLetter, error: insertError } = await supabase
        .from('generated_letters')
        .insert({
          user_id: user.id,
          questionnaire_response_id: questionnaireResponse.id,
          job_offer_id: flow.jobOffer?.id || '',
          cv_id: activeCV.id,
          content: generationResult.content,
          html_content: generationResult.html_content,
          generation_settings: settings || {},
          openai_model: 'gpt-4-turbo'
        })
        .select()
        .single()

      if (insertError) throw insertError

      setFlow(prev => ({
        ...prev,
        step: 'preview',
        generatedLetter,
        isLoading: false
      }))
    })

    // Si la génération a échoué (quota ou autre erreur)
    if (!success) {
      setFlow(prev => ({
        ...prev,
        isLoading: false,
        error: 'Génération annulée ou quota dépassé'
      }))
    }

  }, [user, flow.jobOffer, flow.questionnaireResponse, activeCV, executeWithQuotaCheck])

  const generatePDF = useCallback(async (letterId: string) => {
    if (!user) return

    setFlow(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/generate-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Télécharger le PDF
      const a = document.createElement('a')
      a.href = url
      a.download = `lettre-motivation-${flow.jobOffer?.company || 'entreprise'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setFlow(prev => ({ ...prev, isLoading: false }))

    } catch (error) {
      setFlow(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la génération du PDF'
      }))
    }
  }, [user, flow.jobOffer])

  const getUserLetters = useCallback(async () => {
    if (!user) return []

    const { data, error } = await supabase
      .from('generated_letters')
      .select(`
        *,
        job_offers(*),
        candidates_profile(title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des lettres:', error)
      return []
    }

    return data || []
  }, [user])

  return {
    flow,
    activeCV,
    resetFlow,
    analyzeJobOffer,
    submitQuestionnaire,
    generateLetter,
    generatePDF,
    getUserLetters
  }
}