/**
 * Dynamic onboarding questionnaire component
 * Uses react-hook-form for form management and framer-motion for animations
 * Responses are automatically saved to Supabase on each modification
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { useUser } from '@/hooks/useUser' // Import existant
import { useI18n } from '@/lib/i18n-context'
import {
  saveOnboardingResponse,
  getOnboardingResponses,
  questionsByCategory,
  type Question
} from '@/lib/onboarding'
import { Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Form validation schema
const FormSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  responses: z.record(z.string())
})

type FormData = z.infer<typeof FormSchema>

// Available categories (will be translated in component)
const categories = [
  { value: 'developer', labelKey: 'profile.categories.developer' },
  { value: 'designer', labelKey: 'profile.categories.designer' },
  { value: 'marketing', labelKey: 'profile.categories.marketing' },
  { value: 'other', labelKey: 'profile.categories.other' }
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
  const { user } = useUser() // ✅ IMPORTANT - User retrieval
  const { t } = useI18n()
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

  // Loading existing responses
  useEffect(() => {
    async function loadExistingResponses() {
      if (!user) return // ✅ Maintenant user est défini

      setLoading(true)
      try {
        const { data, error } = await getOnboardingResponses(user.id)

        if (!error && data.length > 0) {
          // Group responses by category
          const responsesByCategory = data.reduce((acc, resp) => {
            if (!acc[resp.category]) {
              acc[resp.category] = {}
            }
            acc[resp.category][resp.question_id] = resp.response
            return acc
          }, {} as Record<string, Record<string, string>>)

          // If a category already has responses, select it
          const firstCategory = Object.keys(responsesByCategory)[0]
          if (firstCategory) {
            setValue('category', firstCategory)
            setValue('responses', responsesByCategory[firstCategory] || {})
          }
        }
      } catch (error) {
        console.error('Error loading responses:', error)
        toast.error(t('profile.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadExistingResponses()
  }, [user, setValue])

  // Auto-save responses
  const saveResponse = useCallback(async (questionId: string, response: string) => {
    if (!user) return

    setSaving(questionId)
    try {
      await saveOnboardingResponse(user.id, selectedCategory, questionId, response)
    } catch (error) {
      console.error('Error saving:', error)
      toast.error(t('profile.saveError'))
    } finally {
      setSaving(null)
    }
  }, [user, selectedCategory])

  // Update questions when category changes
  useEffect(() => {
    if (selectedCategory) {
      const categoryQuestions = questionsByCategory[selectedCategory] || []
      setQuestions(categoryQuestions)
      
      // Inform parent of change
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
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('profile.specialityQuestion')}
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
              {t(category.labelKey)}
            </button>
          ))}
        </div>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* Dynamic questions */}
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
                          {t('common.saving')}
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

      {/* Next button */}
      {selectedCategory && questions.length > 0 && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleNext}
            className="flex items-center"
          >
            {t('common.continue')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
