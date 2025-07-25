# Test de la nouvelle logique de reset des quotas

## 🎯 Objectif
Valider que le reset des quotas se base maintenant sur **30 jours après la première génération** puis **tous les mois** selon cette date de référence.

## 📋 Scénarios de Test

### Scénario 1: Nouvel Utilisateur (Première Fois)
```typescript
// État initial
{
  letters_generated: 0,
  max_letters: 10,
  first_generation_date: null,
  reset_date: null,
  can_generate: true
}

// Message affiché: "Après la première génération"
```

### Scénario 2: Première Génération
```typescript
// Avant génération (15 janvier 2025 à 10:00)
{
  letters_generated: 0,
  first_generation_date: null,
  reset_date: null
}

// Après génération (automatique via incrementLetterCount)
{
  letters_generated: 1,
  first_generation_date: "2025-01-15T10:00:00.000Z",
  reset_date: "2025-02-14T10:00:00.000Z", // 30 jours plus tard
  can_generate: true
}

// Message affiché: "Reset dans 30 jours" (ou équivalent)
```

### Scénario 3: Dans la période initiale (avant 30 jours)
```typescript
// 15 jours après la première génération (30 janvier 2025)
{
  letters_generated: 5,
  first_generation_date: "2025-01-15T10:00:00.000Z",
  reset_date: "2025-02-14T10:00:00.000Z",
  remaining_letters: 5
}

// Message: "Reset dans 15 jours"
```

### Scénario 4: Premier Reset (30 jours après première génération)
```typescript
// Le 14 février 2025 (30 jours après première génération)
// Automatique via refreshQuota()

// Avant reset
{
  letters_generated: 10,
  reset_date: "2025-02-14T10:00:00.000Z", // Date atteinte
  can_generate: false
}

// Après reset automatique
{
  letters_generated: 0, // Remis à zéro
  reset_date: "2025-03-14T10:00:00.000Z", // Prochain cycle mensuel
  can_generate: true
}
```

### Scénario 5: Cycles Mensuels Suivants
```typescript
// Le 14 mars 2025 (2ème reset)
// Le 14 avril 2025 (3ème reset)
// Le 14 mai 2025 (4ème reset)
// etc...

// Toujours basé sur la date de première génération (15 janvier)
// Reset le 14 de chaque mois (30 jours après le 15)
```

## 🔍 Points de Validation

### Interface Utilisateur
- [ ] Nouveau message "Après la première génération" pour les nouveaux utilisateurs
- [ ] Date de reset correctement calculée après première génération
- [ ] Cycles mensuels respectent la date de première génération
- [ ] Compteur se remet à zéro automatiquement lors des resets

### Base de Données
- [ ] Colonne `first_generation_date` ajoutée
- [ ] `first_generation_date` définie lors de la première génération
- [ ] `reset_date` calculée comme `first_generation_date + 30 jours`
- [ ] Resets suivants basés sur cycles mensuels de la première génération

### Code Logic
- [ ] `incrementLetterCount()` définit `first_generation_date` si `letters_generated === 0`
- [ ] `refreshQuota()` calcule correctement les dates de reset
- [ ] Reset automatique quand `now >= reset_date`
- [ ] Gestion des utilisateurs existants (migration)

## 🧪 Tests Manuels

### Test 1: Simulation Complète
```sql
-- Dans Supabase SQL Editor
-- Créer un utilisateur test
INSERT INTO user_quotas (user_id, letters_generated, max_letters)
VALUES ('test-user-id', 0, 10);

-- Vérifier l'état initial
SELECT * FROM user_quotas WHERE user_id = 'test-user-id';
-- Résultat attendu: first_generation_date = null, reset_date = null
```

### Test 2: Première Génération
```typescript
// Dans l'interface, générer une première lettre
// Vérifier que first_generation_date et reset_date sont définis
```

### Test 3: Simulation de Reset
```sql
-- Simuler qu'on est 30 jours plus tard
UPDATE user_quotas 
SET reset_date = NOW() - INTERVAL '1 day'
WHERE user_id = 'test-user-id';

-- Rafraîchir la page, le reset devrait s'effectuer automatiquement
```

## ✅ Critères de Réussite

1. **Nouveaux utilisateurs**: Pas de date de reset tant qu'il n'y a pas eu de première génération
2. **Première génération**: Définit `first_generation_date` et `reset_date = first_generation_date + 30 jours`
3. **Resets ultérieurs**: Toujours basés sur la date de première génération + cycles mensuels
4. **Utilisateurs existants**: Migration transparente avec approximation via `created_at`
5. **Interface cohérente**: Messages appropriés selon l'état du quota

## 🏆 Avantage du Nouveau Système

- **Personnalisé**: Chaque utilisateur a son propre cycle basé sur sa première utilisation
- **Équitable**: 30 jours complets d'utilisation garantis dès la première génération
- **Prévisible**: Dates de reset constantes et prévisibles pour chaque utilisateur
- **Flexible**: Adaptation automatique pour nouveaux et anciens utilisateurs