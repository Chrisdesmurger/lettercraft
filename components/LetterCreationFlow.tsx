/**
 * Flow de création de lettre de motivation avec stepper
 * Intègre le questionnaire d'onboarding comme première étape
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import OnboardingQuestionnaire from '@/components/OnboardingQuestionnaire'
import CVUpload from '@/components/CVUpload'
import JobOfferExtractor from '@/components/JobOfferExtractor'
import LetterGenerator from '@/components/LetterGenerator'
import LetterPreview from '@/components/LetterPreview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
    ChevronRight,
    ChevronLeft,
    User,
    FileText,
    Briefcase,
    Sparkles,
    Eye,
    Check
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

// Configuration des étapes
const steps = [
    {
        id: 'profile',
        title: 'Votre profil',
        description: 'Parlez-nous de vous et de vos objectifs',
        icon: User,
        component: OnboardingQuestionnaire,
        validation: async (data: any) => {
            // Vérifier que le questionnaire est rempli
            return data.category && Object.keys(data.responses || {}).length > 0
        }
    },
    {
        id: 'cv',
        title: 'Votre CV',
        description: 'Importez votre CV pour extraire vos expériences',
        icon: FileText,
        component: CVUpload,
        validation: async (data: any) => {
            return data.cvUploaded === true
        }
    },
    {
        id: 'job',
        title: "L'offre d'emploi",
        description: "Ajoutez l'offre qui vous intéresse",
        icon: Briefcase,
        component: JobOfferExtractor,
        validation: async (data: any) => {
            return data.jobOffer && data.jobOffer.title && data.jobOffer.company
        }
    },
    {
        id: 'generate',
        title: 'Génération',
        description: 'Personnalisez et générez votre lettre',
        icon: Sparkles,
        component: LetterGenerator,
        validation: async (data: any) => {
            return true // Pas de validation requise
        }
    },
    {
        id: 'preview',
        title: 'Aperçu',
        description: 'Relisez et téléchargez votre lettre',
        icon: Eye,
        component: LetterPreview,
        validation: async (data: any) => {
            return true
        }
    }
]

interface FlowData {
    // Données du profil
    category?: string
    responses?: Record<string, string>

    // Données du CV
    cvUploaded?: boolean
    cvData?: any

    // Données de l'offre
    jobOffer?: {
        title: string
        company: string
        description: string
        requirements?: string[]
    }

    // Lettre générée
    generatedLetter?: string
    letterLanguage?: string
}

export default function LetterCreationFlow() {
    const router = useRouter()
    const { user } = useUser()
    const [currentStep, setCurrentStep] = useState(0)
    const [flowData, setFlowData] = useState<FlowData>({})
    const [isValidating, setIsValidating] = useState(false)
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

    // Rediriger si non connecté
    useEffect(() => {
        if (!user) {
            router.push('/login')
        }
    }, [user, router])

    // Sauvegarder les données dans le localStorage pour persistance
    useEffect(() => {
        const savedData = localStorage.getItem('letterCreationFlow')
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData)
                setFlowData(parsed.data || {})
                setCurrentStep(parsed.step || 0)
                setCompletedSteps(new Set(parsed.completed || []))
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error)
            }
        }
    }, [])

    // Sauvegarder à chaque changement
    useEffect(() => {
        localStorage.setItem('letterCreationFlow', JSON.stringify({
            data: flowData,
            step: currentStep,
            completed: Array.from(completedSteps)
        }))
    }, [flowData, currentStep, completedSteps])

    const CurrentStepComponent = steps[currentStep].component

    // Mise à jour des données du flow
    const updateFlowData = (stepData: Partial<FlowData>) => {
        setFlowData(prev => ({ ...prev, ...stepData }))
    }

    // Navigation entre les étapes
    const goToNext = async () => {
        if (currentStep >= steps.length - 1) return

        setIsValidating(true)
        try {
            // Valider l'étape actuelle
            const isValid = await steps[currentStep].validation(flowData)

            if (isValid) {
                setCompletedSteps(prev => new Set(prev).add(currentStep))
                setCurrentStep(currentStep + 1)

                // Animation de scroll vers le haut
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                toast.error('Veuillez compléter cette étape avant de continuer')
            }
        } catch (error) {
            console.error('Erreur de validation:', error)
            toast.error('Une erreur est survenue')
        } finally {
            setIsValidating(false)
        }
    }

    const goToPrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const goToStep = (stepIndex: number) => {
        // Permettre de naviguer vers les étapes précédentes ou complétées
        if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
            setCurrentStep(stepIndex)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // Réinitialiser le flow
    const resetFlow = () => {
        setFlowData({})
        setCurrentStep(0)
        setCompletedSteps(new Set())
        localStorage.removeItem('letterCreationFlow')
        toast.success('Nouveau processus de création démarré')
    }

    const progressPercentage = ((currentStep + 1) / steps.length) * 100

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster />

            <div className="container mx-auto py-8 px-4">
                {/* Header avec progression */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">Créer une lettre de motivation</h1>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFlow}
                            className="text-gray-600"
                        >
                            Recommencer
                        </Button>
                    </div>

                    {/* Stepper desktop */}
                    <div className="hidden md:block">
                        <div className="flex justify-between mb-4">
                            {steps.map((step, index) => {
                                const Icon = step.icon
                                const isActive = index === currentStep
                                const isCompleted = completedSteps.has(index)
                                const isClickable = index <= currentStep || completedSteps.has(index - 1)

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => goToStep(index)}
                                        disabled={!isClickable}
                                        className={cn(
                                            "flex-1 text-center transition-all",
                                            isClickable && "cursor-pointer hover:opacity-80",
                                            !isClickable && "cursor-not-allowed opacity-50"
                                        )}
                                    >
                                        <div className="relative">
                                            <div
                                                className={cn(
                                                    "w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-all",
                                                    isActive && "bg-primary text-white ring-4 ring-primary/20",
                                                    isCompleted && !isActive && "bg-green-500 text-white",
                                                    !isActive && !isCompleted && "bg-gray-200 text-gray-500"
                                                )}
                                            >
                                                {isCompleted && !isActive ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <Icon className="w-5 h-5" />
                                                )}
                                            </div>

                                            {index < steps.length - 1 && (
                                                <div
                                                    className={cn(
                                                        "absolute top-6 left-[50%] w-full h-0.5 transition-all",
                                                        index < currentStep || isCompleted
                                                            ? "bg-primary"
                                                            : "bg-gray-200"
                                                    )}
                                                    style={{ width: 'calc(100% + 2rem)', marginLeft: '1.5rem' }}
                                                />
                                            )}
                                        </div>

                                        <div className="mt-3">
                                            <p className={cn(
                                                "font-medium text-sm",
                                                isActive ? "text-primary" : "text-gray-700"
                                            )}>
                                                {step.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 hidden lg:block">
                                                {step.description}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Progress bar mobile */}
                    <div className="md:hidden">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                                Étape {currentStep + 1} sur {steps.length}
                            </span>
                            <span className="text-sm text-gray-500">
                                {steps[currentStep].title}
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                    </div>
                </div>

                {/* Contenu de l'étape */}
                <Card className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-6">
                                <h2 className="text-2xl font-semibold mb-2">
                                    {steps[currentStep].title}
                                </h2>
                                <p className="text-gray-600">
                                    {steps[currentStep].description}
                                </p>
                            </div>

                            <CurrentStepComponent
                                data={flowData}
                                onUpdate={updateFlowData}
                                onNext={goToNext}
                            />
                        </motion.div>
                    </AnimatePresence>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <Button
                        onClick={goToPrevious}
                        disabled={currentStep === 0}
                        variant="outline"
                        size="lg"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Précédent
                    </Button>

                    <Button
                        onClick={goToNext}
                        disabled={currentStep === steps.length - 1 || isValidating}
                        size="lg"
                    >
                        {isValidating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Validation...
                            </>
                        ) : (
                            <>
                                {currentStep === steps.length - 2 ? 'Voir l\'aperçu' : 'Suivant'}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Aide contextuelle */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                        💡 <strong>Astuce :</strong> Vos réponses sont sauvegardées automatiquement.
                        Vous pouvez revenir à tout moment pour continuer votre lettre.
                    </p>
                </div>
            </div>
        </div>
    )
}