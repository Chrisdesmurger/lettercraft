import { useState, useEffect, useCallback, useRef } from "react";

interface UseScrollEndDetectionOptions {
  /** Seuil en pixels avant la fin pour considérer que l'utilisateur a fini de scroller */
  threshold?: number;
  /** Délai en millisecondes après la fin du scroll pour déclencher l'événement */
  delay?: number;
  /** Element à surveiller (par défaut: window) */
  element?: React.RefObject<HTMLElement>;
  /** Activer/désactiver la détection */
  enabled?: boolean;
}

interface UseScrollEndDetectionResult {
  /** True si l'utilisateur a atteint la fin et que le délai est écoulé */
  hasReachedEnd: boolean;
  /** True si l'utilisateur a atteint la fin (sans délai) */
  isAtEnd: boolean;
  /** Pourcentage de scroll (0-100) */
  scrollPercentage: number;
  /** Réinitialiser la détection */
  reset: () => void;
}

/**
 * Hook pour détecter quand l'utilisateur a fini de scroller un contenu
 */
export function useScrollEndDetection(
  options: UseScrollEndDetectionOptions = {},
): UseScrollEndDetectionResult {
  const {
    threshold = 50, // 50px avant la fin
    delay = 3000, // 3 secondes après la fin du scroll
    element,
    enabled = true,
  } = options;

  const [isAtEnd, setIsAtEnd] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTime = useRef<number>(0);

  const reset = useCallback(() => {
    setIsAtEnd(false);
    setHasReachedEnd(false);
    setScrollPercentage(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const checkScrollPosition = useCallback(() => {
    if (!enabled) return;

    const targetElement = element?.current || document.documentElement;
    const scrollTop = element?.current
      ? element.current.scrollTop
      : window.pageYOffset;
    const scrollHeight = targetElement.scrollHeight;
    const clientHeight = element?.current
      ? element.current.clientHeight
      : window.innerHeight;

    // Calculer le pourcentage de scroll
    const maxScroll = scrollHeight - clientHeight;
    const percentage =
      maxScroll > 0 ? Math.min((scrollTop / maxScroll) * 100, 100) : 100;
    setScrollPercentage(percentage);

    // Vérifier si on est proche de la fin
    const distanceFromEnd = scrollHeight - scrollTop - clientHeight;
    const atEnd = distanceFromEnd <= threshold;

    setIsAtEnd(atEnd);

    if (atEnd && !hasReachedEnd) {
      // L'utilisateur a atteint la fin, démarrer le délai
      lastScrollTime.current = Date.now();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        // Vérifier que l'utilisateur n'a pas scrollé entre temps
        const timeSinceLastScroll = Date.now() - lastScrollTime.current;
        if (timeSinceLastScroll >= delay - 100) {
          // Tolérance de 100ms
          setHasReachedEnd(true);
        }
      }, delay);
    } else if (!atEnd && timeoutRef.current) {
      // L'utilisateur a scrollé vers le haut, annuler le délai
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [enabled, element, threshold, delay, hasReachedEnd]);

  const handleScroll = useCallback(() => {
    lastScrollTime.current = Date.now();
    checkScrollPosition();
  }, [checkScrollPosition]);

  useEffect(() => {
    if (!enabled) return;

    const targetElement = element?.current;
    const scrollTarget = targetElement || window;

    // Vérification initiale
    checkScrollPosition();

    // Ajouter l'écouteur de scroll
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    // Vérifier aussi lors du redimensionnement
    window.addEventListener("resize", checkScrollPosition, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollPosition);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, element, handleScroll, checkScrollPosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasReachedEnd,
    isAtEnd,
    scrollPercentage,
    reset,
  };
}
