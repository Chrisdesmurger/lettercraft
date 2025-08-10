/**
 * PDF Templates for Letter Generation
 * 
 * This module provides different PDF templates with various styles and layouts
 * PDF content is in French with dynamic content from AI generation
 */

export interface LetterData {
  content: string
  jobTitle?: string
  company?: string
  candidateName?: string
  candidateAddress?: string
  candidatePhone?: string
  candidateEmail?: string
  date?: string
  location?: string
}

export interface PdfTemplate {
  id: string
  name: string
  description: string
  preview: string // URL vers un aperçu de l'image
  generateHtml: (data: LetterData) => string
}

/**
 * Template 1: Classique Français
 * Style traditionnel avec police Times New Roman
 */
const classicTemplate: PdfTemplate = {
  id: 'classic',
  name: 'Classique',
  description: 'Style traditionnel français avec Times New Roman',
  preview: '/templates/classic-preview.jpg',
  generateHtml: (data: LetterData) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation - ${data.jobTitle || 'Poste'}</title>
      <style>
        @page { size: A4; margin: 2.5cm 2cm; }
        body { 
          font-family: 'Times New Roman', Times, serif; 
          font-size: 12pt; 
          line-height: 1.6; 
          color: #000; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .header { text-align: right; margin-bottom: 2.5cm; }
        .sender-info { font-size: 11pt; line-height: 1.5; }
        .date-location { text-align: right; margin-bottom: 2cm; font-size: 11pt; }
        .recipient-info { margin-bottom: 2cm; font-size: 11pt; }
        .subject { 
          font-weight: bold; 
          margin-bottom: 1.5cm; 
          text-decoration: underline; 
          font-size: 12pt; 
        }
        .content { 
          text-align: justify; 
          margin-bottom: 2cm; 
          white-space: pre-wrap;
          text-indent: 1.5em;
        }
        .signature { text-align: right; margin-top: 2cm; }
        .greeting { margin-bottom: 1cm; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="sender-info">
          ${data.candidateName || ''}<br>
          ${data.candidateAddress ? data.candidateAddress + '<br>' : ''}
          ${data.candidatePhone ? data.candidatePhone + '<br>' : ''}
          ${data.candidateEmail || ''}
        </div>
      </div>
      
      <div class="date-location">
        ${data.location || ''}, le ${data.date || new Date().toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}
      </div>
      
      <div class="recipient-info">
        À l'attention du service recrutement<br>
        ${data.company || 'Entreprise'}
      </div>
      
      <div class="subject">
        <strong>Objet :</strong> Candidature pour le poste de ${data.jobTitle || 'Poste'}
      </div>
      
      <div class="greeting">
        Madame, Monsieur,
      </div>
      
      <div class="content">${data.content || 'Contenu de la lettre'}</div>
      
      <div class="signature">
        Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.<br>
        <br>
        <br>
        ${data.candidateName || ''}
      </div>
    </body>
    </html>
  `
}

/**
 * Template 2: Moderne Minimaliste
 * Design épuré avec police sans-serif
 */
const modernTemplate: PdfTemplate = {
  id: 'modern',
  name: 'Moderne',
  description: 'Design épuré et contemporain',
  preview: '/templates/modern-preview.jpg',
  generateHtml: (data: LetterData) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation - ${data.jobTitle || 'Poste'}</title>
      <style>
        @page { size: A4; margin: 3cm 2.5cm; }
        body { 
          font-family: 'Helvetica', Arial, sans-serif; 
          font-size: 11pt; 
          line-height: 1.7; 
          color: #2c3e50; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .header { 
          border-bottom: 2px solid #3498db; 
          padding-bottom: 20px; 
          margin-bottom: 3cm; 
        }
        .sender-info { 
          font-size: 10pt; 
          color: #7f8c8d; 
        }
        .sender-name {
          font-size: 14pt;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        .date-location { 
          text-align: right; 
          margin-bottom: 2cm; 
          color: #7f8c8d; 
          font-size: 10pt; 
        }
        .recipient-info { 
          background: #ecf0f1; 
          padding: 15px; 
          margin-bottom: 2cm; 
          border-left: 4px solid #3498db; 
        }
        .subject { 
          font-weight: 600; 
          margin-bottom: 2cm; 
          color: #2c3e50;
          font-size: 12pt;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content { 
          text-align: justify; 
          margin-bottom: 2.5cm; 
          white-space: pre-wrap;
        }
        .signature { text-align: right; color: #34495e; }
        .greeting { 
          margin-bottom: 1.5cm; 
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="sender-name">${data.candidateName || ''}</div>
        <div class="sender-info">
          ${data.candidateAddress ? data.candidateAddress + ' • ' : ''}
          ${data.candidatePhone ? data.candidatePhone + ' • ' : ''}
          ${data.candidateEmail || ''}
        </div>
      </div>
      
      <div class="date-location">
        ${data.location || ''}, ${data.date || new Date().toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}
      </div>
      
      <div class="recipient-info">
        <strong>Service Recrutement</strong><br>
        ${data.company || 'Entreprise'}
      </div>
      
      <div class="subject">
        Candidature - ${data.jobTitle || 'Poste'}
      </div>
      
      <div class="greeting">
        Madame, Monsieur,
      </div>
      
      <div class="content">${data.content || 'Contenu de la lettre'}</div>
      
      <div class="signature">
        Cordialement,<br>
        <br>
        <strong>${data.candidateName || ''}</strong>
      </div>
    </body>
    </html>
  `
}

/**
 * Template 3: Élégant avec Accent
 * Design sophistiqué avec couleur d'accent
 */
const elegantTemplate: PdfTemplate = {
  id: 'elegant',
  name: 'Élégant',
  description: 'Design sophistiqué avec touches de couleur',
  preview: '/templates/elegant-preview.jpg',
  generateHtml: (data: LetterData) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation - ${data.jobTitle || 'Poste'}</title>
      <style>
        @page { size: A4; margin: 2.5cm; }
        body { 
          font-family: 'Georgia', 'Times New Roman', serif; 
          font-size: 11pt; 
          line-height: 1.6; 
          color: #2c3e50; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          margin: -20px -20px 3cm -20px;
        }
        .sender-name {
          font-size: 18pt;
          font-weight: normal;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        .sender-info { 
          font-size: 10pt; 
          opacity: 0.9;
        }
        .date-location { 
          text-align: right; 
          margin-bottom: 2cm; 
          font-style: italic;
          color: #7f8c8d; 
        }
        .recipient-info { 
          border-left: 3px solid #667eea; 
          padding-left: 15px; 
          margin-bottom: 2cm; 
        }
        .subject { 
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 15px 20px;
          margin-bottom: 2cm; 
          font-weight: 600;
          color: #2c3e50;
        }
        .content { 
          text-align: justify; 
          margin-bottom: 2.5cm; 
          white-space: pre-wrap;
        }
        .signature { 
          text-align: right; 
          color: #495057;
          border-top: 1px solid #e9ecef;
          padding-top: 20px;
        }
        .greeting { 
          margin-bottom: 1.5cm; 
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="sender-name">${data.candidateName || ''}</div>
        <div class="sender-info">
          ${data.candidateAddress ? data.candidateAddress + '<br>' : ''}
          ${data.candidatePhone ? data.candidatePhone + ' • ' : ''}${data.candidateEmail || ''}
        </div>
      </div>
      
      <div class="date-location">
        ${data.location || ''}, ${data.date || new Date().toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}
      </div>
      
      <div class="recipient-info">
        <strong>Service Recrutement</strong><br>
        ${data.company || 'Entreprise'}
      </div>
      
      <div class="subject">
        <strong>Objet :</strong> Candidature spontanée - ${data.jobTitle || 'Poste'}
      </div>
      
      <div class="greeting">
        Madame, Monsieur,
      </div>
      
      <div class="content">${data.content || 'Contenu de la lettre'}</div>
      
      <div class="signature">
        Dans l'attente de votre réponse, veuillez agréer mes salutations distinguées.<br>
        <br>
        <strong>${data.candidateName || ''}</strong>
      </div>
    </body>
    </html>
  `
}

/**
 * Template 4: Créatif Coloré
 * Pour les métiers créatifs avec design moderne
 */
const creativeTemplate: PdfTemplate = {
  id: 'creative',
  name: 'Créatif',
  description: 'Design moderne et coloré pour les métiers créatifs',
  preview: '/templates/creative-preview.jpg',
  generateHtml: (data: LetterData) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation - ${data.jobTitle || 'Poste'}</title>
      <style>
        @page { size: A4; margin: 2cm; }
        body { 
          font-family: 'Helvetica', Arial, sans-serif; 
          font-size: 11pt; 
          line-height: 1.6; 
          color: #2d3748; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .container {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          padding: 3px;
          margin: -10px;
        }
        .content-wrapper {
          background: white;
          padding: 30px;
          margin: 10px;
        }
        .header { 
          text-align: center;
          margin-bottom: 3cm; 
          position: relative;
        }
        .sender-name {
          font-size: 20pt;
          font-weight: 300;
          color: #2d3748;
          margin-bottom: 15px;
          letter-spacing: 2px;
        }
        .sender-info { 
          font-size: 10pt; 
          color: #718096;
          background: #f7fafc;
          padding: 15px;
          border-radius: 8px;
        }
        .date-location { 
          text-align: right; 
          margin-bottom: 2cm; 
          color: #4a5568;
          font-size: 10pt;
        }
        .recipient-info { 
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 2cm; 
        }
        .subject { 
          text-align: center;
          font-weight: 600; 
          margin-bottom: 2cm; 
          color: #2d3748;
          font-size: 13pt;
          background: #edf2f7;
          padding: 20px;
          border-radius: 25px;
        }
        .content { 
          text-align: justify; 
          margin-bottom: 2.5cm; 
          white-space: pre-wrap;
          padding: 0 15px;
        }
        .signature { 
          text-align: center;
          background: #f7fafc;
          padding: 20px;
          border-radius: 8px;
          color: #4a5568;
        }
        .greeting { 
          margin-bottom: 1.5cm; 
          font-weight: 500;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content-wrapper">
          <div class="header">
            <div class="sender-name">${data.candidateName || ''}</div>
            <div class="sender-info">
              ${data.candidateAddress ? data.candidateAddress + ' • ' : ''}
              ${data.candidatePhone ? data.candidatePhone + ' • ' : ''}
              ${data.candidateEmail || ''}
            </div>
          </div>
          
          <div class="date-location">
            ${data.location || ''} • ${data.date || new Date().toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
          
          <div class="recipient-info">
            <strong>Service Recrutement</strong><br>
            ${data.company || 'Entreprise'}
          </div>
          
          <div class="subject">
            ✨ ${data.jobTitle || 'Poste'} ✨
          </div>
          
          <div class="greeting">
            Bonjour ! 👋
          </div>
          
          <div class="content">${data.content || 'Contenu de la lettre'}</div>
          
          <div class="signature">
            À très bientôt !<br>
            <br>
            <strong>${data.candidateName || ''}</strong> ✨
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Tous les modèles disponibles
 */
export const PDF_TEMPLATES: PdfTemplate[] = [
  classicTemplate,
  modernTemplate,
  elegantTemplate,
  creativeTemplate
]

/**
 * Récupérer un modèle par son ID
 */
export function getTemplateById(id: string): PdfTemplate | undefined {
  return PDF_TEMPLATES.find(template => template.id === id)
}

/**
 * Récupérer le modèle par défaut
 */
export function getDefaultTemplate(): PdfTemplate {
  return classicTemplate
}