import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { Tables } from "@/lib/supabase-client";

export type CVData = Tables<"candidates_profile">;

export interface UseUserCVsReturn {
  cvs: CVData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setActiveCV: (cvId: string) => Promise<boolean>;
  deleteCV: (cvId: string) => Promise<boolean>;
  downloadCV: (cvId: string) => Promise<void>;
}

export function useUserCVs(): UseUserCVsReturn {
  const [cvs, setCvs] = useState<CVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError("Utilisateur non authentifié");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("candidates_profile")
        .select("*")
        .eq("user_id", session.user.id)
        .order("is_active", { ascending: false })
        .order("uploaded_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setCvs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const setActiveCV = async (cvId: string): Promise<boolean> => {
    try {
      console.log("🔍 [useUserCVs] setActiveCV called with cvId:", cvId);
      console.trace("🔍 [useUserCVs] Call stack trace");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.error("❌ [useUserCVs] No user session");
        setError("Utilisateur non authentifié");
        return false;
      }

      console.log(
        "🔍 [useUserCVs] Deactivating all CVs for user:",
        session.user.id,
      );
      // D'abord, désactiver tous les CV de l'utilisateur
      const { error: deactivateError } = await supabase
        .from("candidates_profile")
        .update({ is_active: false })
        .eq("user_id", session.user.id);

      if (deactivateError) {
        console.error("❌ [useUserCVs] Deactivate error:", deactivateError);
        setError(deactivateError.message);
        return false;
      }

      console.log("🔍 [useUserCVs] Activating CV:", cvId);
      // Ensuite, activer le CV sélectionné
      const { error: activateError } = await supabase
        .from("candidates_profile")
        .update({ is_active: true })
        .eq("id", cvId)
        .eq("user_id", session.user.id);

      if (activateError) {
        console.error("❌ [useUserCVs] Activate error:", activateError);
        console.error("❌ [useUserCVs] Error details:", {
          message: activateError.message,
          code: activateError.code,
          details: activateError.details,
          hint: activateError.hint,
        });
        setError(activateError.message);
        return false;
      }

      // Rafraîchir la liste
      await fetchCVs();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'activation",
      );
      return false;
    }
  };

  const deleteCV = async (cvId: string): Promise<boolean> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError("Utilisateur non authentifié");
        return false;
      }

      // Récupérer les infos du CV avant suppression pour supprimer le fichier
      const { data: cvData } = await supabase
        .from("candidates_profile")
        .select("file_url")
        .eq("id", cvId)
        .eq("user_id", session.user.id)
        .single();

      if (cvData?.file_url) {
        // Extraire le nom du fichier de l'URL
        const fileName = cvData.file_url.split("/").pop();
        if (fileName) {
          // Supprimer le fichier du storage
          await supabase.storage.from("documents").remove([fileName]);
        }
      }

      // Supprimer l'entrée de la base de données
      const { error: deleteError } = await supabase
        .from("candidates_profile")
        .delete()
        .eq("id", cvId)
        .eq("user_id", session.user.id);

      if (deleteError) {
        setError(deleteError.message);
        return false;
      }

      // Rafraîchir la liste
      await fetchCVs();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
      return false;
    }
  };

  const downloadCV = async (cvId: string): Promise<void> => {
    try {
      const cv = cvs.find((c) => c.id === cvId);
      if (!cv?.file_url) {
        setError("Fichier non trouvé");
        return;
      }

      // Extraire le nom du fichier de l'URL
      const fileName = cv.file_url.split("/").pop();
      if (!fileName) {
        setError("Nom de fichier invalide");
        return;
      }

      // Télécharger le fichier depuis Supabase Storage
      const { data, error } = await supabase.storage
        .from("documents")
        .download(fileName);

      if (error) {
        setError(error.message);
        return;
      }

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = cv.title || fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors du téléchargement",
      );
    }
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  return {
    cvs,
    loading,
    error,
    refetch: fetchCVs,
    setActiveCV,
    deleteCV,
    downloadCV,
  };
}
