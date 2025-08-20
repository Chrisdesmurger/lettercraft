"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Check,
  Eye,
  Sparkles,
  FileText,
  Briefcase,
  Zap,
  Lock,
  ExternalLink,
} from "lucide-react";
import { PDF_TEMPLATES, PdfTemplate } from "@/lib/pdf-templates";
import { useI18n } from "@/lib/i18n-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import Link from "next/link";

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string) => void;
  className?: string;
}

// Définir les modèles premium (tous sauf 'classic')
const PREMIUM_TEMPLATES = ["modern", "elegant", "creative"];

const templateIcons = {
  classic: FileText,
  modern: Briefcase,
  elegant: Sparkles,
  creative: Zap,
};

const templateColors = {
  classic: "bg-gray-100 hover:bg-gray-200 border-gray-300",
  modern: "bg-blue-100 hover:bg-blue-200 border-blue-300",
  elegant: "bg-purple-100 hover:bg-purple-200 border-purple-300",
  creative:
    "bg-gradient-to-r from-pink-100 to-cyan-100 hover:from-pink-200 hover:to-cyan-200 border-pink-300",
};

export default function TemplateSelector({
  selectedTemplateId = "classic",
  onTemplateSelect,
  className = "",
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const { profile } = useUserProfile();

  const selectedTemplate =
    PDF_TEMPLATES.find((t) => t.id === selectedTemplateId) || PDF_TEMPLATES[0];
  const isPremium = profile?.subscription_tier === "premium";

  // Fonction pour vérifier si un template est accessible
  const isTemplateAccessible = (templateId: string) => {
    return templateId === "classic" || isPremium;
  };

  const handleTemplateSelect = (templateId: string) => {
    // Vérifier l'accès au template
    if (!isTemplateAccessible(templateId)) {
      return; // Ne pas permettre la sélection si pas d'accès
    }
    onTemplateSelect(templateId);
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Palette className="h-4 w-4 mr-2" />
        {t("pdfTemplates.title")}:{" "}
        {t(`pdfTemplates.templates.${selectedTemplate.id}.name`)}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  {t("pdfTemplates.titleFull")}
                </h2>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  ✕
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                {PDF_TEMPLATES.map((template) => {
                  const Icon =
                    templateIcons[template.id as keyof typeof templateIcons] ||
                    FileText;
                  const isSelected = template.id === selectedTemplateId;
                  const isAccessible = isTemplateAccessible(template.id);
                  const isPremiumTemplate = PREMIUM_TEMPLATES.includes(
                    template.id,
                  );

                  return (
                    <Card
                      key={template.id}
                      className={`transition-all duration-200 ${
                        isAccessible
                          ? `cursor-pointer ${
                              isSelected
                                ? "ring-2 ring-primary border-primary"
                                : "hover:shadow-md"
                            }`
                          : "cursor-not-allowed opacity-50"
                      } ${templateColors[template.id as keyof typeof templateColors]} ${
                        !isAccessible ? "blur-[2px] hover:blur-[1px]" : ""
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      {!isAccessible && (
                        <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center z-10">
                          <div className="bg-white bg-opacity-90 rounded-full p-2 shadow-lg">
                            <Lock className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                      )}
                      <CardHeader className="pb-3 relative">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon className="h-5 w-5 mr-2" />
                            {t(`pdfTemplates.templates.${template.id}.name`)}
                            {isPremiumTemplate && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              {t("pdfTemplates.selected")}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>

                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {t(
                            `pdfTemplates.templates.${template.id}.description`,
                          )}
                        </p>

                        {/* Aperçu miniature du style */}
                        <div className="border rounded-lg p-3 bg-white shadow-sm">
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <div
                                className={`w-24 h-2 rounded ${
                                  template.id === "classic"
                                    ? "bg-gray-400"
                                    : template.id === "modern"
                                      ? "bg-blue-400"
                                      : template.id === "elegant"
                                        ? "bg-gradient-to-r from-purple-400 to-blue-400"
                                        : "bg-gradient-to-r from-pink-400 to-cyan-400"
                                }`}
                              />
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
                          {template.id === "classic" && (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                Times New Roman
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Traditionnel
                              </Badge>
                            </>
                          )}
                          {template.id === "modern" && (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                Sans-serif
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Épuré
                              </Badge>
                            </>
                          )}
                          {template.id === "elegant" && (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                Georgia
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Couleurs
                              </Badge>
                            </>
                          )}
                          {template.id === "creative" && (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                Moderne
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Créatif
                              </Badge>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t mt-6">
                <div className="flex items-center space-x-3">
                  <p className="text-sm text-muted-foreground">
                    {t("pdfTemplates.subtitleFull")}
                  </p>
                  {!isPremium && (
                    <Link href="/profile?tab=subscription">
                      <Button size="sm" className="h-7 text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {t("subscription.upgradeToPremium")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t("pdfTemplates.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
