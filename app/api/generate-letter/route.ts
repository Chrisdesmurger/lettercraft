
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withQuotaCheck } from '@/lib/middleware/quota-middleware'
import { generateStructuredPrompt, parseLetterResponse, cleanLetterSections, validateContentCleanliness } from '@/lib/letter-sections'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getToneDirectives, validateToneParams, sanitizeToneText, isValidToneKey } from '@/lib/tone-guidelines'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

async function generateLetterHandler(request: NextRequest, userId: string) {
    try {
        const supabase = createRouteHandlerClient({ cookies })

        const body = await request.json()
        const { profile, cv, jobOffer, settings } = body

        // Validation et sécurisation des paramètres de ton
        const { toneKey = 'professionnel', toneCustom } = settings
        
        // Validation côté serveur
        if (!isValidToneKey(toneKey)) {
            return NextResponse.json(
                { error: 'Ton non valide' },
                { status: 400 }
            )
        }

        const toneValidation = validateToneParams(toneKey, toneCustom)
        if (!toneValidation.valid) {
            return NextResponse.json(
                { error: 'Paramètres de ton invalides', details: toneValidation.errors },
                { status: 400 }
            )
        }

        // Sanitiser le texte personnalisé si nécessaire
        const sanitizedToneCustom = toneCustom ? sanitizeToneText(toneCustom) : undefined

        // Obtenir les directives de style pour le ton sélectionné
        const toneDirectives = getToneDirectives(toneKey, sanitizedToneCustom)

        // Générer le prompt structuré avec les directives de ton
        const prompt = generateStructuredPrompt(profile, cv, jobOffer, {
            ...settings,
            toneDirectives
        })

        const letterConfig = getOpenAIConfig('LETTER_GENERATION')
        const completion = await openai.chat.completions.create({
            model: letterConfig.model,
            messages: [
                {
                    role: "system",
                    content: "Tu es un expert en rédaction de lettres de motivation professionnelles. Réponds toujours avec la structure demandée utilisant les balises SUBJECT:, GREETING:, et BODY:."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: letterConfig.temperature,
            max_tokens: letterConfig.max_tokens
        })

        const aiResponse = completion.choices[0].message.content

        if (!aiResponse) {
            throw new Error('Aucune réponse de l\'IA')
        }

        // Parser la réponse pour extraire les sections
        const { sections, fullContent } = parseLetterResponse(aiResponse)
        
        // Nettoyer les sections pour enlever les informations personnelles
        const cleanedSections = cleanLetterSections(sections)
        
        // Valider que le contenu est propre
        const validation = validateContentCleanliness(fullContent)
        if (!validation.isClean) {
            console.warn('Generated content contains personal information:', validation.issues)
            // On peut continuer mais on log les problèmes pour surveillance
        }

        // Sauvegarder la lettre générée avec les sections séparées et les paramètres de ton
        const { data: savedLetter, error: saveError } = await supabase
            .from('generated_letters')
            .insert({
                user_id: userId,
                content: fullContent,
                subject: cleanedSections.subject,
                greeting: cleanedSections.greeting,
                body: cleanedSections.body,
                html_content: null,
                pdf_url: null,
                generation_settings: settings,
                openai_model: letterConfig.model,
                tone_key: toneKey,
                tone_custom: sanitizedToneCustom,
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

        return NextResponse.json({ 
            letter: fullContent,
            sections: cleanedSections,
            letterId: savedLetter?.id 
        })
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