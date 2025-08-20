# 🧪 Test Data - Stripe Events

Ce dossier contient des événements Stripe de test pour valider le système de webhooks et d'emails.

## 📄 Fichiers disponibles

### `stripe-payment-failed.json`

**Événement** : `invoice.payment_failed`  
**Customer ID** : `cus_SjnUizgv7O8n1B`  
**Montant** : €9.99 (999 centimes)  
**Description** : Échec de paiement pour un abonnement LetterCraft Premium

**Utilisation** :

```bash
# Avec Stripe CLI trigger
stripe trigger invoice.payment_failed --add customer=cus_SjnUizgv7O8n1B --forward-to=http://localhost:3000/api/webhooks/stripe

# Avec le script automatisé (Windows)
scripts\test-stripe-webhook.bat

# Avec le script automatisé (Linux/Mac)
./scripts/test-stripe-webhook.sh
```

**Test attendu** :

1. ✅ Webhook reçu et traité
2. ✅ Facture sauvegardée en base
3. ✅ Email d'échec de paiement envoyé
4. ✅ Logs détaillés dans la console

## 🔧 Utilisation

### Prérequis

1. **Stripe CLI installé** : `npm install -g @stripe/stripe-cli`
2. **Authentification** : `stripe login`
3. **Serveur local actif** : `npm run dev` (port 3000)

### Test rapide

```bash
# Windows
scripts\test-stripe-webhook.bat test-data\stripe-payment-failed.json

# Linux/Mac
./scripts/test-stripe-webhook.sh test-data/stripe-payment-failed.json
```

### Vérification

1. **Logs serveur** : Vérifiez la console Next.js
2. **Base de données** : Consultez la table `stripe_invoices`
3. **Email** : Vérifiez la réception de l'email de test
4. **Dashboard Stripe** : https://dashboard.stripe.com/test/events

## 📧 Emails testés

L'événement `invoice.payment_failed` déclenche :

- 📧 **Email d'échec de paiement** en français (par défaut)
- 🔗 **Lien vers la facture Stripe**
- ⚠️ **Instructions de résolution**

## 🛠️ Personnalisation

Pour tester avec un autre customer ID :

1. Modifiez le champ `"customer"` dans le JSON
2. Assurez-vous que le customer existe dans votre base Supabase
3. Lancez le test

Pour tester d'autres événements :

1. Dupliquez le fichier JSON
2. Changez le `"type"` de l'événement
3. Adaptez les données selon l'événement
4. Utilisez `stripe trigger [event-type]` approprié

## 🔍 Debugging

Si le test échoue :

1. **Vérifiez les variables d'environnement** Brevo
2. **Consultez les logs webhook** dans la console
3. **Testez la connectivité** avec `scripts/test-brevo.js`
4. **Vérifiez le customer ID** dans Supabase

---

_Pour plus d'informations sur le système d'emails, consultez `BREVO_EMAIL_SYSTEM.md`_
