"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { codeToFlagEmoji, Country } from "@/lib/data/countries";
import { Language } from "@/lib/data/languages";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  language: string;
  birth_date: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    language: "",
    birth_date: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          country: data.country || "",
          language: data.language || "",
          birth_date: data.birth_date || "",
        });
      }

      const { data: countryData } = await supabase
        .from("countries")
        .select("*")
        .order("name", { ascending: true });
      if (countryData) {
        setCountries(countryData as Country[]);
      }

      const { data: languageData } = await supabase
        .from("languages")
        .select("*")
        .order("label", { ascending: true });
      if (languageData) {
        setLanguages(languageData as Language[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    const phone = profile.phone;
    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError("Numéro de téléphone invalide");
      return;
    }
    setPhoneError(null);
    const updates = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone,
      country: profile.country,
      language: profile.language,
      birth_date: profile.birth_date,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("user_profiles")
      .upsert({ user_id: session.user.id, ...updates });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Profil mis à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <Header />
      {/* Main Content */}
      <div className="flex items-center justify-center py-10">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Mon Profil</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={profile.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  defaultCountry="FR"
                  value={profile.phone || undefined}
                  onChange={(value) => {
                    setPhoneError(null);
                    setProfile((prev) => ({ ...prev, phone: value || "" }));
                  }}
                  international
                />
                {phoneError && (
                  <p className="text-red-500 text-sm">{phoneError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="country">Pays</Label>
                <select
                  id="country"
                  name="country"
                  value={profile.country}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Sélectionner --</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {codeToFlagEmoji(c.code)} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="language">Langue</Label>
                <select
                  id="language"
                  name="language"
                  value={profile.language}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Sélectionner --</option>
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="birth_date">Date de naissance</Label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={profile.birth_date}
                  onChange={handleChange}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="ml-auto">
                Enregistrer
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
