"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { FeedbackCategory, FEEDBACK_CATEGORIES } from "@/types/reviews"
import { useI18n } from "@/lib/i18n-context"

export interface CategorySelectorProps {
  selectedCategories: FeedbackCategory[]
  onCategoriesChange: (categories: FeedbackCategory[]) => void
  maxCategories?: number
  className?: string
  disabled?: boolean
}

const CategorySelector = React.forwardRef<HTMLDivElement, CategorySelectorProps>(
  ({ 
    selectedCategories, 
    onCategoriesChange, 
    maxCategories = 4,
    className,
    disabled = false,
    ...props 
  }, ref) => {
    const { t } = useI18n()

    const handleCategoryToggle = (category: FeedbackCategory) => {
      if (disabled) return

      const isSelected = selectedCategories.includes(category)
      
      if (isSelected) {
        // Remove category
        onCategoriesChange(selectedCategories.filter(c => c !== category))
      } else {
        // Add category if under limit
        if (selectedCategories.length < maxCategories) {
          onCategoriesChange([...selectedCategories, category])
        }
      }
    }

    const getCategoryLabel = (category: FeedbackCategory) => {
      return t(`reviews.categories.${category}`) || category
    }

    const isMaxReached = selectedCategories.length >= maxCategories

    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        role="group"
        aria-label="Catégories de feedback"
        {...props}
      >
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((categoryData) => {
            const category = categoryData.key
            const isSelected = selectedCategories.includes(category)
            const canSelect = !isMaxReached || isSelected
            const label = getCategoryLabel(category)

            return (
              <button
                key={category}
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                  "border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                  !canSelect && "opacity-50 cursor-not-allowed",
                  disabled && "pointer-events-none opacity-50"
                )}
                onClick={() => handleCategoryToggle(category)}
                disabled={disabled || (!canSelect && !isSelected)}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={t('reviews.categories.categoryLabel', { category: label }) || `Catégorie ${label}`}
              >
                {isSelected && (
                  <Check className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{label}</span>
              </button>
            )
          })}
        </div>
        
        {/* Helper text */}
        <div className="text-xs text-muted-foreground">
          {selectedCategories.length === 0 ? (
            t('reviews.categories.selectUpTo', { max: maxCategories }) || 
            `Sélectionnez jusqu'à ${maxCategories} catégories (optionnel)`
          ) : (
            t('reviews.categories.selectedCount', { 
              selected: selectedCategories.length, 
              max: maxCategories 
            }) || `${selectedCategories.length}/${maxCategories} catégories sélectionnées`
          )}
        </div>

        {/* Selected categories as badges (alternative view) */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="text-xs"
              >
                {getCategoryLabel(category)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    )
  }
)

CategorySelector.displayName = "CategorySelector"

export { CategorySelector }