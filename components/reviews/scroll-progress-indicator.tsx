"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";
import { useScrollEndDetection } from "@/hooks/useScrollEndDetection";

interface ScrollProgressIndicatorProps {
  /** Pourcentage de scroll (0-100) */
  scrollPercentage?: number;
  /** L'utilisateur est-il à la fin du contenu ? */
  isAtEnd?: boolean;
  /** Y a-t-il une lettre en attente de review ? */
  hasPendingReview?: boolean;
  /** Référence à l'élément contenant le contenu à surveiller */
  letterContentRef?: React.RefObject<HTMLElement>;
  /** Classe CSS personnalisée */
  className?: string;
  /** Afficher l'indicateur uniquement quand l'utilisateur scrolle */
  showOnlyWhenScrolling?: boolean;
}

/**
 * Indicateur de progression de lecture avec feedback visuel
 */
export function ScrollProgressIndicator({
  scrollPercentage: propScrollPercentage,
  isAtEnd: propIsAtEnd,
  hasPendingReview: propHasPendingReview,
  letterContentRef,
  className,
  showOnlyWhenScrolling = true,
}: ScrollProgressIndicatorProps) {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = React.useState(!showOnlyWhenScrolling);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollTimeout = React.useRef<NodeJS.Timeout>();

  // Utiliser le hook de détection de scroll si une ref est fournie
  const { scrollPercentage: hookScrollPercentage, isAtEnd: hookIsAtEnd } =
    useScrollEndDetection({
      element: letterContentRef,
      enabled: !!letterContentRef,
    });

  // Utiliser les valeurs du hook ou les props
  const scrollPercentage = letterContentRef
    ? hookScrollPercentage
    : propScrollPercentage || 0;
  const isAtEnd = letterContentRef ? hookIsAtEnd : propIsAtEnd || false;
  const hasPendingReview = propHasPendingReview || false;

  // Gestion de la visibilité lors du scroll
  React.useEffect(() => {
    if (!showOnlyWhenScrolling) return;

    const handleScroll = () => {
      setIsScrolling(true);
      setIsVisible(true);

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
        // Garder visible si on est à la fin et qu'il y a une review en attente
        if (!(isAtEnd && hasPendingReview)) {
          setIsVisible(false);
        }
      }, 2000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [isAtEnd, hasPendingReview, showOnlyWhenScrolling]);

  // Forcer la visibilité si on est à la fin avec une review en attente
  React.useEffect(() => {
    if (isAtEnd && hasPendingReview) {
      setIsVisible(true);
    }
  }, [isAtEnd, hasPendingReview]);

  const getStatusIcon = () => {
    if (isAtEnd && hasPendingReview) {
      return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
    }
    if (isAtEnd) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Eye className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (isAtEnd && hasPendingReview) {
      return (
        t("reviews.scrollIndicator.waitingForFeedback") ||
        "En attente de votre avis..."
      );
    }
    if (isAtEnd) {
      return t("reviews.scrollIndicator.readingComplete") || "Lecture terminée";
    }
    return (
      t("reviews.scrollIndicator.percentRead", {
        percent: Math.round(scrollPercentage),
      }) || `${Math.round(scrollPercentage)}% lu`
    );
  };

  const getStatusColor = () => {
    if (isAtEnd && hasPendingReview) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    if (isAtEnd) {
      return "border-green-200 bg-green-50 text-green-700";
    }
    return "border-blue-200 bg-blue-50 text-blue-700";
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg backdrop-blur-sm",
            getStatusColor(),
            className,
          )}
        >
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>

          {/* Barre de progression */}
          <div className="w-12 h-2 bg-black/10 rounded-full overflow-hidden ml-2">
            <motion.div
              className="h-full bg-current rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${scrollPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
