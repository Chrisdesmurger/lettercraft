"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { useI18n } from "@/lib/i18n-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else if (data.user) {
      const { data: userRow } = await supabase
        .from("users")
        .select("onboarded")
        .eq("id", data.user.id)
        .single();
      setSuccess(t("auth.loginSuccess"));
      router.push("/");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsResetting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(t("auth.resetError"));
    } else {
      setSuccess(t("auth.resetSuccess"));
      setResetSent(true);
    }

    setIsResetting(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      {!showForgotPassword ? (
        // Login Form
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold text-center">{t("auth.login")}</h1>
          <input
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded"
          >
            {t("auth.signin")}
          </button>

          <div className="text-center text-sm space-y-2">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-orange-600 hover:underline"
            >
              {t("auth.forgotPassword")}
            </button>

            <p>
              {t("auth.noAccount")}{" "}
              <Link
                href="/register"
                className="text-orange-600 hover:underline"
              >
                {t("auth.register")}
              </Link>
            </p>
          </div>
        </form>
      ) : (
        // Forgot Password Form
        <div className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-sm">
          {!resetSent ? (
            <form onSubmit={handleForgotPassword}>
              <h1 className="text-2xl font-bold text-center">
                {t("auth.forgotPasswordTitle")}
              </h1>
              <p className="text-gray-600 text-sm text-center mb-4">
                {t("auth.forgotPasswordDesc")}
              </p>

              <input
                type="email"
                placeholder={t("auth.email")}
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}

              <button
                type="submit"
                disabled={isResetting}
                className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isResetting ? t("common.sending") : t("auth.sendResetLink")}
              </button>
            </form>
          ) : (
            // Success State
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">{t("auth.resetEmailSent")}</h1>
              <p className="text-gray-600 text-sm">
                {t("auth.resetEmailDesc")}
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setResetSent(false);
                setError(null);
                setSuccess(null);
                setResetEmail("");
              }}
              className="text-orange-600 hover:underline text-sm"
            >
              {t("auth.backToLogin")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
