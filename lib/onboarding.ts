import { supabase } from './supabaseClient'

/**
 * Enregistre la réponse à une question d'onboarding pour un utilisateur.
 * S'il existe déjà une réponse pour la question, elle est mise à jour.
 */
export async function saveOnboardingResponse(
  userId: string,
  category: string,
  questionId: string,
  response: string
) {
  // Vérifier s'il existe déjà une réponse
  const { data: existing } = await supabase
    .from('onboarding_responses')
    .select('id')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    return supabase
      .from('onboarding_responses')
      .update({ response })
      .eq('id', existing.id)
  }

  return supabase
    .from('onboarding_responses')
    .insert({ user_id: userId, category, question_id: questionId, response })
}
