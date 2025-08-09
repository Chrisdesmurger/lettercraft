# Automatisation de la Suppression de Comptes

Ce guide explique comment mettre en place l'automatisation des tâches de suppression de compte avec des outils gratuits.

## 🚀 Aperçu du Système

Le système de suppression automatique comprend :
- **Nettoyage des demandes expirées** (toutes les 6h)
- **Exécution des suppressions programmées** (quotidien à 2h00 UTC)
- **Maintenance complète** (combinaison des deux)

## 📁 Fichiers Créés

### 1. API Endpoint
- **Fichier** : `app/api/cleanup/route.ts`
- **Actions disponibles** :
  - `cleanup_expired_requests` - Nettoie les demandes non confirmées > 7 jours
  - `execute_pending_deletions` - Exécute les suppressions programmées
  - `full_maintenance` - Combinaison des deux actions

### 2. Automatisation via Cron-Job.org
- **Service externe** : [cron-job.org](https://cron-job.org) (gratuit)
- **Planification** :
  - Nettoyage : toutes les 6 heures (`0 */6 * * *`)
  - Suppressions : quotidien à 2h00 UTC (`0 2 * * *`)

## ⚙️ Configuration Requise

### 1. Variables d'Environnement
Ajoutez ces variables dans votre `.env.local` :
```env
ADMIN_SECRET=votre-secret-admin-securise
```

## 🔧 Instructions de Mise en Place

### Configuration Cron-Job.org (Recommandé - Gratuit)

1. **Inscrivez-vous** sur [cron-job.org](https://cron-job.org) (gratuit)

2. **Créer les tâches cron** :

   **Tâche 1 - Nettoyage (toutes les 6h)** :
   - URL : `https://votre-app.vercel.app/api/cleanup`
   - Méthode : `POST`
   - Headers : `Content-Type: application/json`
   - Body : 
     ```json
     {
       "action": "cleanup_expired_requests",
       "adminSecret": "votre-secret-admin"
     }
     ```
   - Schedule : `0 */6 * * *`

   **Tâche 2 - Suppressions (quotidien à 2h00)** :
   - URL : `https://votre-app.vercel.app/api/cleanup`
   - Méthode : `POST`
   - Headers : `Content-Type: application/json`
   - Body :
     ```json
     {
       "action": "execute_pending_deletions",
       "adminSecret": "votre-secret-admin"
     }
     ```
   - Schedule : `0 2 * * *`

### Alternative : UptimeRobot (Monitoring + Cron Gratuit)

1. **Inscrivez-vous** sur [UptimeRobot](https://uptimerobot.com) (gratuit)

2. **Créer des monitors HTTP POST** :
   - Type : HTTP(S)
   - URL : `https://votre-app.vercel.app/api/cleanup`
   - Monitoring Interval : 6 heures (pour le nettoyage)
   - Créer un deuxième monitor pour les suppressions (interval 24h)

## 🔍 Monitoring et Tests

### Vérifier le Statut
```bash
# GET pour vérifier la santé du système
curl https://votre-app.vercel.app/api/cleanup
```

**Réponse attendue** :
```json
{
  "status": "healthy",
  "stats": {
    "activeRequests": 0,
    "readyForDeletion": 0,
    "expiredRequests": 2
  },
  "actions": [
    "cleanup_expired_requests",
    "execute_pending_deletions", 
    "full_maintenance"
  ]
}
```

### Test Manuel
```bash
# Nettoyer les demandes expirées
curl -X POST https://votre-app.vercel.app/api/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup_expired_requests",
    "adminSecret": "votre-secret-admin"
  }'

# Exécuter les suppressions programmées  
curl -X POST https://votre-app.vercel.app/api/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "action": "execute_pending_deletions",
    "adminSecret": "votre-secret-admin"
  }'
```

### Logs d'Audit
Tous les événements sont enregistrés dans la table `audit_logs` :
```sql
SELECT * FROM audit_logs 
WHERE action_type IN ('maintenance_cleanup', 'maintenance_execution')
ORDER BY created_at DESC;
```

## 🛡️ Sécurité

### Protection des Endpoints
- **Secret Admin** : Authentification requise via `ADMIN_SECRET`
- **IP Logging** : Tentatives non autorisées sont enregistrées
- **Rate Limiting** : Protection contre les abus

### Bonnes Pratiques
1. **Secret complexe** : Utilisez un secret de 32+ caractères
2. **HTTPS obligatoire** : Jamais d'appels en HTTP
3. **Monitoring des logs** : Surveillez les tentatives d'accès non autorisées

## 🔧 Dépannage

### Cron-Job.org ne fonctionne pas
- Vérifiez que l'URL et le body JSON sont corrects
- Testez manuellement avec curl d'abord
- Vérifiez les logs d'exécution sur cron-job.org

### API retourne 403 Unauthorized
- Vérifiez que `ADMIN_SECRET` est identique dans `.env.local` et cron-job.org
- Testez manuellement avec curl

### API retourne 500 Internal Error
- Vérifiez les logs Vercel ou votre hébergeur
- Testez la connexion à Supabase
- Vérifiez que les fonctions SQL existent

## 📊 Fréquences Recommandées

| Action | Fréquence | Raison |
|--------|-----------|--------|
| `cleanup_expired_requests` | 6 heures | Libère les tokens expirés |
| `execute_pending_deletions` | Quotidien (2h00) | Supprime les comptes programmés |
| `full_maintenance` | Hebdomadaire | Maintenance complète |

## 🎯 Résultat Attendu

Une fois configuré, votre système :
- ✅ Nettoie automatiquement les demandes non confirmées après 7 jours
- ✅ Exécute les suppressions de compte programmées quotidiennement
- ✅ Maintient des logs d'audit complets
- ✅ Envoie des emails de confirmation de suppression
- ✅ Annule automatiquement les abonnements Stripe

Le tout **sans intervention manuelle** et avec des **outils 100% gratuits** ! 🚀