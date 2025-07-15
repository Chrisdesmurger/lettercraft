'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  Download, 
  Copy,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLetterGeneration } from '@/hooks/useLetterGeneration'
import { useUserCVs } from '@/hooks/useUserCVs'
import LetterQuestionnaire from './LetterQuestionnaire'
import toast from 'react-hot-toast'

interface LetterGenerationFlowProps {
  onBack: () => void
}

export default function LetterGenerationFlow({ onBack }: LetterGenerationFlowProps) {
  const { cvs } = useUserCVs()
  const {
    flow,
    activeCV,
    resetFlow,
    analyzeJobOffer,
    submitQuestionnaire,
    generateLetter,
    generatePDF
  } = useLetterGeneration()

  const [jobOfferInput, setJobOfferInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')


  const handleJobOfferSubmit = async () => {
    if (!jobOfferInput.trim()) {
      toast.error('Veuillez saisir le texte de l\'offre d\'emploi')
      return
    }

    if (!activeCV) {
      toast.error('Veuillez d\'abord sélectionner un CV actif')
      return
    }

    await analyzeJobOffer(jobOfferInput, sourceUrl)
  }

  const handleQuestionnaireSubmit = async (data: any) => {
    try {
      const questionnaireResponse = await submitQuestionnaire(data)
      if (!questionnaireResponse) {
        return
      }
      // Générer automatiquement la lettre après le questionnaire
      await generateLetter(undefined, questionnaireResponse)
    } catch (error) {
      console.error('Erreur dans handleQuestionnaireSubmit:', error)
    }
  }

  const handleCopyLetter = () => {
    if (flow.generatedLetter?.content) {
      navigator.clipboard.writeText(flow.generatedLetter.content)
      toast.success('Lettre copiée dans le presse-papiers')
    }
  }

  const handleDownloadPDF = async () => {
    if (flow.generatedLetter?.id) {
      await generatePDF(flow.generatedLetter.id)
    }
  }

  const handleRegenerate = async () => {
    await generateLetter({ temperature: 0.8 })
  }

  const renderJobOfferStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analysons l'offre d'emploi
          </h1>
          <p className="text-gray-600">
            Collez le texte de l'offre d'emploi pour une lettre personnalisée
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Offre d'emploi à analyser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL source (optionnel)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/job-offer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte de l'offre d'emploi *
              </label>
              <Textarea
                value={jobOfferInput}
                onChange={(e) => setJobOfferInput(e.target.value)}
                placeholder="Collez ici le texte complet de l'offre d'emploi..."
                className="min-h-[300px] resize-none"
                rows={12}
              />
            </div>

            {activeCV && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">CV actif sélectionné</span>
                </div>
                <p className="text-sm text-green-700">{activeCV.title}</p>
              </div>
            )}

            {!activeCV && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Aucun CV actif</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Veuillez d'abord sélectionner un CV actif dans vos paramètres
                </p>
              </div>
            )}

            <Button
              onClick={handleJobOfferSubmit}
              disabled={!jobOfferInput.trim() || !activeCV || flow.isLoading}
              className="w-full"
            >
              {flow.isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyser l'offre
                </>
              )}
            </Button>

            {flow.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-900">{flow.error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={resetFlow}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nouvelle lettre
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Terminé
            </Badge>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Votre lettre est prête !
          </h1>
          <p className="text-gray-600">
            Lettre générée pour {flow.jobOffer?.title} chez {flow.jobOffer?.company}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Prévisualisation */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Prévisualisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-6 max-h-[600px] overflow-y-auto">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {flow.generatedLetter?.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={flow.isLoading}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>

                <Button
                  onClick={handleCopyLetter}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le texte
                </Button>

                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  disabled={flow.isLoading}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Régénérer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Détails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Poste :</span>
                  <p className="text-gray-600">{flow.jobOffer?.title}</p>
                </div>
                <div>
                  <span className="font-medium">Entreprise :</span>
                  <p className="text-gray-600">{flow.jobOffer?.company}</p>
                </div>
                <div>
                  <span className="font-medium">CV utilisé :</span>
                  <p className="text-gray-600">{activeCV?.title}</p>
                </div>
                <div>
                  <span className="font-medium">Généré le :</span>
                  <p className="text-gray-600">
                    {flow.generatedLetter?.created_at && 
                      new Date(flow.generatedLetter.created_at).toLocaleDateString('fr-FR')
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <AnimatePresence mode="wait">
      {flow.step === 'job_offer' && (
        <motion.div
          key="job_offer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderJobOfferStep()}
        </motion.div>
      )}

      {flow.step === 'questionnaire' && flow.jobOffer && activeCV && (
        <motion.div
          key="questionnaire"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <LetterQuestionnaire
            jobOffer={flow.jobOffer}
            cvData={activeCV}
            onSubmit={handleQuestionnaireSubmit}
            onBack={() => resetFlow()}
            isLoading={flow.isLoading}
          />
        </motion.div>
      )}

      {flow.step === 'generation' && (
        <motion.div
          key="generation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Génération en cours...
              </h2>
              <p className="text-gray-600 mb-6">
                Nous créons votre lettre de motivation personnalisée en fonction de vos réponses.
              </p>
              <div className="bg-orange-100 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  Cela peut prendre quelques secondes, merci de patienter.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {flow.step === 'preview' && flow.generatedLetter && (
        <motion.div
          key="preview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderPreviewStep()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}