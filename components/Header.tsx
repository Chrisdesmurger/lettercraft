'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Menu, X } from 'lucide-react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
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
            <Link href="/" className="text-gray-700 hover:text-orange-600 transition-colors">Dashboard</Link>
            <Link href="/upload" className="text-gray-700 hover:text-orange-600 transition-colors">Documents</Link>
            <a href="#" className="text-gray-700 hover:text-orange-600 transition-colors">Générateur</a>
            <Link href="/profile" className="text-gray-700 hover:text-orange-600 transition-colors">Profil</Link>
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
            <Link href="/" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Dashboard</Link>
            <Link href="/upload" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Documents</Link>
            <a href="#" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Générateur</a>
            <Link href="/profile" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">Profil</Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
