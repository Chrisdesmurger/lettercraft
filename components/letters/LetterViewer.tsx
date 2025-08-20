"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Tables } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Copy,
  FileText,
  Building,
  MapPin,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n-context";
import { ReviewSystem } from "@/components/reviews/review-system";
import { getReviewDelayForText } from "@/lib/reading-time";
import { ReviewModal } from "@/components/reviews/review-modal";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { useUser } from "@/hooks/useUser";
import { CreateReviewData } from "@/types/reviews";

type GeneratedLetter = Tables<"generated_letters"> & {
  job_offers: Tables<"job_offers"> | null;
  candidates_profile: { title: string } | null;
};

interface LetterViewerProps {
  letter: GeneratedLetter;
  isOpen: boolean;
  onClose: () => void;
}

export default function LetterViewer({
  letter,
  isOpen,
  onClose,
}: LetterViewerProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [hasUserReview, setHasUserReview] = useState<boolean | null>(null);

  // Calculer le délai de review basé sur la longueur du texte
  const defaultDelaySeconds = parseInt(
    process.env.NEXT_PUBLIC_REVIEW_DELAY_SECONDS || "60",
  );
  const reviewDelay = getReviewDelayForText(letter.content, {
    wordsPerMinute: 200, // Un peu plus lent pour la lecture à l'écran
    additionalDelay: 5, // 5 secondes de plus après la lecture estimée
    minTime: Math.min(defaultDelaySeconds * 1000, 15 * 1000), // Minimum entre délai env et 15s
    maxTime: defaultDelaySeconds * 1000, // Délai configuré dans .env.local
  });

  // État pour le modal de review manuel
  const [isManualReviewOpen, setIsManualReviewOpen] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Vérifier si l'utilisateur a déjà laissé un avis pour cette lettre
  const checkUserReview = useCallback(async () => {
    if (!user) {
      setHasUserReview(false);
      return;
    }

    try {
      const { data: existingReview, error } = await supabase
        .from("letter_reviews")
        .select("id")
        .eq("letter_id", letter.id)
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing review:", error);
        setHasUserReview(false);
        return;
      }

      setHasUserReview(!!existingReview);
    } catch (error) {
      console.error("Error checking user review:", error);
      setHasUserReview(false);
    }
  }, [letter.id, user]);

  // Fonction pour déclencher manuellement le modal de review
  const handleShowReview = () => {
    setIsManualReviewOpen(true);
  };

  // Fonction pour fermer le modal manuel
  const handleCloseManualReview = () => {
    setIsManualReviewOpen(false);
  };

  // Fonction pour soumettre le review manuel
  const handleSubmitManualReview = async (data: CreateReviewData) => {
    setIsSubmittingManual(true);

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

        if (error.code === "ALREADY_REVIEWED") {
          toast.error(t("reviews.errors.alreadyReviewed"));
        } else if (error.code === "RATE_LIMIT_EXCEEDED") {
          toast.error(t("reviews.errors.rateLimitExceeded"));
        } else {
          throw new Error(error.error || t("reviews.errors.submissionError"));
        }
        return;
      }

      const result = await response.json();

      // Mettre à jour l'état après soumission d'un avis
      setHasUserReview(true);

      // Fermer le modal
      setIsManualReviewOpen(false);

      // Afficher message de succès
      toast.success(t("reviews.submitSuccess"));
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(t("reviews.submitError"));
    } finally {
      setIsSubmittingManual(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkUserReview();
    }
  }, [isOpen, checkUserReview]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter.content);
      setCopied(true);
      toast.success(t("success.letterCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("error.copyFailed"));
    }
  };

  if (!isOpen) return null;

  const jobOffer = letter.job_offers;
  const createdDate = new Date(letter.created_at);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {jobOffer?.title || t("letter.defaultTitle")}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                {jobOffer?.company && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>{jobOffer.company}</span>
                  </div>
                )}
                {jobOffer?.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{jobOffer.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(createdDate, "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content - Zone scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
              {letter.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {t("letter.generatedOn", {
              date: format(createdDate, "dd MMMM yyyy à HH:mm", { locale: fr }),
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
            {/* Bouton Laisser un avis - toujours visible, grisé si déjà noté */}
            {user && (
              <Button
                size="sm"
                onClick={hasUserReview ? undefined : handleShowReview}
                disabled={hasUserReview === true}
                className={
                  hasUserReview
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                }
              >
                <Star className="w-4 h-4 mr-2" />
                {hasUserReview
                  ? t("reviews.actions.alreadyReviewed") || "Avis déjà donné"
                  : t("reviews.actions.leaveReview") || "Laisser un avis"}
              </Button>
            )}
          </div>
        </div>

        {/* Review System pour auto-show seulement si pas encore noté */}
        {hasUserReview === false && (
          <ReviewSystem
            letterId={letter.id}
            delayAfterScrollEnd={reviewDelay}
            autoShow={true}
            showBadge={false}
            useSimpleTimeout={true}
            onReviewSubmitted={() => {
              // Mettre à jour l'état après soumission d'un avis
              setHasUserReview(true);
            }}
          />
        )}

        {/* Modal de review manuel */}
        <ReviewModal
          isOpen={isManualReviewOpen}
          onClose={handleCloseManualReview}
          onSubmit={handleSubmitManualReview}
          letterId={letter.id}
          isSubmitting={isSubmittingManual}
        />
      </div>
    </div>
  );
}
