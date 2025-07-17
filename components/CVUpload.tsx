/**
 * CV upload and analysis component
 * Supports PDF and images, automatically extracts information
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
import { supabase } from '@/lib/supabase-client'
import { useUser } from '@/hooks/useUser'
import { useI18n } from '@/lib/i18n-context'

interface CVUploadProps {
    data?: any
    onUpdate?: (data: any) => void
    onNext?: () => void
}

export default function CVUpload({ data, onUpdate, onNext }: CVUploadProps) {
    const { user } = useUser()
    const { t } = useI18n()
    const [uploading, setUploading] = useState(false)
    const [cvFile, setCvFile] = useState<File | null>(null)
    const [cvData, setCvData] = useState(data?.cvData || null)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file || !user) return

        setCvFile(file)
        setUploading(true)

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-cv-${Date.now()}.${fileExt}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('cvs')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Here you can add CV text extraction
            // For example with a Cloud function or API

            // For demo purposes, we simulate extraction
            const extractedData = {
                fileName: file.name,
                uploadPath: uploadData.path,
                // Extracted data (to implement with OCR/parsing)
                extractedText: 'CV uploaded successfully',
                skills: [],
                experiences: [],
                education: []
            }

            setCvData(extractedData)

            // Update the flow
            if (onUpdate) {
                onUpdate({
                    cvUploaded: true,
                    cvData: extractedData
                })
            }

            toast.success(t('cv.uploadSuccess'))
        } catch (error) {
            console.error('Upload error:', error)
            toast.error(t('cv.uploadError'))
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
                                ? t('cv.analyzing')
                                : isDragActive
                                    ? t('cv.dropHere')
                                    : t('cv.dragOrClick')
                            }
                        </p>

                        <p className="text-sm text-gray-500">
                            {t('cv.acceptedFormats')}
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
                                        {t('cv.uploadedSuccessfully')}
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
                                {t('cv.extractedInfo')}
                            </h4>
                            <p className="text-sm text-gray-600">
                                {t('cv.extractedDescription')}
                            </p>
                        </div>
                    </Card>

                    {onNext && (
                        <div className="mt-8 flex justify-end">
                            <Button onClick={onNext} size="lg">
                                {t('cv.continueToJob')}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    )
}