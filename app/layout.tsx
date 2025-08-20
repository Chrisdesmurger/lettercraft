import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ToastProvider from "@/components/toaster";
import { I18nProvider } from "@/lib/i18n-context";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LetterCraft - Générateur de lettres de motivation IA",
  description:
    "Créez des lettres de motivation personnalisées et professionnelles avec l'intelligence artificielle",
  keywords:
    "lettre de motivation, cv, emploi, candidature, IA, génération automatique",
  authors: [{ name: "LetterCraft Team" }],
  openGraph: {
    title: "LetterCraft - Générateur de lettres de motivation IA",
    description: "Créez des lettres de motivation personnalisées avec l'IA",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <I18nProvider>
          <ToastProvider />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
