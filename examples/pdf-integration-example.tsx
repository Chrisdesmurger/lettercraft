/**
 * Exemple d'intégration du système de modèles PDF
 * 
 * Voici comment intégrer les nouveaux modèles PDF dans vos composants existants
 */

import React from 'react'
import PdfExportControls from '@/components/pdf/PdfExportControls'
import { type LetterData } from '@/lib/pdf-templates'

// Exemple d'utilisation dans LetterPreview.tsx
export function LetterPreviewWithTemplates({ data }: { data: any }) {
  // Convertir vos données actuelles vers le format LetterData
  const letterData: LetterData = {
    content: data.generatedLetter || '',
    jobTitle: data.jobOffer?.title,
    company: data.jobOffer?.company,
    candidateName: data.candidateProfile?.first_name + ' ' + data.candidateProfile?.last_name,
    candidateEmail: data.candidateProfile?.email,
    candidatePhone: data.candidateProfile?.phone,
    candidateAddress: data.candidateProfile?.address,
    location: data.candidateProfile?.city || 'Paris',
    date: new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const fileName = `lettre-motivation-${data.jobOffer?.company || 'entreprise'}`

  return (
    <div className="space-y-6">
      {/* Votre contenu actuel de prévisualisation */}
      <div className="letter-preview">
        {data.generatedLetter}
      </div>

      {/* Nouveau système d'export avec modèles */}
      <PdfExportControls 
        letterData={letterData}
        fileName={fileName}
      />
    </div>
  )
}

// Exemple pour LetterCard.tsx
export function LetterCardWithTemplates({ letter }: { letter: any }) {
  const letterData: LetterData = {
    content: letter.content || '',
    jobTitle: letter.job_offers?.title,
    company: letter.job_offers?.company,
    candidateName: letter.candidates_profile?.first_name + ' ' + letter.candidates_profile?.last_name,
    // Ajoutez d'autres champs depuis votre base de données
  }

  const fileName = `lettre-motivation-${letter.job_offers?.company || 'entreprise'}-${letter.job_offers?.title || 'poste'}`

  return (
    <PdfExportControls 
      letterData={letterData}
      fileName={fileName}
      className="mt-4"
    />
  )
}

// Exemple d'utilisation directe des modèles
import { generateLetterPdfWithTemplate } from '@/lib/pdf'

export async function generateCustomPdf() {
  const letterData: LetterData = {
    content: "Contenu de votre lettre...",
    jobTitle: "Développeur Full Stack",
    company: "TechCorp",
    candidateName: "Jean Dupont",
    candidateEmail: "jean.dupont@email.com",
    candidatePhone: "06 12 34 56 78",
    candidateAddress: "123 Rue de la Tech\n75001 Paris",
    location: "Paris"
  }

  try {
    await generateLetterPdfWithTemplate(
      letterData,
      'ma-lettre-personnalisee',
      { 
        templateId: 'modern', // 'classic', 'modern', 'elegant', 'creative'
        format: 'a4',
        quality: 0.98 
      }
    )
    console.log('PDF généré avec succès!')
  } catch (error) {
    console.error('Erreur:', error)
  }
}