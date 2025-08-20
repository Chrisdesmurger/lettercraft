# Configuration d'environnement pour le système de quotas

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env.local` :

```env
# Clés Supabase existantes
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Nouvelle clé requise pour le système de quotas
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clé OpenAI existante
OPENAI_API_KEY=your_openai_api_key
```

## Comment obtenir SUPABASE_SERVICE_ROLE_KEY

1. Allez sur votre tableau de bord Supabase : https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Dans la section **Project API keys**, copiez la clé **service_role**
5. Ajoutez-la à votre `.env.local` comme `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT** : La clé service_role a des privilèges élevés. Ne jamais l'exposer côté client ou la commiter dans Git.

## Vérification de la configuration

Pour vérifier que tout est configuré correctement :

1. Redémarrez votre serveur de développement :

   ```bash
   npm run dev
   ```

2. Ouvrez la console développeur et vérifiez qu'il n'y a plus d'erreur "Non autorisé"

3. Testez l'API quota directement :
   ```bash
   curl http://localhost:3000/api/quota
   ```

## Migration de la base de données

N'oubliez pas d'exécuter la migration pour créer les tables et fonctions :

```bash
npm run db:migrate
```

Si la commande échoue, vous pouvez exécuter manuellement le contenu du fichier :
`supabase/migrations/0018_create_quota_system.sql`

Dans l'interface SQL de Supabase (Dashboard → SQL Editor).
