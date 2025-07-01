
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
            return NextResponse.json({ error: 'Non autoris�' }, { status: 401 })
        }

        const body = await request.json()
        const { profile, cv, jobOffer, settings } = body

        // Construire le prompt pour OpenAI
        const prompt = `
    G�n�re une lettre de motivation professionnelle avec les informations suivantes:
    
    Profil du candidat:
    - Cat�gorie: ${profile.category}
    - Stack/Expertise: ${profile.responses.stack_expertise}
    - Projet phare: ${profile.responses.project_proud}
    - R�solution de probl�mes: ${profile.responses.problem_solving}
    - Culture d'apprentissage: ${profile.responses.learning_culture}
    - Objectifs de carri�re: ${profile.responses.career_goals}
    
    Offre d'emploi:
    - Poste: ${jobOffer.title}
    - Entreprise: ${jobOffer.company}
    - Description: ${jobOffer.description}
    
    Param�tres:
    - Langue: ${settings.language}
    - Ton: ${settings.tone}
    - Longueur: environ ${settings.length} mots
    - Mettre en avant l'exp�rience: ${settings.emphasizeExperience ? 'Oui' : 'Non'}
    
    La lettre doit �tre structur�e, personnalis�e et convaincante.
    `

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Tu es un expert en r�daction de lettres de motivation professionnelles."
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

        // Sauvegarder le quota utilis�
        await supabase.from('user_quotas').upsert({
            user_id: user.id,
            letters_generated: 1
        }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
        })

        return NextResponse.json({ letter })
    } catch (error) {
        console.error('Erreur:', error)
        return NextResponse.json(
            { error: 'Erreur lors de la g�n�ration' },
            { status: 500 }
        )
    }
}