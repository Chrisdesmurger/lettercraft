/**
 * Système de tons d'écriture pour la génération de lettres de motivation
 * Fournit les directives de style pour chaque ton prédéfini
 */

export type ToneKey =
  | "professionnel"
  | "chaleureux"
  | "direct"
  | "persuasif"
  | "créatif"
  | "concis"
  | "personnalisé";

export interface ToneGuideline {
  key: ToneKey;
  label: string;
  description: string;
  styleDirectives: string;
  example?: string;
}

/**
 * Directives de style pour chaque ton d'écriture
 * Ces consignes sont intégrées dans le prompt de génération IA
 */
export const TONE_GUIDELINES: Record<
  Exclude<ToneKey, "personnalisé">,
  ToneGuideline
> = {
  professionnel: {
    key: "professionnel",
    label: "Professionnel",
    description:
      "Style formel et structuré, idéal pour les candidatures traditionnelles",
    styleDirectives:
      "Style formel, clair, structuré, factuel. Utilise un langage soutenu, des phrases bien construites et un vocabulaire précis. Évite les familiarités et maintient une distance respectueuse.",
    example: "J'ai l'honneur de vous présenter ma candidature...",
  },
  chaleureux: {
    key: "chaleureux",
    label: "Chaleureux",
    description: "Ton cordial et humain qui crée une connexion personnelle",
    styleDirectives:
      "Ton cordial, positif, humain et engageant. Exprime de l'enthousiasme authentique, utilise un langage accessible tout en restant respectueux. Montre de la personnalité sans tomber dans la familiarité.",
    example: "C'est avec un réel enthousiasme que je vous écris...",
  },
  direct: {
    key: "direct",
    label: "Direct",
    description: "Approche franche et efficace, va droit au but",
    styleDirectives:
      "Formulations concises, orientées résultats. Va droit à l'essentiel, utilise des phrases courtes et impactantes. Privilégie les faits concrets et les réalisations mesurables.",
    example:
      "Mes 5 ans d'expérience en développement web correspondent exactement à vos besoins...",
  },
  persuasif: {
    key: "persuasif",
    label: "Persuasif",
    description: "Met l'accent sur la valeur ajoutée et les bénéfices",
    styleDirectives:
      "Mettre en avant bénéfices, preuves et motivation. Utilise des arguments convaincants, des exemples concrets de réussites. Montre clairement la valeur ajoutée apportée à l'entreprise.",
    example:
      "Mon expertise vous permettra d'augmenter vos performances de 30%...",
  },
  créatif: {
    key: "créatif",
    label: "Créatif",
    description:
      "Style original avec des expressions variées et une touche d'originalité",
    styleDirectives:
      "Expressions variées, métaphores légères, originalité. Utilise un vocabulaire riche et imagé tout en restant professionnel. Apporte une touche de créativité qui reflète la personnalité.",
    example:
      "Comme un puzzle dont chaque pièce trouve sa place, mes compétences s'articulent parfaitement avec vos objectifs...",
  },
  concis: {
    key: "concis",
    label: "Concis",
    description: "Maximum d'impact en minimum de mots",
    styleDirectives:
      "Phrases courtes, suppression du superflu. Privilégie l'efficacité, utilise des mots forts et précis. Chaque phrase doit avoir un impact, éliminer tout mot inutile.",
    example:
      "Développeur expérimenté. Résultats prouvés. Disponible immédiatement.",
  },
};

/**
 * Récupère les directives de style pour un ton donné
 * @param toneKey - Clé du ton sélectionné
 * @param customText - Texte personnalisé si le ton est "personnalisé"
 * @returns Les directives de style à utiliser dans le prompt
 */
export function getToneDirectives(
  toneKey: ToneKey,
  customText?: string,
): string {
  if (toneKey === "personnalisé") {
    if (!customText || customText.trim().length === 0) {
      throw new Error(
        "Le texte personnalisé est requis pour le ton personnalisé",
      );
    }
    return `Style personnalisé selon ces directives : "${sanitizeToneText(customText)}". Adapte le ton et le style en conséquence tout en gardant le professionnalisme requis pour une lettre de motivation.`;
  }

  const guideline = TONE_GUIDELINES[toneKey];
  if (!guideline) {
    console.warn(
      `Ton non reconnu: ${toneKey}, utilisation du ton professionnel par défaut`,
    );
    return TONE_GUIDELINES.professionnel.styleDirectives;
  }

  return guideline.styleDirectives;
}

/**
 * Valide et sanitise le texte personnalisé du ton
 * @param text - Texte à sanitiser
 * @returns Texte nettoyé et sécurisé
 */
export function sanitizeToneText(text: string): string {
  if (!text) return "";

  // Nettoyer le texte : supprimer les balises, caractères dangereux
  let sanitized = text
    .replace(/<[^>]*>/g, "") // Supprimer balises HTML
    .replace(/[<>&"']/g, "") // Supprimer caractères dangereux
    .trim();

  // Limiter à 120 caractères
  if (sanitized.length > 120) {
    sanitized = sanitized.substring(0, 120).trim();
  }

  return sanitized;
}

/**
 * Valide qu'une clé de ton est valide
 * @param toneKey - Clé à valider
 * @returns True si la clé est valide
 */
export function isValidToneKey(toneKey: string): toneKey is ToneKey {
  const validKeys: ToneKey[] = [
    "professionnel",
    "chaleureux",
    "direct",
    "persuasif",
    "créatif",
    "concis",
    "personnalisé",
  ];
  return validKeys.includes(toneKey as ToneKey);
}

/**
 * Récupère toutes les options de tons disponibles pour l'interface utilisateur
 * @returns Liste des tons avec leurs informations d'affichage
 */
export function getToneOptions(): ToneGuideline[] {
  return Object.values(TONE_GUIDELINES);
}

/**
 * Valide les paramètres de ton
 * @param toneKey - Clé du ton
 * @param customText - Texte personnalisé optionnel
 * @returns Résultat de validation avec erreurs éventuelles
 */
export function validateToneParams(
  toneKey: string,
  customText?: string,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!toneKey) {
    errors.push("Le ton est obligatoire");
  } else if (!isValidToneKey(toneKey)) {
    errors.push("Ton non valide");
  } else if (toneKey === "personnalisé") {
    if (!customText || customText.trim().length === 0) {
      errors.push("Le texte personnalisé est requis pour le ton personnalisé");
    } else if (customText.length > 120) {
      errors.push("Le texte personnalisé ne peut pas dépasser 120 caractères");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
