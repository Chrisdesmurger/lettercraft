'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'
import { getRandomTips, getTopTips, getTipsByCategory, type Tip } from '@/lib/tips-data'


interface TipCardProps {
  tip: Tip
  isActive: boolean
}

function TipCard({ tip, isActive }: TipCardProps) {
  const { t } = useI18n()

  return (
    <Card className={cn(
      "h-full transition-all duration-300 hover:shadow-lg",
      isActive ? "ring-2 ring-orange-400 shadow-lg" : "shadow-md"
    )}>
      <CardContent className="p-6 h-full flex flex-col">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {t(`tips.${tip.id}.title`)}
            </h3>
            {tip.priority >= 5 && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                Top
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed">
            {t(`tips.${tip.id}.description`)}
          </p>
        </div>

        <div className="mt-auto">
          <Badge variant="outline" className="text-xs">
            {t(`tips.categories.${tip.category}`)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

interface TipsCarouselProps {
  mode?: 'random' | 'top' | 'category'
  category?: Tip['category']
  count?: number
  autoplay?: boolean
  autoplayDelay?: number
  showControls?: boolean
  showIndicators?: boolean
  className?: string
  title?: string
  subtitle?: string
}

export default function TipsCarousel({
  mode = 'random',
  category,
  count = 9, // Augmenté pour avoir assez de conseils pour le défilement
  autoplay = true,
  autoplayDelay = 5000,
  showControls = true,
  showIndicators = true,
  className,
  title,
  subtitle
}: TipsCarouselProps) {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [tips, setTips] = useState<Tip[]>([])
  const [isAutoplayRunning, setIsAutoplayRunning] = useState(autoplay)

  // Générer les conseils selon le mode
  useEffect(() => {
    let selectedTips: Tip[]
    
    switch (mode) {
      case 'top':
        selectedTips = getTopTips(count)
        break
      case 'category':
        selectedTips = category ? getTipsByCategory(category).slice(0, count) : getRandomTips(count)
        break
      default:
        selectedTips = getRandomTips(count, category)
    }
    
    setTips(selectedTips)
    setCurrentIndex(0)
  }, [mode, category, count])

  // Autoplay
  useEffect(() => {
    if (!isAutoplayRunning || tips.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tips.length)
    }, autoplayDelay)

    return () => clearInterval(interval)
  }, [isAutoplayRunning, tips.length, autoplayDelay])

  // Navigation
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + tips.length) % tips.length)
    setIsAutoplayRunning(false)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % tips.length)
    setIsAutoplayRunning(false)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoplayRunning(false)
  }

  // Régénérer les conseils
  const regenerateTips = () => {
    let newTips: Tip[]
    
    switch (mode) {
      case 'top':
        newTips = getTopTips(count)
        break
      case 'category':
        newTips = category ? getTipsByCategory(category).slice(0, count) : getRandomTips(count)
        break
      default:
        newTips = getRandomTips(count, category)
    }
    
    setTips(newTips)
    setCurrentIndex(0)
    setIsAutoplayRunning(autoplay)
  }

  if (tips.length === 0) {
    return null
  }

  return (
    <div className={cn("w-full", className)}>
      {/* En-tête */}
      {(title || subtitle) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">
              {title || t('tips.title')}
            </h2>
            {mode === 'random' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateTips}
                className="text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
          {subtitle && (
            <p className="text-gray-600 text-sm">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Carrousel */}
      <div className="relative">
        {/* Contrôles de navigation */}
        {showControls && tips.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md hover:shadow-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md hover:shadow-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Conteneur des cartes */}
        <div className="overflow-hidden mx-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {(() => {
                // S'assurer qu'on a toujours exactement 3 cartes
                const visibleTips = []
                for (let i = 0; i < 3; i++) {
                  const tipIndex = (currentIndex + i) % tips.length
                  visibleTips.push(tips[tipIndex])
                }
                return visibleTips.map((tip, index) => (
                  <TipCard
                    key={`${tip.id}-${currentIndex}-${index}`}
                    tip={tip}
                    isActive={false}
                  />
                ))
              })()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicateurs */}
        {showIndicators && tips.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {tips.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex
                    ? "bg-orange-500 w-6"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}