import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase-client'

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
      Génère UNIQUEMENT le contenu principal d'une lettre de motivation en ${language} pour la candidature suivante:
      
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
      
      IMPORTANT: Génère le contenu complet de la lettre avec :
      - L'objet/sujet de la lettre approprié
      - Une salutation appropriée (Dear Hiring Manager, Madame Monsieur, etc.)
      - Le contenu persuasif structuré en paragraphes
      - Une conclusion professionnelle
      
      Ne génère PAS :
      - Les informations de contact du candidat
      - L'adresse du destinataire  
      - La date et le lieu
      - La signature avec le nom
      
      Structure recommandée :
      Subject: [Objet approprié]
      
      [Salutation]
      
      [Contenu persuasif]
      
      [Conclusion professionnelle]
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en ressources humaines et en rédaction de lettres de motivation. Tu génères le contenu complet de la lettre incluant l'objet, la salutation, le contenu persuasif et une conclusion professionnelle, mais SANS les informations de contact, dates ou signature avec nom."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
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