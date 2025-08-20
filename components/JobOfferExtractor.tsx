/**
 * Component for extracting and analyzing job offers
 * Supports text, links and photos of job offers
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link,
  FileText,
  Camera,
  ChevronRight,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n-context";

interface JobOfferExtractorProps {
  data?: any;
  onUpdate?: (data: any) => void;
  onNext?: () => void;
}

export default function JobOfferExtractor({
  data,
  onUpdate,
  onNext,
}: JobOfferExtractorProps) {
  const { t } = useI18n();
  const [extracting, setExtracting] = useState(false);
  const [jobData, setJobData] = useState(data?.jobOffer || null);
  const [inputType, setInputType] = useState<"text" | "url" | "photo">("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const extractJobOffer = async () => {
    setExtracting(true);

    try {
      // Extraction simulation (replace with your actual logic)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Extracted data (implement with AI/parsing)
      const extracted = {
        title: "Développeur Full Stack React/Node.js",
        company: "TechCorp",
        location: "Paris, France",
        type: "CDI",
        description: textInput || "Description extracted from offer...",
        requirements: [
          "3+ ans d'expérience en React",
          "Maîtrise de Node.js",
          "Expérience avec les bases de données SQL",
        ],
        benefits: [
          "Télétravail flexible",
          "Formation continue",
          "Équipe internationale",
        ],
      };

      setJobData(extracted);

      if (onUpdate) {
        onUpdate({ jobOffer: extracted });
      }

      toast.success(t("job.analysisSuccess"));
    } catch (error) {
      toast.error(t("job.analysisError"));
    } finally {
      setExtracting(false);
    }
  };

  const resetJobOffer = () => {
    setJobData(null);
    setTextInput("");
    setUrlInput("");
    if (onUpdate) {
      onUpdate({ jobOffer: null });
    }
  };

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
              {t("job.analysisComplete")}
            </h3>
            <Button onClick={resetJobOffer} variant="outline" size="sm">
              {t("job.modify")}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">{t("job.position")}</p>
              <p className="font-medium">{jobData.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t("job.company")}</p>
                <p className="font-medium">{jobData.company}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t("job.location")}</p>
                <p className="font-medium">{jobData.location}</p>
              </div>
            </div>

            {jobData.requirements && (
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  {t("job.requirements")}
                </p>
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
              {t("job.generateLetter")}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Tabs value={inputType} onValueChange={(v) => setInputType(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text">
            <FileText className="h-4 w-4 mr-2" />
            {t("job.text")}
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link className="h-4 w-4 mr-2" />
            {t("job.link")}
          </TabsTrigger>
          <TabsTrigger value="photo">
            <Camera className="h-4 w-4 mr-2" />
            {t("job.photo")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-6">
          <Card className="p-6">
            <Textarea
              placeholder={t("job.textPlaceholder")}
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
                  {t("job.analyzing")}
                </>
              ) : (
                t("job.analyzeOffer")
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="mt-6">
          <Card className="p-6">
            <Input
              placeholder={t("job.urlPlaceholder")}
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
                  {t("job.extracting")}
                </>
              ) : (
                t("job.extractFromLink")
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="photo" className="mt-6">
          <Card className="p-6">
            <div className="text-center text-gray-500 mb-4">
              <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>{t("job.photoFeatureComingSoon")}</p>
              <p className="text-sm mt-2">{t("job.photoFeatureDesc")}</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
