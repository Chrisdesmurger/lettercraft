/**
 * Composant de génération et personnalisation de la lettre
 * Utilise l'IA pour créer une lettre personnalisée
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

const tones = [
    { value: 'professional', label: 'Professionnel', description: 'Formel et structuré' },
    { value: 'enthusiastic', label: 'Enthousiaste', description: 'Dynamique et motivé' },
    { value: 'creative', label: 'Créatif', description: 'Original et unique' },
]

export default function LetterGenerator({ data, onUpdate, onNext }: LetterGeneratorProps) {
    const [generating, setGenerating] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [generatedLetter, setGeneratedLetter] = useState(data?.generatedLetter || '')

    // Paramètres de génération
    const [language, setLanguage] = useState(data?.letterLanguage || 'fr')
    const [tone, setTone] = useState('professional')
    const [length, setLength] = useState([250]) // Nombre de mots
    const [includeHobbies, setIncludeHobbies] = useState(false)
    const [emphasizeExperience, setEmphasizeExperience] = useState(true)

    const generateLetter = async () => {
        setGenerating(true)

        try {
            // Simulation de la génération (à remplacer par votre appel API OpenAI)
            await new Promise(resolve => setTimeout(resolve, 3000))

            // Lettre générée (à implémenter avec votre logique)
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

            toast.success('Lettre générée avec succès!')
        } catch (error) {
            toast.error('Erreur lors de la génération')
        } finally {
            setGenerating(false)
        }
    }

    const regenerateLetter = async () => {
        setRegenerating(true)
        await generateLetter()
        setRegenerating(false)
    }

    // Générer automatiquement au chargement si pas déjà fait
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
                    <h3 className="text-xl font-semibold">Génération en cours...</h3>
                    <p className="text-gray-600">
                        Notre IA crée votre lettre de motivation personnalisée
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
                                Personnalisez votre lettre
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Ajustez les paramètres pour obtenir une lettre qui vous ressemble
                            </p>
                        </div>

                        {/* Langue */}
                        <div>
                            <Label className="text-base mb-3 block">
                                <Globe className="inline h-4 w-4 mr-2" />
                                Langue de la lettre
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
                                Ton de la lettre
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
                                Longueur de la lettre ({length[0]} mots)
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
                                <span>Concise</span>
                                <span>Détaillée</span>
                            </div>
                        </div>

                        {/* Options supplémentaires */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="hobbies" className="cursor-pointer">
                                    Inclure mes centres d'intérêt
                                </Label>
                                <Switch
                                    id="hobbies"
                                    checked={includeHobbies}
                                    onCheckedChange={setIncludeHobbies}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="experience" className="cursor-pointer">
                                    Mettre en avant mon expérience
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
                            Générer ma lettre
                        </Button>
                    </div>
                </Card>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    {/* Options de personnalisation rapide */}
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Button
                                    onClick={() => setGeneratedLetter('')}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Paramètres
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
                                    Régénérer
                                </Button>
                            </div>
                            <div className="text-sm text-gray-500">
                                {length[0]} mots • {language.toUpperCase()}
                            </div>
                        </div>
                    </Card>

                    {/* Aperçu de la lettre */}
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
                                Voir l'aperçu final
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}