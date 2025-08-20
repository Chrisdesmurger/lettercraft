# 🎨 Système de Modèles PDF - LetterCraft

## ✨ Fonctionnalités Ajoutées

### 🎯 **4 Modèles Professionnels**

- **Classique** : Style traditionnel français (Times New Roman)
- **Moderne** : Design épuré contemporain (Helvetica)
- **Élégant** : Sophistiqué avec dégradés (Georgia)
- **Créatif** : Coloré pour métiers créatifs (Moderne + Emojis)

### 🔧 **Composants UI**

- `PdfExportControls` : Interface complète d'export avec sélection
- `TemplateSelector` : Sélecteur de modèles avec aperçus visuels

### ⚡ **API Améliorée**

- `generateLetterPdfWithTemplate()` : Nouvelle fonction avec modèles
- Support des données structurées `LetterData`
- Options avancées par modèle

## 📁 **Fichiers Créés**

```
lib/
├── pdf-templates.ts          # Modèles et logique de génération
└── pdf.ts                    # Core PDF (mis à jour)

components/pdf/
├── PdfExportControls.tsx     # Interface d'export complète
└── TemplateSelector.tsx      # Sélecteur de modèles

docs/
└── PDF_TEMPLATES_GUIDE.md    # Documentation complète

examples/
└── pdf-integration-example.tsx # Exemples d'intégration
```

## 🚀 **Utilisation Rapide**

### Import du Composant

```tsx
import PdfExportControls from "@/components/pdf/PdfExportControls";
```

### Préparation des Données

```tsx
const letterData = {
  content: "Votre lettre...",
  jobTitle: "Développeur",
  company: "TechCorp",
  candidateName: "Jean Dupont",
  candidateEmail: "jean@email.com",
};
```

### Rendu du Composant

```tsx
<PdfExportControls letterData={letterData} fileName="ma-lettre-motivation" />
```

## 🎨 **Aperçu des Modèles**

### Classique 📄

```
┌─────────────────────────────┐
│ Jean Dupont                 │
│ Adresse                     │
│                             │
│         Paris, 9 août 2025  │
│                             │
│ Service Recrutement         │
│ TechCorp                    │
│                             │
│ Objet: Candidature...       │
│                             │
│ Madame, Monsieur,           │
│                             │
│ Contenu de la lettre...     │
│                             │
│         Cordialement,       │
│         Jean Dupont         │
└─────────────────────────────┘
```

### Moderne 🔷

```
┌─────────────────────────────┐
│ JEAN DUPONT                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ jean@email.com              │
│                             │
│ ▎Service Recrutement        │
│ ▎TechCorp                   │
│                             │
│ CANDIDATURE - DÉVELOPPEUR   │
│                             │
│ Contenu moderne...          │
│                             │
│         Cordialement,       │
│         JEAN DUPONT         │
└─────────────────────────────┘
```

### Élégant 🎭

```
┌─────────────────────────────┐
│ ████ JEAN DUPONT ████       │
│ jean@email.com              │
│                             │
│ ▌Service Recrutement        │
│ ▌TechCorp                   │
│                             │
│    Candidature spontanée    │
│    ─────────────────────    │
│                             │
│ Contenu élégant...          │
│ ─────────────────────────── │
│         Jean Dupont         │
└─────────────────────────────┘
```

### Créatif 🌈

```
┌─═══════════════════════════─┐
│ ┃    JEAN DUPONT ✨        ┃ │
│ ┃ jean@email.com           ┃ │
│ └─────────────────────────┘ │
│                             │
│ 🏢 TechCorp                 │
│                             │
│ 🎯 ✨ Développeur ✨        │
│                             │
│ Bonjour ! 👋               │
│ Contenu créatif...          │
│                             │
│ À très bientôt !            │
│ JEAN DUPONT ✨              │
└─────────────────────────────┘
```

## ✅ **Avantages**

- 🎨 **4 styles professionnels** adaptés aux secteurs
- 🚀 **Performance** : Génération côté client
- 🔧 **Facilité d'intégration** : Composants prêts à l'emploi
- 📱 **Responsive** : Interface adaptable
- 🛡️ **SSR-Safe** : Pas d'erreur serveur
- 📊 **Extensible** : Facile d'ajouter de nouveaux modèles

## 📖 **Documentation Complète**

Voir `docs/PDF_TEMPLATES_GUIDE.md` pour le guide détaillé d'utilisation et de personnalisation.

---

**🤖 Créé avec Claude Code pour LetterCraft**
