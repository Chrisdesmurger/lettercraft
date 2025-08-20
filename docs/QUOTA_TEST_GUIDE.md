# Guide de Test - Système de Quotas

## ✅ Intégration Terminée

Le système de quotas est maintenant **complètement intégré** dans les composants suivants :

### 1. Hook `useLetterGeneration`

- ✅ Vérifie les quotas avant génération
- ✅ Incrémente automatiquement le compteur après succès
- ✅ Gère les erreurs de quota

### 2. Composant `LetterGenerationFlow`

- ✅ Affiche `QuotaBanner` en haut de page
- ✅ Protège le bouton "Régénérer" avec `QuotaGuard`

### 3. Composant `LetterGenerator`

- ✅ Protège les boutons de génération et régénération
- ✅ Affiche le statut des quotas

## 🧪 Tests à Effectuer

### 1. **Première utilisation**

```bash
# Démarrer l'application
npm run dev

# Aller sur la page de génération de lettres
# Observer: QuotaStatus devrait montrer 0/10 lettres utilisées
```

### 2. **Génération de lettre**

- Utiliser le flow de génération complet
- Après génération réussie, vérifier que le compteur s'incrémente
- Vérifier dans la DB : `SELECT * FROM user_quotas WHERE user_id = 'your-user-id'`

### 3. **Test de la limite**

```sql
-- Simuler l'épuisement des quotas (utilisateur gratuit)
UPDATE user_quotas
SET letters_generated = 9
WHERE user_id = 'your-user-id';
```

- Générer 1 lettre → Devrait passer (10/10)
- Essayer de générer une autre → Devrait être bloqué

### 4. **Test utilisateur Premium**

```sql
-- Simuler un upgrade vers Premium
UPDATE user_profiles
SET subscription_tier = 'premium'
WHERE user_id = 'your-user-id';
```

- Recharger la page
- Observer : Interface adaptée, générations "illimitées"

### 5. **Reset mensuel**

```sql
-- Simuler un reset mensuel
UPDATE user_quotas
SET letters_generated = 0,
    reset_date = NOW() + INTERVAL '1 month'
WHERE user_id = 'your-user-id';
```

## 🔍 Points de Vérification

### Dans l'interface :

- [ ] **QuotaBanner** s'affiche correctement
- [ ] **QuotaStatus** montre le bon nombre de lettres restantes
- [ ] **Boutons de génération** sont désactivés quand quota épuisé
- [ ] **Messages d'erreur** appropriés quand quota dépassé
- [ ] **Badge Premium** affiché pour les utilisateurs premium

### Dans la base de données :

- [ ] Table `user_quotas` créée avec les bonnes colonnes
- [ ] Enregistrement créé automatiquement au premier usage
- [ ] Compteur `letters_generated` s'incrémente après chaque génération
- [ ] `max_letters` mis à jour selon le subscription_tier

### Dans les logs :

- [ ] Pas d'erreurs console
- [ ] Messages de toast appropriés
- [ ] Logs de debug si activés

## 🚨 Résolution de Problèmes

### Quota ne s'incrémente pas :

1. Vérifier que la migration a été exécutée
2. Vérifier les permissions RLS Supabase
3. Regarder la console pour des erreurs JavaScript

### Interface ne se met pas à jour :

1. Forcer un refresh avec `refreshQuota()`
2. Vérifier que `useQuota` est utilisé dans le composant
3. Vérifier l'état d'authentification utilisateur

### Messages d'erreur incorrects :

1. Vérifier les traductions i18n
2. Vérifier la logique de `checkCanGenerate()`

## 📊 Base de Données

### Vérifier les quotas d'un utilisateur :

```sql
SELECT
    uq.*,
    up.subscription_tier,
    up.first_name,
    up.last_name
FROM user_quotas uq
JOIN user_profiles up ON uq.user_id = up.user_id
WHERE uq.user_id = 'your-user-id';
```

### Vérifier les lettres générées :

```sql
SELECT
    gl.created_at,
    jo.title as job_title,
    jo.company,
    gl.openai_model
FROM generated_letters gl
JOIN job_offers jo ON gl.job_offer_id = jo.id
WHERE gl.user_id = 'your-user-id'
ORDER BY gl.created_at DESC
LIMIT 5;
```

### Reset manuel des quotas :

```sql
UPDATE user_quotas
SET letters_generated = 0,
    reset_date = date_trunc('month', NOW()) + INTERVAL '1 month'
WHERE user_id = 'your-user-id';
```
