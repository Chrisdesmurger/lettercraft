'use client'

import { useState } from 'react'
import { Bell, Globe, Shield, Eye, EyeOff } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

export default function SettingsTab() {
  const { t } = useI18n()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    newsletter: true
  })
  const [language, setLanguage] = useState('fr')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-8">
      {/* Notifications */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          {t('settings.notifications')}
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <span className="text-gray-700">{t('settings.notifications.email')}</span>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <span className="text-gray-700">{t('settings.notifications.push')}</span>
            <input
              type="checkbox"
              checked={notifications.push}
              onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <span className="text-gray-700">{t('settings.notifications.newsletter')}</span>
            <input
              type="checkbox"
              checked={notifications.newsletter}
              onChange={(e) => setNotifications({ ...notifications, newsletter: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
          </label>
        </div>
      </div>

      {/* Language */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          {t('settings.language')}
        </h3>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
        </select>
      </div>

      {/* Security */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          {t('settings.security')}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.newPassword')}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.confirmPassword')}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            {t('settings.updatePassword')}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold mb-4 text-red-600">{t('settings.dangerZone')}</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 mb-4">
            {t('settings.deleteAccountWarning')}
          </p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            {t('settings.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}
