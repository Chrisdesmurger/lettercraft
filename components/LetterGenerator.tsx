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
import {
    Sparkles,
    Globe,
    Zap,
    ChevronRight,
    Loader2,
    RefreshCw,
    Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'

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
    
    const tones = [
        { value: 'professional', label: t('letter.tones.professional'), description: t('letter.tones.professionalDesc') },
        { value: 'enthusiastic', label: t('letter.tones.enthusiastic'), description: t('letter.tones.enthusiasticDesc') },
        { value: 'creative', label: t('letter.tones.creative'), description: t('letter.tones.creativeDesc') },
    ]
    const [generating, setGenerating] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [generatedLetter, setGeneratedLetter] = useState(data?.generatedLetter || '')

    // Generation parameters
    const [language, setLanguage] = useState(data?.letterLanguage || 'fr')
    const [tone, setTone] = useState('professional')
    const [length, setLength] = useState([250]) // Nombre de mots
    const [includeHobbies, setIncludeHobbies] = useState(false)
    const [emphasizeExperience, setEmphasizeExperience] = useState(true)

    const generateLetter = async () => {
        setGenerating(true)

        try {
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
                    letterTone: tone,
                    letterLength: length[0]
                })
            }

            toast.success(t('letter.generateSuccess'))
        } catch (error) {
            toast.error(t('letter.generateError'))
        } finally {
            setGenerating(false)
        }
    }

    const regenerateLetter = async () => {
        setRegenerating(true)
        await generateLetter()
        setRegenerating(false)
    }

    // Auto-generate on load if not already done
    useEffect(() => {
        if (!generatedLetter && data?.jobOffer && data?.responses) {
            generateLetter()
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

                        {/* Ton */}
                        <div>
                            <Label className="text-base mb-3 block">
                                <Zap className="inline h-4 w-4 mr-2" />
                                {t('letter.tone')}
                            </Label>
                            <RadioGroup value={tone} onValueChange={setTone}>
                                <div className="space-y-3">
                                    {tones.map((t) => (
                                        <div key={t.value} className="flex items-start">
                                            <RadioGroupItem value={t.value} id={t.value} />
                                            <div className="ml-3">
                                                <Label htmlFor={t.value} className="cursor-pointer">
                                                    {t.label}
                                                </Label>
                                                <p className="text-sm text-gray-500">{t.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
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

                        <Button
                            onClick={generateLetter}
                            className="w-full"
                            size="lg"
                            disabled={generating}
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {t('letter.generate')}
                        </Button>
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