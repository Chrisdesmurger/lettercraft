"use client";

import * as React from "react";
import { ReviewModal } from "./review-modal";
import { ContributorBadge } from "./contributor-badge";
import { useReviewModal } from "@/hooks/useReviewModal";
import { useContributorBadge } from "@/hooks/useContributorBadge";
import { CreateReviewData } from "@/types/reviews";
import { toast } from "react-hot-toast";

export interface ReviewSystemProps {
  /** The letter ID to potentially show review for */
  letterId?: string;
  /** Whether to auto-show the review modal after delay */
  autoShow?: boolean;
  /** Whether to show the contributor badge */
  showBadge?: boolean;
  /** Custom class for the container */
  className?: string;
  /** Callback when review is submitted successfully */
  onReviewSubmitted?: (review: CreateReviewData) => void;
  /** Reference to the element containing the letter content for scroll detection */
  letterContentRef?: React.RefObject<HTMLElement>;
  /** Délai après la fin du scroll avant d'afficher le modal (ms) */
  delayAfterScrollEnd?: number;
  /** Utiliser un simple timeout au lieu de la détection de scroll */
  useSimpleTimeout?: boolean;
}

/**
 * Main review system component that handles modal and badge display
 */
export const ReviewSystem = React.forwardRef<HTMLDivElement, ReviewSystemProps>(
  (
    {
      letterId,
      autoShow = true,
      showBadge = true,
      className,
      onReviewSubmitted,
      letterContentRef,
      delayAfterScrollEnd = 2000,
      useSimpleTimeout = false,
    },
    ref,
  ) => {
    const { badge, checkBadge } = useContributorBadge();

    const {
      isOpen,
      isSubmitting,
      showReviewModal,
      closeReviewModal,
      submitReview,
      currentLetterId,
      scrollInfo,
    } = useReviewModal({
      autoShow,
      letterContentRef,
      delayAfterScrollEnd,
      useSimpleTimeout,
      onReviewSubmit: async (data) => {
        // Callback for custom handling
        onReviewSubmitted?.(data);

        // Check if badge should be updated after submission
        await checkBadge();
      },
    });

    // Show review modal when letterId is provided and auto-show is enabled
    React.useEffect(() => {
      if (letterId && autoShow) {
        showReviewModal(letterId);
      }
    }, [letterId, autoShow, showReviewModal]);

    return (
      <div ref={ref} className={className}>
        {/* Contributor Badge */}
        {showBadge && badge.earned && (
          <div className="mb-4">
            <ContributorBadge badge={badge} size="sm" showDescription={false} />
          </div>
        )}

        {/* Review Modal */}
        <ReviewModal
          isOpen={isOpen}
          onClose={closeReviewModal}
          onSubmit={submitReview}
          letterId={currentLetterId || ""}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  },
);

ReviewSystem.displayName = "ReviewSystem";

/**
 * Hook-only version for components that want to manage the UI themselves
 */
export function useReviewSystem(
  options: {
    autoShow?: boolean;
    onReviewSubmitted?: (review: CreateReviewData) => void;
    letterContentRef?: React.RefObject<HTMLElement>;
    delayAfterScrollEnd?: number;
    useSimpleTimeout?: boolean;
  } = {},
) {
  const {
    autoShow = true,
    onReviewSubmitted,
    letterContentRef,
    delayAfterScrollEnd = 2000,
    useSimpleTimeout = false,
  } = options;
  const { badge, checkBadge } = useContributorBadge();

  const reviewModal = useReviewModal({
    autoShow,
    letterContentRef,
    delayAfterScrollEnd,
    useSimpleTimeout,
    onReviewSubmit: async (data) => {
      onReviewSubmitted?.(data);
      await checkBadge();
    },
  });

  return {
    badge,
    checkBadge,
    ...reviewModal,
  };
}
