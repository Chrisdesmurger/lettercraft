'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ChevronRight, ChevronLeft, Check, FileText, Upload, User, MessageSquare, Sparkles, Menu, X } from 'lucide-react';

const ModernWebApp = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const router = useRouter();

  /**
   * Déconnecte l'utilisateur et redirige vers la page de connexion
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const questions = [
    {
      id: 'motivation',
      type: 'textarea',
      title: 'Pourquoi voulez-vous ce poste ?',
      subtitle: 'Partagez votre motivation en quelques phrases.',
      placeholder: 'Tapez votre réponse ici...'
    },
    {
      id: 'skills',
      type: 'textarea',
      title: 'Quelles compétences vous distinguent ?',
      subtitle: 'Décrivez vos compétences principales pour ce rôle.',
      placeholder: 'Décrivez vos compétences...'
    },
    {
      id: 'experience',
      type: 'multiple',
      title: 'Votre niveau d\'expérience ?',
      subtitle: 'Sélectionnez votre niveau d\'expérience.',
      options: [
        'Débutant (0-2 ans)',
        'Intermédiaire (2-5 ans)',
        'Senior (5-10 ans)',
        'Expert (10+ ans)'
      ]
    },
    {
      id: 'availability',
      type: 'multiple',
      title: 'Quand pouvez-vous commencer ?',
      subtitle: 'Sélectionnez votre disponibilité.',
      options: [
        'Immédiatement',
        'Dans 2 semaines',
        'Dans 1 mois',
        'Dans 2-3 mois'
      ]
    }
  ];

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const generateLetter = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvSummary: 'CV du candidat', // À remplacer par les vraies données
          jobOffer: 'Offre d\'emploi', // À remplacer par les vraies données
          answers,
          language: 'fr'
        }),
      });

      const data = await response.json();
      if (data.letter) {
        setGeneratedLetter(data.letter);
      }
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">LetterCraft</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-orange-600 transition-colors">Dashboard</a>
              <a href="#" className="text-gray-700 hover:text-orange-600 transition-colors">Documents</a>
              <a href="#" className="text-gray-700 hover:text-orange-600 transition-colors">Générateur</a>
              <a href="#" className="text-gray-700 hover:text-orange-600 transition-colors">Profil</a>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-orange-600 transition-colors"
              >
                Déconnexion
              </button>
            </nav>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Dashboard</a>
              <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Documents</a>
              <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Générateur</a>
              <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Profil</a>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">CV Uploadé</h3>
            </div>
            <p className="text-gray-600 text-sm">Gérez votre CV et vos documents</p>
            <button className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center">
              Voir détails <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Offres d'emploi</h3>
            </div>
            <p className="text-gray-600 text-sm">3 offres analysées</p>
            <button className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm flex items-center">
              Gérer <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Lettres générées</h3>
            </div>
            <p className="text-gray-600 text-sm">12 lettres créées</p>
            <button className="mt-4 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center">
              Historique <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Questionnaire Section */}
        {!generatedLetter ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-orange-100/50 overflow-hidden">
            {/* Progress Bar */}
            <div className="h-2 bg-gray-100">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-8 md:p-12">
              {/* Question Counter */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {currentStep + 1} sur {questions.length}
                </span>
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Retour
                  </button>
                )}
              </div>

              {/* Question Content */}
              <div className={`transition-all duration-300 ${isAnimating ? 'opacity-50 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                  {questions[currentStep].title}
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  {questions[currentStep].subtitle}
                </p>

                {/* Question Input */}
                <div className="mb-8">
                  {questions[currentStep].type === 'textarea' ? (
                    <textarea
                      className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 resize-none text-lg"
                      placeholder={questions[currentStep].placeholder}
                      value={answers[questions[currentStep].id] || ''}
                      onChange={(e) => handleAnswer(questions[currentStep].id, e.target.value)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {questions[currentStep].options?.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswer(questions[currentStep].id, option)}
                          className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 ${
                            answers[questions[currentStep].id] === option
                              ? 'border-orange-400 bg-orange-50 text-orange-800'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{option}</span>
                            {answers[questions[currentStep].id] === option && (
                              <Check className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {questions.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index <= currentStep ? 'bg-orange-400' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex space-x-4">
                    {currentStep === questions.length - 1 ? (
                      <button
                        onClick={generateLetter}
                        disabled={isGenerating || !answers[questions[currentStep].id]}
                        className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isGenerating ? 'Génération...' : 'Terminer'}
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        disabled={!answers[questions[currentStep].id]}
                        className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
                      >
                        Suivant
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Generated Letter Display */
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-orange-100/50 p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Votre lettre de motivation</h2>
            <div className="prose prose-lg max-w-none">
              <div className="whitespace-pre-wrap bg-gray-50 p-6 rounded-xl border border-gray-200">
                {generatedLetter}
              </div>
            </div>
            <div className="mt-8 flex space-x-4">
              <button 
                onClick={() => {
                  setGeneratedLetter('');
                  setCurrentStep(0);
                  setAnswers({});
                }}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Nouvelle lettre
              </button>
              <button className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200">
                Télécharger PDF
              </button>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        {!generatedLetter && (
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Prêt à générer votre lettre de motivation ?</h3>
              <p className="text-orange-100 mb-6">Complétez le questionnaire pour créer une lettre personnalisée et impactante.</p>
              <button className="bg-white text-orange-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                Commencer maintenant
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ModernWebApp;