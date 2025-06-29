'use client'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import OnboardingQuestionnaire from '@/components/OnboardingQuestionnaire'

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="space-y-8">
        <OnboardingWizard />
        <OnboardingQuestionnaire />
      </div>
    </main>
  )
}
