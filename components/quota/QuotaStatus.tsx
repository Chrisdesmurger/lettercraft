"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuota, quotaUtils } from "@/hooks/useQuota";
import { Crown, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-context";

interface QuotaStatusProps {
  showUpgrade?: boolean;
  compact?: boolean;
  className?: string;
}

export function QuotaStatus({
  showUpgrade = true,
  compact = false,
  className,
}: QuotaStatusProps) {
  const { quota, loading, error, refreshQuota } = useQuota();
  const { t } = useI18n();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle className={compact ? "text-base" : "text-lg"}>
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : undefined}>
          <div className="space-y-3">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !quota) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {error || t("quota.loadError")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshQuota}
              className="mx-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("quota.retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPremium = quota.subscription_tier === "premium";
  const progressPercentage = isPremium
    ? 0
    : Math.min((quota.letters_generated / quota.max_letters) * 100, 100);
  const isNearLimit = progressPercentage >= 80;
  const color = quotaUtils.getQuotaColor(quota);

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`flex items-center gap-2 ${compact ? "text-base" : "text-lg"}`}
          >
            {isPremium ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <Zap className="h-5 w-5 text-blue-500" />
            )}
            {t("quota.generationQuota")}
          </CardTitle>

          <Badge
            variant={isPremium ? "default" : "secondary"}
            className={
              isPremium ? "bg-yellow-500 hover:bg-yellow-600" : undefined
            }
          >
            {isPremium ? t("quota.premium") : t("quota.free")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={compact ? "pt-0" : undefined}>
        <div className="space-y-4">
          {/* Barre de progression pour les utilisateurs gratuits */}
          {!isPremium && (
            <div className="space-y-2">
              <Progress
                value={progressPercentage}
                className="h-2"
                // Couleur dynamique basée sur l'utilisation
                style={
                  {
                    "--progress-background": isNearLimit
                      ? "#ef4444"
                      : progressPercentage > 50
                        ? "#f97316"
                        : "#22c55e",
                  } as React.CSSProperties
                }
              />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {quota.letters_generated} / {quota.max_letters}{" "}
                  {t("quota.used")}
                </span>
                <span
                  className={`font-medium ${isNearLimit ? "text-red-600" : "text-muted-foreground"}`}
                >
                  {quota.remaining_letters} {t("quota.remaining")}
                </span>
              </div>
            </div>
          )}

          {/* Message pour les utilisateurs premium */}
          {isPremium && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                {t("quota.unlimitedGenerations")}
              </p>
            </div>
          )}

          {/* Informations de reset */}
          <div className="text-xs text-muted-foreground text-center">
            {isPremium
              ? t("quota.neverResets")
              : t("quota.resetDate", {
                  date: quotaUtils.formatResetDate(quota.reset_date),
                })}
          </div>

          {/* Bouton d'upgrade pour les utilisateurs gratuits */}
          {showUpgrade && !isPremium && (
            <div className="pt-2">
              {isNearLimit && (
                <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-800 text-center">
                    {t("quota.approachingLimit")}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                size={compact ? "sm" : "default"}
                onClick={() => {
                  // Rediriger vers la page d'upgrade ou ouvrir une modal
                  window.location.href = "/profile?tab=subscription";
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                {t("quota.upgradeToPremium")}
              </Button>
            </div>
          )}

          {/* Message si quota dépassé */}
          {!quota.can_generate && !isPremium && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 text-center font-medium">
                {t("quota.quotaExceeded")}
              </p>
              <p className="text-xs text-red-600 text-center mt-1">
                {t("quota.quotaExceededMessage", {
                  time: quotaUtils.getTimeUntilReset(quota.reset_date),
                })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default QuotaStatus;
