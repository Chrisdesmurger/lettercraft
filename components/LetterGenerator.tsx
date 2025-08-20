/**
 * Letter generation and customization component
 * Uses AI to create a personalized letter
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
    Sparkles,
    Globe,
    Zap,
    ChevronRight,
    Loader2,
    RefreshCw,
    Settings,
    AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'
import { QuotaGuard, usePreGenerationQuotaCheck } from '@/components/quota'
import { generateLetter } from '@/lib/api/letter-generation'
import { getToneOptions, validateToneParams, type ToneKey } from '@/lib/tone-guidelines'

interface LetterGeneratorProps {
    data?: any
    onUpdate?: (data: any) => void
    onNext?: () => void
}

const languages = [
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

export default function LetterGenerator({ data, onUpdate, onNext }: LetterGeneratorProps) {
    const { t } = useI18n()
    const { executeWithQuotaCheck } = usePreGenerationQuotaCheck()
    
    // Récupérer les options de tons prédéfinies
    const toneOptions = getToneOptions()
    
    const [generating, setGenerating] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [generatedLetter, setGeneratedLetter] = useState(data?.generatedLetter || '')

    // Generation parameters
    const [language, setLanguage] = useState(data?.letterLanguage || 'fr')
    const [toneKey, setToneKey] = useState<ToneKey>(data?.letterToneKey || 'professionnel')
    const [customToneText, setCustomToneText] = useState(data?.letterToneCustom || '')
    const [length, setLength] = useState([250]) // Nombre de mots
    const [includeHobbies, setIncludeHobbies] = useState(false)
    const [emphasizeExperience, setEmphasizeExperience] = useState(true)
    
    // Validation du ton
    const [toneValidation, setToneValidation] = useState({ valid: true, errors: [] as string[] })
    
    // Valider les paramètres de ton quand ils changent
    useEffect(() => {
        const validation = validateToneParams(toneKey, customToneText)
        setToneValidation(validation)
    }, [toneKey, customToneText])

    const generateLetterFromAPI = async () => {
        setGenerating(true)

        const success = await executeWithQuotaCheck(async () => {
            try {
                // Utiliser la vraie API de génération avec notre système de sections
                const response = await generateLetter({
                    profile: {
                        category: data?.category || 'développeur',
                        responses: data?.responses || {}
                    },
                    cv: data?.cv || {},
                    jobOffer: data?.jobOffer || { title: '', company: '', description: '' },
                    settings: {
                        language,
                        toneKey,
                        toneCustom: customToneText,
                        length: length[0],
                        includeHobbies,
                        emphasizeExperience
                    }
                })

                // Utiliser la réponse complète avec sections
                setGeneratedLetter(response.letter)

                if (onUpdate) {
                    onUpdate({
                        generatedLetter: response.letter,
                        sections: response.sections, // Inclure les sections
                        letterId: response.letterId, // Inclure l'ID pour les reviews
                        letterLanguage: language,
                        letterToneKey: toneKey,
                        letterToneCustom: customToneText,
                        letterLength: length[0]
                    })
                }

                toast.success(t('letter.generateSuccess'))
            } catch (error) {
                console.error('Error generating letter:', error)
                throw error // Relancer l'erreur pour que executeWithQuotaCheck la gère
            }
        })

        if (!success) {
            toast.error(t('letter.generateError'))
        }
        
        setGenerating(false)
    }

    const regenerateLetter = async () => {
        setRegenerating(true)
        
        // Réutiliser la même logique que generateLetter mais avec l'état de régénération
        const success = await executeWithQuotaCheck(async () => {
            // Generation simulation (replace with your OpenAI API call)
            await new Promise(resolve => setTimeout(resolve, 3000))

            // Generated letter (implement with your logic)
            const letter = `Madame, Monsieur,

C'est avec un grand intérêt que je vous adresse ma candidature pour le poste de ${data?.jobOffer?.title} au sein de ${data?.jobOffer?.company}.

Fort de mon expérience en développement web et de ma maîtrise des technologies ${data?.responses?.stack_expertise || 'React et Node.js'}, je suis convaincu de pouvoir apporter une réelle valeur ajoutée à votre équipe.

${data?.responses?.project_proud || 'Au cours de mes précédentes expériences, j\'ai eu l\'opportunité de mener à bien plusieurs projets d\'envergure qui ont significativement amélioré les performances et l\'expérience utilisateur.'}

${data?.responses?.problem_solving || 'Ma capacité à résoudre des problèmes complexes et mon approche méthodique me permettent d\'aborder chaque défi avec créativité et rigueur.'}

${emphasizeExperience ? `Ce qui me distingue particulièrement, c'est ${data?.responses?.career_goals || 'ma passion pour l\'innovation technologique et mon désir constant d\'apprentissage'}.` : ''}

Je serais ravi de pouvoir discuter plus en détail de la manière dont mes compétences et mon expérience peuvent contribuer au succès de ${data?.jobOffer?.company}.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${data?.userName || 'Votre nom'}`

            setGeneratedLetter(letter)

            if (onUpdate) {
                onUpdate({
                    generatedLetter: letter,
                    letterLanguage: language,
                    letterToneKey: toneKey,
                    letterToneCustom: customToneText,
                    letterLength: length[0]
                })
            }

            toast.success(t('letter.generateSuccess'))
        })

        if (!success) {
            toast.error(t('letter.generateError'))
        }
        
        setRegenerating(false)
    }

    // Auto-generate on load if not already done
    useEffect(() => {
        if (!generatedLetter && data?.jobOffer && data?.responses) {
            generateLetterFromAPI()
        }
    }, [])

    if (generating && !generatedLetter) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    <Sparkles className="h-12 w-12 mx-auto text-primary animate-pulse" />
                    <h3 className="text-xl font-semibold">{t('letter.generating')}</h3>
                    <p className="text-gray-600">
                        {t('letter.generatingDesc')}
                    </p>
                    <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {!generatedLetter ? (
                <Card className="p-8">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {t('letter.customize')}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {t('letter.customizeDesc')}
                            </p>
                        </div>

                        {/* Langue */}
                        <div>
                            <Label className="text-base mb-3 block">
                                <Globe className="inline h-4 w-4 mr-2" />
                                {t('letter.language')}
                            </Label>
                            <RadioGroup value={language} onValueChange={setLanguage}>
                                <div className="grid grid-cols-2 gap-3">
                                    {languages.map((lang) => (
                                        <div key={lang.value} className="flex items-center">
                                            <RadioGroupItem value={lang.value} id={lang.value} />
                                            <Label
                                                htmlFor={lang.value}
                                                className="ml-2 cursor-pointer flex items-center"
                                            >
                                                <span className="mr-2">{lang.flag}</span>
                                                {lang.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Choix du ton */}
                        <div>
                            <Label className="text-base mb-3 block">
                                <Zap className="inline h-4 w-4 mr-2" />
                                Choisissez le ton de votre lettre
                            </Label>
                            <RadioGroup value={toneKey} onValueChange={(value) => setToneKey(value as ToneKey)}>
                                <div className="space-y-3">
                                    {toneOptions.map((option) => (
                                        <div key={option.key} className="flex items-start">
                                            <RadioGroupItem value={option.key} id={option.key} />
                                            <div className="ml-3 flex-1">
                                                <Label htmlFor={option.key} className="cursor-pointer font-medium">
                                                    {option.label}
                                                </Label>
                                                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                                                {option.example && (
                                                    <p className="text-xs text-gray-400 mt-1 italic">
                                                        Exemple : "{option.example}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Option personnalisée */}
                                    <div className="flex items-start">
                                        <RadioGroupItem value="personnalisé" id="personnalisé" />
                                        <div className="ml-3 flex-1">
                                            <Label htmlFor="personnalisé" className="cursor-pointer font-medium">
                                                Personnalisé
                                            </Label>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Décrivez le ton souhaité en quelques mots
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </RadioGroup>
                            
                            {/* Champ texte pour ton personnalisé */}
                            {toneKey === 'personnalisé' && (
                                <div className="mt-4">
                                    <Label htmlFor="customTone" className="text-sm font-medium">
                                        Décrivez votre ton souhaité (max 120 caractères)
                                    </Label>
                                    <Textarea
                                        id="customTone"
                                        value={customToneText}
                                        onChange={(e) => setCustomToneText(e.target.value)}
                                        maxLength={120}
                                        placeholder="Ex: Décontracté mais respectueux, avec une pointe d'humour..."
                                        className="mt-1 resize-none"
                                        rows={3}
                                        aria-describedby="customTone-help"
                                    />
                                    <div className="flex justify-between items-center mt-1">
                                        <p id="customTone-help" className="text-xs text-gray-500">
                                            Soyez spécifique sur le style d'écriture souhaité
                                        </p>
                                        <span className="text-xs text-gray-400">
                                            {customToneText.length}/120
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Affichage des erreurs de validation */}
                            {!toneValidation.valid && (
                                <div className="mt-2 flex items-start space-x-2 text-red-600">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                        {toneValidation.errors.map((error, index) => (
                                            <p key={index}>{error}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Longueur */}
                        <div>
                            <Label className="text-base mb-3 block">
                                {t('letter.length', { words: length[0].toString() })}
                            </Label>
                            <Slider
                                value={length}
                                onValueChange={setLength}
                                min={150}
                                max={400}
                                step={50}
                                className="mb-2"
                            />
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{t('letter.concise')}</span>
                                <span>{t('letter.detailed')}</span>
                            </div>
                        </div>

                        {/* Options supplémentaires */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="hobbies" className="cursor-pointer">
                                    {t('letter.includeHobbies')}
                                </Label>
                                <Switch
                                    id="hobbies"
                                    checked={includeHobbies}
                                    onCheckedChange={setIncludeHobbies}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="experience" className="cursor-pointer">
                                    {t('letter.emphasizeExperience')}
                                </Label>
                                <Switch
                                    id="experience"
                                    checked={emphasizeExperience}
                                    onCheckedChange={setEmphasizeExperience}
                                />
                            </div>
                        </div>

                        <QuotaGuard showQuotaStatus={true}>
                            <Button
                                onClick={generateLetterFromAPI}
                                className="w-full"
                                size="lg"
                                disabled={generating || !toneValidation.valid}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                {t('letter.generate')}
                            </Button>
                        </QuotaGuard>
                    </div>
                </Card>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    {/* Quick customization options */}
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={() => setGeneratedLetter('')}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    {t('letter.settings')}
                                </Button>
                                <QuotaGuard showQuotaStatus={false}>
                                    <Button
                                        onClick={regenerateLetter}
                                        variant="outline"
                                        size="sm"
                                        disabled={regenerating}
                                    >
                                        {regenerating ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        {t('letter.regenerate')}
                                    </Button>
                                </QuotaGuard>
                            </div>
                            <div className="text-sm text-gray-500">
                                {length[0]} mots • {language.toUpperCase()}
                            </div>
                        </div>
                    </Card>

                    {/* Letter preview */}
                    <Card className="p-8">
                        <div className="prose max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                                {generatedLetter}
                            </pre>
                        </div>
                    </Card>

                    {onNext && (
                        <div className="flex justify-end">
                            <Button onClick={onNext} size="lg">
                                {t('letter.viewFinal')}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}