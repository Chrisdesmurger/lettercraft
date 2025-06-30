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
import { useUser } from '@/hooks/useUser' // Hook existant pour récupérer l'utilisateur
import {
    saveOnboardingResponse,
    getOnboardingResponses,
    questionsByCategory,
    type Question
} from '@/lib/onboarding'
import { Loader2 } from 'lucide-react'

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

export default function OnboardingQuestionnaire() {
    const { user } = useUser()
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
            if (!user) return

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

    // Mise à jour des questions quand la catégorie change
    useEffect(() => {
        if (selectedCategory && questionsByCategory[selectedCategory]) {
            setQuestions(questionsByCategory[selectedCategory])
        } else {
            setQuestions([])
        }
    }, [selectedCategory])

    // Sauvegarde automatique d'une réponse
    const saveResponse = useCallback(
        async (questionId: string, response: string) => {
            if (!user || !selectedCategory || !response.trim()) return

            setSaving(questionId)
            try {
                const { error } = await saveOnboardingResponse(
                    user.id,
                    selectedCategory,
                    questionId,
                    response
                )

                if (error) {
                    toast.error('Erreur lors de la sauvegarde')
                } else {
                    toast.success('Réponse sauvegardée', {
                        duration: 2000,
                        position: 'bottom-right'
                    })
                }
            } catch (error) {
                console.error('Erreur:', error)
                toast.error('Une erreur est survenue')
            } finally {
                setSaving(null)
            }
        },
        [user, selectedCategory]
    )

    // Debounce pour la sauvegarde automatique
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

    const handleResponseChange = (questionId: string, value: string) => {
        // Annuler le timeout précédent
        if (saveTimeout) {
            clearTimeout(saveTimeout)
        }

        // Créer un nouveau timeout pour sauvegarder après 1 seconde d'inactivité
        const timeout = setTimeout(() => {
            saveResponse(questionId, value)
        }, 1000)

        setSaveTimeout(timeout)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-2xl font-bold mb-6">Personnalisons votre profil</h2>
                <p className="text-gray-600 mb-8">
                    Ces informations nous aideront à générer des lettres de motivation
                    parfaitement adaptées à votre profil et vos objectifs.
                </p>

                {/* Sélection de la catégorie */}
                <div className="mb-8">
                    <label className="block text-sm font-medium mb-2">
                        Catégorie de poste recherché
                    </label>
                    <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                            <select
                                {...field}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">Sélectionnez une catégorie</option>
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    />
                    {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                    )}
                </div>

                {/* Questions dynamiques */}
                <AnimatePresence mode="wait">
                    {questions.length > 0 && (
                        <motion.div
                            key={selectedCategory}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {questions.map((question, index) => (
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative"
                                >
                                    <label className="block text-sm font-medium mb-2">
                                        {question.text}
                                        {question.required && (
                                            <span className="text-red-500 ml-1">*</span>
                                        )}
                                    </label>
                                    <Controller
                                        name={`responses.${question.id}`}
                                        control={control}
                                        rules={{ required: question.required }}
                                        render={({ field }) => (
                                            <div className="relative">
                                                <textarea
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e)
                                                        handleResponseChange(question.id, e.target.value)
                                                    }}
                                                    placeholder={question.placeholder}
                                                    rows={4}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                                                />
                                                {saving === question.id && (
                                                    <div className="absolute top-2 right-2">
                                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    />
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: questions.length * 0.1 + 0.2 }}
                                className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg"
                            >
                                <p className="text-sm text-green-800">
                                    ✅ Vos réponses sont sauvegardées automatiquement
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}