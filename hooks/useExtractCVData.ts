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

        const response = await fetch('/api/extract-cv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (!response.ok) throw new Error('extraction failed')
        const extracted: ExtractedProfile = await response.json()

        await supabase
          .from("candidates_profile")
          .update(extracted)
          .eq("id", profileId)

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
