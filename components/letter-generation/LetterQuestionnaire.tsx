'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Briefcase, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import QuestionCard from './QuestionCard'
import { useQuestionnaireFlow, defaultQuestions } from '@/hooks/useQuestionnaireFlow'
import type { QuestionnaireData } from '@/hooks/useLetterGeneration'
import { useI18n } from '@/lib/i18n-context'
import { createQuestionnaireQuestions } from '@/hooks/useQuestionnaireQuestions'

// Fonction pour transformer les données CV pour les rendre compatibles avec QuestionCard
function transformCVData(cvData: any, t: (key: string) => string) {
  if (!cvData) return null
  
  // Transformer les expériences string[] en objets
  const experiences = cvData.experiences?.map((exp: string, index: number) => ({
    id: `exp-${index}`,
    title: exp,
    position: exp,
    company: t('questionnaire.professionalExperience'),
    duration: '',
    description: exp,
    key_points: []
  })) || []

  return {
    ...cvData,
    experiences,
    skills: cvData.skills || []
  }
}

interface LetterQuestionnaireProps {
  jobOffer: any
  cvData: any
  onSubmit: (data: QuestionnaireData) => void
  onBack: () => void
  isLoading?: boolean
}

export default function LetterQuestionnaire({
  jobOffer,
  cvData,
  onSubmit,
  onBack,
  isLoading = false
}: LetterQuestionnaireProps) {
  const { t } = useI18n()
  const [direction, setDirection] = useState(0)
  const questions = createQuestionnaireQuestions(t, jobOffer?.language)
  const {
    state,
    currentQuestion,
    isLastQuestion,
    updateAnswer,
    nextQuestion,
    previousQuestion,
    completeQuestionnaire,
    getProgress,
    getCompletedQuestions,
    validateAnswer
  } = useQuestionnaireFlow(questions)

  const handleNext = () => {
    setDirection(1)
    if (isLastQuestion) {
      if (completeQuestionnaire()) {
        onSubmit(state.answers as QuestionnaireData)
      }
    } else {
      nextQuestion()
    }
  }

  const handlePrevious = () => {
    setDirection(-1)
    previousQuestion()
  }

  const canGoNext = () => {
    const answer = state.answers[currentQuestion.id]
    return validateAnswer(currentQuestion.id, answer) === null
  }

  const completedQuestions = getCompletedQuestions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('questionnaire.title')}
            </h1>
            <p className="text-gray-600">
              {t('questionnaire.subtitle')}
            </p>
          </div>

          {/* Context Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">{jobOffer.title}</h3>
                  <p className="text-sm text-blue-700">{jobOffer.company}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">{cvData.title}</h3>
                  <p className="text-sm text-green-700">{t('questionnaire.activeCV')}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('questionnaire.progress')}
              </span>
              <span className="text-sm text-gray-500">
                {completedQuestions.length} / {questions.length} {t('questionnaire.questions')}
              </span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          {/* Questions Overview */}
          <div className="flex flex-wrap gap-2 mb-8">
            {questions.map((question, index) => {
              const isCompleted = completedQuestions.some(q => q.id === question.id)
              const isCurrent = index === state.currentQuestion
              
              return (
                <Badge
                  key={question.id}
                  variant={isCurrent ? 'default' : isCompleted ? 'secondary' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all',
                    isCurrent && 'bg-orange-500 text-white',
                    isCompleted && !isCurrent && 'bg-green-100 text-green-700',
                    !isCompleted && !isCurrent && 'text-gray-500'
                  )}
                >
                  {index + 1}
                  {isCompleted && <CheckCircle className="w-3 h-3 ml-1" />}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            value={state.answers[currentQuestion.id]}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canGoNext={canGoNext()}
            canGoPrevious={state.currentQuestion > 0}
            isLastQuestion={isLastQuestion}
            questionNumber={state.currentQuestion + 1}
            totalQuestions={questions.length}
            cvData={transformCVData(cvData, t)}
            jobOfferData={jobOffer}
          />
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('common.generating')}
                </h3>
                <p className="text-gray-600">
                  {t('questionnaire.generatingDesc')}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}