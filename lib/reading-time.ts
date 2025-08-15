/**
 * Calcule le temps de lecture estimé pour un texte donné
 */

export interface ReadingTimeOptions {
  /** Vitesse de lecture en mots par minute (défaut: 225) */
  wordsPerMinute?: number
  /** Délai supplémentaire en secondes après la lecture estimée (défaut: 5) */
  additionalDelay?: number
  /** Temps minimum en millisecondes (défaut: 10 secondes) */
  minTime?: number
  /** Temps maximum en millisecondes (défaut: 2 minutes) */
  maxTime?: number
}

export interface ReadingTimeResult {
  /** Temps de lecture estimé en millisecondes */
  estimatedReadingTime: number
  /** Nombre de mots détectés */
  wordCount: number
  /** Temps de lecture en minutes (arrondi) */
  readingTimeMinutes: number
  /** Délai total avec le délai supplémentaire en millisecondes */
  totalDelayMs: number
}

/**
 * Calcule le temps de lecture estimé pour un texte
 * @param text Le texte à analyser
 * @param options Options de configuration
 * @returns Informations sur le temps de lecture
 */
export function calculateReadingTime(
  text: string, 
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const {
    wordsPerMinute = 225, // Vitesse de lecture moyenne en français
    additionalDelay = 5, // 5 secondes supplémentaires
    minTime = 10 * 1000, // 10 secondes minimum
    maxTime = 2 * 60 * 1000 // 2 minutes maximum
  } = options

  // Compter les mots (séparer par espaces, enlever la ponctuation basique)
  const words = text
    .trim()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Garder les caractères français
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)

  const wordCount = words.length

  // Calculer le temps de lecture en minutes
  const readingTimeMinutes = wordCount / wordsPerMinute

  // Convertir en millisecondes et ajouter le délai
  const estimatedReadingTime = readingTimeMinutes * 60 * 1000
  const totalDelayMs = estimatedReadingTime + (additionalDelay * 1000)

  // Appliquer les limites min/max
  const clampedDelay = Math.max(minTime, Math.min(maxTime, totalDelayMs))

  return {
    estimatedReadingTime,
    wordCount,
    readingTimeMinutes: Math.ceil(readingTimeMinutes),
    totalDelayMs: clampedDelay
  }
}

/**
 * Fonction simplifiée pour obtenir directement le délai en millisecondes
 * @param text Le texte à analyser
 * @param options Options de configuration
 * @returns Délai en millisecondes avant d'afficher le modal de review
 */
export function getReviewDelayForText(
  text: string, 
  options: ReadingTimeOptions = {}
): number {
  return calculateReadingTime(text, options).totalDelayMs
}

/**
 * Formate le temps de lecture pour l'affichage utilisateur
 * @param readingTimeResult Résultat du calcul de temps de lecture
 * @returns Texte formaté (ex: "2 min de lecture")
 */
export function formatReadingTime(readingTimeResult: ReadingTimeResult): string {
  const { readingTimeMinutes } = readingTimeResult
  
  if (readingTimeMinutes < 1) {
    return "< 1 min de lecture"
  } else if (readingTimeMinutes === 1) {
    return "1 min de lecture"
  } else {
    return `${readingTimeMinutes} min de lecture`
  }
}