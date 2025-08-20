/**
 * CV upload and analysis component
 * Supports PDF and images, automatically extracts information
 */

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Check,
  X,
  Loader2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase-client";
import { useUser } from "@/hooks/useUser";
import { useI18n } from "@/lib/i18n-context";

interface CVUploadProps {
  data?: any;
  onUpdate?: (data: any) => void;
  onNext?: () => void;
}

export default function CVUpload({ data, onUpdate, onNext }: CVUploadProps) {
  const { user } = useUser();
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvData, setCvData] = useState(data?.cvData || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !user) return;

      setCvFile(file);
      setUploading(true);

      try {
        console.log(
          "🔍 [CV-UPLOAD] Starting CV upload and extraction for file:",
          file.name,
        );

        // Get user session for authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        // Upload to Supabase Storage via API (évite CORS)
        console.log("🔍 [CV-UPLOAD] Uploading via API...");
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const uploadResponse = await fetch("/api/upload-cv", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error("❌ [CV-UPLOAD] Upload API error:", errorData);
          throw new Error(errorData.error || "Erreur lors de l'upload");
        }

        const uploadResult = await uploadResponse.json();
        console.log(
          "✅ [CV-UPLOAD] File uploaded to storage:",
          uploadResult.data.path,
        );

        // Extract CV data using OpenAI API
        console.log("🔍 [CV-UPLOAD] Starting CV text extraction...");
        const formData = new FormData();
        formData.append("file", file);

        const extractResponse = await fetch("/api/extract-cv", {
          method: "POST",
          body: formData,
        });

        if (!extractResponse.ok) {
          const errorData = await extractResponse.json();
          console.error("❌ [CV-UPLOAD] Extraction API error:", errorData);
          throw new Error(
            errorData.error || "Erreur lors de l'extraction du CV",
          );
        }

        const extractedInfo = await extractResponse.json();
        console.log("✅ [CV-UPLOAD] CV extracted successfully:", extractedInfo);

        // ATTENDRE et VALIDER que toutes les données OpenAI sont bien reçues
        console.log(
          "🔍 [CV-UPLOAD] Validating extracted data before DB insertion...",
        );
        console.log("🔍 [CV-UPLOAD] Raw OpenAI response structure:", {
          hasFirstName: !!extractedInfo.first_name,
          hasLastName: !!extractedInfo.last_name,
          skillsCount: extractedInfo.skills?.length || 0,
          experiencesCount: extractedInfo.experiences?.length || 0,
          educationCount: extractedInfo.education?.length || 0,
          hasStructuredData: !!extractedInfo.structured_data,
          allKeys: Object.keys(extractedInfo),
        });

        // S'assurer que l'extraction s'est bien passée avant de continuer
        if (!extractedInfo || typeof extractedInfo !== "object") {
          throw new Error(
            "Données d'extraction OpenAI invalides ou incomplètes",
          );
        }

        // Combine storage info with extracted data
        const extractedData = {
          fileName: file.name,
          uploadPath: uploadResult.data.path,
          extractedText: "CV analysé avec succès",
          first_name: extractedInfo.first_name || "",
          last_name: extractedInfo.last_name || "",
          skills: extractedInfo.skills || [],
          experiences: extractedInfo.experiences || [],
          education: extractedInfo.education || [],
          structured_data: extractedInfo.structured_data || null,
        };

        setCvData(extractedData);

        // ATTENDRE un petit délai pour s'assurer que tout est bien traité
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Sauvegarder le CV dans la base de données et l'activer automatiquement
        console.log(
          "🔍 [CV-UPLOAD] Starting database insertion after OpenAI processing complete...",
        );
        console.log("🔍 [CV-UPLOAD] Data to insert:", {
          first_name: extractedInfo.first_name,
          last_name: extractedInfo.last_name,
          email: extractedInfo.email,
          phone: extractedInfo.phone,
          skills_length: extractedInfo.skills?.length,
          experiences_length: extractedInfo.experiences?.length,
          education_length: extractedInfo.education?.length,
          has_structured_data: !!extractedInfo.structured_data,
        });

        // Debugging: Afficher les données exactes qu'on va insérer
        console.log(
          "🔍 [CV-UPLOAD] DEBUGGING - Full extractedInfo object:",
          extractedInfo,
        );

        // D'abord, désactiver tous les CV existants de l'utilisateur
        const { error: deactivateError } = await supabase
          .from("candidates_profile")
          .update({ is_active: false })
          .eq("user_id", user.id);

        if (deactivateError) {
          console.error(
            "❌ [CV-UPLOAD] Error deactivating existing CVs:",
            deactivateError,
          );
        }

        // Créer l'URL publique du fichier
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("documents")
          .getPublicUrl(uploadResult.data.path);

        // Créer le titre : utiliser le nom/prénom extrait ou fallback sur nom de fichier
        const cvTitle = (() => {
          const firstName = extractedInfo.first_name?.trim() || "";
          const lastName = extractedInfo.last_name?.trim() || "";

          console.log("🔍 [CV-UPLOAD] Title generation - Raw extracted data:", {
            first_name: extractedInfo.first_name,
            last_name: extractedInfo.last_name,
            firstName,
            lastName,
            fileName: file.name,
          });

          if (firstName && lastName) {
            const title = `CV ${firstName} ${lastName}`;
            console.log("🔍 [CV-UPLOAD] Using full name title:", title);
            return title;
          } else if (firstName || lastName) {
            const title = `CV ${firstName || lastName}`;
            console.log("🔍 [CV-UPLOAD] Using single name title:", title);
            return title;
          } else {
            // Fallback: utiliser le nom du fichier sans extension, nettoyé
            const rawFileName = file.name;
            console.log(
              "🔍 [CV-UPLOAD] No names extracted, using filename fallback. Raw filename:",
              rawFileName,
            );

            const cleanFileName = rawFileName
              .replace(/\.[^/.]+$/, "") // Supprimer l'extension
              .replace(/[_-]/g, " ") // Remplacer _ et - par des espaces
              .replace(/\s+/g, " ") // Normaliser les espaces multiples
              .trim();

            console.log("🔍 [CV-UPLOAD] Cleaned filename:", cleanFileName);

            if (cleanFileName && cleanFileName.length > 0) {
              const title = cleanFileName;
              console.log(
                "🔍 [CV-UPLOAD] Using cleaned filename as title:",
                title,
              );
              return title;
            } else {
              const dateTitle = `CV ${new Date().toLocaleDateString("fr-FR")}`;
              console.log(
                "🔍 [CV-UPLOAD] Using date fallback title:",
                dateTitle,
              );
              return dateTitle;
            }
          }
        })();

        console.log("🔍 [CV-UPLOAD] Generated title:", cvTitle);

        // Vérification de sécurité : s'assurer que le titre n'est jamais vide
        const finalTitle =
          cvTitle && cvTitle.trim().length > 0
            ? cvTitle.trim()
            : `CV ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

        console.log(
          "🔍 [CV-UPLOAD] Final title after safety check:",
          finalTitle,
        );

        // Préparer les données avec les types corrects selon la vraie structure de la table
        const insertData = {
          user_id: user.id, // UUID requis
          title: finalTitle, // TEXT NOT NULL - GARANTI NON VIDE
          language: "fr", // TEXT NOT NULL - CRITIQUE !
          description:
            extractedInfo.structured_data?.professional_summary?.trim() || null, // TEXT nullable
          file_url: publicUrl, // TEXT NOT NULL
          file_size: file.size, // BIGINT nullable
          first_name: extractedInfo.first_name?.trim() || null, // TEXT nullable
          last_name: extractedInfo.last_name?.trim() || null, // TEXT nullable
          skills: extractedInfo.skills || [], // ARRAY nullable
          experiences: extractedInfo.experiences || [], // ARRAY nullable
          education: extractedInfo.education || [], // ARRAY nullable
          is_active: true, // BOOLEAN nullable, default false
          // uploaded_at sera automatiquement défini par la DB (default now())
        };

        console.log(
          "🔍 [CV-UPLOAD] Final insert data with correct types:",
          insertData,
        );

        // Insérer le nouveau CV et l'activer immédiatement
        const { data: cvRecord, error: insertError } = await supabase
          .from("candidates_profile")
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error(
            "❌ [CV-UPLOAD] Error saving CV metadata:",
            insertError,
          );
          console.error("❌ [CV-UPLOAD] Full error details:", {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          });
          console.error("❌ [CV-UPLOAD] Failed insertion data was:", {
            user_id: user.id,
            title: cvTitle,
            language: "fr",
            description:
              extractedInfo.structured_data?.professional_summary ||
              `CV extrait automatiquement le ${new Date().toLocaleDateString("fr-FR")}`,
            file_url: publicUrl,
            file_size: file.size,
            first_name: extractedInfo.first_name?.trim() || null,
            last_name: extractedInfo.last_name?.trim() || null,
            skills: extractedInfo.skills || [],
            experiences: extractedInfo.experiences || [],
            education: extractedInfo.education || [],
            is_active: true,
          });

          // Test avec API de debug
          console.log("🔍 [CV-UPLOAD] Testing with debug API...");
          try {
            const testResponse = await fetch("/api/test-cv-insert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            const testResult = await testResponse.json();
            console.log("🔍 [CV-UPLOAD] Test API result:", testResult);
          } catch (testError) {
            console.error("❌ [CV-UPLOAD] Test API failed:", testError);
          }

          toast.error(
            `CV uploadé mais erreur lors de la sauvegarde: ${insertError.message} (Code: ${insertError.code})`,
          );
        } else {
          console.log(
            "✅ [CV-UPLOAD] CV metadata saved and activated successfully!",
          );
          console.log("✅ [CV-UPLOAD] Saved CV record:", cvRecord);
          console.log("✅ [CV-UPLOAD] CV is now active with ID:", cvRecord?.id);
        }

        // Update the flow - ATTENTION: ne pas passer toutes les données à onUpdate !
        if (onUpdate) {
          console.log("🔍 [CV-UPLOAD] Calling onUpdate with basic data only");
          onUpdate({
            cvUploaded: true,
            cvData: {
              // Passer seulement les données de base pour éviter le PATCH qui échoue
              fileName: file.name,
              uploadPath: uploadResult.data.path,
              first_name: extractedInfo.first_name || "",
              last_name: extractedInfo.last_name || "",
              skills: extractedInfo.skills || [],
              experiences: extractedInfo.experiences || [],
              education: extractedInfo.education || [],
              is_active: true,
            },
          });
        }

        toast.success(t("cv.uploadSuccess"));
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(t("cv.uploadError"));
      } finally {
        setUploading(false);
      }
    },
    [user, onUpdate],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeCV = () => {
    setCvFile(null);
    setCvData(null);
    if (onUpdate) {
      onUpdate({
        cvUploaded: false,
        cvData: null,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!cvData ? (
        <Card
          {...getRootProps()}
          className={`
            p-12 border-2 border-dashed cursor-pointer transition-all
            ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}
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
                ? t("cv.analyzing")
                : isDragActive
                  ? t("cv.dropHere")
                  : t("cv.dragOrClick")}
            </p>

            <p className="text-sm text-gray-500">{t("cv.acceptedFormats")}</p>
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
                    {t("cv.uploadedSuccessfully")}
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
                {t("cv.extractedInfo")}
              </h4>
              <p className="text-sm text-gray-600">
                {t("cv.extractedDescription")}
              </p>
            </div>
          </Card>

          {onNext && (
            <div className="mt-8 flex justify-end">
              <Button onClick={onNext} size="lg">
                {t("cv.continueToJob")}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
