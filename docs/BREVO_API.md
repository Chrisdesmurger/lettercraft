# 📧 API de Synchronisation Brevo - Documentation Complète

## Vue d'ensemble

L'API `/api/sync-contact` permet de gérer la synchronisation des contacts entre LetterCraft et Brevo pour les campagnes email marketing. Elle offre des fonctionnalités complètes de création, mise à jour, suppression et gestion des listes de contacts.

## 🔗 Endpoint Principal

```
POST /api/sync-contact
GET /api/sync-contact?email={email}
```

## 📋 Actions Disponibles

### 1. **create** - Créer un nouveau contact

Crée un nouveau contact dans Brevo avec les informations fournies.

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    email: 'user@example.com',      // Requis
    firstName: 'Jean',              // Requis
    lastName: 'Dupont',             // Requis
    language: 'fr'                  // Optionnel (défaut: 'fr')
  })
})
```

**Réponse :**
```json
{
  "success": true,
  "contactId": 12345,
  "message": "Contact créé/mis à jour avec succès"
}
```

### 2. **update** - Mettre à jour un contact existant

Met à jour un contact en utilisant soit l'ID utilisateur, soit l'email.

```javascript
// Option 1: Par ID utilisateur (recommandé)
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    userId: 'user-uuid-here'        // Requis
  })
})

// Option 2: Par email avec données
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    email: 'user@example.com',      // Requis
    firstName: 'Jean',              // Optionnel
    lastName: 'Dupont',             // Optionnel
    language: 'en'                  // Optionnel
  })
})
```

### 3. **delete** - Supprimer un contact

Supprime définitivement un contact de Brevo.

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete',
    email: 'user@example.com'       // Requis
  })
})
```

### 4. **bulk** - Synchronisation en lot

Synchronise plusieurs utilisateurs par leurs IDs.

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'bulk',
    userIds: [                      // Requis (array)
      'uuid-user-1',
      'uuid-user-2',
      'uuid-user-3'
    ]
  })
})
```

**Réponse :**
```json
{
  "success": true,
  "success": 2,
  "failed": 1,
  "message": "2 contacts synchronisés, 1 échecs"
}
```

### 5. **sync** - Synchronisation complète

Synchronise complètement un utilisateur avec toutes ses données.

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'sync',
    userId: 'user-uuid-here'        // Requis
  })
})
```

### 6. **update-lists** - Gérer les listes

Met à jour les listes d'appartenance d'un contact.

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update-lists',
    email: 'user@example.com',      // Requis
    listIds: [1, 2, 4]             // Requis (array des IDs de listes)
  })
})
```

### 7. **sync-all-lists** - Maintenance des listes

Synchronise toutes les listes pour tous les contacts (opération de maintenance).

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'sync-all-lists'
  })
})
```

**Réponse :**
```json
{
  "success": true,
  "updated": 150,
  "failed": 3,
  "message": "150 contacts mis à jour, 3 échecs"
}
```

### 8. **create-missing** - Migration initiale

⭐ **NOUVELLE FONCTIONNALITÉ** - Crée tous les contacts LetterCraft qui n'existent pas encore dans Brevo.

```javascript
const response = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create-missing'
  })
})
```

**Réponse :**
```json
{
  "success": true,
  "created": 45,
  "already_exists": 12,
  "failed": 2,
  "message": "45 contacts créés, 12 existants, 2 échecs"
}
```

## 📥 Récupération de contacts (GET)

Récupère les informations d'un contact existant.

```javascript
const response = await fetch('/api/sync-contact?email=user@example.com')
const data = await response.json()
```

**Réponse :**
```json
{
  "success": true,
  "contact": {
    "id": 12345,
    "email": "user@example.com",
    "attributes": {
      "FIRSTNAME": "Jean",
      "LASTNAME": "Dupont",
      "SUBSCRIPTION_TIER": "premium"
    }
  }
}
```

## 🏷️ Listes Brevo et Segmentation

### Configuration des listes

| Variable d'environnement | ID par défaut | Description |
|--------------------------|---------------|-------------|
| `BREVO_LIST_ALL_USERS` | 1 | Tous les utilisateurs |
| `BREVO_LIST_FREE_USERS` | 2 | Utilisateurs gratuits |
| `BREVO_LIST_PREMIUM_USERS` | 3 | Utilisateurs premium |
| `BREVO_LIST_ACTIVE_USERS` | 4 | Utilisateurs actifs (ont généré des lettres) |
| `BREVO_LIST_CHURNED_USERS` | 5 | Utilisateurs inactifs (30+ jours) |

### Attribution automatique des listes

L'attribution aux listes se fait automatiquement selon ces critères :

- **ALL_USERS** : Tous les utilisateurs
- **FREE_USERS / PREMIUM_USERS** : Selon `subscription_tier`
- **ACTIVE_USERS** : Utilisateurs ayant généré au moins 1 lettre
- **CHURNED_USERS** : Inactifs depuis 30+ jours sans lettres

## 📊 Attributs personnalisés Brevo

Chaque contact synchronisé contient ces attributs :

| Attribut | Type | Description |
|----------|------|-------------|
| `USER_ID` | String | ID utilisateur LetterCraft |
| `SUBSCRIPTION_TIER` | String | `free` ou `premium` |
| `LANGUAGE` | String | Langue préférée (`fr`, `en`, `es`, etc.) |
| `COUNTRY` | String | Code pays |
| `LETTERS_GENERATED` | Number | Nombre de lettres créées |
| `PROFILE_COMPLETE` | Boolean | Profil complet ou non |
| `LAST_LOGIN` | Date | Dernière connexion |
| `REGISTRATION_DATE` | Date | Date d'inscription |
| `FIRSTNAME` | String | Prénom |
| `LASTNAME` | String | Nom |
| `SMS` | String | Numéro de téléphone (optionnel) |

## ⚠️ Gestion d'erreurs

### Codes d'erreur HTTP

- **400 Bad Request** : Paramètres manquants ou invalides
- **404 Not Found** : Contact non trouvé (GET uniquement)
- **500 Internal Server Error** : Erreur serveur ou API Brevo

### Format des erreurs

```json
{
  "error": "Description de l'erreur",
  "details": "Détails techniques (si disponibles)"
}
```

### Exemples d'erreurs courantes

```json
// Paramètres manquants
{
  "error": "Action requise"
}

// Contact non trouvé
{
  "error": "Contact non trouvé"
}

// Erreur Brevo API
{
  "error": "Erreur interne du serveur",
  "details": "Invalid API key"
}
```

## 🔧 Configuration requise

### Variables d'environnement

```env
# Clé API Brevo (obligatoire)
BREVO_API_KEY=xkeysib-your-api-key-here

# IDs des listes Brevo (optionnel - valeurs par défaut utilisées)
BREVO_LIST_ALL_USERS=1
BREVO_LIST_FREE_USERS=2
BREVO_LIST_PREMIUM_USERS=3
BREVO_LIST_ACTIVE_USERS=4
BREVO_LIST_CHURNED_USERS=5

# URL de l'application (pour les webhooks)
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

## 🚀 Cas d'usage pratiques

### Migration initiale

Pour importer tous vos utilisateurs existants dans Brevo :

```javascript
// 1. Créer tous les contacts manquants
const migration = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'create-missing' })
})

// 2. Synchroniser toutes les listes
const lists = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'sync-all-lists' })
})
```

### Maintenance quotidienne

Script de maintenance à exécuter périodiquement :

```javascript
// Synchroniser les listes (utilisateurs qui ont changé de statut)
const maintenance = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'sync-all-lists' })
})

console.log(`Maintenance terminée: ${maintenance.updated} mis à jour`)
```

### Intégration dans le code

L'API est automatiquement appelée lors de :

- **Inscription utilisateur** → `action: 'create'`
- **Mise à jour profil** → `action: 'update'`
- **Changement langue** → `action: 'update'`
- **Changement abonnement** → `action: 'update'` (via webhook Stripe)

## 📈 Monitoring et logs

### Logs de débogage

L'API génère des logs détaillés pour le monitoring :

```
📧 [API] Synchronisation contact Brevo demandée
🔄 Synchronisation utilisateur uuid-123 vers Brevo
✅ Contact créé dans Brevo: 12345
📊 Synchronisation terminée: 150 succès, 3 échecs
```

### Surveillance recommandée

- **Taux d'échec** : Surveiller les échecs > 5%
- **Temps de réponse** : API Brevo peut être lente (2-5s)
- **Quotas Brevo** : Vérifier les limites API
- **Contacts orphelins** : Contacts Brevo sans utilisateur LetterCraft

## 🔐 Sécurité

- **Clé API Brevo** : Gardez-la secrète, ne la commitez jamais
- **Rate limiting** : Pause de 150ms entre les requêtes en lot
- **Validation** : Tous les paramètres sont validés côté serveur
- **Non-bloquant** : Les échecs de sync n'affectent pas l'UX utilisateur

---

## 📞 Support

Pour toute question sur cette API :

1. Vérifiez les logs de l'application
2. Testez avec l'action `sync` pour un utilisateur spécifique
3. Vérifiez la configuration Brevo (listes, attributs personnalisés)
4. Consultez la documentation Brevo API : https://developers.brevo.com/

---

*Documentation générée automatiquement - Version 1.0*