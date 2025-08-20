# Guide des Modèles PDF - LetterCraft

Ce guide explique comment utiliser le nouveau système de modèles PDF pour personnaliser l'apparence des lettres de motivation.

## 🎨 Modèles Disponibles

### 1. **Classique** (`classic`)

- **Style** : Traditionnel français
- **Police** : Times New Roman
- **Usage** : Secteurs traditionnels (banque, administration, juridique)
- **Caractéristiques** : Format formel, mise en page standard

### 2. **Moderne** (`modern`)

- **Style** : Épuré et contemporain
- **Police** : Helvetica/Arial
- **Usage** : Tech, startups, métiers modernes
- **Caractéristiques** : Design minimaliste, couleurs sobres

### 3. **Élégant** (`elegant`)

- **Style** : Sophistiqué avec touches de couleur
- **Police** : Georgia
- **Usage** : Conseil, luxe, communication
- **Caractéristiques** : Dégradé en en-tête, mise en page raffinée

### 4. **Créatif** (`creative`)

- **Style** : Moderne et coloré
- **Police** : Helvetica
- **Usage** : Design, marketing, métiers créatifs
- **Caractéristiques** : Bordure colorée, emojis, ton décontracté

## 🔧 Utilisation

### Méthode Simple - Composant PdfExportControls

```tsx
import PdfExportControls from "@/components/pdf/PdfExportControls";
import { type LetterData } from "@/lib/pdf-templates";

function MyLetterComponent({ data }) {
  const letterData: LetterData = {
    content: data.generatedLetter,
    jobTitle: data.jobOffer.title,
    company: data.jobOffer.company,
    candidateName: data.profile.firstName + " " + data.profile.lastName,
    candidateEmail: data.profile.email,
    candidatePhone: data.profile.phone,
    candidateAddress: data.profile.address,
    location: data.profile.city,
  };

  return (
    <PdfExportControls
      letterData={letterData}
      fileName="ma-lettre-motivation"
    />
  );
}
```

### Méthode Avancée - API Directe

```tsx
import { generateLetterPdfWithTemplate } from "@/lib/pdf";
import { type LetterData, type PdfOptions } from "@/lib/pdf-templates";

async function generateCustomPdf() {
  const letterData: LetterData = {
    content: "Votre contenu de lettre...",
    jobTitle: "Développeur Full Stack",
    company: "TechCorp",
    candidateName: "Jean Dupont",
    // ... autres champs
  };

  const options: PdfOptions = {
    templateId: "modern", // Choisir le modèle
    format: "a4",
    quality: 0.98,
    margin: 1,
  };

  await generateLetterPdfWithTemplate(letterData, "ma-lettre", options);
}
```

## 📝 Structure des Données

### Interface LetterData

```typescript
interface LetterData {
  content: string; // Contenu principal de la lettre
  jobTitle?: string; // Intitulé du poste
  company?: string; // Nom de l'entreprise
  candidateName?: string; // Prénom et nom du candidat
  candidateAddress?: string; // Adresse complète
  candidatePhone?: string; // Numéro de téléphone
  candidateEmail?: string; // Email
  date?: string; // Date (optionnel, auto-générée)
  location?: string; // Ville (par défaut: Paris)
}
```

### Options PDF

```typescript
interface PdfOptions {
  templateId?: string; // ID du modèle ('classic', 'modern', etc.)
  format?: "a4" | "letter"; // Format de page
  margin?: number; // Marges (en pouces)
  quality?: number; // Qualité (0-1)
  scale?: number; // Échelle de rendu
}
```

## 🎛️ Composants Disponibles

### PdfExportControls

Composant complet avec sélection de modèles et boutons d'export.

- ✅ Interface utilisateur complète
- ✅ Sélection de modèles
- ✅ Export PDF et TXT
- ✅ États de chargement

### TemplateSelector

Sélecteur de modèles standalone.

- ✅ Aperçu des modèles
- ✅ Modal de sélection
- ✅ Prévisualisations visuelles

## 🔄 Migration depuis l'Ancien Système

### Avant (LetterPreview.tsx)

```tsx
// Ancien système
await generatePdfFromElement(letterRef.current, fileName);
```

### Après (Avec Modèles)

```tsx
// Nouveau système avec modèles
const letterData = {
  content: editedLetter,
  jobTitle: data?.jobOffer?.title,
  company: data?.jobOffer?.company,
  // ...
};

await generateLetterPdfWithTemplate(letterData, fileName, {
  templateId: "modern",
});
```

## 🎨 Personnalisation Avancée

### Créer un Nouveau Modèle

1. **Ajoutez le modèle dans `lib/pdf-templates.ts`** :

```typescript
const monNouveauTemplate: PdfTemplate = {
  id: "mon-template",
  name: "Mon Template",
  description: "Description de mon template",
  preview: "/templates/mon-template-preview.jpg",
  generateHtml: (data: LetterData) => `
    <!DOCTYPE html>
    <html>
    <!-- Votre HTML personnalisé -->
    </html>
  `,
};

// Ajoutez-le à l'export
export const PDF_TEMPLATES = [
  classicTemplate,
  modernTemplate,
  elegantTemplate,
  creativeTemplate,
  monNouveauTemplate, // ← Nouveau modèle
];
```

2. **Ajoutez les styles et icônes dans `TemplateSelector.tsx`**

### Modifier un Modèle Existant

Éditez la fonction `generateHtml` du modèle concerné dans `lib/pdf-templates.ts`.

## 🎯 Conseils d'Utilisation

### Par Secteur d'Activité

- **Finance/Banque/Juridique** → `classic`
- **Tech/Startups** → `modern`
- **Conseil/Luxe** → `elegant`
- **Design/Marketing/Créatif** → `creative`

### Optimisation Performance

- Les modèles sont générés côté client
- Import dynamique de html2pdf.js
- Pas de requêtes serveur nécessaires
- Compatible SSR (pas d'erreur serveur)

## 🚀 Exemples Complets

Voir le fichier `examples/pdf-integration-example.tsx` pour des exemples d'intégration complets.

---

**Créé avec ❤️ pour LetterCraft - Système de modèles PDF v1.0**
