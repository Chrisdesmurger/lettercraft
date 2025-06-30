/**
 * Fonctions utilitaires pour la gestion des r�ponses d'onboarding
 * Utilise react-hook-form pour la gestion des formulaires et zod pour la validation
 */

import { supabase } from '@/lib/supabase-client'
import { z } from 'zod'

// Sch�mas de validation avec Zod
export const OnboardingResponseSchema = z.object({
    userId: z.string().uuid(),
    category: z.string().min(1, "La cat�gorie est requise"),
    questionId: z.string().min(1, "L'ID de question est requis"),
    response: z.string().min(1, "La r�ponse est requise")
})

export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>

// Types pour les questions
export interface Question {
    id: string
    text: string
    placeholder?: string
    required?: boolean
}

// Configuration des questions par cat�gorie
export const questionsByCategory: Record<string, Question[]> = {
    developer: [
        {
            id: 'stack_expertise',
            text: 'Quels langages, frameworks ou outils ma�trisez-vous le mieux ?',
            placeholder: 'Ex: JavaScript, React, Node.js, Docker...',
            required: true
        },
        {
            id: 'project_proud',
            text: 'Quel projet technique dont vous �tes le plus fier pouvez-vous d�crire en 2�3 phrases ?',
            placeholder: 'D�crivez bri�vement le contexte, les technologies utilis�es et l\'impact...',
            required: true
        },
        {
            id: 'problem_solving',
            text: 'Parlez-moi d\'un d�fi technique complexe que vous avez su r�soudre : contexte, solution, r�sultat.',
            placeholder: 'D�taillez le probl�me rencontr�, votre approche et le r�sultat obtenu...',
            required: true
        },
        {
            id: 'learning_culture',
            text: 'Comment vous tenez-vous � jour des nouvelles technologies ? (blogs, meetups, formations�)',
            placeholder: 'Ex: Je suis des blogs tech, participe � des meetups, contribue � l\'open source...',
            required: true
        },
        {
            id: 'career_goals',
            text: 'Quel type de challenge technique recherchez-vous dans votre prochain poste ?',
            placeholder: 'Ex: Architecture scalable, IA/ML, performance, nouvelles technologies...',
            required: true
        }
    ],
    designer: [
        // Questions pour designers � ajouter
    ],
    marketing: [
        // Questions pour marketing � ajouter
    ]
}

/**
 * Sauvegarde ou met � jour une r�ponse d'onboarding
 * Utilise UPSERT pour g�rer automatiquement cr�ation/mise � jour
 */
export async function saveOnboardingResponse(
    userId: string,
    category: string,
    questionId: string,
    response: string
): Promise<{ data: any; error: any }> {
    try {
        // Validation des donn�es avec Zod
        const validatedData = OnboardingResponseSchema.parse({
            userId,
            category,
            questionId,
            response
        })

        const { data, error } = await supabase
            .from('onboarding_responses')
            .upsert(
                {
                    user_id: validatedData.userId,
                    category: validatedData.category,
                    question_id: validatedData.questionId,
                    response: validatedData.response
                },
                {
                    onConflict: 'user_id,category,question_id',
                    ignoreDuplicates: false
                }
            )
            .select()
            .single()

        if (error) {
            console.error('Erreur lors de la sauvegarde:', error)
            return { data: null, error }
        }

        return { data, error: null }
    } catch (error) {
        console.error('Erreur de validation:', error)
        return { data: null, error }
    }
}

/**
 * R�cup�re toutes les r�ponses d'onboarding pour un utilisateur
 */
export async function getOnboardingResponses(
    userId: string,
    category?: string
): Promise<{ data: any[]; error: any }> {
    let query = supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', userId)

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
        console.error('Erreur lors de la r�cup�ration:', error)
        return { data: [], error }
    }

    return { data: data || [], error: null }
}

/**
 * Supprime une r�ponse d'onboarding sp�cifique
 */
export async function deleteOnboardingResponse(
    userId: string,
    category: string,
    questionId: string
): Promise<{ error: any }> {
    const { error } = await supabase
        .from('onboarding_responses')
        .delete()
        .eq('user_id', userId)
        .eq('category', category)
        .eq('question_id', questionId)

    if (error) {
        console.error('Erreur lors de la suppression:', error)
    }

    return { error }
}