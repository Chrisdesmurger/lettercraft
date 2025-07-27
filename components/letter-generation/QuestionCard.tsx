'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ChevronRight, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuestionnaireQuestion } from '@/hooks/useQuestionnaireFlow'
import { useI18n } from '@/lib/i18n-context'

interface QuestionCardProps {
  question: QuestionnaireQuestion
  value: any
  onChange: (value: any) => void
  onNext: () => void
  onPrevious: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  isLastQuestion: boolean
  questionNumber: number
  totalQuestions: number
  cvData?: any
  jobOfferData?: any
}

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
}

export default function QuestionCard({
  question,
  value,
  onChange,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  isLastQuestion,
  questionNumber,
  totalQuestions,
  cvData,
  jobOfferData
}: QuestionCardProps) {
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleValueChange = useCallback((newValue: any) => {
    setLocalValue(newValue)
    onChange(newValue)
    
    // Validation en temps réel
    if (question.validation) {
      const validationError = question.validation(newValue)
      setError(validationError)
    } else {
      setError(null)
    }
  }, [onChange, question.validation])

  // Auto-sélection de la langue détectée pour la question de langue
  useEffect(() => {
    if (question.id === 'language' && jobOfferData?.language && !value) {
      // Auto-sélectionner la langue détectée si aucune valeur n'est encore définie
      const detectedLanguage = jobOfferData.language
      if (question.options?.some(opt => opt.value === detectedLanguage)) {
        handleValueChange(detectedLanguage)
      }
    }
  }, [question.id, jobOfferData?.language, value, question.options, handleValueChange])

  const handleNext = () => {
    if (question.validation) {
      const validationError = question.validation(localValue)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    onNext()
  }

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <Input
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[44px]"
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[120px] resize-none"
            rows={5}
          />
        )

      case 'select':
        return (
          <div className="space-y-4">
            {question.id === 'language' && jobOfferData?.language && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {t('questionnaire.question6.detectedLanguage', { language: question.options?.find(opt => opt.value === jobOfferData.language)?.label || jobOfferData.language })}
                </p>
              </div>
            )}
            <RadioGroup
              value={localValue}
              onValueChange={handleValueChange}
            >
              {question.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 'multi_select':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={option.value}
                  checked={(localValue || []).includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = localValue || []
                    if (checked) {
                      handleValueChange([...currentValues, option.value])
                    } else {
                      handleValueChange(currentValues.filter((v: string) => v !== option.value))
                    }
                  }}
                />
                <Label htmlFor={option.value} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'select_experience':
        return (
          <div className="space-y-3">
            {cvData?.experiences?.map((experience: any, index: number) => (
              <Card
                key={index}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  localValue?.experience_id === experience.id && 'ring-2 ring-orange-500 bg-orange-50'
                )}
                onClick={() => handleValueChange({
                  experience_id: experience.id || `exp-${index}`,
                  experience_title: experience.title || experience.position || t('questionnaire.experience'),
                  key_points: experience.key_points || []
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-normal text-gray-900">
                        {experience.title || experience.position || t('questionnaire.experience')}
                      </h4>
                      {(experience.company || experience.duration) && (
                        <p className="text-sm text-gray-600 mt-1">
                          {[experience.company, experience.duration].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      {experience.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {experience.description}
                        </p>
                      )}
                    </div>
                    {localValue?.experience_id === (experience.id || `exp-${index}`) && (
                      <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 'multi_select_skills':
        const jobSkills = jobOfferData?.extracted_keywords || []
        const cvSkills = cvData?.skills || []
        const allSkills = [...new Set([...jobSkills, ...cvSkills])]

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill: string, index: number) => {
                const isSelected = (localValue || []).includes(skill)
                const isFromJob = jobSkills.includes(skill)
                const isFromCV = cvSkills.includes(skill)

                return (
                  <Badge
                    key={index}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-sm',
                      isSelected && 'bg-orange-500 text-white',
                      isFromJob && !isSelected && 'border-blue-500 text-blue-700',
                      isFromCV && !isSelected && 'border-green-500 text-green-700'
                    )}
                    onClick={() => {
                      const currentValues = localValue || []
                      if (isSelected) {
                        handleValueChange(currentValues.filter((v: string) => v !== skill))
                      } else {
                        handleValueChange([...currentValues, skill])
                      }
                    }}
                  >
                    {skill}
                    {isFromJob && (
                      <span className="ml-1 text-xs">📋</span>
                    )}
                    {isFromCV && (
                      <span className="ml-1 text-xs">📄</span>
                    )}
                  </Badge>
                )
              })}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>{t('questionnaire.skillsFromOffer')}</p>
              <p>{t('questionnaire.skillsFromCV')}</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      key={question.id}
      custom={1}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                {t('questionnaire.questionOf', { questionNumber: questionNumber.toString(), totalQuestions: totalQuestions.toString() })}
              </span>
              {question.required && (
                <Badge variant="outline" className="text-xs">
                  {t('questionnaire.required')}
                </Badge>
              )}
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {question.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {renderInput()}
          
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.previous')}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canGoNext || !!error}
            className="flex items-center gap-2"
          >
            {isLastQuestion ? t('questionnaire.generateLetter') : t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}