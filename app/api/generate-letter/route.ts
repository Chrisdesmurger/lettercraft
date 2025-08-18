
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withQuotaCheck } from '@/lib/middleware/quota-middleware'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

async function generateLetterHandler(request: NextRequest, userId: string) {
    try {
        const supabase = createRouteHandlerClient({ cookies })

        const body = await request.json()
        const { profile, cv, jobOffer, settings } = body

        // Construire le prompt pour OpenAI
        const prompt = `
    Génère UNIQUEMENT le contenu principal d'une lettre de motivation avec les informations suivantes:
    
    Profil du candidat:
    - Catégorie: ${profile.category}
    - Stack/Expertise: ${profile.responses.stack_expertise}
    - Projet phare: ${profile.responses.project_proud}
    - Résolution de problèmes: ${profile.responses.problem_solving}
    - Culture d'apprentissage: ${profile.responses.learning_culture}
    - Objectifs de carrière: ${profile.responses.career_goals}
    
    Offre d'emploi:
    - Poste: ${jobOffer.title}
    - Entreprise: ${jobOffer.company}
    - Description: ${jobOffer.description}
    
    Paramètres:
    - Langue: ${settings.language}
    - Ton: ${settings.tone}
    - Longueur: environ ${settings.length} mots
    - Mettre en avant l'expérience: ${settings.emphasizeExperience ? 'Oui' : 'Non'}
    
    IMPORTANT: Génère le contenu complet de la lettre qui DOIT COMMENCER par :
    1. Subject: Candidature pour le poste de ${jobOffer.title}
    2. Une ligne vide
    3. Madame, Monsieur, (ou Dear Hiring Manager, selon la langue)
    4. Une ligne vide
    5. Le contenu persuasif en paragraphes
    6. Une conclusion professionnelle (sans signature ni nom)
    
    Ne génère PAS :
    - Les informations de contact du candidat
    - L'adresse du destinataire  
    - La date et le lieu
    - La signature avec le nom
    
    OBLIGATOIRE: Ta réponse DOIT commencer exactement par :
    Subject: Candidature pour le poste de ${jobOffer.title}
    
    ${settings.language === 'fr' ? 'Madame, Monsieur,' : settings.language === 'en' ? 'Dear Hiring Manager,' : 'Estimados señores,'}
    `

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Tu es un expert en rédaction de lettres de motivation professionnelles. Tu génères le contenu complet de la lettre qui DOIT ABSOLUMENT commencer par 'Subject:' suivi de la salutation appropriée, puis le contenu persuasif et une conclusion professionnelle, mais SANS les informations de contact, dates ou signature avec nom."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        })

        const letter = completion.choices[0].message.content

        // Sauvegarder la lettre générée dans la base de données
        const { data: savedLetter, error: saveError } = await supabase
            .from('generated_letters')
            .insert({
                user_id: userId,
                content: letter || '',
                html_content: null,
                pdf_url: null,
                generation_settings: settings,
                openai_model: 'gpt-4',
                // Ces champs sont requis selon le schéma mais on peut les laisser vides pour l'instant
                questionnaire_response_id: 'temp-' + Date.now(),
                job_offer_id: 'temp-' + Date.now(),
                cv_id: 'temp-' + Date.now()
            })
            .select()
            .single()

        if (saveError) {
            console.error('Erreur lors de la sauvegarde:', saveError)
            // Continuer même si la sauvegarde échoue
        }

        // Le quota sera automatiquement incrémenté par le middleware après succès

        return NextResponse.json({ letter, letterId: savedLetter?.id })
    } catch (error) {
        console.error('Erreur:', error)
        return NextResponse.json(
            { error: 'Erreur lors de la génération' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    return withQuotaCheck(request, generateLetterHandler)
}