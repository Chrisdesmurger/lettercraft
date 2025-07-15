import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Vérifier l'authentification
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  
  return user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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

    // Générer la lettre de motivation avec OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en rédaction de lettres de motivation professionnelles en français. Tu dois créer une lettre de motivation personnalisée et convaincante.

INSTRUCTIONS PRÉCISES:
1. Utilise les informations du CV et du questionnaire pour personnaliser la lettre
2. Respecte la structure classique française : en-tête, objet, corps, formule de politesse
3. Adopte un ton ${context.settings.tone} et adapte la longueur selon: ${context.settings.length}
4. Mets en valeur l'expérience sélectionnée et les compétences qui correspondent
5. Intègre naturellement la motivation exprimée
6. Montre l'alignement avec les valeurs de l'entreprise
7. Évite les clichés et les formulations trop génériques

STRUCTURE ATTENDUE:
- En-tête avec coordonnées (si disponibles)
- Objet clair
- Introduction accrocheuse
- Développement en 2-3 paragraphes
- Conclusion avec appel à l'action
- Formule de politesse

Génère uniquement le contenu de la lettre, sans commentaires supplémentaires.`
        },
        {
          role: "user",
          content: `Génère une lettre de motivation pour:

OFFRE D'EMPLOI:
- Poste: ${context.jobOffer.title}
- Entreprise: ${context.jobOffer.company}
- Description: ${context.jobOffer.description}
- Localisation: ${context.jobOffer.location || 'Non spécifiée'}

CANDIDAT:
- Nom: ${context.candidate.name || 'Candidat'}
- Expériences: ${JSON.stringify(context.candidate.experiences)}
- Compétences: ${context.candidate.skills.join(', ')}

RÉPONSES DU QUESTIONNAIRE:
- Motivation: ${context.responses.motivation}
- Expérience à valoriser: ${JSON.stringify(context.responses.experience_highlight)}
- Compétences correspondantes: ${context.responses.skills_match.join(', ')}
- Alignement avec les valeurs: ${context.responses.company_values}
- Contexte supplémentaire: ${context.responses.additional_context || 'Aucun'}

Génère une lettre de motivation professionnelle et personnalisée.`
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
    const htmlCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Convertis cette lettre de motivation en HTML bien formaté pour impression PDF. Utilise:
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

Génère uniquement le code HTML complet, sans commentaires.`
        },
        {
          role: "user",
          content: `Convertis cette lettre en HTML:\n\n${letterContent}`
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

// Méthode GET pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({ 
    message: 'API de génération de lettres personnalisées fonctionnelle',
    version: '1.0.0'
  })
}
