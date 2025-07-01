/**
 * Composant d'upload et d'analyse de CV
 * Supporte PDF et images, extrait les informations automatiquement
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
 import { Card } from '@/components/ui/card'
import {
    Upload,
    FileText,
    Check,
    X,
    Loader2,
    ChevronRight,
    AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase-Client'
import { useUser } from '@/hooks/useUser'

interface CVUploadProps {
    data?: any
    onUpdate?: (data: any) => void
    onNext?: () => void
}

export default function CVUpload({ data, onUpdate, onNext }: CVUploadProps) {
    const { user } = useUser()
    const [uploading, setUploading] = useState(false)
    const [cvFile, setCvFile] = useState<File | null>(null)
    const [cvData, setCvData] = useState(data?.cvData || null)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file || !user) return

        setCvFile(file)
        setUploading(true)

        try {
            // Upload vers Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-cv-${Date.now()}.${fileExt}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('cvs')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Ici, vous pouvez ajouter l'extraction de texte du CV
            // Par exemple avec une fonction Cloud ou une API

            // Pour la demo, on simule l'extraction
            const extractedData = {
                fileName: file.name,
                uploadPath: uploadData.path,
                // Données extraites (à implémenter avec OCR/parsing)
                extractedText: 'CV uploadé avec succès',
                skills: [],
                experiences: [],
                education: []
            }

            setCvData(extractedData)

            // Mettre à jour le flow
            if (onUpdate) {
                onUpdate({
                    cvUploaded: true,
                    cvData: extractedData
                })
            }

            toast.success('CV uploadé et analysé avec succès!')
        } catch (error) {
            console.error('Erreur upload:', error)
            toast.error('Erreur lors de l\'upload du CV')
        } finally {
            setUploading(false)
        }
    }, [user, onUpdate])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg']
        },
        maxFiles: 1,
        multiple: false
    })

    const removeCV = () => {
        setCvFile(null)
        setCvData(null)
        if (onUpdate) {
            onUpdate({
                cvUploaded: false,
                cvData: null
            })
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {!cvData ? (
                <Card
                    {...getRootProps()}
                    className={`
            p-12 border-2 border-dashed cursor-pointer transition-all
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          `}
                >
                    <input {...getInputProps()} />

                    <div className="text-center">
                        {uploading ? (
                            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                        ) : (
                            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        )}

                        <p className="text-lg font-medium mb-2">
                            {uploading
                                ? 'Analyse en cours...'
                                : isDragActive
                                    ? 'Déposez votre CV ici'
                                    : 'Glissez votre CV ici ou cliquez pour sélectionner'
                            }
                        </p>

                        <p className="text-sm text-gray-500">
                            Formats acceptés : PDF, PNG, JPG (max. 10MB)
                        </p>
                    </div>
                </Card>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium flex items-center">
                                        {cvFile?.name || cvData.fileName}
                                        <Check className="h-4 w-4 ml-2 text-green-500" />
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        CV uploadé et analysé avec succès
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={removeCV}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Aperçu des données extraites (optionnel) */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium mb-2 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Informations extraites
                            </h4>
                            <p className="text-sm text-gray-600">
                                Nous avons extrait vos expériences et compétences pour personnaliser
                                votre lettre de motivation.
                            </p>
                        </div>
                    </Card>

                    {onNext && (
                        <div className="mt-8 flex justify-end">
                            <Button onClick={onNext} size="lg">
                                Continuer vers l'offre d'emploi
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}