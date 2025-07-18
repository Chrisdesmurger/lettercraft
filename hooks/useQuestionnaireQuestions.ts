import type { QuestionnaireQuestion } from './useQuestionnaireFlow'

export function createQuestionnaireQuestions(t: (key: string) => string): QuestionnaireQuestion[] {
  return [
    {
      id: 'motivation',
      title: t('questionnaire.question1.title'),
      type: 'textarea',
      placeholder: t('questionnaire.question1.placeholder'),
      required: true,
      validation: (value: string) => {
        if (!value || value.trim().length < 50) {
          return t('questionnaire.validation.min50chars')
        }
        return null
      }
    },
    {
      id: 'experience_highlight',
      title: t('questionnaire.question2.title'),
      type: 'select_experience',
      required: true,
      dynamic: true,
      validation: (value: any) => {
        if (!value || !value.experience_id) {
          return t('questionnaire.validation.selectExperience')
        }
        return null
      }
    },
    {
      id: 'skills_match',
      title: t('questionnaire.question3.title'),
      type: 'multi_select_skills',
      required: true,
      dynamic: true,
      validation: (value: string[]) => {
        if (!value || value.length === 0) {
          return t('questionnaire.validation.selectSkills')
        }
        return null
      }
    },
    {
      id: 'company_values',
      title: t('questionnaire.question4.title'),
      type: 'textarea',
      placeholder: t('questionnaire.question4.placeholder'),
      required: true,
      validation: (value: string) => {
        if (!value || value.trim().length < 30) {
          return t('questionnaire.validation.min30chars')
        }
        return null
      }
    },
    {
      id: 'additional_context',
      title: t('questionnaire.question5.title'),
      type: 'textarea',
      placeholder: t('questionnaire.question5.placeholder'),
      required: false
    }
  ]
}