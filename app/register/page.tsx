"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useI18n } from "@/lib/i18n-context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { detectCountryFromBrowserLanguage } from "@/lib/i18n";
import { useCountries } from "@/hooks/useCountries";

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { countries, loading: countriesLoading } = useCountries();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });
  }, [router]);

  // Détecter automatiquement le pays depuis le navigateur
  useEffect(() => {
    // Attendre que les pays soient chargés avant de détecter
    if (countriesLoading || countries.length === 0) {
      return;
    }

    const detectCountry = () => {
      try {
        // Utiliser la fonction de détection i18n qui utilise Accept-Language
        const detectedCountryCode = detectCountryFromBrowserLanguage();

        // Vérifier que le pays détecté existe dans notre liste
        const detectedCountry = countries.find(
          (c) => c.code === detectedCountryCode,
        );
        if (detectedCountry) {
          setCountry(detectedCountry.code);
        } else {
          // Fallback si le pays détecté n'est pas dans notre liste
          setCountry("FR");
        }
      } catch (error) {
        console.log("Error detecting country:", error);
        // Défaut en cas d'erreur
        setCountry("FR");
      }
    };

    detectCountry();
  }, [countries, countriesLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      setError(error?.message || t("auth.unknownError"));
      return;
    }

    await supabase
      .from("users")
      .insert({ id: data.user.id, email, onboarded: false });

    // Insérer les données du profil utilisateur
    await supabase.from("user_profiles").insert({
      user_id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      country: country,
      language: locale,
    });

    // Assurer la connexion de l'utilisateur apres l'inscription
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return;
    }

    // Envoyer l'email de bienvenue et synchroniser avec Brevo
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "welcome",
          userEmail: email,
          userName: `${firstName} ${lastName}`,
          userLanguage: locale,
        }),
      });
    } catch (emailError) {
      console.warn("Erreur envoi email de bienvenue:", emailError);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    // Synchroniser le contact avec Brevo
    try {
      const { autoCreateContact } = await import("@/lib/internal-api");
      await autoCreateContact(
        {
          email: email,
          firstName: firstName,
          lastName: lastName,
          language: locale,
        },
        "registration",
      );
    } catch (syncError) {
      console.warn("Erreur synchronisation contact Brevo:", syncError);
      // Ne pas bloquer l'inscription si la sync échoue
    }

    setSuccess(t("auth.registerSuccess"));
    router.push("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-center">{t("auth.register")}</h1>
        <input
          type="text"
          placeholder={`${t("profile.lastName")} *`}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder={`${t("profile.firstName")} *`}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="tel"
          placeholder={`${t("profile.phone")} (${t("common.optional")})`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full border rounded px-3 py-2 bg-white"
          required
          disabled={countriesLoading}
        >
          <option value="">
            {countriesLoading
              ? t("common.loading")
              : t("profile.selectCountry")}
          </option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="email"
          placeholder={`${t("auth.email")} *`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder={`${t("auth.password")} *`}
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
          {t("auth.signup")}
        </button>
        <div className="text-center mt-4">
          <p className="text-gray-600">
            {t("auth.haveAccount")}{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-orange-500 hover:text-orange-600 font-medium underline"
            >
              {t("auth.signin")}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
