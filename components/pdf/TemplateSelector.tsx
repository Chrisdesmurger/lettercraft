'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Palette,
  Check,
  Eye,
  Sparkles,
  FileText,
  Briefcase,
  Zap
} from 'lucide-react'
import { PDF_TEMPLATES, PdfTemplate } from '@/lib/pdf-templates'

interface TemplateSelectorProps {
  selectedTemplateId?: string
  onTemplateSelect: (templateId: string) => void
  className?: string
}

const templateIcons = {
  classic: FileText,
  modern: Briefcase,
  elegant: Sparkles,
  creative: Zap
}

const templateColors = {
  classic: 'bg-gray-100 hover:bg-gray-200 border-gray-300',
  modern: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
  elegant: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
  creative: 'bg-gradient-to-r from-pink-100 to-cyan-100 hover:from-pink-200 hover:to-cyan-200 border-pink-300'
}

export default function TemplateSelector({ 
  selectedTemplateId = 'classic', 
  onTemplateSelect,
  className = ''
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedTemplate = PDF_TEMPLATES.find(t => t.id === selectedTemplateId) || PDF_TEMPLATES[0]

  const handleTemplateSelect = (templateId: string) => {
    onTemplateSelect(templateId)
    setIsOpen(false)
  }

  return (
    <div className={className}>
      <Button 
        variant="outline" 
        className="w-full justify-start"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Palette className="h-4 w-4 mr-2" />
        Modèle: {selectedTemplate.name}
      </Button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Choisir un modèle de lettre
                </h2>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  ✕
                </Button>
              </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {PDF_TEMPLATES.map((template) => {
              const Icon = templateIcons[template.id as keyof typeof templateIcons] || FileText
              const isSelected = template.id === selectedTemplateId
              
              return (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:shadow-md'
                  } ${templateColors[template.id as keyof typeof templateColors]}`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-2" />
                        {template.name}
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Sélectionné
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    
                    {/* Aperçu miniature du style */}
                    <div className="border rounded-lg p-3 bg-white shadow-sm">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <div className={`w-24 h-2 rounded ${
                            template.id === 'classic' ? 'bg-gray-400' :
                            template.id === 'modern' ? 'bg-blue-400' :
                            template.id === 'elegant' ? 'bg-gradient-to-r from-purple-400 to-blue-400' :
                            'bg-gradient-to-r from-pink-400 to-cyan-400'
                          }`} />
                          <div className="w-16 h-1 bg-gray-300 rounded" />
                        </div>
                        <div className="w-full h-1 bg-gray-200 rounded" />
                        <div className="w-full h-1 bg-gray-200 rounded" />
                        <div className="w-3/4 h-1 bg-gray-200 rounded" />
                        <div className="mt-2 flex justify-end">
                          <div className="w-20 h-1 bg-gray-300 rounded" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Caractéristiques */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.id === 'classic' && (
                        <>
                          <Badge variant="secondary" className="text-xs">Times New Roman</Badge>
                          <Badge variant="secondary" className="text-xs">Traditionnel</Badge>
                        </>
                      )}
                      {template.id === 'modern' && (
                        <>
                          <Badge variant="secondary" className="text-xs">Sans-serif</Badge>
                          <Badge variant="secondary" className="text-xs">Épuré</Badge>
                        </>
                      )}
                      {template.id === 'elegant' && (
                        <>
                          <Badge variant="secondary" className="text-xs">Georgia</Badge>
                          <Badge variant="secondary" className="text-xs">Couleurs</Badge>
                        </>
                      )}
                      {template.id === 'creative' && (
                        <>
                          <Badge variant="secondary" className="text-xs">Moderne</Badge>
                          <Badge variant="secondary" className="text-xs">Créatif</Badge>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
              <div className="flex justify-between items-center pt-4 border-t mt-6">
                <p className="text-sm text-muted-foreground">
                  Sélectionnez un modèle qui correspond à votre secteur d'activité
                </p>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}