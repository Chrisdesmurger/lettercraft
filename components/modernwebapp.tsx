'use client'

import React from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, Upload, MessageSquare } from 'lucide-react';
import Header from '@/components/Header'
import { useI18n } from '@/lib/i18n-context'

const ModernWebApp = () => {
  const { t } = useI18n()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('webapp.cvUploaded')}</h3>
            </div>
            <p className="text-gray-600 text-sm">{t('webapp.cvDesc')}</p>
            <Link 
              href="/profile"
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              {t('webapp.seeDetails')} <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('webapp.generator')}</h3>
            </div>
            <p className="text-gray-600 text-sm">{t('webapp.generatorDesc')}</p>
            <Link 
              href="/generate-letter"
              className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
            >
              {t('webapp.create')} <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('webapp.lettersGenerated')}</h3>
            </div>
            <p className="text-gray-600 text-sm">{t('webapp.lettersDesc')}</p>
            <Link 
              href="/dashboard/letters"
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center"
            >
              {t('webapp.history')} <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Section d'actions */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">{t('webapp.readyToCreate')}</h3>
            <p className="text-orange-100 mb-6">{t('webapp.readyDesc')}</p>
            <Link 
              href="/generate-letter"
              className="inline-block bg-white text-orange-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {t('webapp.startNow')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModernWebApp;