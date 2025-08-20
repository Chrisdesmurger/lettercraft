/**
 * PDF Templates for Letter Generation
 *
 * This module provides different PDF templates with various styles and layouts
 * PDF content is in French with dynamic content from AI generation
 */

export interface LetterData {
  // Legacy content for backward compatibility
  content?: string;
  // New section-based structure
  subject?: string;
  greeting?: string;
  body?: string;
  // Metadata
  jobTitle?: string;
  company?: string;
  candidateName?: string;
  candidateAddress?: string;
  candidatePhone?: string;
  candidateEmail?: string;
  date?: string;
  location?: string;
  language?: "fr" | "en" | "es" | "de" | "it";
}

export interface PdfTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // URL vers un aperçu de l'image
  generateHtml: (data: LetterData) => string;
}

// Traductions pour les éléments fixes des modèles PDF
const PDF_TRANSLATIONS = {
  fr: {
    company: "Entreprise",
    subject_prefix: "Candidature spontanée",
    greeting_formal: "Madame, Monsieur,",
    greeting_casual: "Bonjour !",
    the: "le",
  },
  en: {
    company: "Company",
    subject_prefix: "Application",
    greeting_formal: "Dear Sir or Madam,",
    greeting_casual: "Hello!",
    the: "",
  },
  es: {
    company: "Empresa",
    subject_prefix: "Candidatura espontánea",
    greeting_formal: "Estimados señores,",
    greeting_casual: "¡Hola!",
    the: "el",
  },
  de: {
    company: "Unternehmen",
    subject_prefix: "Initiativbewerbung",
    greeting_formal: "Sehr geehrte Damen und Herren,",
    greeting_casual: "Hallo!",
    the: "den",
  },
  it: {
    company: "Azienda",
    subject_prefix: "Candidatura spontanea",
    greeting_formal: "Gentili Signori,",
    greeting_casual: "Ciao!",
    the: "il",
  },
};

// Fonction pour obtenir les traductions
function getTranslations(language: string = "fr") {
  return (
    PDF_TRANSLATIONS[language as keyof typeof PDF_TRANSLATIONS] ||
    PDF_TRANSLATIONS.fr
  );
}

// Fonction pour extraire les sections depuis LetterData
function extractSections(data: LetterData) {
  // If we have structured sections, use them
  if (data.subject || data.greeting || data.body) {
    return {
      subject: data.subject || "",
      greeting: data.greeting || "",
      body: data.body || "",
    };
  }

  // Fallback to legacy content for backward compatibility
  if (data.content) {
    const sections = parseLetterContent(data.content);
    return sections;
  }

  // Default empty sections
  return {
    subject: "",
    greeting: "",
    body: "",
  };
}

// Parse legacy content to extract sections for backward compatibility
function parseLetterContent(content: string) {
  let subject = "";
  let greeting = "";
  let body = content;

  // Extract subject if present
  const subjectMatch = content.match(
    /^(Objet\s*:?|Subject\s*:?|Asunto\s*:?|Betreff\s*:?|Oggetto\s*:?)\s*(.+?)(\n|$)/im,
  );
  if (subjectMatch) {
    subject = subjectMatch[2].trim();
    body = body.replace(subjectMatch[0], "").trim();
  }

  // Extract greeting from the beginning
  const lines = body.split("\n");
  const firstFewLines = lines.slice(0, 3);
  for (let i = 0; i < firstFewLines.length; i++) {
    const line = firstFewLines[i].trim();
    if (
      line &&
      (line.toLowerCase().includes("madame") ||
        line.toLowerCase().includes("monsieur") ||
        line.toLowerCase().includes("dear") ||
        line.toLowerCase().includes("bonjour") ||
        line.toLowerCase().includes("hello"))
    ) {
      greeting = line;
      // Remove greeting from body
      const remainingLines = lines.slice(i + 1);
      body = remainingLines.join("\n").trim();
      break;
    }
  }

  return { subject, greeting, body };
}

/**
 * Template 1: Classique Français
 * Style traditionnel avec police Times New Roman
 */
const classicTemplate: PdfTemplate = {
  id: "classic",
  name: "Classique",
  description: "Style traditionnel français avec Times New Roman",
  preview: "/templates/classic-preview.jpg",
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale =
      data.language === "en"
        ? "en-US"
        : data.language === "de"
          ? "de-DE"
          : data.language === "es"
            ? "es-ES"
            : data.language === "it"
              ? "it-IT"
              : "fr-FR";
    const subjectLabel =
      data.language === "fr"
        ? "Objet :"
        : data.language === "en"
          ? "Subject:"
          : data.language === "es"
            ? "Asunto:"
            : data.language === "de"
              ? "Betreff:"
              : "Oggetto:";

    // Extract sections from data
    const sections = extractSections(data);

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation</title>
      <style>
        @page { size: A4; margin: 0mm; }
        html, body {
          height: 100%;
          background: #fff;
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          line-height: 1.3;
          color: #000;
        }
        .page {
          box-sizing: border-box;
          width: 210mm;
          margin: 0mm;
          padding: 20mm;
          overflow-wrap: anywhere; /* casse mots/URLs longues */
          word-break: break-word;
          hyphens: auto;
          flex-wrap: wrap;     /* permet de passer à la ligne si besoin */
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 0.6cm; 
        }
        .sender-info { 
          font-size: 10pt; 
          line-height: 1.2; 
          text-align: left;
        }
        .date-location { 
          font-size: 10pt; 
          text-align: right;
          white-space: nowrap;
        }
        .subject { 
          font-weight: bold; 
          margin-bottom: 0.8cm; 
          text-decoration: underline; 
          font-size: 9pt; 
        }
        .content { 
          font-size: 10pt; 
          text-align: justify; 
          margin-bottom: 0cm; 
          white-space: pre-wrap;
          overflow-wrap: anywhere; /* casse mots/URLs longues */
          word-break: break-word;
          hyphens: auto;
          flex-wrap: wrap; 
        }
        .signature { text-align: right; margin-top: 1cm; }
        .greeting { margin-bottom: 0.5cm; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="sender-info">
            ${data.candidateAddress ? data.candidateAddress + "<br>" : ""}
            ${data.candidatePhone || ""}${data.candidatePhone && data.candidateEmail ? " • " : ""}${data.candidateEmail || ""}
          </div>
        <div class="date-location">
          ${data.location || ""}, ${translations.the} ${
            data.date ||
            new Date().toLocaleDateString(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          }
        </div>
      </div>
      
      <div class="subject">
        <strong>${subjectLabel}</strong> ${sections.subject || (data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix)}
      </div>
      
      <div class="greeting">
        ${sections.greeting || translations.greeting_formal}
      </div>
      
      <div class="content">${sections.body || data.content || "Contenu de la lettre"}</div>
      
      <div class="signature">
        ${data.candidateName || ""}
      </div>
      </div>
    </body>
    </html>
    `;
  },
};

/**
 * Template 2: Moderne Minimaliste
 * Design épuré avec police sans-serif
 */
const modernTemplate: PdfTemplate = {
  id: "modern",
  name: "Moderne",
  description: "Design épuré et contemporain",
  preview: "/templates/modern-preview.jpg",
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale =
      data.language === "en"
        ? "en-US"
        : data.language === "de"
          ? "de-DE"
          : data.language === "es"
            ? "es-ES"
            : data.language === "it"
              ? "it-IT"
              : "fr-FR";

    // Extract sections from data
    const sections = extractSections(data);

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation</title>
      <style>
        @page { size: A4; margin: 0; }
        body { 
          font-family: 'Helvetica', Arial, sans-serif; 
          font-size: 10pt; 
          line-height: 1.3; 
          color: #2c3e50; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .page {
          padding: 15mm 25mm;
          box-sizing: border-box;
          width: 210mm;
          margin: 0 auto;
        }
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #3498db; 
          padding-bottom: 5px; 
        }
        .sender-block {
          flex: 1;
        }
        .sender-name {
          font-size: 10pt;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 3px;
        }
        .sender-contact { 
          font-size: 6pt; 
          color: #7f8c8d;
          line-height: 1.1;
        }
        .date-block {
          text-align: right;
          color: #7f8c8d; 
          font-size: 6pt;
        }
        .subject { 
          font-weight: 600; 
          margin-bottom: 0.8cm; 
          color: #2c3e50;
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .content { 
          font-size: 10pt;
          text-align: justify; 
          margin-bottom: 1.2cm; 
          white-space: pre-wrap;
        }
        .signature { text-align: right; color: #34495e; }
        .greeting { 
          margin-bottom: 0.6cm; 
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="sender-block">
            <div class="sender-contact">
              ${data.candidateAddress ? data.candidateAddress + "<br>" : ""}
              ${data.candidatePhone || ""}${data.candidatePhone && data.candidateEmail ? " • " : ""}${data.candidateEmail || ""}
            </div>
          </div>
          <div class="date-block">
            ${data.location || ""}<br>
            ${
              data.date ||
              new Date().toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            }
          </div>
      </div>
      
      
      <div class="subject">
        ${sections.subject || (data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix)}
      </div>
      
      <div class="greeting">
        ${sections.greeting || translations.greeting_formal}
      </div>
      
      <div class="content">${sections.body || data.content || "Contenu de la lettre"}</div>
      
      <div class="signature">
        <strong>${data.candidateName || ""}</strong>
      </div>
      </div>
    </body>
    </html>
    `;
  },
};

/**
 * Template 3: Élégant avec Accent
 * Design sophistiqué avec couleur d'accent
 */
const elegantTemplate: PdfTemplate = {
  id: "elegant",
  name: "Élégant",
  description: "Design sophistiqué avec touches de couleur",
  preview: "/templates/elegant-preview.jpg",
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale =
      data.language === "en"
        ? "en-US"
        : data.language === "de"
          ? "de-DE"
          : data.language === "es"
            ? "es-ES"
            : data.language === "it"
              ? "it-IT"
              : "fr-FR";

    // Extract sections from data
    const sections = extractSections(data);

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation</title>
      <style>
        @page { size: A4; margin: 0; }
        body { 
          font-family: 'Georgia', 'Times New Roman', serif; 
          font-size: 10pt; 
          line-height: 1.3; 
          color: #2c3e50; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .page {
          padding: 12mm;
          box-sizing: border-box;
          width: 210mm;
          margin: 0 auto;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 25px;
          margin: -15px -15px 0cm -15px;
          border-radius: 0 0 10px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sender-block {
          flex: 1;
        }
        .sender-name {
          font-size: 10pt;
          font-weight: normal;
          margin-bottom: 5px;
          letter-spacing: 0.5px;
        }
        .sender-contact { 
          font-size: 6pt; 
          opacity: 0.9;
          line-height: 1.1;
        }
        .date-block {
          text-align: right;
          font-size: 6pt;
          opacity: 0.9;
        }
        .subject { 
          background: #f1f3f9;
          border-left: 4px solid #667eea;
          padding: 8px 15px;
          border-radius: 0 0 10px 10px;
          margin-bottom: 0.8cm; 
          font-weight: 600;
          color: #2c3e50;
          font-size: 10pt;
        }
        .content { 
          font-size: 10pt;
          text-align: justify; 
          margin-bottom: 1.2cm; 
          margin-left: -5mm;
          margin-right: 5mm;
          white-space: pre-wrap;
        }
        .signature { 
          text-align: right; 
          color: #495057;
          border-top: 1px solid #e9ecef;
          padding-top: 20px;
        }
        .greeting { 
          margin-bottom: 0.6cm; 
          font-style: italic;
        }
      </style>
    </head>
    <body>
    <div class="page">
      <div class="header">
        <div class="sender-block">
          <div class="sender-contact">
            ${data.candidateAddress ? data.candidateAddress + "<br>" : ""}
            ${data.candidatePhone || ""}${data.candidatePhone && data.candidateEmail ? " • " : ""}${data.candidateEmail || ""}
          </div>
        </div>
        <div class="date-block">
          ${data.location || ""}<br>
          ${
            data.date ||
            new Date().toLocaleDateString(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          }
        </div>
      </div>
      
      
      <div class="subject">
        ${sections.subject || (data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix)}
      </div>
      
      <div class="greeting">
        ${sections.greeting || translations.greeting_formal}
      </div>
      
      <div class="content">${sections.body || data.content || "Contenu de la lettre"}</div>
      
      <div class="signature">
        <strong>${data.candidateName || ""}</strong>
      </div>
      </div>
    </body>
    </html>
    `;
  },
};

/**
 * Template 4: Créatif Coloré
 * Pour les métiers créatifs avec design moderne
 */
const creativeTemplate: PdfTemplate = {
  id: "creative",
  name: "Créatif",
  description: "Design moderne et coloré pour les métiers créatifs",
  preview: "/templates/creative-preview.jpg",
  generateHtml: (data: LetterData) => {
    const translations = getTranslations(data.language);
    const locale =
      data.language === "en"
        ? "en-US"
        : data.language === "de"
          ? "de-DE"
          : data.language === "es"
            ? "es-ES"
            : data.language === "it"
              ? "it-IT"
              : "fr-FR";

    // Extract sections from data
    const sections = extractSections(data);

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lettre de Motivation</title>
      <style>
        @page { size: A4; margin: 0; }
        body { 
          font-family: 'Helvetica', Arial, sans-serif; 
          font-size: 10pt; 
          line-height: 1.3; 
          color: #2d3748; 
          margin: 0; 
          padding: 0;
          background: white;
        }
        .page {
          padding: 15mm 12mm;
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
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
          margin-bottom: 0.6cm;
          background: linear-gradient(135deg, #66c5eaff, #4ba296ff);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: -10px -10px 1cm -10px;
        }
        .sender-block {
          flex: 1;
        }
        .sender-name {
          font-size: 10pt;
          font-weight: 300;
          margin-bottom: 5px;
          letter-spacing: 0.5px;
        }
        .sender-contact { 
          font-size: 6pt; 
          opacity: 0.9;
          line-height: 1.1;
        }
        .date-block {
          text-align: right;
          font-size: 6pt;
          opacity: 0.9;
        }
        .subject { 
          text-align: center;
          font-weight: 600; 
          margin-bottom: 0.8cm; 
          color: #2d3748;
          font-size: 10pt;
          background: linear-gradient(135deg, #ffeaa7, #fab1a0);
          padding: 10px;
          border-radius: 15px;
        }
        .content { 
          font-size: 10pt;
          text-align: justify; 
          margin-bottom: 1.2cm; 
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
          margin-bottom: 0.6cm; 
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
              <div class="sender-contact">
                ${data.candidateAddress ? data.candidateAddress + "<br>" : ""}
                ${data.candidatePhone || ""}${data.candidatePhone && data.candidateEmail ? " • " : ""}${data.candidateEmail || ""}
              </div>
            </div>
            <div class="date-block">
              ${data.location || ""}<br>
              ${
                data.date ||
                new Date().toLocaleDateString(locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
            </div>
          </div>
          
          
          <div class="subject">
            ${sections.subject || (data.jobTitle ? `Candidature pour le poste de ${data.jobTitle}` : translations.subject_prefix)}
          </div>
          
          <div class="greeting">
            ${sections.greeting || translations.greeting_casual}
          </div>
          
          <div class="content">${sections.body || data.content || "Contenu de la lettre"}</div>
          
          <div class="signature">
            <strong>${data.candidateName || ""}</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  },
};

/**
 * Tous les modèles disponibles
 */
export const PDF_TEMPLATES: PdfTemplate[] = [
  classicTemplate,
  modernTemplate,
  elegantTemplate,
  creativeTemplate,
];

/**
 * Récupérer un modèle par son ID
 */
export function getTemplateById(id: string): PdfTemplate | undefined {
  return PDF_TEMPLATES.find((template) => template.id === id);
}

/**
 * Récupérer le modèle par défaut
 */
export function getDefaultTemplate(): PdfTemplate {
  return classicTemplate;
}
