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
import { QuotaGuard, QuotaBanner } from '@/components/quota'
import { usePreGenerationQuotaCheck } from '@/hooks/useQuota'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'

interface LetterGenerationFlowProps {
  onBack: () => void
}

export default function LetterGenerationFlow({ onBack }: LetterGenerationFlowProps) {
  const { t } = useI18n()
  const { cvs } = useUserCVs()
  const { checkAndShowQuotaStatus } = usePreGenerationQuotaCheck()
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
      toast.error(t('flow.enterJobOffer'))
      return
    }

    if (!activeCV) {
      toast.error(t('flow.selectActiveCv'))
      return
    }

    // Vérifier les quotas avant de procéder à l'analyse
    const hasQuotaAvailable = await checkAndShowQuotaStatus()
    if (!hasQuotaAvailable) {
      return // L'utilisateur est bloqué par le quota
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
      toast.success(t('letter.copySuccess'))
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
          {t('flow.back')}
        </Button>

        {/* Bannière des quotas */}
        <QuotaBanner className="mb-6" />

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('flow.analyzeJobTitle')}
          </h1>
          <p className="text-gray-600">
            {t('flow.analyzeJobDesc')}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t('flow.jobToAnalyze')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('flow.sourceUrl')}
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
                {t('flow.jobOfferText')}
              </label>
              <Textarea
                value={jobOfferInput}
                onChange={(e) => setJobOfferInput(e.target.value)}
                placeholder={t('flow.jobOfferPlaceholder')}
                className="min-h-[300px] resize-none"
                rows={12}
              />
            </div>

            {activeCV && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">{t('flow.activeCvSelected')}</span>
                </div>
                <p className="text-sm text-green-700">{activeCV.title}</p>
              </div>
            )}

            {!activeCV && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">{t('flow.noActiveCV')}</span>
                </div>
                <p className="text-sm text-yellow-700">
                  {t('flow.selectCvInSettings')}
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
                  {t('flow.analyzing')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('flow.analyzeOffer')}
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
            {t('flow.newLetter')}
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-700 border-green-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('flow.completed')}
            </Badge>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('flow.letterReady')}
          </h1>
          <p className="text-gray-600">
            {t('flow.letterGeneratedFor', { title: flow.jobOffer?.title || '', company: flow.jobOffer?.company || '' })}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Prévisualisation */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('flow.preview')}
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
                <CardTitle className="text-lg">{t('flow.actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={flow.isLoading}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('flow.downloadPdf')}
                </Button>

                <Button
                  onClick={handleCopyLetter}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('flow.copyText')}
                </Button>

                <QuotaGuard showQuotaStatus={false}>
                  <Button
                    onClick={handleRegenerate}
                    variant="outline"
                    disabled={flow.isLoading}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('flow.regenerate')}
                  </Button>
                </QuotaGuard>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('flow.details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">{t('flow.position')}</span>
                  <p className="text-gray-600">{flow.jobOffer?.title}</p>
                </div>
                <div>
                  <span className="font-medium">{t('flow.company')}</span>
                  <p className="text-gray-600">{flow.jobOffer?.company}</p>
                </div>
                <div>
                  <span className="font-medium">{t('flow.cvUsed')}</span>
                  <p className="text-gray-600">{activeCV?.title}</p>
                </div>
                <div>
                  <span className="font-medium">{t('flow.generatedOn')}</span>
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
                {t('flow.generating')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('flow.generatingDesc')}
              </p>
              <div className="bg-orange-100 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  {t('flow.pleaseWait')}
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