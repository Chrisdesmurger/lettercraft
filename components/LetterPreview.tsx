/**
 * Letter preview and download component
 * Allows previewing, editing and exporting the letter
 */

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Edit3,
  Copy,
  Check,
  FileText,
  Mail,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase-client";
import { useUser } from "@/hooks/useUser";
import { useI18n } from "@/lib/i18n-context";
import {
  generatePdfFromElement,
  generateTextFile,
  generateLetterPdfWithTemplate,
} from "@/lib/pdf";
import { type LetterData } from "@/lib/pdf-templates";
import PdfExportControls from "@/components/pdf/PdfExportControls";
import { ReviewSystem, ScrollProgressIndicator } from "@/components/reviews";
import { useScrollEndDetection } from "@/hooks/useScrollEndDetection";
import { LetterSections } from "@/types";
import { formatLetterSections } from "@/lib/letter-sections";
import { TONE_GUIDELINES, type ToneKey } from "@/lib/tone-guidelines";

interface LetterPreviewProps {
  data?: any;
  onUpdate?: (data: any) => void;
  onNext?: () => void;
}

export default function LetterPreview({
  data,
  onUpdate,
  onNext,
}: LetterPreviewProps) {
  const { user } = useUser();
  const { t } = useI18n();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLetter, setEditedLetter] = useState(data?.generatedLetter || "");
  const [letterSections, setLetterSections] = useState<LetterSections | null>(
    data?.sections || null,
  );
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [useNewPdfSystem, setUseNewPdfSystem] = useState(true); // Toggle pour nouveau/ancien système
  const letterRef = useRef<HTMLDivElement>(null);
  const [generatedLetterId, setGeneratedLetterId] = useState<string | null>(
    data?.letterId || null,
  );
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Détection du scroll pour l'indicateur de progression
  const { isAtEnd, scrollPercentage } = useScrollEndDetection({
    element: letterRef,
    threshold: 100,
    delay: 2000,
    enabled: !!generatedLetterId && showScrollIndicator,
  });

  // Activer l'indicateur de scroll une fois que la lettre est générée
  React.useEffect(() => {
    if (generatedLetterId && editedLetter) {
      setShowScrollIndicator(true);
    }
  }, [generatedLetterId, editedLetter]);

  // Convertir les données actuelles vers le format LetterData pour les modèles
  const letterData: LetterData = {
    content: editedLetter || data?.generatedLetter || "",
    jobTitle: data?.jobOffer?.title || "",
    company: data?.jobOffer?.company || "",
    candidateName:
      data?.profile?.first_name && data?.profile?.last_name
        ? `${data.profile.first_name} ${data.profile.last_name}`
        : user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : "",
    candidateEmail: data?.profile?.email || user?.email || "",
    candidatePhone: data?.profile?.phone || user?.user_metadata?.phone || "",
    candidateAddress: data?.profile?.address || "",
    location: data?.profile?.city || "Paris",
    date: new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  const fileName = `lettre-motivation-${data?.jobOffer?.company || "entreprise"}`;

  // Helper function to get tone display information
  const getToneDisplay = () => {
    const toneKey =
      (data?.letterToneKey as ToneKey) || data?.letterTone || "professionnel";
    const customText = data?.letterToneCustom || "";

    if (toneKey === "personnalisé" && customText) {
      return {
        label: t("questionnaire.question7.tones.custom.label"),
        description: customText,
      };
    }

    const toneGuideline =
      TONE_GUIDELINES[toneKey as Exclude<ToneKey, "personnalisé">];
    if (toneGuideline) {
      return {
        label: t(
          `questionnaire.question7.tones.${
            toneKey === "professionnel"
              ? "professional"
              : toneKey === "chaleureux"
                ? "warm"
                : toneKey === "direct"
                  ? "direct"
                  : toneKey === "persuasif"
                    ? "persuasive"
                    : toneKey === "créatif"
                      ? "creative"
                      : toneKey === "concis"
                        ? "concise"
                        : "professional"
          }.label`,
        ),
        description: toneGuideline.description,
      };
    }

    return {
      label: t("questionnaire.question7.tones.professional.label"),
      description: t("questionnaire.question7.tones.professional.description"),
    };
  };

  // Create generated letter entry in database if not exists (for review system)
  React.useEffect(() => {
    const createLetterEntry = async () => {
      if (!user || !editedLetter || generatedLetterId) return;

      try {
        console.log("Attempting to create letter entry for user:", user.id);
        console.log("Letter content length:", editedLetter.length);

        const { data: letterData, error } = await supabase
          .from("generated_letters")
          .insert({
            user_id: user.id,
            content: editedLetter,
            html_content: null,
            pdf_url: null,
            generation_settings: {
              language: data?.letterLanguage || "fr",
              tone: data?.letterTone || "professional",
              length: data?.letterLength || 300,
            },
            openai_model: "gpt-4",
            // These fields are required by schema but we'll set them to temporary values
            questionnaire_response_id: "temp-" + Date.now(),
            job_offer_id: "temp-" + Date.now(),
            cv_id: "temp-" + Date.now(),
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating letter entry:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          return;
        }

        setGeneratedLetterId(letterData.id);
        console.log("Created letter entry for reviews:", letterData.id);
      } catch (error) {
        console.error("Unexpected error creating letter entry:", error);
      }
    };

    createLetterEntry();
  }, [user, editedLetter, generatedLetterId, data]);

  const handleCopy = async () => {
    try {
      const contentToCopy = letterSections
        ? formatLetterSections(letterSections)
        : editedLetter;
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      toast.success(t("letter.copySuccess"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("letter.copyError"));
    }
  };

  const handleDownloadPDF = async () => {
    if (!letterRef.current) {
      console.error("PDF Error: letterRef.current is null");
      toast.error("Impossible de générer le PDF - élément non trouvé");
      return;
    }

    const fileName = `lettre-motivation-${data?.jobOffer?.company || "document"}`;

    console.log("Starting PDF generation:", {
      fileName,
      elementExists: !!letterRef.current,
      elementContent: letterRef.current.innerHTML.substring(0, 100) + "...",
    });

    try {
      await generatePdfFromElement(letterRef.current, fileName);
      console.log("PDF generation successful");
      toast.success(t("letter.pdfDownloaded"));
    } catch (error) {
      console.error("PDF generation error in LetterPreview:", error);
      console.error("Error details:", {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Erreur PDF: ${errorMessage}`);
    }
  };

  const handleDownloadTXT = () => {
    const fileName = `lettre-motivation-${data?.jobOffer?.company || "document"}`;

    try {
      const contentToDownload = letterSections
        ? formatLetterSections(letterSections)
        : editedLetter;
      generateTextFile(contentToDownload, fileName);
      toast.success(t("letter.txtDownloaded"));
    } catch (error) {
      console.error("TXT generation error:", error);
      toast.error(
        t("letter.txtError") || "Erreur lors de la génération du fichier texte",
      );
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const contentToSave = letterSections
        ? formatLetterSections(letterSections)
        : editedLetter;

      // Save to Supabase
      const { error } = await supabase.from("saved_letters").insert({
        user_id: user.id,
        job_title: data?.jobOffer?.title,
        company: data?.jobOffer?.company,
        content: contentToSave,
        language: data?.letterLanguage,
        metadata: {
          category: data?.category,
          tone: data?.letterTone,
          length: data?.letterLength,
          sections: letterSections, // Sauvegarder aussi les sections si disponibles
        },
      });

      if (error) throw error;

      toast.success(t("letter.saveSuccess"));
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("letter.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Si on a des sections, reconstruire le contenu complet
      if (letterSections) {
        const fullContent = formatLetterSections(letterSections);
        setEditedLetter(fullContent);
        if (onUpdate) {
          onUpdate({
            generatedLetter: fullContent,
            sections: letterSections,
          });
        }
      } else if (editedLetter !== data?.generatedLetter) {
        if (onUpdate) {
          onUpdate({ generatedLetter: editedLetter });
        }
      }
      toast.success(t("letter.changesSuccess"));
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action bar */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={toggleEdit}
              variant={isEditing ? "default" : "outline"}
              size="sm"
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("letter.save")}
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  {t("letter.edit")}
                </>
              )}
            </Button>

            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t("letter.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {t("letter.copy")}
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              disabled={saving}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("letter.save")}
                </>
              )}
            </Button>
          </div>

          {/* Export Actions - Choose between legacy and new template system */}
          <div className="flex gap-2">
            {useNewPdfSystem ? (
              /* Nouveau système avec modèles - Interface intégrée */
              <>
                <Button onClick={handleDownloadTXT} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  TXT
                </Button>
                <Button
                  onClick={() => setUseNewPdfSystem(false)}
                  variant="outline"
                  size="sm"
                  title="Basculer vers l'ancien système PDF"
                >
                  📄 PDF (Simple)
                </Button>
              </>
            ) : (
              /* Ancien système PDF */
              <>
                <Button onClick={handleDownloadTXT} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  TXT
                </Button>

                <Button onClick={handleDownloadPDF} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>

                <Button
                  onClick={() => setUseNewPdfSystem(true)}
                  variant="outline"
                  size="sm"
                  title="Basculer vers les modèles PDF"
                >
                  🎨 Modèles
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Nouveau système PDF avec modèles */}
      {useNewPdfSystem && (
        <PdfExportControls
          letterData={letterData}
          fileName={fileName}
          className="mb-6"
        />
      )}

      {/* Letter preview/edit */}
      <Card className="p-8">
        {isEditing ? (
          <div className="space-y-4">
            {letterSections ? (
              // Edition par sections si disponibles
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Objet :
                  </label>
                  <input
                    type="text"
                    value={letterSections.subject}
                    onChange={(e) =>
                      setLetterSections({
                        ...letterSections,
                        subject: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Objet de la lettre..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Salutations :
                  </label>
                  <input
                    type="text"
                    value={letterSections.greeting}
                    onChange={(e) =>
                      setLetterSections({
                        ...letterSections,
                        greeting: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Madame, Monsieur,"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Corps de la lettre :
                  </label>
                  <Textarea
                    value={letterSections.body}
                    onChange={(e) =>
                      setLetterSections({
                        ...letterSections,
                        body: e.target.value,
                      })
                    }
                    className="min-h-[400px] font-sans text-base leading-relaxed"
                    placeholder="Corps principal de la lettre..."
                  />
                </div>
              </>
            ) : (
              // Edition simple si pas de sections
              <Textarea
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
                className="min-h-[600px] font-sans text-base leading-relaxed"
                placeholder={t("letter.placeholder")}
              />
            )}
          </div>
        ) : (
          <div ref={letterRef} className="prose max-w-none">
            {letterSections ? (
              // Affichage par sections avec styles différents
              <div className="space-y-6">
                <section className="letter-subject">
                  <h1 className="text-lg font-semibold text-gray-900 mb-4">
                    Objet : {letterSections.subject}
                  </h1>
                </section>

                <section className="letter-greeting">
                  <div className="text-base font-medium text-gray-800 mb-4">
                    {letterSections.greeting}
                  </div>
                </section>

                <section className="letter-body">
                  <div className="text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {letterSections.body}
                  </div>
                </section>
              </div>
            ) : (
              // Affichage simple pour compatibilité descendante
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                {editedLetter}
              </pre>
            )}
          </div>
        )}
      </Card>

      {/* Review System - appears after letter display with auto-modal */}
      {generatedLetterId && (
        <>
          <ReviewSystem
            letterId={generatedLetterId}
            autoShow={true}
            showBadge={true}
            letterContentRef={letterRef}
            delayAfterScrollEnd={2000}
            onReviewSubmitted={(review) => {
              console.log("Review submitted in LetterPreview:", review);
              toast.success(
                t("reviews.submitSuccess") || "Merci pour votre avis !",
              );
              setShowScrollIndicator(false); // Masquer l'indicateur après soumission
            }}
          />

          {/* Scroll Progress Indicator */}
          {showScrollIndicator && (
            <ScrollProgressIndicator
              scrollPercentage={scrollPercentage}
              isAtEnd={isAtEnd}
              hasPendingReview={!!generatedLetterId}
              showOnlyWhenScrolling={true}
            />
          )}
        </>
      )}

      {/* Summary and final actions */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-green-100 rounded-full">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-2">
              {t("letter.ready")}
            </h3>
            <p className="text-green-800 text-sm mb-4">
              {t("letter.readyDesc", {
                title: data?.jobOffer?.title,
                company: data?.jobOffer?.company,
              })}
            </p>

            {/* Détails de la génération */}
            <div className="bg-white/50 rounded-md p-3 mb-4 text-xs space-y-2">
              <div className="flex flex-wrap gap-4">
                {data?.letterLanguage && (
                  <div>
                    <span className="font-medium text-green-900">
                      {t("questionnaire.question6.title")}:
                    </span>
                    <span className="text-green-800 ml-1">
                      {data.letterLanguage === "fr"
                        ? "Français"
                        : data.letterLanguage === "en"
                          ? "English"
                          : data.letterLanguage === "es"
                            ? "Español"
                            : data.letterLanguage === "de"
                              ? "Deutsch"
                              : data.letterLanguage === "it"
                                ? "Italiano"
                                : data.letterLanguage}
                    </span>
                  </div>
                )}

                {(data?.letterToneKey || data?.letterTone) && (
                  <div>
                    <span className="font-medium text-green-900">
                      {t("flow.toneUsed")}:
                    </span>
                    <span className="text-green-800 ml-1">
                      {getToneDisplay().label}
                    </span>
                    {getToneDisplay().description &&
                      getToneDisplay().description !==
                        getToneDisplay().label && (
                        <span className="text-green-700 ml-1 italic">
                          ({getToneDisplay().description})
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                size="sm"
              >
                {t("letter.backToDashboard")}
              </Button>
              <Button onClick={() => window.location.reload()} size="sm">
                {t("letter.createNew")}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
