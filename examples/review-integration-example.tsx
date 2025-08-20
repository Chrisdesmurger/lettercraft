/**
 * Review System Integration Examples
 *
 * This file demonstrates various ways to integrate the review system
 * into LetterCraft components.
 */

import React from "react";
import { ReviewSystem, ContributorBadge } from "@/components/reviews";
import { useContributorBadge } from "@/hooks/useContributorBadge";
import { useReviewModal } from "@/hooks/useReviewModal";
import { AnalyticsDashboard } from "@/components/reviews/analytics-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Example 1: Simple integration in letter preview
export function LetterPreviewWithReviews({
  letter,
}: {
  letter: { id: string; content: string };
}) {
  return (
    <div className="space-y-4">
      {/* Letter content */}
      <Card>
        <CardHeader>
          <CardTitle>Votre lettre de motivation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{letter.content}</div>
        </CardContent>
      </Card>

      {/* Review system - automatically shows modal after 2.5s */}
      <ReviewSystem
        letterId={letter.id}
        autoShow={true}
        showBadge={true}
        onReviewSubmitted={(review) => {
          console.log("Review submitted:", review);
          // Track analytics, show success message, etc.
        }}
      />
    </div>
  );
}

// Example 2: Manual control with custom hook
export function CustomLetterComponent({
  letter,
}: {
  letter: { id: string; content: string };
}) {
  const { badge, checkBadge } = useContributorBadge();
  const {
    isOpen,
    isSubmitting,
    showReviewModal,
    closeReviewModal,
    submitReview,
    currentLetterId,
  } = useReviewModal({
    autoShow: false, // Disable auto-show
    onReviewSubmit: async (review) => {
      // Custom handling
      console.log("Review submitted:", review);

      // Could track analytics
      // analytics.track('review_submitted', { rating: review.rating })

      // Show custom success message
      // toast.success('Merci pour votre avis !')
    },
  });

  return (
    <div className="space-y-4">
      {/* Letter content */}
      <Card>
        <CardHeader>
          <CardTitle>Lettre générée</CardTitle>
          {badge.earned && <ContributorBadge badge={badge} size="sm" />}
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{letter.content}</div>
        </CardContent>
      </Card>

      {/* Manual review trigger */}
      <div className="flex gap-2">
        <Button onClick={() => showReviewModal(letter.id)}>
          Évaluer cette lettre
        </Button>

        {badge.earned && (
          <Button variant="outline" disabled>
            🏆 Contributeur ({badge.reviewCount} avis)
          </Button>
        )}
      </div>

      {/* The modal will appear when showReviewModal is called */}
    </div>
  );
}

// Example 3: Letter list with review indicators
export function LetterListWithReviews({
  letters,
}: {
  letters: Array<{
    id: string;
    title: string;
    content: string;
    reviewed?: boolean;
  }>;
}) {
  const { badge } = useContributorBadge();

  return (
    <div className="space-y-4">
      {/* Show contributor badge at the top if earned */}
      {badge.earned && (
        <div className="mb-6">
          <ContributorBadge badge={badge} />
        </div>
      )}

      {/* Letter list */}
      <div className="grid gap-4">
        {letters.map((letter) => (
          <Card key={letter.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{letter.title}</CardTitle>
                {letter.reviewed ? (
                  <span className="text-sm text-green-600">✓ Évaluée</span>
                ) : (
                  <span className="text-sm text-gray-500">Non évaluée</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {letter.content.substring(0, 150)}...
              </p>

              {/* Review system for each letter */}
              <ReviewSystem
                letterId={letter.id}
                autoShow={false} // Don't auto-show in lists
                showBadge={false} // Don't repeat badge for each letter
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Example 4: Admin analytics dashboard
export function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = React.useState(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">
          Vue d'ensemble des avis et feedback utilisateurs
        </p>
      </div>

      {/* Analytics dashboard */}
      <AnalyticsDashboard defaultPeriodDays={selectedPeriod} />
    </div>
  );
}

// Example 5: Profile page with contributor status
export function UserProfileWithBadge({
  user,
}: {
  user: { name: string; email: string };
}) {
  const { badge, checkBadge } = useContributorBadge();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil utilisateur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>

        {/* Show contributor status */}
        <div>
          {badge.earned ? (
            <ContributorBadge badge={badge} />
          ) : (
            <div className="text-sm text-gray-500">
              <p>
                Évaluez {badge.requiredReviews - badge.reviewCount} lettres de
                plus pour débloquer le badge Contributeur
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(badge.reviewCount / badge.requiredReviews) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Example 6: Conditional review prompt
export function ConditionalReviewPrompt({
  letter,
  showReviewPrompt,
}: {
  letter: { id: string; content: string };
  showReviewPrompt: boolean;
}) {
  const { showReviewModal } = useReviewModal({ autoShow: false });

  // Only show review system if conditions are met
  if (!showReviewPrompt) {
    return (
      <div>
        <div className="whitespace-pre-wrap">{letter.content}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="whitespace-pre-wrap">{letter.content}</div>

      {/* Conditional review prompt */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Aidez-nous à améliorer</h4>
              <p className="text-sm text-gray-600">
                Votre avis nous aide à générer de meilleures lettres
              </p>
            </div>
            <Button onClick={() => showReviewModal(letter.id)}>
              Donner mon avis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* The review system manages the modal */}
      <ReviewSystem letterId={letter.id} autoShow={false} showBadge={true} />
    </div>
  );
}

export default {
  LetterPreviewWithReviews,
  CustomLetterComponent,
  LetterListWithReviews,
  AdminDashboard,
  UserProfileWithBadge,
  ConditionalReviewPrompt,
};
