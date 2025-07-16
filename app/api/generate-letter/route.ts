
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        const body = await request.json()
        const { profile, cv, jobOffer, settings } = body

        // Construire le prompt pour OpenAI
        const prompt = `
    Génère une lettre de motivation professionnelle avec les informations suivantes:
    
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
    
    La lettre doit être structurée, personnalisée et convaincante.
    `

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Tu es un expert en rédaction de lettres de motivation professionnelles."
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
                user_id: user.id,
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

        // Sauvegarder le quota utilisé
        await supabase.from('user_quotas').upsert({
            user_id: user.id,
            letters_generated: 1
        }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
        })

        return NextResponse.json({ letter, letterId: savedLetter?.id })
    } catch (error) {
        console.error('Erreur:', error)
        return NextResponse.json(
            { error: 'Erreur lors de la génération' },
            { status: 500 }
        )
    }
}