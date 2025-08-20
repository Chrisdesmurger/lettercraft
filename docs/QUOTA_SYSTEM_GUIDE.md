# Guide du Système de Quotas LetterCraft

## Vue d'ensemble

Le système de quotas LetterCraft limite les générations de lettres de motivation en fonction du plan d'abonnement de l'utilisateur :

- **Plan Gratuit** : 10 générations par mois
- **Plan Premium** : Générations illimitées (1000/mois techniquement)

## Architecture

### 1. Base de données (Supabase)

#### Table `user_quotas`

```sql
CREATE TABLE public.user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    letters_generated INTEGER NOT NULL DEFAULT 0,
    max_letters INTEGER NOT NULL DEFAULT 10,
    reset_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

#### Fonctions principales

- `get_or_create_user_quota(UUID)` - Récupère ou crée le quota utilisateur
- `can_generate_letter(UUID)` - Vérifie si l'utilisateur peut générer
- `increment_letter_count(UUID)` - Incrémente le compteur après génération
- `get_quota_status(UUID)` - Retourne le statut complet des quotas

#### Triggers automatiques

- Reset mensuel automatique (1er de chaque mois)
- Synchronisation avec les changements d'abonnement
- Mise à jour des limites selon le tier

### 2. Middleware de Protection

**Fichier** : `lib/middleware/quota-middleware.ts`

La fonction `withQuotaCheck()` protège les routes API :

1. Extrait l'utilisateur de la requête
2. Vérifie le quota disponible
3. Exécute la fonction si autorisé
4. Incrémente le compteur en cas de succès

### 3. Routes API Protégées

- `/api/generate-letter` - Génération simple
- `/api/generate-personalized-letter` - Génération avancée
- `/api/quota` - Consultation du statut des quotas

### 4. Hooks React

**Hook principal** : `useQuota()`

```typescript
const { quota, loading, error, refreshQuota, checkCanGenerate } = useQuota();
```

**Hook de vérification** : `usePreGenerationQuotaCheck()`

```typescript
const { checkAndShowQuotaStatus } = usePreGenerationQuotaCheck();
```

### 5. Composants UI

- **`QuotaStatus`** - Affichage détaillé du statut
- **`QuotaBanner`** - Bannière contextuelle d'alerte
- **`QuotaGuard`** - Protection des composants de génération
- **`QuotaProtectedButton`** - Bouton avec vérification automatique

## Installation et Configuration

### 1. Migration Supabase

```bash
# Appliquer la migration
npm run db:migrate

# Vérifier que la table existe
```

### 2. Variables d'environnement

Assurez-vous d'avoir dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Permissions Supabase

Les fonctions utilisent `SECURITY DEFINER` pour accéder aux données avec des privilèges élevés tout en maintenant la sécurité RLS.

## Utilisation

### Dans les composants de génération

```typescript
import { QuotaGuard, QuotaProtectedButton } from '@/components/quota'

export function LetterGenerator() {
  return (
    <QuotaGuard showQuotaStatus={true}>
      <form>
        {/* Formulaire de génération */}
        <QuotaProtectedButton onClick={generateLetter}>
          Générer la lettre
        </QuotaProtectedButton>
      </form>
    </QuotaGuard>
  )
}
```

### Dans les pages de profil

```typescript
import { QuotaStatus } from '@/components/quota'

export function ProfilePage() {
  return (
    <div>
      <QuotaStatus showUpgrade={true} />
      {/* Autres composants */}
    </div>
  )
}
```

### Vérification manuelle

```typescript
import { usePreGenerationQuotaCheck } from "@/hooks/useQuota";

const { checkAndShowQuotaStatus } = usePreGenerationQuotaCheck();

const handleGenerate = async () => {
  const canProceed = await checkAndShowQuotaStatus();
  if (canProceed) {
    // Procéder à la génération
  }
};
```

## Tests et Scénarios

### Scénarios de test

1. **Utilisateur gratuit avec quotas disponibles**
   - Doit pouvoir générer jusqu'à 10 lettres
   - Voir le compteur décrémenter

2. **Utilisateur gratuit quota épuisé**
   - Doit voir les messages d'erreur appropriés
   - Boutons de génération désactivés
   - Redirection vers upgrade

3. **Utilisateur premium**
   - Générations illimitées
   - Interface adaptée (badge premium, etc.)

4. **Reset mensuel**
   - Les quotas se remettent à zéro le 1er du mois
   - Mise à jour automatique des interfaces

5. **Changement d'abonnement**
   - Passage gratuit → premium : quotas illimités
   - Mise à jour immédiate des limites

### Tests manuels

```sql
-- Vérifier le quota d'un utilisateur
SELECT * FROM get_quota_status('user-uuid-here');

-- Simuler l'épuisement des quotas
UPDATE user_quotas
SET letters_generated = max_letters
WHERE user_id = 'user-uuid-here';

-- Simuler un reset
UPDATE user_quotas
SET letters_generated = 0, reset_date = NOW() + INTERVAL '1 month'
WHERE user_id = 'user-uuid-here';
```

### Tests API

```bash
# Vérifier le statut des quotas
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/quota

# Tester la génération avec quotas
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"profile": {...}, "cv": {...}, "jobOffer": {...}}' \
     http://localhost:3000/api/generate-letter
```

## Gestion des erreurs

### Codes d'erreur

- `UNAUTHORIZED` - Utilisateur non authentifié
- `QUOTA_EXCEEDED` - Quota dépassé
- `QUOTA_SYSTEM_ERROR` - Erreur système des quotas
- `INTERNAL_ERROR` - Erreur interne

### Messages utilisateur

Tous les messages sont internationalisés et adaptés au contexte :

- Quotas restants
- Limite atteinte
- Suggestions d'upgrade
- Dates de reset

## Monitoring et Maintenance

### Métriques à surveiller

1. **Utilisation des quotas**
   - Nombre d'utilisateurs approchant de leur limite
   - Taux de conversion vers premium

2. **Performance**
   - Temps de réponse des vérifications de quota
   - Charge sur les fonctions Supabase

3. **Erreurs**
   - Échecs de vérification des quotas
   - Problèmes de synchronisation

### Maintenance régulière

- Vérifier les logs des fonctions Supabase
- Nettoyer les anciens enregistrements si nécessaire
- Surveiller les métriques d'utilisation

## Évolutions futures

### Fonctionnalités potentielles

1. **Quotas personnalisés** - Limites différentes par utilisateur
2. **Quotas partagés** - Pour les équipes/organisations
3. **Période de grâce** - Dépassement temporaire autorisé
4. **Analytics avancés** - Métriques détaillées d'utilisation
5. **Notifications proactives** - Alertes avant épuisement

### Optimisations

1. **Cache Redis** - Mise en cache des statuts de quota
2. **Pré-calcul** - Calcul anticipé des resets
3. **Batch processing** - Traitement par lots des resets

## Support et dépannage

### Problèmes courants

1. **Quotas non mis à jour** - Vérifier la synchronisation des triggers
2. **Erreurs d'authentification** - Vérifier les tokens et permissions
3. **Interface non rafraîchie** - Forcer le refresh avec `refreshQuota()`

### Debug

```typescript
// Activer les logs détaillés
localStorage.setItem("quota-debug", "true");

// Vérifier l'état du hook
console.log(useQuota());
```
