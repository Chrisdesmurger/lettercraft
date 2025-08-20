/**
 * Utilitaires pour l'API proxy de storage
 * Permet d'accéder aux fichiers Supabase Storage sans problèmes CORS
 */

/**
 * Génère une URL proxy pour accéder à un fichier dans Supabase Storage
 * @param bucket - Nom du bucket Supabase
 * @param path - Chemin du fichier dans le bucket
 * @returns URL proxy pour accéder au fichier
 */
export function getStorageProxyUrl(bucket: string, path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    bucket,
    path,
  });

  return `${baseUrl}/api/storage-proxy?${params.toString()}`;
}

/**
 * Extrait les informations bucket/path depuis une URL Supabase Storage classique
 * @param supabaseStorageUrl - URL complète Supabase Storage
 * @returns Objet avec bucket et path, ou null si l'URL n'est pas valide
 */
export function parseSupabaseStorageUrl(
  supabaseStorageUrl: string,
): { bucket: string; path: string } | null {
  try {
    const url = new URL(supabaseStorageUrl);

    // Format attendu: https://[project].supabase.co/storage/v1/object/[bucket]/[path]
    const pathParts = url.pathname.split("/");

    if (
      pathParts.length < 6 ||
      pathParts[2] !== "storage" ||
      pathParts[3] !== "v1" ||
      pathParts[4] !== "object"
    ) {
      return null;
    }

    const bucket = pathParts[5];
    const path = pathParts.slice(6).join("/");

    return { bucket, path };
  } catch (error) {
    console.warn("Invalid Supabase Storage URL:", supabaseStorageUrl);
    return null;
  }
}

/**
 * Convertit une URL Supabase Storage classique en URL proxy
 * @param supabaseStorageUrl - URL complète Supabase Storage
 * @returns URL proxy, ou l'URL originale si la conversion échoue
 */
export function convertToProxyUrl(supabaseStorageUrl: string): string {
  const parsed = parseSupabaseStorageUrl(supabaseStorageUrl);

  if (!parsed) {
    console.warn(
      "Could not convert to proxy URL, returning original:",
      supabaseStorageUrl,
    );
    return supabaseStorageUrl;
  }

  return getStorageProxyUrl(parsed.bucket, parsed.path);
}

/**
 * Hook React pour générer des URLs proxy
 */
export function useStorageProxy() {
  return {
    getProxyUrl: getStorageProxyUrl,
    convertUrl: convertToProxyUrl,
    parseUrl: parseSupabaseStorageUrl,
  };
}

/**
 * Types pour TypeScript
 */
export interface StorageFile {
  bucket: string;
  path: string;
  url?: string;
  proxyUrl?: string;
}

/**
 * Crée un objet StorageFile avec URL proxy
 */
export function createStorageFile(bucket: string, path: string): StorageFile {
  return {
    bucket,
    path,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    proxyUrl: getStorageProxyUrl(bucket, path),
  };
}

/**
 * Exemples d'utilisation :
 *
 * // Générer une URL proxy directement
 * const proxyUrl = getStorageProxyUrl('documents', 'user-123/letter-456.pdf')
 *
 * // Convertir une URL Supabase existante
 * const originalUrl = 'https://project.supabase.co/storage/v1/object/documents/user-123/letter.pdf'
 * const proxyUrl = convertToProxyUrl(originalUrl)
 *
 * // Dans un composant React
 * const { getProxyUrl, convertUrl } = useStorageProxy()
 * const pdfUrl = getProxyUrl('documents', 'user-123/letter.pdf')
 */
