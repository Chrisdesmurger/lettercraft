"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { Download, TrendingUp, Users, MessageSquare, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewStatistics } from "@/types/reviews";
import { toast } from "react-hot-toast";

export interface AnalyticsDashboardProps {
  className?: string;
  defaultPeriodDays?: number;
}

interface AnalyticsState {
  data: ReviewStatistics | null;
  isLoading: boolean;
  error: string | null;
  periodDays: number;
}

/**
 * Analytics dashboard for review system (admin/internal use)
 */
export const AnalyticsDashboard = React.forwardRef<
  HTMLDivElement,
  AnalyticsDashboardProps
>(({ className, defaultPeriodDays = 30 }, ref) => {
  const [state, setState] = React.useState<AnalyticsState>({
    data: null,
    isLoading: false,
    error: null,
    periodDays: defaultPeriodDays,
  });

  const [isExporting, setIsExporting] = React.useState(false);

  const fetchAnalytics = React.useCallback(async (days: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/reviews/analytics?days=${days}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch analytics");
      }

      const data = await response.json();
      setState((prev) => ({ ...prev, data, isLoading: false }));
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      }));
    }
  }, []);

  const exportCSV = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/reviews/export?days=${state.periodDays}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export data");
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lettercraft-reviews-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export téléchargé avec succès");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const changePeriod = (days: number) => {
    setState((prev) => ({ ...prev, periodDays: days }));
    fetchAnalytics(days);
  };

  // Fetch data on mount
  React.useEffect(() => {
    fetchAnalytics(state.periodDays);
  }, [fetchAnalytics, state.periodDays]);

  const { data, isLoading, error } = state;

  if (error) {
    return (
      <div ref={ref} className={cn("p-4", className)}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Erreur: {error}</p>
              <Button
                variant="outline"
                onClick={() => fetchAnalytics(state.periodDays)}
                className="mt-2"
              >
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics des Reviews</h2>
          <p className="text-muted-foreground">
            Statistiques des avis et feedback utilisateurs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={state.periodDays === days ? "default" : "outline"}
                size="sm"
                onClick={() => changePeriod(days)}
                disabled={isLoading}
              >
                {days}j
              </Button>
            ))}
          </div>

          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={isExporting || isLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Export..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "---" : data?.total_reviews || 0}
            </div>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "---" : data?.average_rating?.toFixed(1) || "0.0"}
            </div>
            {data && !isLoading && (
              <div className="mt-2">
                <StarRating rating={data.average_rating} readOnly size="sm" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participation Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de Participation
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "---"
                : `${data?.participation_rate?.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? ""
                : `${data?.total_users_with_reviews || 0}/${data?.total_users_with_letters || 0} utilisateurs`}
            </p>
          </CardContent>
        </Card>

        {/* Users with Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisateurs Actifs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "---" : data?.total_users_with_reviews || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution des Notes</CardTitle>
          <CardDescription>
            Répartition des notes de 1 à 5 étoiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count =
                  data?.rating_distribution?.[rating.toString()] || 0;
                const total = data?.total_reviews || 1;
                const percentage = (count / total) * 100;

                return (
                  <div key={rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-20">
                      <span className="text-sm text-muted-foreground">
                        {count}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Problem Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Catégories de Problèmes</CardTitle>
          <CardDescription>
            Aspects mentionnés dans les avis négatifs (≤ 3 étoiles)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data?.category_breakdown || {}).map(
                ([category, count]) => (
                  <div key={category} className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {count as number}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {category}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

AnalyticsDashboard.displayName = "AnalyticsDashboard";
