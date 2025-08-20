"use client";

import { useState, useEffect } from "react";
import { Bell, Globe, Shield, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { supabase } from "@/lib/supabase-client";
import { locales, localeNames, type Locale } from "@/lib/i18n";
import toast from "react-hot-toast";

export default function SettingsTab() {
  const { t, locale, setLocale } = useI18n();
  const [notifications, setNotifications] = useState({
    email: true,
    newsletter: true,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [hasNotificationChanges, setHasNotificationChanges] = useState(false);
  const [initialNotifications, setInitialNotifications] = useState({
    email: true,
    newsletter: true,
  });
  const [language, setLanguage] = useState<Locale>(locale);
  const [initialLanguage, setInitialLanguage] = useState<Locale>(locale);
  const [hasLanguageChanges, setHasLanguageChanges] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les données utilisateur au montage
  useEffect(() => {
    async function loadUserSettings() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("language, email_notifications, newsletter_enabled")
            .eq("user_id", session.user.id)
            .single();

          if (profileData) {
            // Charger la langue
            if (
              profileData.language &&
              locales.includes(profileData.language as Locale)
            ) {
              const userLanguage = profileData.language as Locale;
              setLanguage(userLanguage);
              setInitialLanguage(userLanguage);
            }

            // Charger les préférences de notifications
            const notificationPrefs = {
              email: profileData.email_notifications ?? true,
              newsletter: profileData.newsletter_enabled ?? true,
            };
            setNotifications(notificationPrefs);
            setInitialNotifications(notificationPrefs);
          }
        }
      } catch (error) {
        console.error("Error loading user settings:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserSettings();
  }, []);

  // Fonction pour gérer les changements de langue (sans sauvegarde)
  const handleLanguageChange = (newLanguage: Locale) => {
    setLanguage(newLanguage);
    setHasLanguageChanges(newLanguage !== initialLanguage);
  };

  // Fonction pour sauvegarder la langue
  const saveLanguagePreference = async () => {
    try {
      setLanguageLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("auth.mustBeLoggedIn"));
        return;
      }

      // Mettre à jour dans user_profiles
      const { error } = await supabase
        .from("user_profiles")
        .update({
          language: language,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error updating language:", error);
        toast.error(t("settings.updateError"));
        return;
      }

      // Synchroniser les données mises à jour avec Brevo
      try {
        const { autoSyncUser } = await import("@/lib/internal-api");
        await autoSyncUser(session.user.id, "language-update");
      } catch (syncError) {
        console.warn("Erreur synchronisation contact Brevo:", syncError);
        // Ne pas bloquer la mise à jour de la langue si la sync échoue
      }

      // Mettre à jour le contexte i18n
      setLocale(language);
      setInitialLanguage(language);
      setHasLanguageChanges(false);

      toast.success(t("settings.languageUpdateSuccess"));
    } catch (error) {
      console.error("Error saving language:", error);
      toast.error(t("settings.updateError"));
    } finally {
      setLanguageLoading(false);
    }
  };

  // Fonction pour gérer les changements de notifications (sans sauvegarde)
  const handleNotificationChange = (
    type: "email" | "newsletter",
    value: boolean,
  ) => {
    const newNotifications = { ...notifications, [type]: value };
    setNotifications(newNotifications);

    // Vérifier s'il y a des changements par rapport aux valeurs initiales
    const hasChanges =
      newNotifications.email !== initialNotifications.email ||
      newNotifications.newsletter !== initialNotifications.newsletter;
    setHasNotificationChanges(hasChanges);
  };

  // Fonction pour sauvegarder les préférences de notifications
  const saveNotificationPreferences = async () => {
    try {
      setNotificationsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("auth.mustBeLoggedIn"));
        return;
      }

      // Mettre à jour dans la base de données
      const { error } = await supabase
        .from("user_profiles")
        .update({
          email_notifications: notifications.email,
          newsletter_enabled: notifications.newsletter,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error updating notification preferences:", error);
        toast.error(t("settings.updateError"));
        return;
      }

      // Synchroniser avec Brevo pour la newsletter
      try {
        const { autoSyncUser } = await import("@/lib/internal-api");
        await autoSyncUser(session.user.id, "notification-preferences-update");
      } catch (syncError) {
        console.warn("Erreur synchronisation contact Brevo:", syncError);
        // Ne pas bloquer la mise à jour si la sync échoue
      }

      // Mettre à jour les valeurs initiales
      setInitialNotifications(notifications);
      setHasNotificationChanges(false);

      toast.success("Préférences de notifications sauvegardées");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast.error(t("settings.updateError"));
    } finally {
      setNotificationsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Notifications */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          {t("settings.notifications.title")}
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <span className="text-gray-700">
              {t("settings.notifications.email")}
            </span>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) =>
                handleNotificationChange("email", e.target.checked)
              }
              disabled={notificationsLoading}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <span className="text-gray-700">
              {t("settings.notifications.newsletter")}
            </span>
            <input
              type="checkbox"
              checked={notifications.newsletter}
              onChange={(e) =>
                handleNotificationChange("newsletter", e.target.checked)
              }
              disabled={notificationsLoading}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50"
            />
          </label>
        </div>

        {/* Bouton de sauvegarde pour les notifications */}
        {hasNotificationChanges && (
          <div className="mt-4">
            <button
              onClick={saveNotificationPreferences}
              disabled={notificationsLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {notificationsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />
                  {t("common.processing")}
                </>
              ) : (
                t("common.save")
              )}
            </button>
          </div>
        )}
      </div>

      {/* Language */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          {t("settings.language")}
        </h3>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as Locale)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          disabled={loading || languageLoading}
        >
          {locales.map((localeCode) => (
            <option key={localeCode} value={localeCode}>
              {localeNames[localeCode]}
            </option>
          ))}
        </select>

        {/* Bouton de sauvegarde pour la langue */}
        {hasLanguageChanges && (
          <div className="mt-4">
            <button
              onClick={saveLanguagePreference}
              disabled={languageLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {languageLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />
                  {t("common.processing")}
                </>
              ) : (
                t("common.save")
              )}
            </button>
          </div>
        )}
      </div>

      {/* Security */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          {t("settings.security")}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.currentPassword")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
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
              {t("settings.newPassword")}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.confirmPassword")}
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            {t("settings.updatePassword")}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold mb-4 text-red-600">
          {t("settings.dangerZone")}
        </h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 mb-4">
            {t("settings.deleteAccountWarning")}
          </p>
          <button
            onClick={() => {
              // Navigate to the account deletion flow
              window.location.href = "/account/delete";
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {t("settings.deleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
