# 🔐 Sécurité de l'API Brevo - Documentation

## Vue d'ensemble

L'API `/api/sync-contact` implémente plusieurs couches de sécurité pour protéger les données des utilisateurs et prévenir les abus.

## 🛡️ Couches de sécurité

### 1. **Authentification JWT**

Tous les appels externes nécessitent un token JWT valide de Supabase.

```javascript
// Requis dans les headers
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiI...'
}
```

**Vérifications :**

- ✅ Token valide et non expiré
- ✅ Utilisateur existe dans la base de données
- ✅ Session active

### 2. **Contrôle d'accès basé sur les rôles (RBAC)**

| Niveau          | Actions autorisées         | Conditions                                        |
| --------------- | -------------------------- | ------------------------------------------------- |
| **Utilisateur** | `create`, `update`, `sync` | Ses propres données uniquement                    |
| **Admin**       | Toutes les actions         | Utilisateurs avec `subscription_tier = 'premium'` |
| **Interne**     | Toutes les actions         | Appels avec secret interne                        |

### 3. **Rate Limiting**

Protection contre les attaques par déni de service.

| Type d'action           | Limite       | Fenêtre     |
| ----------------------- | ------------ | ----------- |
| **Actions normales**    | 100 req/min  | 60 secondes |
| **Actions admin**       | 50 req/min   | 60 secondes |
| **Actions dangereuses** | 10 req/min   | 60 secondes |
| **Appels internes**     | 1000 req/min | 60 secondes |

**Headers de réponse :**

```
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-01-27T10:30:00Z
```

### 4. **Validation stricte des données**

Chaque action a son propre schéma de validation.

**Exemple pour `create` :**

```javascript
{
  email: { required: true, format: 'email' },
  firstName: { required: true, minLength: 1, maxLength: 100 },
  lastName: { required: true, minLength: 1, maxLength: 100 },
  language: { enum: ['fr', 'en', 'es', 'it'] }
}
```

**Types de validation :**

- ✅ Types de données (string, number, array)
- ✅ Longueurs min/max
- ✅ Formats (email, UUID)
- ✅ Valeurs autorisées (enum)
- ✅ Taille des arrays

### 5. **Appels internes sécurisés**

Les synchronisations automatiques utilisent un système de secret interne.

```javascript
headers: {
  'X-Internal-Secret': 'your-secret-key',
  'X-Internal-Source': 'registration'
}
```

**Avantages :**

- 🚀 Pas de dépendance à l'authentification utilisateur
- ⚡ Rate limiting élevé pour les opérations internes
- 🛡️ Protection contre les appels externes malveillants

### 6. **Audit et logging**

Toutes les actions sensibles sont loggées.

```javascript
// Actions surveillées
⚠️ Action 'delete' exécutée par user@example.com (uuid-123)
⚠️ Action 'create-missing' exécutée par admin@example.com (uuid-456)
🚫 Accès refusé pour l'action 'bulk': Permissions administrateur requises
```

**Types de logs :**

- ✅ Actions admin/dangereuses
- ✅ Tentatives d'accès refusées
- ✅ Erreurs de validation
- ✅ Rate limiting dépassé

## 🚨 Classification des actions

### **Actions publiques** (utilisateur authentifié)

- `create` - Créer un contact
- `update` - Mettre à jour ses données
- `sync` - Synchroniser son profil

### **Actions administrateur** (permissions élevées)

- `bulk` - Synchronisation en lot
- `sync-all-lists` - Maintenance des listes
- `update-lists` - Modifier les listes d'un contact

### **Actions dangereuses** (audit renforcé)

- `delete` - Supprimer un contact
- `create-missing` - Migration complète

## 🔧 Configuration de sécurité

### **Variables d'environnement**

```env
# Secret pour les appels internes (générer une clé forte)
INTERNAL_API_SECRET=your-secure-random-string-here

# Tokens Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Génération du secret interne**

```bash
# Générer une clé sécurisée
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🧪 Tests de sécurité

### **Script de test automatique**

```bash
# Tester toutes les couches de sécurité
node scripts/test-security.js
```

**Tests inclus :**

- ✅ Requêtes sans authentification
- ✅ Tokens invalides
- ✅ Validation des données
- ✅ Permissions insuffisantes
- ✅ Rate limiting
- ✅ Appels internes
- ✅ JSON malformé

### **Tests manuels**

```javascript
// Test d'authentification
curl -X POST http://localhost:3000/api/sync-contact \
  -H "Content-Type: application/json" \
  -d '{"action": "sync", "userId": "test"}'
// Attendu: 401 Unauthorized

// Test avec token valide
curl -X POST http://localhost:3000/api/sync-contact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"action": "sync", "userId": "your-user-id"}'
// Attendu: 200 Success
```

## 🚧 Bonnes pratiques

### **Pour les développeurs**

1. **Toujours utiliser l'API interne** pour les synchronisations automatiques

```javascript
import { autoSyncUser } from "@/lib/internal-api";
await autoSyncUser(userId, "profile-update");
```

2. **Gérer les erreurs sans bloquer l'UX**

```javascript
try {
  await autoSyncUser(userId, "source");
} catch (error) {
  console.warn("Sync failed:", error);
  // Continue sans interrompre l'utilisateur
}
```

3. **Ne jamais exposer le secret interne** côté client

### **Pour les administrateurs**

1. **Surveiller les logs** de sécurité régulièrement
2. **Générer un secret fort** et le changer périodiquement
3. **Limiter les permissions admin** aux utilisateurs de confiance
4. **Monitorer le rate limiting** pour détecter les abus

### **Pour la production**

1. **Variables d'environnement sécurisées**

```env
INTERNAL_API_SECRET=64-char-random-hex-string
```

2. **Monitoring actif**

- Alertes sur les échecs d'authentification répétés
- Surveillance du rate limiting
- Logs d'audit des actions sensibles

3. **Rotation des secrets**

- Changer le secret interne trimestriellement
- Renouveler les tokens API Brevo annuellement

## ⚠️ Vulnérabilités connues et mitigations

### **1. Attaque par force brute**

**Mitigation :** Rate limiting strict (10 req/min pour actions sensibles)

### **2. Élévation de privilèges**

**Mitigation :** Vérification stricte des permissions à chaque requête

### **3. Injection de données**

**Mitigation :** Validation complète avec schémas TypeScript

### **4. Déni de service**

**Mitigation :** Rate limiting par IP + User-Agent

### **5. Fuite de données**

**Mitigation :** Utilisateurs ne peuvent accéder qu'à leurs propres données

## 📞 Incident de sécurité

En cas de problème de sécurité :

1. **Identifier la source** via les logs
2. **Bloquer l'accès** si nécessaire (rate limiting)
3. **Changer le secret interne** si compromis
4. **Analyser l'impact** sur les données
5. **Documenter l'incident** et les corrections

---

## 📋 Checklist de sécurité

- [ ] ✅ Authentification JWT configurée
- [ ] ✅ Permissions RBAC en place
- [ ] ✅ Rate limiting activé
- [ ] ✅ Validation des données stricte
- [ ] ✅ Secret interne sécurisé
- [ ] ✅ Logs d'audit activés
- [ ] ✅ Tests de sécurité passés
- [ ] ✅ Monitoring configuré

_Dernière mise à jour : Janvier 2025_
