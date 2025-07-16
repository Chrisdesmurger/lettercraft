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

  // Sauvegarde automatique des réponses
  const saveResponse = useCallback(async (questionId: string, response: string) => {
    if (!user) return

    setSaving(questionId)
    try {
      await saveOnboardingResponse(user.id, selectedCategory, questionId, response)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(null)
    }
  }, [user, selectedCategory])

  // Mise à jour des questions quand la catégorie change
  useEffect(() => {
    if (selectedCategory) {
      const categoryQuestions = questionsByCategory[selectedCategory] || []
      setQuestions(categoryQuestions)
      
      // Informer le parent du changement
      if (onUpdate) {
        onUpdate({
          category: selectedCategory,
          responses: watch('responses')
        })
      }
    }
  }, [selectedCategory, onUpdate, watch])

  const handleNext = () => {
    const formData = {
      category: selectedCategory,
      responses: watch('responses')
    }
    
    if (onUpdate) {
      onUpdate(formData)
    }
    
    if (onNext) {
      onNext()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sélection de catégorie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quelle est votre spécialité ?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setValue('category', category.value)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                selectedCategory === category.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* Questions dynamiques */}
      <AnimatePresence mode="wait">
        {selectedCategory && questions.length > 0 && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {questions.map((question) => (
              <div key={question.id}>
                <Controller
                  name={`responses.${question.id}`}
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {question.text}
                      </label>
                      <textarea
                        {...field}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder={question.placeholder}
                        onChange={(e) => {
                          field.onChange(e.target.value)
                          saveResponse(question.id, e.target.value)
                        }}
                      />
                      {saving === question.id && (
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Sauvegarde...
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton Suivant */}
      {selectedCategory && questions.length > 0 && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleNext}
            className="flex items-center"
          >
            Continuer
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
