import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Temporairement désactiver l'auth pour tester
    console.log('API analyze-job-offer called')

    const { jobOfferText, sourceUrl } = await request.json()

    if (!jobOfferText || typeof jobOfferText !== 'string') {
      return NextResponse.json({ error: 'Texte d\'offre d\'emploi requis' }, { status: 400 })
    }

    // Analyser l'offre d'emploi avec OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un expert en analyse d'offres d'emploi. Analyse le texte fourni et extrait les informations structurées suivantes au format JSON:

{
  "title": "Titre du poste",
  "company": "Nom de l'entreprise",
  "description": "Description détaillée du poste",
  "requirements": ["Exigence 1", "Exigence 2", ...],
  "location": "Localisation",
  "salary_range": "Fourchette salariale si mentionnée",
  "employment_type": "Type d'emploi (CDI, CDD, etc.)",
  "keywords": ["mot-clé 1", "mot-clé 2", ...],
  "company_values": ["valeur 1", "valeur 2", ...],
  "benefits": ["avantage 1", "avantage 2", ...],
  "experience_level": "Niveau d'expérience requis",
  "skills": ["compétence 1", "compétence 2", ...]
}

Assure-toi d'extraire tous les mots-clés techniques et compétences mentionnés. Si une information n'est pas disponible, utilise null.`
        },
        {
          role: "user",
          content: `Analyse cette offre d'emploi:\n\n${jobOfferText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    const analysisText = completion.choices[0].message.content
    if (!analysisText) {
      throw new Error('Aucune réponse reçue d\'OpenAI')
    }

    // Parser la réponse JSON
    let analyzedData
    try {
      analyzedData = JSON.parse(analysisText)
    } catch (parseError) {
      // Si le parsing échoue, essayer d'extraire le JSON de la réponse
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analyzedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Impossible de parser la réponse d\'OpenAI')
      }
    }

    // Validation des données essentielles
    if (!analyzedData.title || !analyzedData.company) {
      return NextResponse.json({ 
        error: 'Impossible d\'extraire les informations essentielles de l\'offre d\'emploi' 
      }, { status: 400 })
    }

    // Enrichir avec des données par défaut si nécessaire
    const enrichedData = {
      title: analyzedData.title,
      company: analyzedData.company,
      description: analyzedData.description || jobOfferText,
      requirements: analyzedData.requirements || [],
      location: analyzedData.location || null,
      salary_range: analyzedData.salary_range || null,
      employment_type: analyzedData.employment_type || null,
      keywords: analyzedData.keywords || [],
      company_values: analyzedData.company_values || [],
      benefits: analyzedData.benefits || [],
      experience_level: analyzedData.experience_level || null,
      skills: analyzedData.skills || []
    }

    return NextResponse.json(enrichedData)

  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'offre d\'emploi:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de l\'analyse de l\'offre d\'emploi',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}

// Méthode GET pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({ 
    message: 'API d\'analyse d\'offres d\'emploi fonctionnelle',
    version: '1.0.0'
  })
}