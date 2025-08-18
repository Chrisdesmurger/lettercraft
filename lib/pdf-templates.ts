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
  language?: 'fr' | 'en' | 'es' | 'de' | 'it'
}

export interface PdfTemplate {
  id: string
  name: string
  description: string
  preview: string // URL vers un aperçu de l'image
  generateHtml: (data: LetterData) => string
}

// Traductions pour les éléments fixes des modèles PDF
const PDF_TRANSLATIONS = {
  fr: {
    to_attention: 'À l\'attention du service recrutement',
    company: 'Entreprise',
    subject_prefix: 'Candidature spontanée',
    greeting_formal: 'Madame, Monsieur,',
    greeting_casual: 'Bonjour !',
    closing_formal: 'Je vous prie d\'agréer, Madame, Monsieur, l\'expression de mes salutations distinguées.',
    closing_semi_formal: 'Dans l\'attente de votre réponse, veuillez agréer mes salutations distinguées.',
    closing_modern: 'Cordialement,',
    closing_casual: 'À très bientôt !',
    the: 'le'
  },
  en: {
    to_attention: 'To the attention of the recruitment department',
    company: 'Company',
    subject_prefix: 'Application',
    greeting_formal: 'Dear Sir or Madam,',
    greeting_casual: 'Hello!',
    closing_formal: 'I look forward to hearing from you and thank you for your consideration.',
    closing_semi_formal: 'I look forward to your response. Yours sincerely,',
    closing_modern: 'Best regards,',
    closing_casual: 'Looking forward to hearing from you!',
    the: ''
  },
  es: {
    to_attention: 'A la atención del departamento de reclutamiento',
    company: 'Empresa',
    subject_prefix: 'Candidatura espontánea',
    greeting_formal: 'Estimados señores,',
    greeting_casual: '¡Hola!',
    closing_formal: 'Les saluda atentamente,',
    closing_semi_formal: 'En espera de su respuesta, les saluda atentamente,',
    closing_modern: 'Cordialmente,',
    closing_casual: '¡Hasta pronto!',
    the: 'el'
  },
  de: {
    to_attention: 'An die Personalabteilung',
    company: 'Unternehmen',
    subject_prefix: 'Initiativbewerbung',
    greeting_formal: 'Sehr geehrte Damen und Herren,',
    greeting_casual: 'Hallo!',
    closing_formal: 'Mit freundlichen Grüßen,',
    closing_semi_formal: 'Ich freue mich auf Ihre Antwort. Mit freundlichen Grüßen,',
    closing_modern: 'Mit freundlichen Grüßen,',
    closing_casual: 'Bis bald!',
    the: 'den'
  },
  it: {
    to_attention: 'All\'attenzione del dipartimento di reclutamento',
    company: 'Azienda',
    subject_prefix: 'Candidatura spontanea',
    greeting_formal: 'Gentili Signori,',
    greeting_casual: 'Ciao!',
    closing_formal: 'In attesa di un Vostro cortese riscontro, porgo cordiali saluti.',
    closing_semi_formal: 'In attesa della Vostra risposta, cordiali saluti.',
    closing_modern: 'Cordiali saluti,',
    closing_casual: 'A presto!',
    the: 'il'
  }
}

// Fonction pour obtenir les traductions
function getTranslations(language: string = 'fr') {
  return PDF_TRANSLATIONS[language as keyof typeof PDF_TRANSLATIONS] || PDF_TRANSLATIONS.fr
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
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale = data.language === 'en' ? 'en-US' : data.language === 'de' ? 'de-DE' : data.language === 'es' ? 'es-ES' : data.language === 'it' ? 'it-IT' : 'fr-FR';
    const subjectLabel = data.language === 'fr' ? 'Objet :' : data.language === 'en' ? 'Subject:' : data.language === 'es' ? 'Asunto:' : data.language === 'de' ? 'Betreff:' : 'Oggetto:';
    
    return `
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
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 2cm; 
        }
        .sender-info { 
          font-size: 11pt; 
          line-height: 1.4; 
          text-align: left;
        }
        .date-location { 
          font-size: 11pt; 
          text-align: right;
          white-space: nowrap;
        }
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
          <strong>${data.candidateName || ''}</strong><br>
          ${data.candidateAddress ? data.candidateAddress + '<br>' : ''}
          ${data.candidatePhone || ''}${data.candidatePhone && data.candidateEmail ? ' • ' : ''}${data.candidateEmail || ''}
        </div>
        <div class="date-location">
          ${data.location || ''}, ${translations.the} ${data.date || new Date().toLocaleDateString(locale, { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>
      
      <div class="recipient-info">
        ${translations.to_attention}<br>
        ${data.company || translations.company}
      </div>
      
      <div class="subject">
        <strong>${subjectLabel}</strong> ${data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix}
      </div>
      
      <div class="greeting">
        ${translations.greeting_formal}
      </div>
      
      <div class="content">${data.content || 'Contenu de la lettre'}</div>
      
      <div class="signature">
        ${translations.closing_formal}<br>
        <br>
        <br>
        ${data.candidateName || ''}
      </div>
    </body>
    </html>
    `;
  }
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
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale = data.language === 'en' ? 'en-US' : data.language === 'de' ? 'de-DE' : data.language === 'es' ? 'es-ES' : data.language === 'it' ? 'it-IT' : 'fr-FR';
    const recruitmentDept = data.language === 'en' ? 'Recruitment Department' : data.language === 'es' ? 'Departamento de Reclutamiento' : data.language === 'de' ? 'Personalabteilung' : data.language === 'it' ? 'Dipartimento di Reclutamento' : 'Service Recrutement';
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation - ${data.jobTitle || 'Poste'}</title>
      <style>
        @page { size: A4; margin: 2.5cm; }
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #3498db; 
          padding-bottom: 15px; 
          margin-bottom: 2.5cm; 
        }
        .sender-block {
          flex: 1;
        }
        .sender-name {
          font-size: 14pt;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        .sender-contact { 
          font-size: 9pt; 
          color: #7f8c8d;
          line-height: 1.3;
        }
        .date-block {
          text-align: right;
          color: #7f8c8d; 
          font-size: 10pt;
        }
        .recipient-info { 
          background: #f8f9fa; 
          padding: 15px; 
          margin-bottom: 2cm; 
          border-left: 4px solid #3498db;
          border-radius: 0 4px 4px 0;
        }
        .subject { 
          font-weight: 600; 
          margin-bottom: 2cm; 
          color: #2c3e50;
          font-size: 12pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
        <div class="sender-block">
          <div class="sender-name">${data.candidateName || ''}</div>
          <div class="sender-contact">
            ${data.candidateAddress ? data.candidateAddress + '<br>' : ''}
            ${data.candidatePhone || ''}${data.candidatePhone && data.candidateEmail ? ' • ' : ''}${data.candidateEmail || ''}
          </div>
        </div>
        <div class="date-block">
          ${data.location || ''}<br>
          ${data.date || new Date().toLocaleDateString(locale, { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>
      
      <div class="recipient-info">
        <strong>${recruitmentDept}</strong><br>
        ${data.company || translations.company}
      </div>
      
      <div class="subject">
        ${data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix}
      </div>
      
      <div class="greeting">
        ${translations.greeting_formal}
      </div>
      
      <div class="content">${data.content || 'Contenu de la lettre'}</div>
      
      <div class="signature">
        ${translations.closing_modern}<br>
        <br>
        <strong>${data.candidateName || ''}</strong>
      </div>
    </body>
    </html>
    `;
  }
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
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale = data.language === 'en' ? 'en-US' : data.language === 'de' ? 'de-DE' : data.language === 'es' ? 'es-ES' : data.language === 'it' ? 'it-IT' : 'fr-FR';
    const recruitmentDept = data.language === 'en' ? 'Recruitment Department' : data.language === 'es' ? 'Departamento de Reclutamiento' : data.language === 'de' ? 'Personalabteilung' : data.language === 'it' ? 'Dipartimento di Reclutamento' : 'Service Recrutement';
    
    return `
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
          padding: 20px 25px;
          margin: 0 0 2.5cm 0;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sender-block {
          flex: 1;
        }
        .sender-name {
          font-size: 16pt;
          font-weight: normal;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .sender-contact { 
          font-size: 9pt; 
          opacity: 0.9;
          line-height: 1.3;
        }
        .date-block {
          text-align: right;
          font-size: 9pt;
          opacity: 0.9;
        }
        .recipient-info { 
          border-left: 3px solid #667eea; 
          padding-left: 15px; 
          margin-bottom: 2cm;
          background: #f8f9fb;
          padding: 15px 15px 15px 20px;
          border-radius: 0 5px 5px 0;
        }
        .subject { 
          background: #f1f3f9;
          border-left: 4px solid #667eea;
          padding: 12px 20px;
          margin-bottom: 2cm; 
          font-weight: 600;
          color: #2c3e50;
          font-size: 12pt;
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
        <div class="sender-block">
          <div class="sender-name">${data.candidateName || ''}</div>
          <div class="sender-contact">
            ${data.candidateAddress ? data.candidateAddress + '<br>' : ''}
            ${data.candidatePhone || ''}${data.candidatePhone && data.candidateEmail ? ' • ' : ''}${data.candidateEmail || ''}
          </div>
        </div>
        <div class="date-block">
          ${data.location || ''}<br>
          ${data.date || new Date().toLocaleDateString(locale, { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>
      
      <div class="recipient-info">
        <strong>${recruitmentDept}</strong><br>
        ${data.company || translations.company}
      </div>
      
      <div class="subject">
        ${data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix}
      </div>
      
      <div class="greeting">
        ${translations.greeting_formal}
      </div>
      
      <div class="content">${data.content || 'Contenu de la lettre'}</div>
      
      <div class="signature">
        ${translations.closing_semi_formal}<br>
        <br>
        <strong>${data.candidateName || ''}</strong>
      </div>
    </body>
    </html>
    `;
  }
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
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale = data.language === 'en' ? 'en-US' : data.language === 'de' ? 'de-DE' : data.language === 'es' ? 'es-ES' : data.language === 'it' ? 'it-IT' : 'fr-FR';
    const recruitmentDept = data.language === 'en' ? 'Recruitment Department' : data.language === 'es' ? 'Departamento de Reclutamiento' : data.language === 'de' ? 'Personalabteilung' : data.language === 'it' ? 'Dipartimento di Reclutamento' : 'Service Recrutement';
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation - ${data.jobTitle || 'Poste'}</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
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
          padding: 2px;
          border-radius: 12px;
        }
        .content-wrapper {
          background: white;
          padding: 25px;
          border-radius: 10px;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2cm;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 0 0 2cm 0;
        }
        .sender-block {
          flex: 1;
        }
        .sender-name {
          font-size: 16pt;
          font-weight: 300;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .sender-contact { 
          font-size: 9pt; 
          opacity: 0.9;
          line-height: 1.3;
        }
        .date-block {
          text-align: right;
          font-size: 9pt;
          opacity: 0.9;
        }
        .recipient-info { 
          background: #f0f4f8;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 2cm;
          border-left: 4px solid #ff6b6b;
        }
        .subject { 
          text-align: center;
          font-weight: 600; 
          margin-bottom: 2cm; 
          color: #2d3748;
          font-size: 12pt;
          background: linear-gradient(135deg, #ffeaa7, #fab1a0);
          padding: 15px;
          border-radius: 20px;
        }
        .content { 
          text-align: justify; 
          margin-bottom: 2.5cm; 
          white-space: pre-wrap;
        }
        .signature { 
          text-align: center;
          background: #f7fafc;
          padding: 15px;
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
            <div class="sender-block">
              <div class="sender-name">${data.candidateName || ''}</div>
              <div class="sender-contact">
                ${data.candidateAddress ? data.candidateAddress + '<br>' : ''}
                ${data.candidatePhone || ''}${data.candidatePhone && data.candidateEmail ? ' • ' : ''}${data.candidateEmail || ''}
              </div>
            </div>
            <div class="date-block">
              ${data.location || ''}<br>
              ${data.date || new Date().toLocaleDateString(locale, { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
          
          <div class="recipient-info">
            <strong>${recruitmentDept}</strong><br>
            ${data.company || translations.company}
          </div>
          
          <div class="subject">
            ✨ ${data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix} ✨
          </div>
          
          <div class="greeting">
            ${translations.greeting_casual}
          </div>
          
          <div class="content">${data.content || 'Contenu de la lettre'}</div>
          
          <div class="signature">
            ${translations.closing_casual}<br>
            <br>
            <strong>${data.candidateName || ''}</strong> ✨
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
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