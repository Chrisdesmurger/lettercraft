'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserCVs } from '@/hooks/useUserCVs'
import LetterGenerationFlow from '@/components/letter-generation/LetterGenerationFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Upload, FileText, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}

function GenerateLetterContent() {
  const { user, isLoading: userLoading } = useUser()
  const { profile, loading: profileLoading } = useUserProfile()
  const { cvs, loading: cvsLoading } = useUserCVs()
  const router = useRouter()

  const isLoading = userLoading || profileLoading || cvsLoading
  const activeCV = cvs.find(cv => cv.is_active)

  const handleBack = () => {
    router.push('/profile')
  }

  // Redirection si non authentifié
  if (!isLoading && !user) {
    router.push('/auth/login')
    return null
  }

  // État de chargement
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // Vérifier si l'utilisateur a un CV actif
  if (!activeCV) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au profil
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              CV requis
            </h1>
            <p className="text-gray-600">
              Vous devez d'abord uploader et activer un CV pour générer une lettre de motivation
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Aucun CV actif trouvé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Action requise</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Pour générer une lettre de motivation personnalisée, vous devez :
                </p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• Uploader votre CV depuis l'onglet "Mes CV"</li>
                  <li>• Définir un CV comme actif</li>
                  <li>• Revenir ici pour commencer la génération</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/profile?tab=cv')}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader un CV
                </Button>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                >
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Vérifier les limites d'abonnement
  const subscriptionTier = profile?.subscription_tier || 'free'
  const canGenerateLetters = subscriptionTier === 'premium' || activeCV

  if (!canGenerateLetters) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au profil
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Abonnement requis
            </h1>
            <p className="text-gray-600">
              La génération de lettres de motivation est disponible avec un abonnement premium
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Passez au Premium</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">
                  Fonctionnalités Premium
                </h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Génération illimitée de lettres de motivation</li>
                  <li>• Jusqu'à 3 CV uploadés</li>
                  <li>• Questionnaire personnalisé avancé</li>
                  <li>• Export PDF professionnel</li>
                  <li>• Support prioritaire</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/profile?tab=subscription')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
                >
                  Découvrir Premium
                </Button>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                >
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Tout est OK, afficher le flow de génération
  return <LetterGenerationFlow onBack={handleBack} />
}

export default function GenerateLetterPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <GenerateLetterContent />
    </Suspense>
  )
}