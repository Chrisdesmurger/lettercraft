import { useState, useEffect, useCallback, useMemo } from "react";
import { CreateReviewData, ReviewModalMemory } from "@/types/reviews";
import { useUser } from "@/hooks/useUser";
import { useScrollEndDetection } from "@/hooks/useScrollEndDetection";
import { supabase } from "@/lib/supabase-client";

const MEMORY_EXPIRY_HOURS = 24; // Remember dismissal for 24 hours
const STORAGE_KEY = "lettercraft_review_modal_memory";

interface UseReviewModalOptions {
  onReviewSubmit?: (data: CreateReviewData) => Promise<void>;
  autoShow?: boolean;
  /** Element contenant la lettre à surveiller pour le scroll */
  letterContentRef?: React.RefObject<HTMLElement>;
  /** Délai après la fin du scroll avant d'afficher le modal (ms) */
  delayAfterScrollEnd?: number;
  /** Utiliser un simple timeout au lieu de la détection de scroll */
  useSimpleTimeout?: boolean;
}

interface UseReviewModalResult {
  isOpen: boolean;
  isSubmitting: boolean;
  showReviewModal: (letterId: string) => void;
  closeReviewModal: () => void;
  submitReview: (data: CreateReviewData) => Promise<void>;
  currentLetterId: string | null;
  // Informations de scroll pour debugging/UI
  scrollInfo: {
    isAtEnd: boolean;
    scrollPercentage: number;
    pendingLetterId: string | null;
  };
}

/**
 * Hook to manage review modal state and timing
 */
export function useReviewModal(
  options: UseReviewModalOptions = {},
): UseReviewModalResult {
  const {
    onReviewSubmit,
    autoShow = true,
    letterContentRef,
    delayAfterScrollEnd = 2000, // 2 secondes après la fin du scroll
    useSimpleTimeout = false,
  } = options;
  const { user } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLetterId, setCurrentLetterId] = useState<string | null>(null);
  const [pendingLetterId, setPendingLetterId] = useState<string | null>(null);

  // Détection de la fin de scroll (seulement si pas en mode simple timeout)
  const {
    hasReachedEnd,
    isAtEnd,
    scrollPercentage,
    reset: resetScrollDetection,
  } = useScrollEndDetection({
    element: letterContentRef,
    threshold: 100, // 100px avant la fin
    delay: delayAfterScrollEnd,
    enabled: autoShow && !!pendingLetterId && !useSimpleTimeout,
  });

  // Get review modal memory from localStorage
  const getModalMemory = useMemo(
    () => (): ReviewModalMemory => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    },
    [],
  );

  // Save review modal memory to localStorage
  const saveModalMemory = useMemo(
    () => (memory: ReviewModalMemory) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
      } catch (error) {
        console.warn("Failed to save review modal memory:", error);
      }
    },
    [],
  );

  // Check if modal was dismissed for this letter recently
  const wasDismissedRecently = useMemo(
    () =>
      (letterId: string): boolean => {
        const memory = getModalMemory();
        const letterMemory = memory[letterId];

        if (!letterMemory || !letterMemory.dismissed) {
          return false;
        }

        const expiry =
          letterMemory.dismissedAt + MEMORY_EXPIRY_HOURS * 60 * 60 * 1000;
        return Date.now() < expiry;
      },
    [getModalMemory],
  );

  // Mark letter as dismissed
  const markAsDismissed = useCallback(
    (letterId: string) => {
      const memory = getModalMemory();
      memory[letterId] = {
        dismissed: true,
        dismissedAt: Date.now(),
      };
      saveModalMemory(memory);
    },
    [getModalMemory, saveModalMemory],
  );

  // Show review modal based on scroll detection
  const showReviewModal = useCallback(
    (letterId: string) => {
      if (!user || !autoShow) return;

      // Check if already dismissed recently
      if (wasDismissedRecently(letterId)) return;

      // Set the pending letter ID to start scroll detection
      setPendingLetterId(letterId);
      resetScrollDetection();
    },
    [user, autoShow, wasDismissedRecently, resetScrollDetection],
  );

  // Effect to show modal when scroll end is detected
  useEffect(() => {
    if (hasReachedEnd && pendingLetterId && !isOpen) {
      setCurrentLetterId(pendingLetterId);
      setIsOpen(true);
      setPendingLetterId(null);
    }
  }, [hasReachedEnd, pendingLetterId, isOpen]);

  // Effect for simple timeout mode
  useEffect(() => {
    if (!useSimpleTimeout || !pendingLetterId || isOpen) return;

    const timeoutId = setTimeout(() => {
      setCurrentLetterId(pendingLetterId);
      setIsOpen(true);
      setPendingLetterId(null);
    }, delayAfterScrollEnd);

    return () => clearTimeout(timeoutId);
  }, [useSimpleTimeout, pendingLetterId, delayAfterScrollEnd, isOpen]);

  // Close review modal
  const closeReviewModal = useCallback(() => {
    setIsOpen(false);

    // Mark as dismissed if user closes without submitting
    if (currentLetterId && !isSubmitting) {
      markAsDismissed(currentLetterId);
    }

    // Clear pending letter and reset scroll detection
    setPendingLetterId(null);
    resetScrollDetection();

    // Reset state after animation
    setTimeout(() => {
      setCurrentLetterId(null);
    }, 200);
  }, [currentLetterId, isSubmitting, markAsDismissed, resetScrollDetection]);

  // Submit review
  const submitReview = useCallback(
    async (data: CreateReviewData) => {
      if (!user || isSubmitting) return;

      setIsSubmitting(true);

      try {
        // Get current session for auth
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Call API to submit review
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || error.code || "Submission failed");
        }

        const result = await response.json();

        // Call custom submit handler if provided
        if (onReviewSubmit) {
          await onReviewSubmit(data);
        }

        // Don't mark as dismissed since review was successfully submitted
        console.log("Review submitted successfully:", result.review.id);
      } catch (error) {
        console.error("Error submitting review:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, isSubmitting, onReviewSubmit],
  );

  // Cleanup old entries from localStorage periodically
  useEffect(() => {
    const cleanup = () => {
      const memory = getModalMemory();
      const now = Date.now();
      const expiry = MEMORY_EXPIRY_HOURS * 60 * 60 * 1000;

      let hasChanges = false;
      Object.keys(memory).forEach((letterId) => {
        const letterMemory = memory[letterId];
        if (letterMemory && letterMemory.dismissedAt + expiry < now) {
          delete memory[letterId];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        saveModalMemory(memory);
      }
    };

    // Cleanup on mount and periodically
    cleanup();
    const interval = setInterval(cleanup, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, [getModalMemory, saveModalMemory]);

  return {
    isOpen,
    isSubmitting,
    showReviewModal,
    closeReviewModal,
    submitReview,
    currentLetterId,
    scrollInfo: {
      isAtEnd,
      scrollPercentage,
      pendingLetterId,
    },
  };
}
