import { useEffect, useState } from "react";
import Tesseract from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import { supabase } from "@/lib/supabase-client";

GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ExtractedProfile {
  first_name?: string;
  last_name?: string;
  experiences?: string[];
  skills?: string[];
  education?: string[];
}

export function useExtractCVData(
  profileId: string | null,
  filePath: string | null,
) {
  const [data, setData] = useState<ExtractedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId || !filePath) return;

    const run = async () => {
      setLoading(true);
      try {
        const { data: file, error: dlError } = await supabase.storage
          .from("documents")
          .download(filePath);
        if (dlError || !file) throw dlError || new Error("download failed");

        let text = "";
        if (filePath.endsWith(".txt")) {
          text = await file.text();
        } else if (filePath.endsWith(".pdf")) {
          text = await extractPdfText(file);
        } else {
          const { data: ocr } = await Tesseract.recognize(file, "fra+eng");
          text = ocr.text;
        }

        const extracted = parseText(text);

        await supabase
          .from("candidates_profile")
          .update(extracted)
          .eq("id", profileId);

        setData(extracted);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [profileId, filePath]);

  return { data, loading, error };
}

async function extractPdfText(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    text += "\n";
  }
  return text;
}

function parseText(text: string): ExtractedProfile {
  const firstNameMatch = text.match(/Pr[eé]nom[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ'-]+)/i);
  const lastNameMatch = text.match(/Nom[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ'-]+)/i);

  const expMatch = text.match(
    /(?:Exp[ée]riences?|Experience)([\s\S]*?)(?:Comp[ée]tences|Skills|$)/i,
  );
  const experiences = expMatch
    ? expMatch[1]
        .split(/\n+/)
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;

  const skillsMatch = text.match(
    /(?:Comp[ée]tences|Skills)([\s\S]*?)(?:Formation|Education|$)/i,
  );
  const skills = skillsMatch
    ? skillsMatch[1]
        .split(/[,\n]+/)
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;

  const eduMatch = text.match(
    /(?:Formation|Education)([\s\S]*?)(?:Exp[ée]riences?|Skills|$)/i,
  );
  const education = eduMatch
    ? eduMatch[1]
        .split(/\n+/)
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;

  return {
    first_name: firstNameMatch ? firstNameMatch[1] : undefined,
    last_name: lastNameMatch ? lastNameMatch[1] : undefined,
    experiences,
    skills,
    education,
  };
}
