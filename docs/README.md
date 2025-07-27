# 📚 Documentation LetterCraft

Ce dossier contient la documentation technique détaillée pour les différents composants de LetterCraft.

## 📋 Fichiers disponibles

### [BREVO_API.md](./BREVO_API.md)
Documentation complète de l'API de synchronisation des contacts avec Brevo.

**Contenu :**
- 🔗 Tous les endpoints disponibles
- 📋 Actions supportées (create, update, delete, bulk, sync, etc.)
- 🏷️ Gestion des listes et segmentation
- 📊 Attributs personnalisés Brevo
- ⚠️ Gestion d'erreurs et codes de statut
- 🚀 Cas d'usage pratiques
- 🔧 Configuration et variables d'environnement

**Audience :** Développeurs, administrateurs système, équipe marketing

## 🛠️ Scripts utilitaires

### [../scripts/brevo-sync.js](../scripts/brevo-sync.js)
Script en ligne de commande pour les opérations Brevo.

**Usage :**
```bash
# Migration initiale - créer tous les contacts manquants
node scripts/brevo-sync.js create-missing

# Synchroniser un utilisateur spécifique
node scripts/brevo-sync.js sync-user abc-123-def

# Maintenance des listes
node scripts/brevo-sync.js sync-all-lists

# Aide
node scripts/brevo-sync.js help
```

## 📝 Contributions

Pour ajouter ou modifier la documentation :

1. Créez un nouveau fichier `.md` dans ce dossier
2. Utilisez la même structure et format que les fichiers existants
3. Mettez à jour ce README pour référencer le nouveau fichier
4. Ajoutez une référence dans le fichier principal `CLAUDE.md`

## 🔗 Liens utiles

- [Documentation principale](../CLAUDE.md) - Vue d'ensemble de l'architecture
- [Configuration environnement](../.env.local.example) - Variables d'environnement
- [Schéma base de données](../DATABASE_SCHEMA.sql) - Structure des tables

---

*Dernière mise à jour : Janvier 2025*