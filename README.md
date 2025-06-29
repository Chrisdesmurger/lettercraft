# LetterCraft - Générateur de lettres de motivation IA

Une application web moderne pour générer des lettres de motivation personnalisées avec l'intelligence artificielle.

## 🚀 Fonctionnalités

- **Interface moderne et intuitive** - Design épuré avec animations fluides
- **Questionnaire interactif** - Guide l'utilisateur étape par étape
- **Génération IA** - Utilise GPT-4 pour créer des lettres personnalisées
- **Responsive** - Fonctionne sur tous les appareils
- **Stockage cloud** - Intégration Supabase pour sauvegarder les données

## 📋 Prérequis

- Node.js 18+ 
- Compte OpenAI avec accès API
- Projet Supabase (optionnel)

## 🛠️ Installation

1. Cloner le repository
```bash
git clone https://github.com/votre-username/lettercraft.git
cd lettercraft
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.local.example .env.local
```

Puis éditer `.env.local` avec vos clés :
```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
OPENAI_API_KEY=sk-votre-cle-openai
```

4. Lancer le serveur de développement
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🏗️ Structure du projet

```
src/
├── app/                    # App Router Next.js
│   ├── api/               # API Routes
│   │   └── generate/      # Endpoint de génération
│   ├── globals.css        # Styles globaux
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Page d'accueil
├── components/            # Composants React
│   └── ModernWebApp.tsx   # Composant principal
└── lib/                   # Utilitaires
    └── supabase.ts        # Client Supabase
```

## 🔧 Configuration Supabase (optionnel)

Si vous souhaitez utiliser Supabase pour stocker les données :

1. Créer les tables dans Supabase :

```sql
-- Table des utilisateurs
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  phone text,
  created_at timestamp with time zone default now(),
  generation_count integer default 0
);

-- Table des documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  type text not null check (type in ('cv', 'job_offer')),
  content text not null,
  summary text,
  created_at timestamp with time zone default now()
);

-- Table des lettres générées
create table generated_letters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  document_id uuid references documents(id),
  job_offer_id uuid references documents(id),
  content text not null,
  answers jsonb,
  created_at timestamp with time zone default now()
);
```

2. Créer un bucket de stockage nommé `documents` pour les fichiers uploadés

## 🚀 Déploiement

### Vercel (recommandé)

1. Pusher votre code sur GitHub
2. Importer le projet dans Vercel
3. Configurer les variables d'environnement
4. Déployer

### Autres plateformes

L'application est compatible avec toute plateforme supportant Next.js 14+

## 🛡️ Sécurité

- Les clés API ne sont jamais exposées côté client
- Validation des données côté serveur
- Sanitization des entrées utilisateur
- HTTPS requis en production

## 📝 Utilisation

1. **Accueil** - Vue d'ensemble avec statistiques
2. **Questionnaire** - Répondre aux questions sur la motivation
3. **Génération** - L'IA crée une lettre personnalisée
4. **Résultat** - Affichage et téléchargement de la lettre

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

- [Next.js](https://nextjs.org/) - Framework React
- [Tailwind CSS](https://tailwindcss.com/) - Styles utilitaires
- [OpenAI](https://openai.com/) - API GPT-4
- [Supabase](https://supabase.com/) - Backend as a Service
- [Lucide](https://lucide.dev/) - Icônes