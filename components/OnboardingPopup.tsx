'use client'
import { useRouter } from 'next/navigation'

/**
 * Pop-up affiché sur le tableau de bord si l'utilisateur n'a pas terminé
 * l'onboarding. Permet de le rediriger vers le questionnaire.
 */
export default function OnboardingPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl space-y-4 max-w-sm w-full">
        <h2 className="text-lg font-semibold">Complétez votre onboarding</h2>
        <p className="text-sm text-gray-600">
          Vous devez répondre au questionnaire pour accéder à toutes les fonctionnalités.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Faire le questionnaire
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
