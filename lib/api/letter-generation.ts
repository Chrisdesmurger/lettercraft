import { supabase } from "@/lib/supabase-client";

interface GenerateLetterParams {
  profile: {
    category: string;
    responses: Record<string, string>;
  };
  cv: {
    skills?: string[];
    experiences?: any[];
  };
  jobOffer: {
    title: string;
    company: string;
    description: string;
    requirements?: string[];
  };
  settings: {
    language: string;
    toneKey: string;
    toneCustom?: string;
    length: number;
    includeHobbies?: boolean;
    emphasizeExperience?: boolean;
  };
}

export interface GenerateLetterResponse {
  letter: string;
  sections?: {
    subject: string;
    greeting: string;
    body: string;
  };
  letterId?: string;
}

export async function generateLetter(
  params: GenerateLetterParams,
): Promise<GenerateLetterResponse> {
  // Appel à votre API OpenAI
  const response = await fetch("/api/generate-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Erreur lors de la génération");
  }

  const data = await response.json();

  // Déclencher l'événement pour notifier les autres composants
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("letter-generated"));
  }

  return data;
}

export async function extractJobOffer(
  input: string,
  type: "text" | "url",
): Promise<any> {
  const response = await fetch("/api/extract-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, type }),
  });

  if (!response.ok) {
    throw new Error("Erreur lors de l'extraction");
  }

  return response.json();
}

export async function analyzeCv(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/analyze-cv", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Erreur lors de l'analyse");
  }

  return response.json();
}
