# Types TypeScript pour OraWebApp - Phase 1

Ce document fournit les définitions TypeScript exactes à créer dans le repository **OraWebApp** pour la feature "Onboarding Dynamique avec Écrans Informatifs".

**Repository cible**: `C:\Users\chris\source\repos\OraWebApp`

---

## 📁 Fichier à créer: `types/onboarding.ts`

**Chemin complet**: `C:\Users\chris\source\repos\OraWebApp\types\onboarding.ts`

Si le répertoire `types/` n'existe pas à la racine, le créer.

---

### Code TypeScript Complet

```typescript
// types/onboarding.ts
// Types pour la gestion de l'onboarding dynamique avec écrans informatifs et recommandations

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Écran d'information à afficher entre les questions d'onboarding
 * Ces écrans permettent de fournir du contexte, des explications et de la motivation
 * pendant le parcours d'onboarding
 */
export interface InformationScreen {
  id: string;
  position: number; // Position dans le flow (0 = avant question 0, 5 = après question 4)

  // Contenu principal
  title: string;
  title_fr?: string;
  title_en?: string;

  subtitle?: string;
  subtitle_fr?: string;
  subtitle_en?: string;

  content?: string; // Markdown ou texte riche
  imageUrl?: string; // URL de l'image hero

  // Points clés (bullets)
  bulletPoints?: string[];
  bulletPoints_fr?: string[];
  bulletPoints_en?: string[];

  // Call-to-Action
  ctaText: string; // Défaut: "Continuer"
  ctaText_fr?: string;
  ctaText_en?: string;

  // Personnalisation visuelle
  backgroundColor?: string; // Hex color (ex: "#F5EFE6")

  // Conditions d'affichage (optionnel)
  display_conditions?: DisplayConditions;
}

/**
 * Conditions pour afficher un écran d'information de manière conditionnelle
 * basé sur les réponses de l'utilisateur
 */
export interface DisplayConditions {
  show_if_answer?: string; // ID de la question à vérifier
  show_if_value?: string; // ID de l'option qui doit être sélectionnée
  show_if_not_value?: string; // ID de l'option qui ne doit PAS être sélectionnée
}

/**
 * Règle de recommandation de programmes configurée par les admins
 * Ces règles permettent de personnaliser les suggestions de programmes
 * en fonction des réponses utilisateur lors de l'onboarding
 */
export interface RecommendationRule {
  id: string;
  name: string; // Ex: "Stress Reduction Rule"
  description: string; // Description de la logique de la règle
  priority: number; // 0-100, plus élevé = priorité plus haute

  // Conditions de matching (toutes doivent être vraies - logique AND)
  conditions: RuleCondition[];

  // Programmes à recommander si les conditions sont remplies
  programIds: string[]; // IDs des programmes Firestore

  // Boost de score pour le système de recommandation
  boostScore: number; // Points bonus ajoutés au score des programmes matchés

  // Statut
  isActive: boolean; // Permet d'activer/désactiver sans supprimer

  // Métadonnées (optionnel)
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by?: string; // UID de l'admin créateur
}

/**
 * Condition individuelle d'une règle de recommandation
 * Ex: "Si la réponse à la question 'objectif_principal' contient 'stress'"
 */
export interface RuleCondition {
  questionId: string; // ID de la question d'onboarding
  operator: 'equals' | 'contains' | 'not_equals'; // Opérateur de comparaison
  value: string; // Valeur à comparer
}

/**
 * Extension de OnboardingConfig existant pour inclure les écrans informatifs
 * À fusionner avec le type OnboardingConfig existant dans OraWebApp
 */
export interface OnboardingConfigExtension {
  // Ajouter ce champ au type OnboardingConfig existant
  informationScreens?: InformationScreen[];
}

/**
 * Helpers pour validation côté client
 */

// Catégories de priorité pour l'UI admin
export type PriorityCategory = 'low' | 'medium' | 'high' | 'critical';

export function getPriorityCategory(priority: number): PriorityCategory {
  if (priority >= 75) return 'critical';
  if (priority >= 50) return 'high';
  if (priority >= 25) return 'medium';
  return 'low';
}

// Catégories de boost pour l'UI admin
export type BoostCategory = 'low' | 'medium' | 'high';

export function getBoostCategory(score: number): BoostCategory {
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// Validation d'une règle de recommandation
export function validateRecommendationRule(rule: Partial<RecommendationRule>): string[] {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim() === '') {
    errors.push('Le nom de la règle est requis');
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('Au moins une condition est requise');
  }

  if (!rule.programIds || rule.programIds.length === 0) {
    errors.push('Au moins un programme doit être sélectionné');
  }

  if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
    errors.push('La priorité doit être entre 0 et 100');
  }

  if (rule.boostScore !== undefined && rule.boostScore < 0) {
    errors.push('Le boost score ne peut pas être négatif');
  }

  // Validation des conditions
  rule.conditions?.forEach((condition, index) => {
    if (!condition.questionId) {
      errors.push(`Condition ${index + 1}: L'ID de question est requis`);
    }
    if (!condition.operator) {
      errors.push(`Condition ${index + 1}: L'opérateur est requis`);
    }
    if (!condition.value) {
      errors.push(`Condition ${index + 1}: La valeur est requise`);
    }
  });

  return errors;
}

// Validation d'un écran d'information
export function validateInformationScreen(screen: Partial<InformationScreen>): string[] {
  const errors: string[] = [];

  if (!screen.title || screen.title.trim() === '') {
    errors.push('Le titre est requis');
  }

  if (screen.position === undefined || screen.position < 0) {
    errors.push('La position doit être un nombre positif');
  }

  if (!screen.ctaText || screen.ctaText.trim() === '') {
    errors.push('Le texte du CTA est requis');
  }

  // Validation des conditions d'affichage
  const cond = screen.display_conditions;
  if (cond) {
    if (cond.show_if_value && !cond.show_if_answer) {
      errors.push('show_if_answer est requis si show_if_value est défini');
    }
    if (cond.show_if_not_value && !cond.show_if_answer) {
      errors.push('show_if_answer est requis si show_if_not_value est défini');
    }
    if (cond.show_if_value && cond.show_if_not_value) {
      errors.push('show_if_value et show_if_not_value ne peuvent pas être utilisés ensemble');
    }
  }

  return errors;
}

/**
 * Types pour l'API admin
 */

// Requête pour créer/mettre à jour un écran d'information
export interface CreateInformationScreenRequest {
  configId: string; // ID de la configuration d'onboarding
  screen: Omit<InformationScreen, 'id'>; // Écran sans ID (généré par Firestore)
}

// Requête pour créer/mettre à jour une règle de recommandation
export interface CreateRecommendationRuleRequest {
  rule: Omit<RecommendationRule, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
}

// Réponse d'analytics pour les règles de recommandation
export interface RecommendationRuleAnalytics {
  ruleId: string;
  ruleName: string;
  totalMatches: number; // Nombre d'utilisateurs qui ont matché cette règle
  averageBoostApplied: number; // Boost moyen appliqué
  programsRecommended: { [programId: string]: number }; // Nombre de fois chaque programme a été recommandé
  lastMatchedAt?: Timestamp;
}

/**
 * Constantes pour l'UI admin
 */

export const OPERATOR_LABELS: Record<RuleCondition['operator'], string> = {
  equals: 'Est égal à',
  contains: 'Contient',
  not_equals: "N'est pas égal à"
};

export const PRIORITY_COLORS: Record<PriorityCategory, string> = {
  low: '#94A3B8', // Slate 400
  medium: '#3B82F6', // Blue 500
  high: '#F59E0B', // Amber 500
  critical: '#EF4444' // Red 500
};

export const BOOST_COLORS: Record<BoostCategory, string> = {
  low: '#10B981', // Green 500
  medium: '#F59E0B', // Amber 500
  high: '#EF4444' // Red 500
};
```

---

## 📝 Notes d'Implémentation

### 1. Compatibilité avec Android

Les types TypeScript ci-dessus correspondent **exactement** aux modèles Kotlin créés dans le repository Ora :
- `InformationScreen.kt` ↔ `InformationScreen` (TypeScript)
- `RecommendationRule.kt` ↔ `RecommendationRule` (TypeScript)
- `DisplayConditions` ↔ `DisplayConditions` (TypeScript)
- `RuleCondition` ↔ `RuleCondition` (TypeScript)

**Mapping des types** :
- Kotlin `String` ↔ TypeScript `string`
- Kotlin `Int` ↔ TypeScript `number`
- Kotlin `Boolean` ↔ TypeScript `boolean`
- Kotlin `List<T>` ↔ TypeScript `T[]`
- Kotlin `Map<K, V>` ↔ TypeScript `Record<K, V>` ou `{ [key: K]: V }`

### 2. Naming Convention (snake_case Firestore)

Les noms de champs utilisent **snake_case** pour correspondre exactement à la base de données Firestore :
- ✅ `information_screens` (pas `informationScreens`)
- ✅ `display_conditions` (pas `displayConditions`)
- ✅ `show_if_answer` (pas `showIfAnswer`)
- ✅ `program_ids` (pas `programIds`)
- ✅ `boost_score` (pas `boostScore`)

### 3. Imports Firebase

```typescript
import { Timestamp } from 'firebase-admin/firestore';
```

Pour le client-side (si nécessaire) :
```typescript
import { Timestamp } from 'firebase/firestore';
```

### 4. Utilisation dans l'API Admin

**Exemple de route API** (`app/api/admin/onboarding/[id]/information-screens/route.ts`) :

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { InformationScreen, validateInformationScreen } from '@/types/onboarding';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const screen: InformationScreen = await request.json();

  // Validation
  const errors = validateInformationScreen(screen);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Sauvegarde dans Firestore
  const admin = await getFirebaseAdmin();
  const configRef = admin.firestore().collection('onboarding_configs').doc(params.id);

  await configRef.update({
    information_screens: admin.firestore.FieldValue.arrayUnion(screen)
  });

  return NextResponse.json({ success: true, screen });
}
```

### 5. Utilisation dans les Composants

**Exemple de formulaire** (`components/admin/onboarding/InformationScreenEditor.tsx`) :

```typescript
import { InformationScreen, validateInformationScreen } from '@/types/onboarding';
import { useState } from 'react';

export function InformationScreenEditor() {
  const [screen, setScreen] = useState<Partial<InformationScreen>>({
    title: '',
    position: 0,
    ctaText: 'Continuer'
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const validationErrors = validateInformationScreen(screen);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Sauvegarder...
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Formulaire... */}
    </form>
  );
}
```

---

## ✅ Checklist d'Intégration dans OraWebApp

- [ ] Créer le fichier `types/onboarding.ts` avec le code ci-dessus
- [ ] Vérifier que `firebase-admin` est installé : `npm install firebase-admin`
- [ ] Importer les types dans les routes API concernées
- [ ] Importer les types dans les composants admin
- [ ] Utiliser les fonctions de validation (`validateInformationScreen`, `validateRecommendationRule`)
- [ ] Tester la création/lecture depuis Firestore

---

## 🔗 Fichiers Associés

**Android (Ora)** :
- `app/src/main/java/com/ora/wellbeing/data/model/onboarding/InformationScreen.kt`
- `app/src/main/java/com/ora/wellbeing/data/model/recommendation/RecommendationRule.kt`

**Firestore** :
- Collection `onboarding_configs/{id}.information_screens[]`
- Collection `recommendation_rules/{id}`

**Documentation** :
- [Issue #16 - Feature: Onboarding Dynamique](https://github.com/Chrisdesmurger/Ora/issues/16)

---

**Créé le** : 2025-11-21
**Phase** : 1 (Modèles de données)
**Statut** : ✅ Prêt à implémenter dans OraWebApp
