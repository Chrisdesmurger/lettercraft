import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

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

        const form = new FormData();
        form.append('file', file);

        const response = await fetch('/api/extract-cv', {
          method: 'POST',
          body: form,
        });
        if (!response.ok) throw new Error('extraction failed');
        const extracted: ExtractedProfile = await response.json();

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
