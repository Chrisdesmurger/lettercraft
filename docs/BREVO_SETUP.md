# Guide de configuration Brevo pour LetterCraft

## 🚀 Configuration initiale

### 1. Créer un compte Brevo

1. Aller sur [https://www.brevo.com](https://www.brevo.com)
2. Créer un compte gratuit
3. Vérifier votre email

### 2. Obtenir l'API Key

1. Se connecter à Brevo
2. Aller dans **SMTP & API** > **API Keys**
3. Créer une nouvelle API Key v3
4. Copier la clé (format: `xkeysib-...`)

### 3. Configuration environnement

Ajouter dans votre `.env.local` :

```env
# Brevo Configuration
BREVO_API_KEY=xkeysib-votre-api-key-ici
BREVO_SENDER_EMAIL=noreply@votredomaine.com
BREVO_SENDER_NAME=LetterCraft

# Pour les tests (optionnel)
TEST_EMAIL=votre-email@exemple.com
```

## 🧪 Tests de l'intégration

### Test de connexion

```bash
# Test basique de connexion
node scripts/test-brevo.js

# Test avec envoi d'email
TEST_EMAIL=votre-email@exemple.com node scripts/test-brevo.js
```

### Test via l'API LetterCraft

```bash
# Démarrer le serveur de dev
npm run dev

# Dans un autre terminal, tester l'API
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "userEmail": "test@exemple.com",
    "userName": "Utilisateur Test",
    "userLanguage": "fr"
  }'
```

## 📧 Types d'emails supportés

### 1. Email de bienvenue (`welcome`)

- **Déclencheur**: Inscription d'un nouvel utilisateur
- **Paramètres**: `userEmail`, `userName`, `userLanguage`

### 2. Confirmation d'abonnement (`subscription_confirmed`)

- **Déclencheur**: Paiement Stripe réussi
- **Paramètres**: `userEmail`, `userName`, `userLanguage`, `invoiceUrl`

### 3. Échec de paiement (`payment_failed`)

- **Déclencheur**: Paiement Stripe échoué
- **Paramètres**: `userEmail`, `userName`, `userLanguage`, `invoiceUrl`

### 4. Avertissement quota (`quota_warning`)

- **Déclencheur**: Il reste 1-2 générations
- **Paramètres**: `userEmail`, `userName`, `userLanguage`, `remainingQuota`

### 5. Limite quota atteinte (`quota_limit`)

- **Déclencheur**: Quota épuisé
- **Paramètres**: `userEmail`, `userName`, `userLanguage`, `currentQuota`, `maxQuota`, `resetDate`

## 🔧 Intégrations automatiques

### Inscription utilisateur

- **Fichier**: `app/register/page.tsx`
- **Action**: Email de bienvenue automatique après inscription

### Webhooks Stripe

- **Fichier**: `app/api/webhooks/stripe/route.ts`
- **Actions**:
  - Confirmation d'abonnement (paiement réussi)
  - Notification d'échec de paiement

### Système de quotas

- **Fichier**: `hooks/useQuota.ts`
- **Actions**:
  - Avertissement quand proche de la limite
  - Notification quand limite atteinte

## 🛠 Développement

### Structure des fichiers

```
lib/
├── brevo-client.ts      # Service principal Brevo
├── email-client.ts      # Client frontend
app/api/
├── send-email/          # API route pour envoi d'emails
```

### Utilisation dans le code

#### Côté serveur

```typescript
import { brevoEmailService } from "@/lib/brevo-client";

await brevoEmailService.sendWelcomeEmail("user@example.com", "John Doe", "fr");
```

#### Côté client

```typescript
import { useEmailClient } from "@/lib/email-client";

const emailClient = useEmailClient();
await emailClient.sendWelcomeEmail("user@example.com", "John Doe", "fr");
```

## 🐛 Dépannage

### Erreurs communes

#### "Invalid api key"

- Vérifiez que `BREVO_API_KEY` est correctement définie
- La clé doit commencer par `xkeysib-`
- Vérifiez qu'elle n'a pas d'espaces avant/après

#### "Cannot read properties of undefined"

- Vérifiez que toutes les variables d'environnement sont définies
- Redémarrez le serveur après modification de `.env.local`

#### "Sender not verified"

- Dans Brevo, vérifiez votre domaine d'envoi
- Ou utilisez l'email Brevo par défaut pour les tests

### Logs utiles

```bash
# Voir les logs des envois d'emails
npm run dev
# Les logs apparaîtront dans la console avec 📧, ✅, ❌
```

## 📊 Monitoring

### Dans l'interface Brevo

1. **Statistics** > **Email** pour voir les statistiques d'envoi
2. **Logs** > **Email** pour voir les détails des envois
3. **SMTP & API** > **API Keys** pour surveiller l'usage

### Dans l'application

- Tous les envois sont loggés dans la console avec des émojis
- Les erreurs sont catchées et n'interrompent pas l'UX
- Les webhooks Stripe loggent les envois d'emails

## 🚀 Production

### Variables d'environnement production

```env
BREVO_API_KEY=xkeysib-votre-cle-production
BREVO_SENDER_EMAIL=noreply@votredomaine-verifie.com
BREVO_SENDER_NAME=LetterCraft
NEXT_PUBLIC_APP_URL=https://votredomaine.com
```

### Vérification domaine

1. Dans Brevo, aller dans **Senders & IP**
2. Ajouter et vérifier votre domaine
3. Configurer les enregistrements DNS SPF/DKIM
