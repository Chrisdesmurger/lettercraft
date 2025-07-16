# LetterCraft - Générateur de lettres de motivation IA

Une application web moderne pour générer des lettres de motivation personnalisées avec l'intelligence artificielle en français.

## 🚀 Fonctionnalités

- **Authentification sécurisée** - Système d'inscription et connexion via Supabase
- **Gestion de profil** - Profil utilisateur avec avatar et statistiques
- **Upload de CV** - Téléchargement et extraction automatique des données CV
- **Génération IA** - Utilise GPT-4 pour créer des lettres personnalisées
- **Historique des lettres** - Sauvegarde et consultation des lettres générées
- **Interface moderne** - Design épuré avec animations fluides et responsive
- **Système de quotas** - Gestion des limites de génération par utilisateur

## 📋 Prérequis

- **Node.js 18+** 
- **Compte OpenAI** avec accès API GPT-4
- **Projet Supabase** avec base de données PostgreSQL
- **npm** ou **yarn** pour la gestion des dépendances

## 🛠️ Installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/lettercraft.git
cd lettercraft
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.local.example .env.local
```

Puis éditer `.env.local` avec vos clés :
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-supabase

# OpenAI
OPENAI_API_KEY=sk-votre-cle-openai

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Configurer la base de données Supabase** (voir section Database Schema)

5. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🏗️ Structure du projet

```
lettercraft/
├── app/                       # App Router Next.js 15
│   ├── api/                  # API Routes
│   │   ├── generate-letter/  # Génération de lettres
│   │   ├── extract-cv/       # Extraction de CV
│   │   └── upload-avatar/    # Upload d'avatar
│   ├── dashboard/            # Pages dashboard
│   │   └── letters/         # Historique des lettres
│   ├── login/               # Page de connexion
│   ├── register/            # Page d'inscription
│   ├── profile/             # Page de profil
│   ├── upload/              # Page d'upload CV
│   └── generate-letter/     # Page de génération
├── components/              # Composants React
│   ├── ui/                 # Composants UI réutilisables
│   ├── profile/            # Composants du profil
│   └── letters/            # Composants des lettres
├── hooks/                  # Hooks React personnalisés
├── lib/                    # Utilitaires et configuration
│   ├── supabase-client.ts  # Client Supabase typé
│   └── api/               # Fonctions API
├── services/              # Services métier
└── types/                 # Types TypeScript
```

## 🗄️ Schema de Base de Données

### Tables Principales

#### `user_profiles`
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country TEXT,
  language TEXT,
  birth_date DATE,
  avatar_url TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `candidates_profile` (CV)
```sql
CREATE TABLE candidates_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  experiences TEXT[],
  skills TEXT[],
  education TEXT[],
  file_size INTEGER,
  is_active BOOLEAN DEFAULT FALSE
);
```

#### `job_offers`
```sql
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[],
  location TEXT,
  salary_range TEXT,
  employment_type TEXT,
  source_url TEXT,
  extracted_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `generated_letters`
```sql
CREATE TABLE generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  questionnaire_response_id TEXT,
  job_offer_id TEXT,
  cv_id TEXT,
  content TEXT NOT NULL,
  html_content TEXT,
  pdf_url TEXT,
  generation_settings JSONB,
  openai_model TEXT DEFAULT 'gpt-4',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_quotas`
```sql
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  letters_generated INTEGER DEFAULT 0,
  max_letters INTEGER DEFAULT 5,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tables de Référence

#### `countries`
```sql
CREATE TABLE countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
```

#### `languages`
```sql
CREATE TABLE languages (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  flag TEXT NOT NULL
);
```

### Storage Buckets

1. **documents** - Pour les fichiers CV uploadés
2. **avatars** - Pour les photos de profil utilisateur

### Politiques de Sécurité (RLS)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès utilisateur
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Répéter pour les autres tables...
```

## 🔧 Configuration Supabase

### 1. Créer un nouveau projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé anonyme

### 2. Configurer l'authentification

1. Aller dans Authentication > Settings
2. Configurer les fournisseurs d'authentification souhaités
3. Définir les URLs de redirection

### 3. Créer les tables

Exécuter les scripts SQL du schema ci-dessus dans l'éditeur SQL de Supabase.

### 4. Configurer le stockage

1. Créer les buckets `documents` et `avatars`
2. Configurer les politiques d'accès appropriées

## 🚀 Déploiement

### Vercel (recommandé)

1. Pusher votre code sur GitHub
2. Importer le projet dans Vercel
3. Configurer les variables d'environnement
4. Déployer

### Variables d'environnement pour la production

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
OPENAI_API_KEY=sk-votre-cle-openai
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

## 📝 Utilisation

### Flux utilisateur

1. **Inscription/Connexion** - Créer un compte ou se connecter
2. **Configuration du profil** - Renseigner les informations personnelles
3. **Upload de CV** - Télécharger et extraire les données du CV
4. **Génération de lettre** - Saisir l'offre d'emploi et générer la lettre
5. **Gestion des lettres** - Consulter l'historique dans le dashboard

### Fonctionnalités avancées

- **Extraction automatique de CV** - Utilise OpenAI pour extraire les informations
- **Génération contextuelle** - Adapte la lettre selon le profil et l'offre
- **Sauvegarde automatique** - Toutes les lettres sont sauvegardées
- **Système de quotas** - Gestion des limites par utilisateur

## 🛡️ Sécurité

- **Authentification Supabase** - Gestion sécurisée des sessions
- **Row Level Security** - Isolation des données par utilisateur
- **Validation des données** - Côté client et serveur
- **Sanitization** - Protection contre les injections
- **HTTPS obligatoire** - En production

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Tests avec couverture
npm run test:coverage

# Linter
npm run lint

# Vérification TypeScript
npm run type-check
```

## 📦 Scripts disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build de production
- `npm run start` - Serveur de production
- `npm run lint` - Linter ESLint
- `npm run type-check` - Vérification TypeScript
- `npm run format` - Formatage Prettier

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- [Next.js 15](https://nextjs.org/) - Framework React
- [Tailwind CSS](https://tailwindcss.com/) - Styles utilitaires
- [OpenAI GPT-4](https://openai.com/) - API de génération
- [Supabase](https://supabase.com/) - Backend as a Service
- [Radix UI](https://www.radix-ui.com/) - Composants UI accessibles
- [Lucide](https://lucide.dev/) - Icônes modernes
- [Framer Motion](https://www.framer.com/motion/) - Animations

## 🐛 Problèmes connus

- Le système de quotas necessite une configuration manuelle
- L'extraction de CV fonctionne mieux avec des PDF structurés
- Les notifications toast peuvent se superposer

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Consulter la documentation Supabase
- Vérifier les logs dans la console de développement