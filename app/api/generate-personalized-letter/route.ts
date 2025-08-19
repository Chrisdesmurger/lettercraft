import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { withQuotaCheck } from '@/lib/middleware/quota-middleware'
import { parseLetterResponse, cleanLetterSections, formatLetterSections, validateContentCleanliness } from '@/lib/letter-sections'

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

    // Système de prompt hybride : qualité de l'ancien + structure de sections
    const generateStructuredPromptPersonalized = (context: any) => {
      const getLanguageInstructions = (language: string) => {
        switch (language) {
          case 'en':
            return {
              language: 'English',
              greeting: 'Dear Hiring Manager,',
              system: `You are an expert in writing professional cover letters in English. You must create a personalized and convincing cover letter.

QUALITY GUIDELINES:
1. Use the CV and questionnaire information to personalize the letter deeply with SPECIFIC details
2. Adopt a ${context.settings.tone} tone and adapt the length according to: ${context.settings.length}
3. Highlight the selected experience and matching skills with measurable examples and concrete achievements
4. Naturally integrate the expressed motivation with authentic enthusiasm using the exact wording provided
5. Show genuine alignment with company values using specific references to company culture/mission
6. STRICTLY avoid clichés like "I am writing to", "esteemed company", "with great interest", "I would welcome the opportunity"
7. Create engaging storytelling that connects specific candidate achievements to exact role requirements
8. Use compelling language with concrete metrics, technologies, and business impact

CONTENT QUALITY:
- Direct opening with specific motivation and company knowledge (NO generic introductions)
- Development with concrete examples including numbers, technologies, and measurable results
- Clear demonstration of exact skills-to-requirements matching with specific evidence
- Authentic expression using questionnaire responses verbatim when relevant
- Strong conclusion with specific next steps and confident value proposition

BANNED PHRASES: "I am writing to", "with great interest", "esteemed company", "I would welcome", "please find attached", "thank you for your consideration"`,
              
              subjectPrefix: 'Application for',
              bodyInstructions: 'Write a compelling and deeply personalized cover letter body that tells a specific story using concrete details from the candidate\'s experience, demonstrates clear measurable value, and shows authentic enthusiasm with specific references to the company and role'
            }
          case 'es':
            return {
              language: 'Spanish',
              greeting: 'Estimado/a responsable de contratación,',
              system: `Eres un experto en redacción de cartas de presentación profesionales en español. Debes crear una carta de presentación personalizada y convincente.

DIRECTRICES DE CALIDAD:
1. Utiliza la información del CV y del cuestionario para personalizar profundamente la carta
2. Adopta un tono ${context.settings.tone} y adapta la longitud según: ${context.settings.length}
3. Destaca la experiencia seleccionada y las competencias correspondientes con ejemplos específicos
4. Integra naturalmente la motivación expresada con entusiasmo auténtico
5. Muestra una alineación genuina con los valores y la cultura de la empresa
6. Evita clichés y formulaciones demasiado genéricas
7. Crea una narrativa atractiva que conecte el recorrido del candidato con el puesto
8. Usa un lenguaje convincente que demuestre la propuesta de valor

CALIDAD DEL CONTENIDO:
- Introducción atractiva que capte inmediatamente la atención
- Desarrollo en 2-3 párrafos enfocados con ejemplos concretos
- Demostración clara de la correspondencia entre habilidades y requisitos
- Expresión auténtica de motivación y encaje cultural
- Conclusión sólida con llamada a la acción segura`,
              
              subjectPrefix: 'Candidatura para',
              bodyInstructions: 'Escribe un cuerpo de carta convincente y profundamente personalizado que cuente una historia específica usando detalles concretos de la experiencia del candidato, demuestre valor medible claro, y muestre entusiasmo auténtico con referencias específicas a la empresa y el puesto'
            }
          default: // français
            return {
              language: 'French',
              greeting: 'Madame, Monsieur,',
              system: `Tu es un expert en rédaction de lettres de motivation professionnelles en français. Tu dois créer une lettre de motivation personnalisée et convaincante.

DIRECTIVES DE QUALITÉ:
1. Utilise les informations du CV et du questionnaire pour personnaliser en profondeur avec des détails SPÉCIFIQUES
2. Adopte un ton ${context.settings.tone} et adapte la longueur selon: ${context.settings.length}
3. Mets en valeur l'expérience sélectionnée avec des exemples mesurables et des réalisations concrètes
4. Intègre naturellement la motivation exprimée en utilisant les mots exacts fournis
5. Montre un alignement véritable avec les valeurs en utilisant des références spécifiques à la culture/mission de l'entreprise
6. ÉVITE STRICTEMENT les clichés comme "C'est avec grand intérêt", "votre estimée entreprise", "Je me permets de vous adresser"
7. Crée une narration captivante qui relie des réalisations spécifiques aux exigences exactes du poste
8. Utilise un langage convaincant avec des métriques concrètes, technologies, et impact business

QUALITÉ DU CONTENU:
- Ouverture directe avec motivation spécifique et connaissance de l'entreprise (PAS d'introductions génériques)
- Développement avec exemples concrets incluant chiffres, technologies, et résultats mesurables
- Démonstration claire de l'adéquation exacte compétences-exigences avec preuves spécifiques
- Expression authentique utilisant les réponses du questionnaire textuellement quand pertinent
- Conclusion forte avec étapes spécifiques et proposition de valeur confiante

PHRASES BANNIES: "C'est avec grand intérêt", "votre estimée entreprise", "Je me permets", "J'aimerais avoir l'opportunité", "Veuillez trouver ci-joint", "Je vous remercie de l'attention"`,
              
              subjectPrefix: 'Candidature pour le poste de',
              bodyInstructions: 'Rédige un corps de lettre convaincant et profondément personnalisé qui raconte une histoire spécifique en utilisant des détails concrets de l\'expérience du candidat, démontre une valeur mesurable claire, et montre un enthousiasme authentique avec des références spécifiques à l\'entreprise et au poste'
            }
        }
      }

      const langInstructions = getLanguageInstructions(context.settings.language)
      
      return `${langInstructions.system}

CONTEXTE RICHE POUR PERSONNALISATION:

OFFRE D'EMPLOI:
- Poste: ${context.jobOffer.title}
- Entreprise: ${context.jobOffer.company}
- Description: ${context.jobOffer.description}
- Exigences: ${Array.isArray(context.jobOffer.requirements) ? context.jobOffer.requirements.join(', ') : 'Non spécifiées'}
- Localisation: ${context.jobOffer.location || 'Non spécifiée'}

PROFIL CANDIDAT:
- Expériences: ${JSON.stringify(context.candidate.experiences || [])}
- Compétences: ${context.candidate.skills.join(', ') || 'Non spécifiées'}
- Formation: ${JSON.stringify(context.candidate.education || [])}

RÉPONSES QUESTIONNAIRE (À INTÉGRER SUBTILEMENT):
- Motivation exprimée: ${context.responses.motivation}
- Expérience à valoriser: ${JSON.stringify(context.responses.experience_highlight)}
- Compétences correspondantes: ${context.responses.skills_match.join(', ')}
- Alignement valeurs entreprise: ${context.responses.company_values}
- Contexte supplémentaire: ${context.responses.additional_context || 'Aucun'}

INSTRUCTIONS CRITIQUES:
1. Réponds UNIQUEMENT avec le format structuré ci-dessous
2. N'inclus AUCUNE information personnelle (nom, adresse, téléphone, email, date)
3. N'inclus AUCUN en-tête, coordonnées, signature ou formule de fin
4. Utilise exactement ces balises: SUBJECT:, GREETING:, BODY:
5. Écris en ${langInstructions.language}
6. Longueur BODY: environ ${context.settings.length === 'court' ? '200' : context.settings.length === 'long' ? '400' : '300'} mots

FORMAT OBLIGATOIRE:

SUBJECT: ${langInstructions.subjectPrefix} ${context.jobOffer.title} chez ${context.jobOffer.company}

GREETING: ${langInstructions.greeting}

BODY: ${langInstructions.bodyInstructions}. 

EXEMPLE DE DÉBUT ATTENDU:
"My decade of experience managing secure payment environments, particularly my role providing virtual infrastructure for 100 users during a critical core banking upgrade, makes me excited about Technology company's mission to build scalable payment systems for socially conscious organizations..."

OBLIGATIONS SPÉCIFIQUES POUR LE BODY:
1. CITE PRÉCISÉMENT l'expérience à valoriser: "${context.responses.experience_highlight.experience_title}" avec des détails de cette expérience
2. MENTIONNE EXPLICITEMENT les compétences correspondantes: ${context.responses.skills_match.join(', ')}
3. INTÈGRE TEXTUELLEMENT la motivation: "${context.responses.motivation}"
4. RÉFÉRENCE DIRECTEMENT les valeurs de l'entreprise: "${context.responses.company_values}"
5. UTILISE des chiffres/métrics spécifiques des expériences du CV
6. ÉVOQUE des éléments concrets de la description du poste: "${context.jobOffer.description}"
7. AJOUTE le contexte supplémentaire s'il existe: "${context.responses.additional_context}"

STRUCTURE OBLIGATOIRE DU BODY:
Paragraphe 1: Ouverture avec motivation spécifique + référence précise à l'entreprise/poste
Paragraphe 2: Détails concrets de l'expérience valorisée avec métrics/résultats 
Paragraphe 3: Alignement valeurs + compétences correspondantes + contribution future
Paragraphe 4: Conclusion avec appel à l'action confiant

RAPPEL CRITIQUE: 
- Aucun nom, adresse, téléphone, email, date, en-tête ou signature
- IMPÉRATIF: Utiliser tous les éléments du questionnaire de manière naturelle mais visible
- Bannir les formulations génériques comme "votre esteemed company" ou "I am writing to express"
- Commencer directement par des éléments spécifiques et concrets

ATTENTION: Réponds EXACTEMENT dans ce format, sans aucun texte avant ou après:

SUBJECT: [votre objet ici]

GREETING: [votre salutation ici]

BODY: [votre corps de lettre de 300 mots intégrant TOUTES les obligations spécifiques listées ci-dessus]`
    }

    // LOGS CONTEXTE pour diagnostic
    console.log('=== CONTEXTE REÇU ===')
    console.log('Job Offer:', JSON.stringify(context.jobOffer, null, 2))
    console.log('Candidate:', JSON.stringify(context.candidate, null, 2))
    console.log('Responses:', JSON.stringify(context.responses, null, 2))
    console.log('Settings:', JSON.stringify(context.settings, null, 2))

    // Générer le prompt structuré
    const structuredPrompt = generateStructuredPromptPersonalized(context)

    // Générer la lettre de motivation avec OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en rédaction de lettres de motivation professionnelles. Tu DOIS impérativement respecter TOUTES les instructions données. Utilise OBLIGATOIREMENT les phrases exactes fournies dans le questionnaire. Réponds toujours avec la structure demandée utilisant les balises SUBJECT:, GREETING:, et BODY:. Commence directement par SUBJECT: sans aucun texte avant."
        },
        {
          role: "user",
          content: structuredPrompt
        }
      ],
      temperature: 0.3, // Réduire pour plus de précision
      max_tokens: 2000 // Augmenter pour éviter les coupures
    })

    const aiResponse = completion.choices[0].message.content
    if (!aiResponse) {
      throw new Error('Aucune réponse reçue d\'OpenAI')
    }

    // LOGS DÉTAILLÉS pour diagnostic
    console.log('=== PROMPT ENVOYÉ À OPENAI ===')
    console.log(structuredPrompt)
    console.log('\n=== RÉPONSE BRUTE DE OPENAI ===')
    console.log(aiResponse)
    console.log('\n=== LONGUEUR RÉPONSE ===')
    console.log(`${aiResponse.length} caractères`)

    // Parser la réponse pour extraire les sections
    const { sections, fullContent } = parseLetterResponse(aiResponse)
    
    console.log('\n=== SECTIONS PARSÉES ===')
    console.log('Subject:', sections.subject)
    console.log('Greeting:', sections.greeting) 
    console.log('Body:', sections.body)
    
    // Nettoyer les sections pour enlever les informations personnelles
    const cleanedSections = cleanLetterSections(sections)
    
    console.log('\n=== SECTIONS NETTOYÉES ===')
    console.log('Subject:', cleanedSections.subject)
    console.log('Greeting:', cleanedSections.greeting)
    console.log('Body:', cleanedSections.body)
    
    // Valider que le contenu est propre
    const validation = validateContentCleanliness(fullContent)
    console.log('\n=== VALIDATION ===')
    console.log('Is clean:', validation.isClean)
    console.log('Issues:', validation.issues)
    
    if (!validation.isClean) {
        console.warn('Generated content contains personal information:', validation.issues)
    }

    const letterContent = formatLetterSections(cleanedSections)

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
      sections: cleanedSections, // Ajouter les sections séparées
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
        },
        validation: validation // Inclure les résultats de validation
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
