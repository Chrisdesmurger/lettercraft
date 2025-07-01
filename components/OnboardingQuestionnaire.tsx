/**
 * Composant de questionnaire d'onboarding dynamique
 * Utilise react-hook-form pour la gestion du formulaire et framer-motion pour les animations
 * Les réponses sont sauvegardées automatiquement dans Supabase à chaque modification
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { useUser } from '@/hooks/useUser' // Import existant
import {
  saveOnboardingResponse,
  getOnboardingResponses,
  questionsByCategory,
  type Question
} from '@/lib/onboarding'
import { Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Schéma de validation du formulaire
const FormSchema = z.object({
  category: z.string().min(1, 'Veuillez sélectionner une catégorie'),
  responses: z.record(z.string())
})

type FormData = z.infer<typeof FormSchema>

// Catégories disponibles
const categories = [
  { value: 'developer', label: 'Développeur' },
  { value: 'designer', label: 'Designer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Autre' }
]

interface OnboardingQuestionnaireProps {
  data?: any
  onUpdate?: (data: any) => void
  onNext?: () => void
}

export default function OnboardingQuestionnaire({
  data,
  onUpdate,
  onNext
}: OnboardingQuestionnaireProps) {
  const { user } = useUser() // ✅ AJOUT IMPORTANT - Récupération de l'utilisateur
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  const {
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      category: '',
      responses: {}
    }
  })

  const selectedCategory = watch('category')

  // Chargement des réponses existantes
  useEffect(() => {
    async function loadExistingResponses() {
      if (!user) return // ✅ Maintenant user est défini

      setLoading(true)
      try {
        const { data, error } = await getOnboardingResponses(user.id)

        if (!error && data.length > 0) {
          // Grouper les réponses par catégorie
          const responsesByCategory = data.reduce((acc, resp) => {
            if (!acc[resp.category]) {
              acc[resp.category] = {}
            }
            acc[resp.category][resp.question_id] = resp.response
            return acc
          }, {} as Record<string, Record<string, string>>)

          // Si une catégorie a déjà des réponses, la sélectionner
          const firstCategory = Object.keys(responsesByCategory)[0]
          if (firstCategory) {
            setValue('category', firstCategory)
            setValue('responses', responsesByCategory[firstCategory] || {})
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des réponses:', error)
        toast.error('Impossible de charger vos réponses précédentes')
      } finally {
        setLoading(false)
      }
    }

    loadExistingResponses()
  }, [user, setValue])

  // ... reste du code avec saveResponse callback qui utilise maintenant user correctement
}
