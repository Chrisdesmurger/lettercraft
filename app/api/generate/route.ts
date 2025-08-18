import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase-client'
import { getOpenAIConfig } from '@/lib/openai-config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { cvSummary, jobOffer, answers, language = 'fr' } = await request.json()

    // Validation des données
    if (!cvSummary || !jobOffer || !answers) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }

    // Construction du prompt
    const prompt = `
      Tu es un expert en rédaction de lettres de motivation professionnelles.
      
      Génère une lettre de motivation en ${language} pour la candidature suivante:
      
      CV du candidat:
      ${cvSummary}
      
      Offre d'emploi:
      ${jobOffer}
      
      Réponses au questionnaire:
      - Motivation: ${answers.motivation || 'Non spécifiée'}
      - Compétences: ${answers.skills || 'Non spécifiées'}
      - Expérience: ${answers.experience || 'Non spécifiée'}
      - Disponibilité: ${answers.availability || 'Non spécifiée'}
      
      La lettre doit:
      - Être professionnelle et personnalisée
      - Mettre en valeur les compétences du candidat
      - Montrer l'adéquation avec le poste
      - Être structurée avec une introduction, un développement et une conclusion
      - Faire environ 300-400 mots
      - Inclure les formules de politesse appropriées
    `

    const letterConfig = getOpenAIConfig('LETTER_GENERATION')
    const completion = await openai.chat.completions.create({
      model: letterConfig.model,
      messages: [
        {
          role: "system",
          content: "Tu es un expert en ressources humaines et en rédaction de lettres de motivation."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: letterConfig.temperature,
      max_tokens: letterConfig.max_tokens,
    })

    const letter = completion.choices[0].message.content

    // Optionnel : Sauvegarder dans Supabase
    // const { data, error } = await supabase
    //   .from('generated_letters')
    //   .insert({
    //     content: letter,
    //     answers,
    //     created_at: new Date().toISOString(),
    //   })

    return NextResponse.json({ 
      letter,
      success: true 
    })
  } catch (error) {
    console.error('Erreur lors de la génération:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la lettre' },
      { status: 500 }
    )
  }
}