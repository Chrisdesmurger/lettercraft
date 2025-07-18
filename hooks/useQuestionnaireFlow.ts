import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

export interface QuestionnaireQuestion {
  id: string
  title: string
  type: 'text' | 'textarea' | 'select' | 'multi_select' | 'select_experience' | 'multi_select_skills'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  required?: boolean
  validation?: (value: any) => string | null
  dynamic?: boolean
}

export interface QuestionnaireState {
  currentQuestion: number
  answers: Record<string, any>
  isValid: boolean
  isComplete: boolean
}

export const defaultQuestions: QuestionnaireQuestion[] = [
  {
    id: 'motivation',
    title: 'Pourquoi ce poste vous intéresse-t-il spécifiquement ?',
    type: 'textarea',
    placeholder: 'Décrivez ce qui vous attire dans cette opportunité et pourquoi vous souhaitez rejoindre cette entreprise...',
    required: true,
    validation: (value: string) => {
      if (!value || value.trim().length < 50) {
        return 'Veuillez fournir une réponse d\'au moins 50 caractères'
      }
      return null
    }
  },
  {
    id: 'experience_highlight',
    title: 'Quelle expérience de votre CV souhaitez-vous mettre en avant ?',
    type: 'select_experience',
    required: true,
    dynamic: true,
    validation: (value: any) => {
      if (!value || !value.experience_id) {
        return 'Veuillez sélectionner une expérience'
      }
      return null
    }
  },
  {
    id: 'skills_match',
    title: 'Quelles compétences correspondent le mieux aux attentes de l\'offre ?',
    type: 'multi_select_skills',
    required: true,
    dynamic: true,
    validation: (value: string[]) => {
      if (!value || value.length === 0) {
        return 'Veuillez sélectionner au moins une compétence'
      }
      return null
    }
  },
  {
    id: 'company_values',
    title: 'Comment vos valeurs personnelles s\'alignent-elles avec celles de l\'entreprise ?',
    type: 'textarea',
    placeholder: 'Expliquez comment votre personnalité et vos valeurs peuvent apporter une valeur ajoutée à l\'entreprise...',
    required: true,
    validation: (value: string) => {
      if (!value || value.trim().length < 30) {
        return 'Veuillez fournir une réponse d\'au moins 30 caractères'
      }
      return null
    }
  },
  {
    id: 'additional_context',
    title: 'Souhaitez-vous ajouter des informations supplémentaires ?',
    type: 'textarea',
    placeholder: 'Informations additionnelles que vous souhaitez inclure dans votre lettre (optionnel)...',
    required: false
  }
]

export function useQuestionnaireFlow(questions: QuestionnaireQuestion[] = defaultQuestions) {
  const [state, setState] = useState<QuestionnaireState>(() => {
    // Charger l'état depuis localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('questionnaire-progress')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Erreur lors du chargement du questionnaire:', e)
        }
      }
    }
    return {
      currentQuestion: 0,
      answers: {},
      isValid: false,
      isComplete: false
    }
  })

  const currentQuestion = questions[state.currentQuestion]
  const isLastQuestion = state.currentQuestion === questions.length - 1

  // Sauvegarder l'état dans localStorage à chaque changement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('questionnaire-progress', JSON.stringify(state))
    }
  }, [state])

  const validateAnswer = useCallback((questionId: string, value: any): string | null => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return null

    if (question.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return 'Cette réponse est obligatoire' // This will be handled by the component
    }

    if (question.validation) {
      return question.validation(value)
    }

    return null
  }, [questions])

  const updateAnswer = useCallback((questionId: string, value: any) => {
    setState(prev => {
      const newAnswers = { ...prev.answers, [questionId]: value }
      const error = validateAnswer(questionId, value)
      
      return {
        ...prev,
        answers: newAnswers,
        isValid: !error
      }
    })
  }, [validateAnswer])

  const nextQuestion = useCallback(() => {
    if (state.currentQuestion < questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        isValid: false
      }))
    }
  }, [state.currentQuestion, questions.length])

  const previousQuestion = useCallback(() => {
    if (state.currentQuestion > 0) {
      setState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1,
        isValid: true
      }))
    }
  }, [state.currentQuestion])

  const goToQuestion = useCallback((questionIndex: number) => {
    if (questionIndex >= 0 && questionIndex < questions.length) {
      setState(prev => ({
        ...prev,
        currentQuestion: questionIndex,
        isValid: !!prev.answers[questions[questionIndex].id]
      }))
    }
  }, [questions])

  const completeQuestionnaire = useCallback(() => {
    // Vérifier que toutes les questions obligatoires sont remplies
    const allValid = questions.every(q => {
      if (!q.required) return true
      const value = state.answers[q.id]
      return validateAnswer(q.id, value) === null
    })

    if (allValid) {
      setState(prev => ({
        ...prev,
        isComplete: true
      }))
      return true
    }

    return false
  }, [questions, state.answers, validateAnswer])

  const resetQuestionnaire = useCallback(() => {
    const initialState = {
      currentQuestion: 0,
      answers: {},
      isValid: false,
      isComplete: false
    }
    setState(initialState)
    // Nettoyer localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('questionnaire-progress')
    }
  }, [])

  const getProgress = useCallback(() => {
    return ((state.currentQuestion + 1) / questions.length) * 100
  }, [state.currentQuestion, questions.length])

  const getCompletedQuestions = useCallback(() => {
    return questions.filter(q => {
      const value = state.answers[q.id]
      return validateAnswer(q.id, value) === null
    })
  }, [questions, state.answers, validateAnswer])

  return {
    state,
    currentQuestion,
    isLastQuestion,
    updateAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    completeQuestionnaire,
    resetQuestionnaire,
    getProgress,
    getCompletedQuestions,
    validateAnswer
  }
}