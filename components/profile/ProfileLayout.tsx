'use client'

import { useState } from 'react'
import { User, Settings, CreditCard, FileText, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Card, CardContent } from '@/components/ui/card'
import ProfileTab from './tabs/ProfileTab'
import CVTab from './tabs/CVTab'
import SettingsTab from './tabs/SettingsTab'
import SubscriptionTab from './tabs/SubscriptionTab'
import AccountDeletionStatus from './AccountDeletionStatus'
import { useI18n } from '@/lib/i18n-context'
import { useUserSubscription } from '@/hooks/useUserSubscription'

type TabType = 'profile' | 'cv' | 'settings' | 'subscription'

export default function ProfileLayout() {
    const { t } = useI18n()
    const [activeTab, setActiveTab] = useState<TabType>('profile')
    const router = useRouter()
    const { user, userProfile, loading, refreshProfile } = useUserSubscription()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const tabs = [
        { id: 'profile', label: t('profile.tabs.profile'), icon: User },
        { id: 'cv', label: t('profile.tabs.cv'), icon: FileText },
        { id: 'settings', label: t('profile.tabs.settings'), icon: Settings },
        { id: 'subscription', label: t('profile.tabs.subscription'), icon: CreditCard },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <div className="flex items-center justify-center py-10 px-4">
                <Card className="w-full max-w-4xl">
                    {/* Header avec titre */}
                    <div className="p-6 border-b">
                        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
                        <p className="text-gray-600 mt-1">{t('profile.subtitle')}</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="border-b">
                        <nav className="flex space-x-1 p-1" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as TabType)}
                                        className={`
                      flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${activeTab === tab.id
                                                ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }
                    `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Account Deletion Status */}
                    <div className="p-6 border-b">
                        <AccountDeletionStatus />
                    </div>

                    {/* Tab Content */}
                    <CardContent className="p-6">
                        {activeTab === 'profile' && <ProfileTab />}
                        {activeTab === 'cv' && <CVTab />}
                        {activeTab === 'settings' && <SettingsTab />}
                        {activeTab === 'subscription' && (
                            <SubscriptionTab 
                                user={user}
                                userProfile={userProfile}
                                loading={loading}
                                refreshProfile={refreshProfile}
                            />
                        )}
                    </CardContent>

                    {/* Footer avec bouton de déconnexion */}
                    <div className="border-t p-4 flex justify-end">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>{t('auth.logout')}</span>
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
