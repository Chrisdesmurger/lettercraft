'use client'

import { useState } from 'react'
import { Tables } from '@/lib/supabase-client'
import LetterCard from './LetterCard'
import LetterViewer from './LetterViewer'
import { Input } from '@/components/ui/input'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'

type GeneratedLetter = Tables<'generated_letters'> & {
  job_offers: Tables<'job_offers'> | null
  candidates_profile: { title: string } | null
}

interface LettersListProps {
  letters: GeneratedLetter[]
}

export default function LettersList({ letters }: LettersListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLetter, setSelectedLetter] = useState<GeneratedLetter | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  const filteredLetters = letters.filter(letter => 
    letter.job_offers?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    letter.job_offers?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewLetter = (letter: GeneratedLetter) => {
    setSelectedLetter(letter)
    setIsViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setSelectedLetter(null)
    setIsViewerOpen(false)
  }

  if (letters.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucune lettre générée
        </h3>
        <p className="text-gray-600 mb-6">
          Vous n'avez pas encore généré de lettres de motivation.
        </p>
        <Button 
          onClick={() => window.location.href = '/generate-letter'}
          className="bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600"
        >
          Créer ma première lettre
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Rechercher par poste ou entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>{filteredLetters.length} lettre{filteredLetters.length > 1 ? 's' : ''} trouvée{filteredLetters.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLetters.map((letter) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            onView={() => handleViewLetter(letter)}
          />
        ))}
      </div>

      {isViewerOpen && selectedLetter && (
        <LetterViewer
          letter={selectedLetter}
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </>
  )
}