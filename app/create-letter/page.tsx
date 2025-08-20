"use client";

import dynamic from "next/dynamic";

// Import dynamique pour éviter les problèmes SSR
const LetterCreationFlow = dynamic(
  () => import("@/components/LetterCreationFlow"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    ),
  },
);

export default function CreateLetterPage() {
  return <LetterCreationFlow />;
}
