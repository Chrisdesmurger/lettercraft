/**
 * Composant pour extraire et analyser une offre d'emploi
 * Supporte le texte, les liens et les photos d'offres
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Link,
    FileText,
    Camera,
    ChevronRight,
    Loader2,
    Check,
    Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

interface JobOfferExtractorProps {
    data?: any
    onUpdate?: (data: any) => void
    onNext?: () => void
}

export default function JobOfferExtractor({ data, onUpdate, onNext }: JobOfferExtractorProps) {
    const [extracting, setExtracting] = useState(false)
    const [jobData, setJobData] = useState(data?.jobOffer || null)
    const [inputType, setInputType] = useState<'text' | 'url' | 'photo'>('text')
    const [textInput, setTextInput] = useState('')
    const [urlInput, setUrlInput] = useState('')

    const extractJobOffer = async () => {
        setExtracting(true)

        try {
            // Simulation de l'extraction (à remplacer par votre logique réelle)
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Données extraites (à implémenter avec IA/parsing)
            const extracted = {
                title: 'Développeur Full Stack React/Node.js',
                company: 'TechCorp',
                location: 'Paris, France',
                type: 'CDI',
                description: textInput || 'Description extraite de l\'offre...',
                requirements: [
                    '3+ ans d\'expérience en React',
                    'Maîtrise de Node.js',
                    'Expérience avec les bases de données SQL'
                ],
                benefits: [
                    'Télétravail flexible',
                    'Formation continue',
                    'Équipe internationale'
                ]
            }

            setJobData(extracted)

            if (onUpdate) {
                onUpdate({ jobOffer: extracted })
            }

            toast.success('Offre d\'emploi analysée avec succès!')
        } catch (error) {
            toast.error('Erreur lors de l\'analyse')
        } finally {
            setExtracting(false)
        }
    }

    const resetJobOffer = () => {
        setJobData(null)
        setTextInput('')
        setUrlInput('')
        if (onUpdate) {
            onUpdate({ jobOffer: null })
        }
    }

    if (jobData) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto"
            >
                <Card className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center">
                            <Check className="h-5 w-5 mr-2 text-green-500" />
                            Offre analysée
                        </h3>
                        <Button
                            onClick={resetJobOffer}
                            variant="outline"
                            size="sm"
                        >
                            Modifier
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Poste</p>
                            <p className="font-medium">{jobData.title}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Entreprise</p>
                                <p className="font-medium">{jobData.company}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Localisation</p>
                                <p className="font-medium">{jobData.location}</p>
                            </div>
                        </div>

                        {jobData.requirements && (
                            <div>
                                <p className="text-sm text-gray-500 mb-2">Compétences requises</p>
                                <ul className="space-y-1">
                                    {jobData.requirements.map((req: string, index: number) => (
                                        <li key={index} className="text-sm flex items-start">
                                            <span className="text-primary mr-2">•</span>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>

                {onNext && (
                    <div className="mt-8 flex justify-end">
                        <Button onClick={onNext} size="lg">
                            Générer ma lettre
                            <Sparkles className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </motion.div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Tabs value={inputType} onValueChange={(v) => setInputType(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text">
                        <FileText className="h-4 w-4 mr-2" />
                        Texte
                    </TabsTrigger>
                    <TabsTrigger value="url">
                        <Link className="h-4 w-4 mr-2" />
                        Lien
                    </TabsTrigger>
                    <TabsTrigger value="photo">
                        <Camera className="h-4 w-4 mr-2" />
                        Photo
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-6">
                    <Card className="p-6">
                        <Textarea
                            placeholder="Collez ici le texte de l'offre d'emploi..."
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            rows={10}
                            className="mb-4"
                        />
                        <Button
                            onClick={extractJobOffer}
                            disabled={!textInput.trim() || extracting}
                            className="w-full"
                        >
                            {extracting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyse en cours...
                                </>
                            ) : (
                                'Analyser l\'offre'
                            )}
                        </Button>
                    </Card>
                </TabsContent>

                <TabsContent value="url" className="mt-6">
                    <Card className="p-6">
                        <Input
                            placeholder="https://exemple.com/offre-emploi"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className="mb-4"
                        />
                        <Button
                            onClick={extractJobOffer}
                            disabled={!urlInput.trim() || extracting}
                            className="w-full"
                        >
                            {extracting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Extraction en cours...
                                </>
                            ) : (
                                'Extraire depuis le lien'
                            )}
                        </Button>
                    </Card>
                </TabsContent>

                <TabsContent value="photo" className="mt-6">
                    <Card className="p-6">
                        <div className="text-center text-gray-500 mb-4">
                            <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p>Fonctionnalité photo à venir</p>
                            <p className="text-sm mt-2">
                                Vous pourrez bientôt prendre en photo une offre d'emploi
                            </p>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}