/**
 * Données de conseils pour la création de lettres de motivation
 * Orientés selon l'utilisation de l'application et le processus de candidature
 */

export interface Tip {
  id: string;
  category:
    | "cv"
    | "job_search"
    | "letter_writing"
    | "interview"
    | "application";
  icon: string; // Lucide icon name
  priority: number; // 1-5, pour mettre en avant les meilleurs conseils
}

// 20 conseils orientés candidature et lettres de motivation
export const tipsData: Tip[] = [
  // Conseils CV et profil (5 conseils)
  {
    id: "cv_active_update",
    category: "cv",
    icon: "RefreshCw",
    priority: 5,
  },
  {
    id: "cv_skills_keywords",
    category: "cv",
    icon: "Target",
    priority: 4,
  },
  {
    id: "cv_achievements_quantify",
    category: "cv",
    icon: "TrendingUp",
    priority: 5,
  },
  {
    id: "cv_linkedin_sync",
    category: "cv",
    icon: "Link",
    priority: 3,
  },
  {
    id: "cv_pdf_quality",
    category: "cv",
    icon: "FileCheck",
    priority: 4,
  },

  // Conseils recherche d'emploi (4 conseils)
  {
    id: "job_research_company",
    category: "job_search",
    icon: "Search",
    priority: 5,
  },
  {
    id: "job_network_contacts",
    category: "job_search",
    icon: "Users",
    priority: 4,
  },
  {
    id: "job_alerts_setup",
    category: "job_search",
    icon: "Bell",
    priority: 3,
  },
  {
    id: "job_salary_research",
    category: "job_search",
    icon: "Calculator",
    priority: 3,
  },

  // Conseils rédaction lettre (6 conseils)
  {
    id: "letter_personalization",
    category: "letter_writing",
    icon: "Heart",
    priority: 5,
  },
  {
    id: "letter_structure_clear",
    category: "letter_writing",
    icon: "Layout",
    priority: 4,
  },
  {
    id: "letter_examples_concrete",
    category: "letter_writing",
    icon: "Lightbulb",
    priority: 5,
  },
  {
    id: "letter_enthusiasm_show",
    category: "letter_writing",
    icon: "Star",
    priority: 4,
  },
  {
    id: "letter_call_action",
    category: "letter_writing",
    icon: "ArrowRight",
    priority: 4,
  },
  {
    id: "letter_proofreading",
    category: "letter_writing",
    icon: "CheckCircle",
    priority: 5,
  },

  // Conseils candidature (3 conseils)
  {
    id: "application_timing",
    category: "application",
    icon: "Clock",
    priority: 4,
  },
  {
    id: "application_follow_up",
    category: "application",
    icon: "MessageCircle",
    priority: 3,
  },
  {
    id: "application_documents_order",
    category: "application",
    icon: "FileStack",
    priority: 3,
  },

  // Conseils entretien (2 conseils)
  {
    id: "interview_preparation",
    category: "interview",
    icon: "BookOpen",
    priority: 4,
  },
  {
    id: "interview_questions_prepare",
    category: "interview",
    icon: "HelpCircle",
    priority: 4,
  },
];

// Fonction pour obtenir des conseils aléatoires
export function getRandomTips(
  count: number = 3,
  category?: Tip["category"],
): Tip[] {
  let availableTips = tipsData;

  if (category) {
    availableTips = tipsData.filter((tip) => tip.category === category);
  }

  // Favoriser les conseils prioritaires
  const weightedTips = availableTips.flatMap((tip) =>
    Array(tip.priority).fill(tip),
  );

  // Mélanger et sélectionner
  const shuffled = weightedTips.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Retourner sans doublons
  return [...new Set(selected)];
}

// Fonction pour obtenir les meilleurs conseils
export function getTopTips(count: number = 3): Tip[] {
  return tipsData.sort((a, b) => b.priority - a.priority).slice(0, count);
}

// Fonction pour obtenir des conseils par catégorie
export function getTipsByCategory(category: Tip["category"]): Tip[] {
  return tipsData
    .filter((tip) => tip.category === category)
    .sort((a, b) => b.priority - a.priority);
}
