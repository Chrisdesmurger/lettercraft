/**
 * Utilities for handling letter sections (subject, greeting, body)
 * Provides functions to format, parse and clean letter sections
 */

export interface LetterSections {
  subject: string
  greeting: string
  body: string
}

export interface ParsedLetterResponse {
  sections: LetterSections
  fullContent: string
}

/**
 * Parse OpenAI response that contains structured letter sections
 * Expects format with SUBJECT:, GREETING:, BODY: tags
 */
export function parseLetterResponse(aiResponse: string): ParsedLetterResponse {
  const sections: LetterSections = {
    subject: '',
    greeting: '',
    body: ''
  }

  // Clean up the response
  const cleaned = aiResponse.trim()

  // Extract subject
  const subjectMatch = cleaned.match(/SUBJECT:\s*(.+?)(?=\n|GREETING:|BODY:|$)/s)
  if (subjectMatch) {
    sections.subject = subjectMatch[1].trim()
  }

  // Extract greeting
  const greetingMatch = cleaned.match(/GREETING:\s*(.+?)(?=\n|SUBJECT:|BODY:|$)/s)
  if (greetingMatch) {
    sections.greeting = greetingMatch[1].trim()
  }

  // Extract body - capture jusqu'à la fin
  const bodyMatch = cleaned.match(/BODY:\s*(.+?)$/s)
  if (bodyMatch) {
    sections.body = bodyMatch[1].trim()
  }

  // If no structured format found, try to parse a standard letter
  if (!sections.subject && !sections.greeting && !sections.body) {
    return parseStandardLetter(cleaned)
  }

  // Generate full content for backward compatibility
  const fullContent = formatLetterSections(sections)

  return {
    sections,
    fullContent
  }
}

/**
 * Parse a standard letter format and extract sections
 * Fallback when AI doesn't use structured tags
 */
function parseStandardLetter(content: string): ParsedLetterResponse {
  // Clean the content first
  let cleanedContent = content
  
  // Remove header information (addresses, phone, email, date)
  cleanedContent = cleanedContent
    // Remove lines with addresses (starting with name, containing addresses)
    .replace(/^[A-Z][a-z]+ [A-Z][a-z]+$/gm, '') // Names like "Christophe Desmurger"
    .replace(/^Address:.*$/gm, '')
    .replace(/^Email:.*$/gm, '')
    .replace(/^Phone:.*$/gm, '')
    .replace(/^\[.*\]$/gm, '') // Remove [Date], [Candidate's Address], etc.
    // Remove location lines
    .replace(/^[A-Z][a-z]+, [A-Z][a-z ]+$/gm, '') // "Queenstown, New Zealand"
    // Remove company address blocks
    .replace(/^Hiring Manager$/gm, '')
    .replace(/^[A-Z][a-z ]+ and [A-Z][a-z ]+$/gm, '') // "Millennium Hotels and Resorts"
    .replace(/^\[Company Address\]$/gm, '')
    // Remove signature blocks at the end
    .replace(/Warm regards,?\s*$/gm, '')
    .replace(/Sincerely,?\s*$/gm, '')
    .replace(/Best regards,?\s*$/gm, '')
    .replace(/Cordialement,?\s*$/gm, '')
    // Clean up multiple newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()

  const lines = cleanedContent.split('\n').map(line => line.trim()).filter(line => line)
  
  let subject = ''
  let greeting = ''
  let bodyLines: string[] = []
  let inBody = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip empty lines
    if (!line) continue
    
    // Look for subject patterns
    if (line.toLowerCase().startsWith('subject:') || line.toLowerCase().startsWith('objet:')) {
      subject = line.replace(/^(subject:|objet:)\s*/i, '').trim()
      continue
    }
    
    // Look for greeting patterns (should be early in the letter)
    if (!inBody && i < 5 && (
        line.toLowerCase().includes('dear') ||
        line.toLowerCase().includes('madame') || 
        line.toLowerCase().includes('monsieur') ||
        line.toLowerCase().includes('bonjour') ||
        line.toLowerCase().includes('hiring manager')
      )) {
      greeting = line
      inBody = true // Start body after greeting
      continue
    }
    
    // If we found a greeting, everything else goes to body
    if (inBody || (!greeting && i > 2)) {
      // Skip closing formulas
      if (!line.toLowerCase().includes('salutations') && 
          !line.toLowerCase().includes('cordialement') &&
          !line.toLowerCase().includes('sincerely') &&
          !line.toLowerCase().includes('warm regards') &&
          !line.toLowerCase().includes('best regards') &&
          line.length > 10) {
        bodyLines.push(line)
        inBody = true
      }
    }
  }
  
  // Extract subject from first paragraph if not found
  if (!subject && bodyLines.length > 0) {
    const firstParagraph = bodyLines[0]
    if (firstParagraph.toLowerCase().includes('application for') ||
        firstParagraph.toLowerCase().includes('candidature pour') ||
        firstParagraph.toLowerCase().includes('interest in')) {
      subject = 'Candidature spontanée'
    } else {
      subject = 'Candidature'
    }
  }
  
  // Default greeting if not found
  if (!greeting) {
    greeting = 'Madame, Monsieur,'
  }
  
  // Join body lines
  const body = bodyLines.join('\n\n')
  
  const sections: LetterSections = { 
    subject: subject || 'Candidature', 
    greeting, 
    body: body || cleanedContent 
  }
  
  return {
    sections,
    fullContent: formatLetterSections(sections)
  }
}

/**
 * Format letter sections into a complete letter
 * Used for display and backward compatibility
 */
export function formatLetterSections(sections: LetterSections): string {
  const { subject, greeting, body } = sections
  
  let formatted = ''
  
  if (subject) {
    formatted += `Objet : ${subject}\n\n`
  }
  
  if (greeting) {
    formatted += `${greeting}\n\n`
  }
  
  if (body) {
    formatted += body
  }
  
  return formatted.trim()
}

/**
 * Clean and validate letter sections
 * Removes personal addresses and sensitive information
 */
export function cleanLetterSections(sections: LetterSections): LetterSections {
  return {
    subject: cleanSection(sections.subject),
    greeting: cleanSection(sections.greeting),
    body: cleanSection(sections.body)
  }
}

/**
 * Clean individual section content while preserving paragraph spacing
 */
function cleanSection(content: string): string {
  if (!content) return ''
  
  // Remove common personal information patterns
  let cleaned = content
    // Remove full names at beginning of lines
    .replace(/^[A-Z][a-z]+ [A-Z][a-z]+\s*$/gm, '')
    // Remove address lines
    .replace(/^Address:.*$/gm, '')
    .replace(/^Email:.*$/gm, '')
    .replace(/^Phone:.*$/gm, '')
    .replace(/^\[.*\].*$/gm, '') // Remove [Date], [Candidate's Address], etc.
    // Remove location/city lines
    .replace(/^[A-Z][a-z]+,\s*[A-Z][a-z ]+\s*$/gm, '') // "Queenstown, New Zealand"
    // Remove addresses (lines starting with numbers or containing postal codes)
    .replace(/^\d+[,\s].+$/gm, '')
    .replace(/\b\d{5}\b.+$/gm, '')
    // Remove phone numbers (various formats)
    .replace(/\b(\+33|0)[1-9](\s?\d{2}){4}\b/g, '')
    .replace(/\b\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}\b/g, '')
    .replace(/\[\w+\'s Phone Number\]/g, '')
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '')
    .replace(/\[\w+\'s Email\]/g, '')
    // Remove dates at the beginning of lines
    .replace(/^.*\d{1,2}\/\d{1,2}\/\d{4}.*$/gm, '')
    .replace(/^.*\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}.*$/gm, '')
    // Remove company address blocks
    .replace(/^Hiring Manager\s*$/gm, '')
    .replace(/^[A-Z][a-z ]+ and [A-Z][a-z ]+\s*$/gm, '') // "Millennium Hotels and Resorts"
    .replace(/^\[Company Address\]\s*$/gm, '')
    // Remove signature blocks
    .replace(/^(Warm regards|Sincerely|Best regards|Cordialement),?\s*$/gm, '')
    // Remove candidate placeholders
    .replace(/\[Candidate\'s [^\]]+\]/g, '')
  
  // Preserve paragraph spacing - clean up excessive newlines but maintain structure
  cleaned = cleaned
    // Convert 3+ consecutive newlines to double newlines (preserve paragraph breaks)
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // Remove leading/trailing spaces on each line but preserve paragraph structure
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove empty lines at start/end but preserve internal paragraph spacing
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
  
  return cleaned
}

/**
 * Generate improved prompt for OpenAI to get structured response
 */
export function generateStructuredPrompt(profile: any, cv: any, jobOffer: any, settings: any): string {
  const basePrompt = `
Tu es un expert en rédaction de lettres de motivation. Tu dois OBLIGATOIREMENT répondre avec le format structuré suivant, sans exception.

Informations pour la lettre:
- Poste: ${jobOffer.title}
- Entreprise: ${jobOffer.company}
- Description: ${jobOffer.description}
- Catégorie du candidat: ${profile.category}
- Stack/Expertise: ${profile.responses?.stack_expertise || 'Non spécifié'}
- Projet phare: ${profile.responses?.project_proud || 'Non spécifié'}
- Résolution de problèmes: ${profile.responses?.problem_solving || 'Non spécifié'}
- Culture d'apprentissage: ${profile.responses?.learning_culture || 'Non spécifié'}
- Objectifs de carrière: ${profile.responses?.career_goals || 'Non spécifié'}

INSTRUCTIONS STRICTES:
1. Réponds UNIQUEMENT avec le format ci-dessous
2. N'inclus AUCUNE information personnelle (nom, adresse, téléphone, email, date)
3. N'inclus AUCUN en-tête, signature ou formule de fin
4. Utilise exactement ces balises: SUBJECT:, GREETING:, BODY:

FORMAT OBLIGATOIRE:

SUBJECT: [Objet concis pour ${jobOffer.title} chez ${jobOffer.company}]

GREETING: [Formule de politesse simple comme "Madame, Monsieur," ou "Chère équipe de recrutement,"]

BODY: [Corps de la lettre d'environ ${settings.length} mots, ton ${settings.tone}, mettant en avant les compétences et expériences pertinentes pour le poste, SANS aucune information personnelle]

ATTENTION: Ne respecte que ce format. Pas d'adresse, pas de nom, pas de signature, pas de date.
`

  return basePrompt.trim()
}

/**
 * Validate that the generated content doesn't contain personal information
 * Returns true if content is clean, false if it contains personal info
 */
export function validateContentCleanliness(content: string): { isClean: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for email patterns
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)) {
    issues.push('Contains email address')
  }
  
  // Check for phone patterns
  if (/\b(\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9})\b/.test(content)) {
    issues.push('Contains phone number')
  }
  
  // Check for address patterns
  if (/^Address:/m.test(content) || /^\[.*Address\]/m.test(content)) {
    issues.push('Contains address information')
  }
  
  // Check for specific personal names in headers (common pattern)
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/m.test(content)) {
    issues.push('Contains personal name as header')
  }
  
  // Check for date patterns
  if (/^\[Date\]/m.test(content) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(content)) {
    issues.push('Contains date information')
  }
  
  // Check for signature blocks
  if (/(Warm regards|Sincerely|Best regards|Cordialement),?\s*$/.test(content)) {
    issues.push('Contains signature block')
  }
  
  return {
    isClean: issues.length === 0,
    issues
  }
}