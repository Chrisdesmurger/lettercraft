'use client'

import { useState } from 'react'
import { Upload, FileText, Download, Trash2, Eye } from 'lucide-react'

export default function CVTab() {
  const [cvList, setCvList] = useState([
    {
      id: 1,
      name: 'CV_2024_Marketing.pdf',
      size: '245 KB',
      uploadDate: '2024-03-15',
      isActive: true
    },
    {
      id: 2,
      name: 'CV_2023_General.pdf',
      size: '198 KB',
      uploadDate: '2023-12-20',
      isActive: false
    }
  ])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Gérer mes CV</h3>
        <p className="text-gray-600">Uploadez et gérez vos CV pour générer des lettres de motivation adaptées</p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">Glissez-déposez votre CV ici ou</p>
        <button className="text-orange-600 hover:text-orange-700 font-medium">
          Parcourir les fichiers
        </button>
        <p className="text-sm text-gray-500 mt-2">PDF, DOC, DOCX (Max. 5MB)</p>
      </div>

      {/* CV List */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Mes CV</h4>
        {cvList.map((cv) => (
          <div
            key={cv.id}
            className={`border rounded-lg p-4 ${cv.isActive ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{cv.name}</p>
                  <p className="text-sm text-gray-500">
                    {cv.size} • Uploadé le {new Date(cv.uploadDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {cv.isActive && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                    CV actif
                  </span>
                )}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
            {!cv.isActive && (
              <button className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">
                Définir comme CV actif
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Conseils</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Gardez votre CV à jour pour des lettres de motivation plus pertinentes</li>
          <li>• Vous pouvez avoir plusieurs CV pour différents types de postes</li>
          <li>• Le CV actif sera utilisé par défaut pour générer vos lettres</li>
        </ul>
      </div>
    </div>
  )
}
