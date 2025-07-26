# 📦 Export du Schéma Supabase - LetterCraft

Ce script permet d'exporter complètement le schéma de base de données Supabase pour le reproduire dans un autre projet.

## 🚀 Utilisation Rapide

### 1. **Exécuter l'export**
```bash
# Avec les variables d'environnement déjà configurées
node export-db-schema.js

# Ou avec npm
npm run export
```

### 2. **Fichier généré**
- `supabase_schema_export.sql` - Script SQL complet pour recréer le schéma

## 📋 Ce qui est exporté

### 🗄️ **Structures de Tables**
- `user_profiles` - Profils utilisateurs avec abonnements
- `candidates_profile` - CVs uploadés et extraits
- `job_offers` - Offres d'emploi analysées  
- `letter_questionnaire_responses` - Questionnaires de lettres
- `generated_letters` - Lettres générées et sauvegardées
- `user_quotas` - Système de quotas avec reset personnalisé
- `countries` - Données de référence pays
- `languages` - Langues supportées
- `stripe_subscriptions` - Abonnements Stripe
- `stripe_invoices` - Factures et paiements

### 🛡️ **Sécurité (RLS)**
- Politiques Row Level Security pour chaque table
- Règles d'accès basées sur `auth.uid()`
- Protection des données utilisateur

### ⚙️ **Fonctions & Triggers**
- `sync_user_subscription_tier()` - Synchronisation automatique des tiers d'abonnement
- `upsert_stripe_subscription()` - Gestion des abonnements Stripe
- Triggers pour mise à jour automatique

### 📁 **Storage**
- Configuration des buckets `avatars` et `documents`
- Politiques d'accès pour upload/download
- Limites de taille et types MIME

### 📊 **Données de Référence**
- Liste complète des pays
- Langues supportées avec drapeaux
- Données essentielles au fonctionnement

## 🔧 Configuration Requise

### Variables d'Environnement
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Dépendances
```bash
npm install @supabase/supabase-js
```

## 📖 Guide d'Import dans un Nouveau Projet

### 1. **Créer un Nouveau Projet Supabase**
- Aller sur [supabase.com](https://supabase.com)
- Créer un nouveau projet
- Noter l'URL et les clés

### 2. **Importer le Schéma**
- Ouvrir **SQL Editor** dans le dashboard Supabase
- Copier le contenu de `supabase_schema_export.sql`
- Cliquer sur **"Run"** pour exécuter

### 3. **Configurer l'Authentification**
- Aller dans **Authentication > Settings**
- Configurer les URLs de redirection
- Activer les fournisseurs souhaités

### 4. **Configurer Stripe (optionnel)**
- Ajouter les webhooks Stripe
- Configurer les clés dans les variables d'environnement
- Tester les paiements

### 5. **Tester l'Import**
```sql
-- Vérifier que toutes les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Vérifier les politiques RLS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';

-- Tester les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
```

## 🎯 Cas d'Usage

### **Développement**
- Créer un environnement de staging identique
- Tester les migrations sur une copie
- Développer en parallèle sur plusieurs projets

### **Production**
- Migrer vers un nouveau projet Supabase
- Backup et restauration du schéma
- Déploiement multi-environnement

### **Collaboration**
- Partager le schéma avec l'équipe
- Onboarding rapide de nouveaux développeurs
- Documentation vivante de la base de données

## ⚠️ Notes Importantes

### **Données Sensibles**
- ❌ Les données utilisateur ne sont **PAS** exportées
- ✅ Seules les données de référence sont incluses
- ✅ Aucune clé ou secret n'est exporté

### **Permissions**
- Utilise la `SUPABASE_SERVICE_ROLE_KEY` (droits admin)
- Ne jamais exposer cette clé côté client
- Stocker dans les variables d'environnement

### **Compatibilité**
- Compatible avec tous les projets Supabase
- Utilise des commandes SQL standard
- Gère les conflits avec `ON CONFLICT`

## 🛠️ Personnalisation

### **Ajouter des Tables**
Modifier la liste `TABLES_TO_EXPORT` dans le script :
```javascript
const TABLES_TO_EXPORT = [
  'user_profiles',
  'your_custom_table',  // Ajouter ici
  // ...
]
```

### **Exporter des Données**
Pour inclure des données spécifiques :
```javascript
// Dans le script, ajouter après l'export des structures
const { data: customData } = await supabase
  .from('your_table')
  .select('*')

// Générer les INSERT statements
```

### **Politiques Personnalisées**
Les politiques RLS sont détectées automatiquement. Pour des politiques spécifiques, les ajouter manuellement dans le script.

## 🚀 Résultat

Après exécution, vous obtenez un fichier SQL complet qui recrée :
- ✅ **Structure complète** de la base de données
- ✅ **Sécurité** avec toutes les politiques RLS
- ✅ **Fonctionnalités avancées** (triggers, fonctions)
- ✅ **Configuration Storage** pour les fichiers
- ✅ **Données de référence** essentielles

**Prêt à déployer** dans n'importe quel nouveau projet Supabase ! 🎉