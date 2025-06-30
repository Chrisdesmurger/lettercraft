/**
 * Version adaptée pour le flow de création
 * Ajoute les props data et onUpdate pour l'intégration
 */
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient' // ou votre nom de fichier
import {
    saveOnboardingResponse,
    getOnboardingResponses,
    questionsByCategory,
    type Question
} from '@/lib/onboarding'
// ... imports existants ...

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
    // ... code existant ...

    // Modifier la sauvegarde pour mettre à jour le flow
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
                    // Mettre à jour les données du flow
                    if (onUpdate) {
                        const currentResponses = watch('responses')
                        onUpdate({
                            category: selectedCategory,
                            responses: currentResponses
                        })
                    }

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
        [user, selectedCategory, onUpdate, watch]
    )

    // Ajouter un bouton pour continuer à la fin
    const allQuestionsAnswered = questions.every(
        q => watch(`responses.${q.id}`)?.trim()
    )

    return (
        <div className="max-w-2xl mx-auto">
            {/* ... contenu existant ... */}

            {/* Ajouter à la fin du composant */}
            {selectedCategory && questions.length > 0 && allQuestionsAnswered && onNext && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 flex justify-end"
                >
                    <Button onClick={onNext} size="lg">
                        Continuer vers votre CV
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </motion.div>
            )}
        </div>
    )
}