"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useI18n } from "@/lib/i18n-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function ResetPasswordContent() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session from the password reset link
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setValidSession(!!session);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(t("auth.passwordUpdateSuccess"));
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }

    setIsLoading(false);
  };

  if (validSession === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-red-600">
            {t("auth.linkExpired")}
          </h1>
          <p className="text-gray-600">{t("auth.linkExpiredDesc")}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded"
          >
            {t("auth.backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-center">
          {t("auth.resetPasswordTitle")}
        </h1>
        <p className="text-gray-600 text-sm text-center">
          {t("auth.resetPasswordDesc")}
        </p>

        <input
          type="password"
          placeholder={t("auth.newPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
          minLength={6}
        />

        <input
          type="password"
          placeholder={t("auth.confirmNewPassword")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
          minLength={6}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? t("auth.updating") : t("auth.updatePassword")}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-orange-600 hover:underline text-sm"
          >
            {t("auth.backToLogin")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
