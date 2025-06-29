'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabaseClient'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUser } from '@supabase/auth-helpers-react'
import { saveOnboardingResponse } from '@/lib/onboarding'

// Questions disponibles par catégorie de poste
type Question = { id: string; label: string; placeholder?: string }
const QUESTIONNAIRE: Record<string, { label: string; questions: Question[] }> = {
  technique: {
    label: 'Poste Technique / Développeur',
    questions: [
      {
        id: 'stack',
        label:
          'Quels langages, frameworks ou outils maîtrisez-vous le mieux ?',
      },
      {
        id: 'projet_fier',
        label:
          'Quel projet technique dont vous êtes le plus fier pouvez-vous décrire en 2–3 phrases ?',
      },
      {
        id: 'defi',
        label:
          'Parlez-moi d’un défi technique complexe que vous avez su résoudre : contexte, solution, résultat.',
      },
      {
        id: 'veille',
        label:
          'Comment vous tenez-vous à jour des nouvelles technologies ? (blogs, meetups, formations…)',
      },
      {
        id: 'collaboration',
        label:
          'Comment communiquez-vous avec les autres développeurs (revues de code, pair-programming…)?',
      },
      {
        id: 'challenge',
        label:
          'Quel type de challenge technique recherchez-vous dans votre prochain poste ?',
      },
    ],
  },
  management: {
    label: 'Poste Managérial / Leadership',
    questions: [
      {
        id: 'style',
        label: 'Comment décririez-vous votre style de management en une phrase ?',
      },
      {
        id: 'motivation',
        label:
          'Racontez un exemple où vous avez motivé une équipe pour atteindre un objectif exigeant.',
      },
      {
        id: 'conflit',
        label: 'Comment gérez-vous un désaccord entre deux membres de votre équipe ?',
      },
      {
        id: 'roadmap',
        label:
          'Comment contribuez-vous à la définition de la roadmap produit ou service dans votre entreprise actuelle ?',
      },
      {
        id: 'kpi',
        label:
          'Quels KPI ou indicateurs utilisez-vous pour évaluer la performance de vos équipes ?',
      },
    ],
  },
  creatif: {
    label: 'Poste Créatif / Design',
    questions: [
      {
        id: 'workflow',
        label:
          'Pouvez-vous décrire votre workflow de création (brief, wireframe, maquette, etc.) ?',
      },
      {
        id: 'outils',
        label:
          'Quelles ressources (dribbble, Behance, blogs…) ou outils (Figma, Sketch…) utilisez-vous ?',
      },
      {
        id: 'projet',
        label:
          'Quel design (site, application, logo…) avez-vous conçu dont vous êtes le plus fier ? Pourquoi ?',
      },
      {
        id: 'adaptabilite',
        label:
          'Comment adaptez-vous votre travail pour des clients aux univers et contraintes très différents ?',
      },
      {
        id: 'feedback',
        label:
          'Comment intégrez-vous les retours utilisateurs et clients dans votre processus ?',
      },
    ],
  },
  vente: {
    label: 'Poste Relation Client / Vente',
    questions: [
      {
        id: 'prospect',
        label: 'Comment préparez-vous une prise de contact avec un prospect ?',
      },
      {
        id: 'negociation',
        label:
          'Décrivez une négociation difficile que vous avez menée : tactiques et résultats.',
      },
      {
        id: 'fidelisation',
        label:
          'Quelles actions mettez-vous en place pour créer une relation de confiance sur le long terme ?',
      },
      {
        id: 'ecoute',
        label: 'Comment détectez-vous les besoins non exprimés d’un client ?',
      },
      {
        id: 'objectif_ca',
        label:
          'Quel objectif de chiffre d’affaires vous êtes-vous fixé et atteint récemment ?',
      },
    ],
  },
  secteur: {
    label: 'Secteur Spécifique',
    questions: [
      {
        id: 'reglementation',
        label:
          'Quelles réglementations ou bonnes pratiques propres à votre secteur maîtrisez-vous ?',
      },
      {
        id: 'adaptation',
        label:
          'Comment avez-vous déjà adapté une solution technique (ou process métier) aux normes de votre secteur ?',
      },
      {
        id: 'terminologie',
        label:
          'Donnez un exemple où vous avez dû expliquer un concept complexe à un non-expert du domaine.',
      },
      {
        id: 'defis',
        label:
          'Selon vous, quels sont les trois principaux défis de ce secteur aujourd’hui ?',
      },
      {
        id: 'valeur',
        label:
          'Comment votre expérience peut-elle aider l’entreprise à relever ces défis ?',
      },
    ],
  },
}

// Schéma de validation générique
const schema = z.object({
  category: z.string().min(1, 'Choisissez une catégorie'),
  responses: z.record(z.string()).optional(),
})

export type FormValues = z.infer<typeof schema>

export default function OnboardingQuestionnaire() {
  const { user } = useUser()
  const { register, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: '', responses: {} },
  })

  const category = watch('category')
  const questions = QUESTIONNAIRE[category]?.questions || []
  const responses = watch('responses') || {}
  const answeredCount = questions.reduce(
    (acc, q) => (responses[q.id] ? acc + 1 : acc),
    0
  )
  const percent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0

  // Charger les réponses existantes pour la catégorie sélectionnée
  useEffect(() => {
    if (!user || !category) return
    supabase
      .from('onboarding_responses')
      .select('question_id, response')
      .eq('user_id', user.id)
      .eq('category', category)
      .then(({ data }) => {
        const values: Record<string, string> = {}
        data?.forEach((r) => {
          values[r.question_id] = r.response
        })
        questions.forEach((q) => {
          if (values[q.id]) setValue(`responses.${q.id}` as const, values[q.id])
        })
      })
  }, [category, questions, setValue, user])

  const handleChange = (qid: string, value: string) => {
    if (!user || !category) return
    setValue(`responses.${qid}` as const, value)
    saveOnboardingResponse(user.id, category, qid, value)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Catégorie de poste</label>
        <select
          {...register('category')}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Sélectionner...</option>
          {Object.entries(QUESTIONNAIRE).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {questions.length > 0 && (
        <div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-orange-500 rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-right text-sm text-gray-600 mt-1">
            {answeredCount}/{questions.length}
          </p>
        </div>
      )}

      {questions.map((q) => (
        <div key={q.id}>
          <label className="block mb-1 font-medium">{q.label}</label>
          <input
            type="text"
            {...register(`responses.${q.id}` as const)}
            onChange={(e) => handleChange(q.id, e.target.value)}
            placeholder={q.placeholder}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      ))}
    </div>
  )
}
