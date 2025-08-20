"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { CategorySelector } from "@/components/ui/category-selector";
import { useI18n } from "@/lib/i18n-context";
import {
  FeedbackCategory,
  CreateReviewData,
  REVIEW_CONSTRAINTS,
} from "@/types/reviews";
import { toast } from "react-hot-toast";

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReviewData) => Promise<void>;
  letterId: string;
  isSubmitting?: boolean;
}

export const ReviewModal = React.forwardRef<HTMLDivElement, ReviewModalProps>(
  ({ isOpen, onClose, onSubmit, letterId, isSubmitting = false }, ref) => {
    const { t } = useI18n();
    const [rating, setRating] = React.useState<number>(0);
    const [feedback, setFeedback] = React.useState<string>("");
    const [categories, setCategories] = React.useState<FeedbackCategory[]>([]);
    const [isValid, setIsValid] = React.useState<boolean>(false);
    const [isLocalSubmitting, setIsLocalSubmitting] =
      React.useState<boolean>(false);

    // Validation
    React.useEffect(() => {
      setIsValid(
        rating >= REVIEW_CONSTRAINTS.MIN_RATING &&
          rating <= REVIEW_CONSTRAINTS.MAX_RATING &&
          feedback.length <= REVIEW_CONSTRAINTS.MAX_FEEDBACK_LENGTH,
      );
    }, [rating, feedback]);

    // Reset form when modal opens/closes
    React.useEffect(() => {
      if (!isOpen) {
        setRating(0);
        setFeedback("");
        setCategories([]);
        setIsLocalSubmitting(false);
      }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isValid || isSubmitting || isLocalSubmitting) return;

      setIsLocalSubmitting(true);

      try {
        const reviewData: CreateReviewData = {
          letterId,
          rating,
          feedback: feedback.trim() || undefined,
          categories: categories.length > 0 ? categories : undefined,
        };

        await onSubmit(reviewData);

        // Show success toast before closing
        toast.success(t("reviews.submitSuccess") || "Merci pour votre avis !");

        // Close modal after short delay to ensure toast is visible
        setTimeout(() => {
          onClose();
        }, 100);
      } catch (error) {
        console.error("Error submitting review:", error);
        toast.error(
          t("reviews.submitError") || "Erreur lors de l'envoi de votre avis",
        );
      } finally {
        setIsLocalSubmitting(false);
      }
    };

    const handleSkip = () => {
      onClose();
      // Log skip event for analytics
      console.log("Review skipped for letter:", letterId);
    };

    const remainingChars =
      REVIEW_CONSTRAINTS.MAX_FEEDBACK_LENGTH - feedback.length;

    return (
      <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
        <DialogContent
          ref={ref}
          className="sm:max-w-md"
          onInteractOutside={(e) => isSubmitting && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {t("reviews.modal.title") ||
                "Comment évaluez-vous cette lettre ?"}
            </DialogTitle>
            <DialogDescription>
              {t("reviews.modal.description") ||
                "Votre avis nous aide à améliorer la qualité des lettres générées."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label htmlFor="rating" className="text-sm font-medium">
                {t("reviews.rating.label") || "Note"}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="flex items-center justify-center py-2">
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  size="lg"
                  className="justify-center"
                />
              </div>
              {rating > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {rating === 1 &&
                    (t("reviews.rating.labels.1") || "Très insatisfait")}
                  {rating === 2 &&
                    (t("reviews.rating.labels.2") || "Insatisfait")}
                  {rating === 3 && (t("reviews.rating.labels.3") || "Neutre")}
                  {rating === 4 &&
                    (t("reviews.rating.labels.4") || "Satisfait")}
                  {rating === 5 &&
                    (t("reviews.rating.labels.5") || "Très satisfait")}
                </p>
              )}
            </div>

            {/* Feedback Text */}
            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-sm font-medium">
                {t("reviews.feedback.label") || "Commentaire (optionnel)"}
              </Label>
              <Textarea
                id="feedback"
                placeholder={
                  t("reviews.feedback.placeholder") ||
                  "Partagez vos impressions sur cette lettre..."
                }
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
                maxLength={REVIEW_CONSTRAINTS.MAX_FEEDBACK_LENGTH}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("reviews.feedback.optional") || "Optionnel"}</span>
                <span className={remainingChars < 20 ? "text-orange-500" : ""}>
                  {t("reviews.feedback.charactersRemaining", {
                    count: remainingChars,
                  }) || `${remainingChars} caractères restants`}
                </span>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("reviews.categories.label") ||
                  "Aspects à améliorer (optionnel)"}
              </Label>
              <CategorySelector
                selectedCategories={categories}
                onCategoriesChange={setCategories}
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
              >
                {t("reviews.actions.skip") || "Passer"}
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting || isLocalSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting || isLocalSubmitting
                  ? t("reviews.actions.submitting") || "Envoi..."
                  : t("reviews.actions.submit") || "Envoyer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
);

ReviewModal.displayName = "ReviewModal";
