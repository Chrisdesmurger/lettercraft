export interface ExtractedProfile {
  first_name?: string;
  last_name?: string;
  experiences?: string[];
  skills?: string[];
  education?: string[];
}
export async function extractResumeDataFromFile(
  file: File,
): Promise<ExtractedProfile> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/extract-cv", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("extraction failed");
  return (await res.json()) as ExtractedProfile;
}
