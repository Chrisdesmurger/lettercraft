import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { withQuotaCheck } from '@/lib/middleware/quota-middleware'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generatePersonalizedLetterHandler(request: NextRequest, userId: string) {
  try {

    const { jobOffer, questionnaireResponse, cvData, settings } = await request.json()

    if (!jobOffer || !questionnaireResponse || !cvData) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Construire le contexte pour la génération
    const context = {
      jobOffer: {
        title: jobOffer.title,
        company: jobOffer.company,
        description: jobOffer.description,
        requirements: jobOffer.requirements || [],
        location: jobOffer.location
      },
      candidate: {
        name: `${cvData.first_name || ''} ${cvData.last_name || ''}`.trim(),
        experiences: cvData.experiences || [],
        skills: cvData.skills || [],
        education: cvData.education || []
      },
      responses: {
        motivation: questionnaireResponse.motivation,
        experience_highlight: questionnaireResponse.experience_highlight,
        skills_match: questionnaireResponse.skills_match,
        company_values: questionnaireResponse.company_values,
        additional_context: questionnaireResponse.additional_context
      },
      settings: {
        language: settings?.language || 'fr',
        tone: settings?.tone || 'professionnel',
        length: settings?.length || 'moyen'
      }
    }

    // Définir les instructions selon la langue
    const getLanguageInstructions = (language: string) => {
      switch (language) {
        case 'en':
          return {
            system: `You are an expert in writing professional cover letters in English. You must create a personalized and convincing cover letter.

PRECISE INSTRUCTIONS:
1. Use the CV and questionnaire information to personalize the letter
2. Generate ONLY the main content without header, contact details, subject line, greetings or closing formulas
3. Adopt a ${context.settings.tone} tone and adapt the length according to: ${context.settings.length}
4. Highlight the selected experience and matching skills
5. Naturally integrate the expressed motivation
6. Show alignment with company values
7. Avoid clichés and overly generic formulations

EXPECTED STRUCTURE:
- Engaging introduction paragraph
- Development in 2-3 paragraphs
- Conclusion with call to action

IMPORTANT: Do NOT include:
- Contact information
- Header details
- Subject line
- Greetings (Dear Sir/Madam, etc.)
- Closing formulas (Sincerely, Best regards, etc.)
- Signature

Generate only the persuasive content, without additional comments.`,
            prompt: `Generate a cover letter for:`
          }
        case 'es':
          return {
            system: `Eres un experto en redacción de cartas de presentación profesionales en español. Debes crear una carta de presentación personalizada y convincente.

INSTRUCCIONES PRECISAS:
1. Utiliza la información del CV y del cuestionario para personalizar la carta
2. Genera ÚNICAMENTE el contenido principal sin encabezado, datos de contacto, asunto, saludos o fórmulas de cortesía
3. Adopta un tono ${context.settings.tone} y adapta la longitud según: ${context.settings.length}
4. Destaca la experiencia seleccionada y las competencias que coinciden
5. Integra naturalmente la motivación expresada
6. Muestra la alineación con los valores de la empresa
7. Evita clichés y formulaciones demasiado genéricas

ESTRUCTURA ESPERADA:
- Introducción atractiva
- Desarrollo en 2-3 párrafos
- Conclusión con llamada a la acción

IMPORTANTE: NO incluyas:
- Información de contacto
- Datos del encabezado
- Línea de asunto
- Saludos (Estimados señores, etc.)
- Fórmulas de cortesía (Atentamente, etc.)
- Firma

Genera únicamente el contenido persuasivo, sin comentarios adicionales.`,
            prompt: `Genera una carta de presentación para:`
          }
        default: // français
          return {
            system: `Tu es un expert en rédaction de lettres de motivation professionnelles en français. Tu dois créer une lettre de motivation personnalisée et convaincante.

INSTRUCTIONS PRÉCISES:
1. Utilise les informations du CV et du questionnaire pour personnaliser la lettre
2. Génère UNIQUEMENT le contenu principal sans en-tête, coordonnées, objet, salutations ou formules de politesse
3. Adopte un ton ${context.settings.tone} et adapte la longueur selon: ${context.settings.length}
4. Mets en valeur l'expérience sélectionnée et les compétences qui correspondent
5. Intègre naturellement la motivation exprimée
6. Montre l'alignement avec les valeurs de l'entreprise
7. Évite les clichés et les formulations trop génériques

STRUCTURE ATTENDUE:
- Introduction accrocheuse
- Développement en 2-3 paragraphes
- Conclusion avec appel à l'action

IMPORTANT: N'inclus PAS:
- Informations de contact
- Données d'en-tête
- Ligne d'objet
- Salutations (Madame, Monsieur, etc.)
- Formules de politesse (Cordialement, etc.)
- Signature

Génère uniquement le contenu persuasif, sans commentaires supplémentaires.`,
            prompt: `Génère une lettre de motivation pour:`
          }
      }
    }

    const languageInstructions = getLanguageInstructions(context.settings.language)

    // Générer la lettre de motivation avec OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: languageInstructions.system
        },
        {
          role: "user",
          content: `${languageInstructions.prompt}

${context.settings.language === 'en' ? 'JOB OFFER:' : context.settings.language === 'es' ? 'OFERTA DE EMPLEO:' : 'OFFRE D\'EMPLOI:'}
- ${context.settings.language === 'en' ? 'Position:' : context.settings.language === 'es' ? 'Puesto:' : 'Poste:'} ${context.jobOffer.title}
- ${context.settings.language === 'en' ? 'Company:' : context.settings.language === 'es' ? 'Empresa:' : 'Entreprise:'} ${context.jobOffer.company}
- ${context.settings.language === 'en' ? 'Description:' : context.settings.language === 'es' ? 'Descripción:' : 'Description:'} ${context.jobOffer.description}
- ${context.settings.language === 'en' ? 'Location:' : context.settings.language === 'es' ? 'Localización:' : 'Localisation:'} ${context.jobOffer.location || (context.settings.language === 'en' ? 'Not specified' : context.settings.language === 'es' ? 'No especificada' : 'Non spécifiée')}

${context.settings.language === 'en' ? 'CANDIDATE:' : context.settings.language === 'es' ? 'CANDIDATO:' : 'CANDIDAT:'}
- ${context.settings.language === 'en' ? 'Name:' : context.settings.language === 'es' ? 'Nombre:' : 'Nom:'} ${context.candidate.name || (context.settings.language === 'en' ? 'Candidate' : context.settings.language === 'es' ? 'Candidato' : 'Candidat')}
- ${context.settings.language === 'en' ? 'Experiences:' : context.settings.language === 'es' ? 'Experiencias:' : 'Expériences:'} ${JSON.stringify(context.candidate.experiences)}
- ${context.settings.language === 'en' ? 'Skills:' : context.settings.language === 'es' ? 'Habilidades:' : 'Compétences:'} ${context.candidate.skills.join(', ')}

${context.settings.language === 'en' ? 'QUESTIONNAIRE RESPONSES:' : context.settings.language === 'es' ? 'RESPUESTAS DEL CUESTIONARIO:' : 'RÉPONSES DU QUESTIONNAIRE:'}
- ${context.settings.language === 'en' ? 'Motivation:' : context.settings.language === 'es' ? 'Motivación:' : 'Motivation:'} ${context.responses.motivation}
- ${context.settings.language === 'en' ? 'Experience to highlight:' : context.settings.language === 'es' ? 'Experiencia a destacar:' : 'Expérience à valoriser:'} ${JSON.stringify(context.responses.experience_highlight)}
- ${context.settings.language === 'en' ? 'Matching skills:' : context.settings.language === 'es' ? 'Habilidades correspondientes:' : 'Compétences correspondantes:'} ${context.responses.skills_match.join(', ')}
- ${context.settings.language === 'en' ? 'Values alignment:' : context.settings.language === 'es' ? 'Alineación con valores:' : 'Alignement avec les valeurs:'} ${context.responses.company_values}
- ${context.settings.language === 'en' ? 'Additional context:' : context.settings.language === 'es' ? 'Contexto adicional:' : 'Contexte supplémentaire:'} ${context.responses.additional_context || (context.settings.language === 'en' ? 'None' : context.settings.language === 'es' ? 'Ninguno' : 'Aucun')}

${context.settings.language === 'en' ? 'Generate a professional and personalized cover letter.' : context.settings.language === 'es' ? 'Genera una carta de presentación profesional y personalizada.' : 'Génère une lettre de motivation professionnelle et personnalisée.'}`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })

    const letterContent = completion.choices[0].message.content
    if (!letterContent) {
      throw new Error('Aucune réponse reçue d\'OpenAI')
    }

    // Générer également la version HTML pour le PDF
    const htmlInstructions = {
      fr: `Convertis cette lettre de motivation en HTML bien formaté pour impression PDF. Utilise:
- Des balises sémantiques appropriées
- Une mise en page professionnelle
- Des espaces et marges correctes
- Police lisible et professionnelle
- Pas de CSS externe, utilise du CSS inline

Structure HTML:
- En-tête avec coordonnées
- Objet en gras
- Paragraphes bien espacés
- Signature à la fin

Génère uniquement le code HTML complet, sans commentaires.`,
      en: `Convert this cover letter to well-formatted HTML for PDF printing. Use:
- Appropriate semantic tags
- Professional layout
- Correct spacing and margins
- Readable and professional font
- No external CSS, use inline CSS

HTML Structure:
- Header with contact details
- Subject in bold
- Well-spaced paragraphs
- Signature at the end

Generate only the complete HTML code, without comments.`,
      es: `Convierte esta carta de presentación en HTML bien formateado para impresión PDF. Utiliza:
- Etiquetas semánticas apropiadas
- Diseño profesional
- Espaciado y márgenes correctos
- Fuente legible y profesional
- Sin CSS externo, usa CSS inline

Estructura HTML:
- Encabezado con datos de contacto
- Asunto en negrita
- Párrafos bien espaciados
- Firma al final

Genera únicamente el código HTML completo, sin comentarios.`
    }

    const htmlCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: htmlInstructions[context.settings.language as keyof typeof htmlInstructions] || htmlInstructions.fr
        },
        {
          role: "user",
          content: `${context.settings.language === 'en' ? 'Convert this letter to HTML:' : context.settings.language === 'es' ? 'Convierte esta carta en HTML:' : 'Convertis cette lettre en HTML:'}\n\n${letterContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })

    const htmlContent = htmlCompletion.choices[0].message.content || letterContent

    return NextResponse.json({
      content: letterContent,
      html_content: htmlContent,
      metadata: {
        generated_at: new Date().toISOString(),
        model: 'gpt-4-turbo',
        user_id: userId,
        context_used: {
          job_title: context.jobOffer.title,
          company: context.jobOffer.company,
          candidate_name: context.candidate.name,
          experience_highlighted: context.responses.experience_highlight.experience_title,
          skills_count: context.responses.skills_match.length
        }
      }
    })

  } catch (error) {
    console.error('Erreur lors de la génération de la lettre:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la génération de la lettre',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withQuotaCheck(request, generatePersonalizedLetterHandler)
}

// Méthode GET pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({ 
    message: 'API de génération de lettres personnalisées fonctionnelle',
    version: '1.0.0'
  })
}
