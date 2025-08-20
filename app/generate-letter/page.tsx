"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserCVs } from "@/hooks/useUserCVs";
import LetterGenerationFlow from "@/components/letter-generation/LetterGenerationFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Upload, FileText, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import { useI18n } from "@/lib/i18n-context";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Header />
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateLetterContent() {
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const { profile, loading: profileLoading } = useUserProfile();
  const { cvs, loading: cvsLoading } = useUserCVs();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        setUserLoading(false);
      }
    });
  }, [router]);

  const isLoading = userLoading || profileLoading || cvsLoading;
  const activeCV = cvs.find((cv) => cv.is_active);

  const handleBack = () => {
    router.push("/profile");
  };

  // Redirection si non authentifié
  if (!isLoading && !user) {
    router.push("/login");
    return null;
  }

  // État de chargement
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Vérifier si l'utilisateur a un CV actif
  if (!activeCV) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
        <Header />
        <div className="p-4">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("generate.backToProfile")}
            </Button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t("generate.cvRequired")}
              </h1>
              <p className="text-gray-600">{t("generate.cvRequiredDesc")}</p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t("generate.noCvFound")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">
                      {t("generate.actionRequired")}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {t("generate.cvRequiredSteps")}
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>• {t("generate.cvRequiredStep1")}</li>
                    <li>• {t("generate.cvRequiredStep2")}</li>
                    <li>• {t("generate.cvRequiredStep3")}</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => router.push("/upload")}
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t("generate.uploadCV")}
                  </Button>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                  >
                    {t("common.back")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Vérifier les limites d'abonnement
  const subscriptionTier = profile?.subscription_tier || "free";
  const canGenerateLetters = subscriptionTier === "premium" || activeCV;

  if (!canGenerateLetters) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
        <Header />
        <div className="p-4">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("generate.backToProfile")}
            </Button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t("generate.subscriptionRequired")}
              </h1>
              <p className="text-gray-600">
                {t("generate.subscriptionRequiredDesc")}
              </p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{t("generate.upgradeTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    {t("generate.premiumFeatures")}
                  </h3>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• {t("generate.feature1")}</li>
                    <li>• {t("generate.feature2")}</li>
                    <li>• {t("generate.feature3")}</li>
                    <li>• {t("generate.feature4")}</li>
                    <li>• {t("generate.feature5")}</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => router.push("/profile?tab=subscription")}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
                  >
                    {t("generate.discoverPremium")}
                  </Button>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                  >
                    {t("common.back")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Tout est OK, afficher le flow de génération
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <Header />
      <LetterGenerationFlow onBack={handleBack} />
    </div>
  );
}

export default function GenerateLetterPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <GenerateLetterContent />
    </Suspense>
  );
}
