import type { QuestionnaireQuestion } from "./useQuestionnaireFlow";

export function createQuestionnaireQuestions(
  t: (key: string) => string,
  detectedLanguage?: string,
  subscriptionTier?: string,
): QuestionnaireQuestion[] {
  const questions: QuestionnaireQuestion[] = [
    {
      id: "motivation",
      title: t("questionnaire.question1.title"),
      type: "textarea",
      placeholder: t("questionnaire.question1.placeholder"),
      required: true,
      validation: (value: string) => {
        if (!value || value.trim().length < 50) {
          return t("questionnaire.validation.min50chars");
        }
        return null;
      },
    },
    {
      id: "experience_highlight",
      title: t("questionnaire.question2.title"),
      type: "select_experience",
      required: true,
      dynamic: true,
      validation: (value: any) => {
        if (!value || !value.experience_id) {
          return t("questionnaire.validation.selectExperience");
        }
        return null;
      },
    },
    {
      id: "skills_match",
      title: t("questionnaire.question3.title"),
      type: "multi_select_skills",
      required: true,
      dynamic: true,
      validation: (value: string[]) => {
        if (!value || value.length === 0) {
          return t("questionnaire.validation.selectSkills");
        }
        return null;
      },
    },
    {
      id: "company_values",
      title: t("questionnaire.question4.title"),
      type: "textarea",
      placeholder: t("questionnaire.question4.placeholder"),
      required: true,
      validation: (value: string) => {
        if (!value || value.trim().length < 30) {
          return t("questionnaire.validation.min30chars");
        }
        return null;
      },
    },
    {
      id: "additional_context",
      title: t("questionnaire.question5.title"),
      type: "textarea",
      placeholder: t("questionnaire.question5.placeholder"),
      required: false,
    },
  ];

  // Ajouter les questions premium seulement pour les utilisateurs premium
  if (subscriptionTier === "premium") {
    // Question langue
    questions.push({
      id: "language",
      title: t("questionnaire.question6.title"),
      type: "select",
      placeholder: t("questionnaire.question6.placeholder"),
      required: true,
      options: [
        { value: "fr", label: t("questionnaire.question6.french") },
        { value: "en", label: t("questionnaire.question6.english") },
        { value: "es", label: t("questionnaire.question6.spanish") },
      ],
      defaultValue: detectedLanguage || "fr",
      validation: (value: string) => {
        if (!value) {
          return t("questionnaire.validation.required");
        }
        return null;
      },
    });

    // Question ton d'écriture
    questions.push({
      id: "writing_tone",
      title: t("questionnaire.question7.title"),
      type: "tone_selector",
      placeholder: t("questionnaire.question7.placeholder"),
      required: true,
      options: [
        {
          value: "professionnel",
          label: t("questionnaire.question7.tones.professional.label"),
          description: t(
            "questionnaire.question7.tones.professional.description",
          ),
          example: t("questionnaire.question7.tones.professional.example"),
        },
        {
          value: "chaleureux",
          label: t("questionnaire.question7.tones.warm.label"),
          description: t("questionnaire.question7.tones.warm.description"),
          example: t("questionnaire.question7.tones.warm.example"),
        },
        {
          value: "direct",
          label: t("questionnaire.question7.tones.direct.label"),
          description: t("questionnaire.question7.tones.direct.description"),
          example: t("questionnaire.question7.tones.direct.example"),
        },
        {
          value: "persuasif",
          label: t("questionnaire.question7.tones.persuasive.label"),
          description: t(
            "questionnaire.question7.tones.persuasive.description",
          ),
          example: t("questionnaire.question7.tones.persuasive.example"),
        },
        {
          value: "créatif",
          label: t("questionnaire.question7.tones.creative.label"),
          description: t("questionnaire.question7.tones.creative.description"),
          example: t("questionnaire.question7.tones.creative.example"),
        },
        {
          value: "concis",
          label: t("questionnaire.question7.tones.concise.label"),
          description: t("questionnaire.question7.tones.concise.description"),
          example: t("questionnaire.question7.tones.concise.example"),
        },
        {
          value: "personnalisé",
          label: t("questionnaire.question7.tones.custom.label"),
          description: t("questionnaire.question7.tones.custom.description"),
        },
      ],
      defaultValue: "professionnel",
      validation: (value: any) => {
        if (!value || !value.toneKey) {
          return t("questionnaire.validation.selectTone");
        }
        if (
          value.toneKey === "personnalisé" &&
          (!value.customText || value.customText.trim().length === 0)
        ) {
          return t("questionnaire.validation.customToneRequired");
        }
        if (value.customText && value.customText.length > 120) {
          return t("questionnaire.validation.customToneTooLong");
        }
        return null;
      },
    });
  }

  return questions;
}
