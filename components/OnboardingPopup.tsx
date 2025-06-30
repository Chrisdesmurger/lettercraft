'use client'
import OnboardingQuestionnaire from './OnboardingQuestionnaire'

/**
 * Pop-up affiché sur le tableau de bord si l'utilisateur n'a pas terminé
 * l'onboarding. Permet de le rediriger vers le questionnaire.
 */
export default function OnboardingPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl space-y-4 max-w-lg w-full">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Complétez votre onboarding</h2>
          <button onClick={onClose} className="px-2 py-1 text-sm">Fermer</button>
        </div>
        <OnboardingQuestionnaire />
      </div>
    </div>
  )
}
