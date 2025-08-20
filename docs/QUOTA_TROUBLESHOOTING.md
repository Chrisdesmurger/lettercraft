# Guide de Résolution - Système de Quotas LetterCraft

## Problème Résolu : "Non autorisé" dans useQuota

### Problème initial

L'erreur "Non autorisé" était causée par :

1. Problèmes d'authentification avec `createRouteHandlerClient`
2. Incompatibilité avec Next.js 15 et l'API `cookies()`

### Solution implémentée

**Approche côté client complète** :

- Suppression de l'API route `/api/quota`
- Gestion directe via Supabase côté client
- Quotas gérés dans le hook `useQuota`

## Architecture Finale

### 1. Hook `useQuota()` - Gestion complète côté client

```typescript
const { quota, loading, error, refreshQuota, incrementLetterCount } =
  useQuota();
```

**Fonctionnalités** :

- ✅ Récupération des quotas depuis Supabase
- ✅ Création automatique des enregistrements manquants
- ✅ Reset mensuel automatique côté client
- ✅ Synchronisation avec les tiers d'abonnement
- ✅ Incrémentation des compteurs

### 2. Migration simplifiée

**Fichier** : `supabase/migrations/0018_create_quota_system_simple.sql`

- Table `user_quotas` avec RLS
- Pas de fonctions complexes
- Gestion par triggers simples

### 3. Middleware simplifié

**Fonctionnalité** : Authentification uniquement

- Plus de vérification de quota côté serveur
- Meilleure UX avec vérifications côté client

## Installation et Test

### 1. Exécuter la migration

```bash
npm run db:migrate
```

Ou manuellement dans Supabase Dashboard :

- Aller à SQL Editor
- Exécuter le contenu de `0018_create_quota_system_simple.sql`

### 2. Test du système

```typescript
// Dans un composant
import { useQuota } from '@/hooks/useQuota'

function TestComponent() {
  const { quota, loading, error } = useQuota()

  if (loading) return <div>Chargement...</div>
  if (error) return <div>Erreur: {error}</div>

  return (
    <div>
      <p>Lettres générées: {quota?.letters_generated}</p>
      <p>Maximum: {quota?.max_letters}</p>
      <p>Restantes: {quota?.remaining_letters}</p>
    </div>
  )
}
```

### 3. Utilisation avec génération

```typescript
import { usePreGenerationQuotaCheck } from '@/hooks/useQuota'

function GenerateButton() {
  const { executeWithQuotaCheck } = usePreGenerationQuotaCheck()

  const handleGenerate = () => {
    executeWithQuotaCheck(async () => {
      // Logique de génération
      const response = await fetch('/api/generate-letter', {...})
      // Le quota sera automatiquement incrémenté après succès
    })
  }

  return <button onClick={handleGenerate}>Générer</button>
}
```

## Avantages de la nouvelle approche

### ✅ Simplicité

- Pas d'API route complexe
- Logique centralisée dans un hook
- Moins de code à maintenir

### ✅ Performance

- Pas d'appels API supplémentaires
- Mise à jour en temps réel
- État local synchronisé

### ✅ Fiabilité

- Pas de problèmes d'authentification
- Compatible Next.js 15
- Gestion d'erreurs robuste

### ✅ Expérience utilisateur

- Vérifications instantanées
- Messages d'erreur contextuels
- Interface réactive

## Composants disponibles

### QuotaStatus

```typescript
import { QuotaStatus } from '@/components/quota'

<QuotaStatus showUpgrade={true} compact={false} />
```

### QuotaGuard

```typescript
import { QuotaGuard } from '@/components/quota'

<QuotaGuard showQuotaStatus={true}>
  {/* Formulaire de génération */}
</QuotaGuard>
```

### QuotaProtectedButton

```typescript
import { QuotaProtectedButton } from '@/components/quota'

<QuotaProtectedButton onClick={generateLetter}>
  Générer une lettre
</QuotaProtectedButton>
```

## Surveillance et Maintenance

### Métriques à surveiller

1. **Taux d'erreur** dans `useQuota`
2. **Performance** des requêtes Supabase
3. **Conversion** vers premium quand quotas épuisés

### Logs utiles

```typescript
// Activer les logs détaillés
console.log("Quota status:", quota);
console.log("Can generate:", quota?.can_generate);
```

## Troubleshooting

### Quota non affiché

1. Vérifier l'authentification utilisateur
2. Vérifier les policies RLS Supabase
3. Vérifier la table `user_quotas` existe

### Compteur non mis à jour

1. Vérifier `incrementLetterCount()` est appelé
2. Vérifier les permissions UPDATE sur `user_quotas`
3. Forcer un refresh avec `refreshQuota()`

### Reset mensuel non fonctionnel

- Le reset se fait automatiquement côté client
- Vérifier la logique dans `refreshQuota()`
