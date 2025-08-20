"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TemplateSelector from "./TemplateSelector";
import PdfExportControls from "./PdfExportControls";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { LetterData } from "@/lib/pdf-templates";

// Données de test pour le PDF
const testLetterData: LetterData = {
  content: `Madame, Monsieur,

Suite à votre offre d'emploi pour le poste de Développeur Full-Stack au sein de votre équipe, je souhaite vous faire part de ma candidature.

Fort de mes 3 années d'expérience en développement web, je maîtrise les technologies React, Node.js et TypeScript. Mon expérience chez StartupTech m'a permis de développer une expertise en développement d'applications SaaS et en architecture microservices.

Je suis particulièrement intéressé par votre approche innovante du développement produit et votre engagement envers les technologies émergentes. Mon profil technique et ma passion pour l'innovation correspondent parfaitement aux exigences du poste.

Je serais ravi de pouvoir échanger avec vous sur cette opportunité et vous démontrer ma motivation.

Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.`,
  jobTitle: "Développeur Full-Stack",
  company: "Tech Solutions",
  candidateName: "Jean Dupont",
  candidateAddress: "456 Avenue des Candidats\n69000 Lyon",
  candidatePhone: "+33 6 12 34 56 78",
  candidateEmail: "jean.dupont@email.com",
  date: new Date().toLocaleDateString("fr-FR"),
  location: "Lyon",
};

export default function PdfTemplateTest() {
  const { profile } = useUserProfile();
  const [selectedTemplate, setSelectedTemplate] = React.useState("classic");

  const isPremium = profile?.subscription_tier === "premium";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Test des Templates PDF - Restrictions d'accès
            <Badge variant={isPremium ? "default" : "secondary"}>
              {isPremium ? "Premium" : "Free"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Information utilisateur */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">État de l'abonnement</h3>
            <p>
              Utilisateur: <strong>{isPremium ? "Premium" : "Free"}</strong>
              <br />
              Email: {profile?.email || "Non connecté"}
              <br />
              Accès aux templates:{" "}
              {isPremium ? "Tous les modèles" : "Modèle Classic uniquement"}
            </p>
          </div>

          {/* Sélecteur de template */}
          <div>
            <h3 className="font-semibold mb-4">Sélecteur de Template</h3>
            <TemplateSelector
              selectedTemplateId={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
            />
          </div>

          {/* Contrôles d'export */}
          <div>
            <h3 className="font-semibold mb-4">Contrôles d'Export PDF</h3>
            <PdfExportControls
              letterData={testLetterData}
              fileName="test-lettre-motivation"
            />
          </div>

          {/* Informations sur les restrictions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-800">
              Restrictions implémentées
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                ✅ Utilisateurs free: accès uniquement au modèle "Classic"
              </li>
              <li>
                ✅ Modèles premium floutés et non-cliquables pour les
                utilisateurs free
              </li>
              <li>
                ✅ Icône de verrouillage sur les modèles premium restreints
              </li>
              <li>✅ Badge "Premium" sur les modèles non-accessibles</li>
              <li>
                ✅ Message d'upgrade dans PdfExportControls pour utilisateurs
                free
              </li>
              <li>
                ✅ Boutons d'upgrade vers la page d'abonnement
                (/profile?tab=subscription)
              </li>
              <li>
                ✅ Protection côté client contre la sélection de modèles premium
              </li>
              <li>✅ Support multilingue des messages de restriction</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
