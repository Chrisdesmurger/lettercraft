'use client'

import { Upload, FileText, Download, Trash2, Eye, Crown } from 'lucide-react'
import { useUserCVs } from '@/hooks/useUserCVs'
import { useUserProfile, getCVLimitsBySubscription } from '@/hooks/useUserProfile'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'

export default function CVTab() {
  const { t } = useI18n()
  const { cvs, loading, error, setActiveCV, deleteCV, downloadCV } = useUserCVs()
  const { profile, loading: profileLoading } = useUserProfile()
  const router = useRouter()
  
  const subscriptionTier = profile?.subscription_tier || 'free'
  const maxCVs = getCVLimitsBySubscription(subscriptionTier)
  const canUpload = cvs.length < maxCVs


  const handleSetActive = async (cvId: string) => {
    const success = await setActiveCV(cvId)
    if (success) {
      toast.success(t('cv.setActiveSuccess'))
    } else {
      toast.error(t('cv.setActiveError'))
    }
  }

  const handleDelete = async (cvId: string) => {
    if (confirm(t('cv.deleteConfirm'))) {
      const success = await deleteCV(cvId)
      if (success) {
        toast.success(t('cv.deleteSuccess'))
      } else {
        toast.error(t('cv.deleteError'))
      }
    }
  }

  const handleDownload = async (cvId: string) => {
    await downloadCV(cvId)
  }

  const handleUpload = () => {
    router.push('/upload')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('cv.title')}</h3>
        <p className="text-gray-600">{t('cv.subtitle')}</p>
      </div>

      {/* Upload Area */}
      {canUpload ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">{t('cv.dropzone')}</p>
          <button 
            onClick={handleUpload}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            {t('common.browse')}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            {t('cv.formats')} • {cvs.length}/{maxCVs} CV
            {subscriptionTier === 'free' && (
              <span className="ml-2 text-orange-600 font-medium">({t('cv.freeLimit')})</span>
            )}
            {subscriptionTier === 'premium' && (
              <span className="ml-2 text-purple-600 font-medium flex items-center gap-1">
                <Crown className="w-3 h-3" />
                ({t('cv.premiumLimit')})
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">
            {t('cv.limitReached', { limit: maxCVs.toString() })}
            {subscriptionTier === 'free' && (
              <span className="block text-orange-600 font-medium mt-1">({t('cv.freeLimit')})</span>
            )}
          </p>
          <p className="text-sm text-gray-400 mb-3">
            {t('cv.deleteToAddNew')}
          </p>
          {subscriptionTier === 'free' && (
            <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="text-purple-700 font-semibold">{t('cv.upgradeToPremium')}</span>
              </div>
              <p className="text-sm text-purple-600 mb-3">
                {t('cv.upgradeDescription')}
              </p>
              <button className="bg-gradient-to-r from-purple-600 to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-orange-700 transition-all">
                {t('cv.discoverPremium')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CV List */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">{t('cv.myCV')}</h4>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">{t('cv.loading')}</p>
          </div>
        ) : cvs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('cv.noCV')}</p>
            {canUpload && (
              <button 
                onClick={handleUpload}
                className="mt-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                {t('cv.uploadFirst')}
              </button>
            )}
          </div>
        ) : (
          cvs.map((cv) => (
            <div
              key={cv.id}
              className={`border rounded-lg p-4 ${cv.is_active ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{cv.title}</p>
                    <p className="text-sm text-gray-500">
                      {t('cv.uploadedOn')} {new Date(cv.uploaded_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {cv.is_active && (
                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                      {t('cv.active')}
                    </span>
                  )}
                  <button 
                    onClick={() => handleDownload(cv.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('common.download')}
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    onClick={() => handleDelete(cv.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              {!cv.is_active && (
                <button 
                  onClick={() => handleSetActive(cv.id)}
                  className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  {t('cv.setAsActive')}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">{t('cv.tips')}</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• {t('cv.tipKeepUpdated')}</li>
          <li>• {t('cv.tipMultipleCV', { maxCVs: maxCVs.toString(), plan: subscriptionTier === 'free' ? t('cv.freePlan') : t('cv.premiumPlan') })}</li>
          <li>• {t('cv.tipActiveCV')}</li>
          {subscriptionTier === 'free' && (
            <li className="text-purple-600 font-medium">
              • 🎁 {t('cv.tipUpgradePremium')}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
