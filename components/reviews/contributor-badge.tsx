"use client"

import * as React from "react"
import { Star, Award } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { ContributorBadge as ContributorBadgeType } from "@/types/reviews"

export interface ContributorBadgeProps {
  badge: ContributorBadgeType
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
}

export const ContributorBadge = React.forwardRef<HTMLDivElement, ContributorBadgeProps>(
  ({ badge, className, size = 'md', showDescription = true }, ref) => {
    const { t } = useI18n()

    if (!badge.earned) {
      return null
    }

    const sizeClasses = {
      sm: "text-xs",
      md: "text-sm", 
      lg: "text-base"
    }

    const iconSizes = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5"
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        role="img"
        aria-label={t('reviews.badge.contributor') || 'Badge Contributeur'}
      >
        <Badge 
          variant="secondary"
          className={cn(
            "flex items-center gap-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-300",
            "dark:from-yellow-900/20 dark:to-orange-900/20 dark:text-yellow-200 dark:border-yellow-700",
            sizeClasses[size]
          )}
        >
          <Award className={cn(iconSizes[size], "text-yellow-600 dark:text-yellow-400")} />
          <span className="font-medium">
            {t('reviews.badge.contributor') || 'Contributeur'}
          </span>
        </Badge>

        {showDescription && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className={cn(iconSizes[size], "text-yellow-500")} />
            <span>
              {t('reviews.badge.description') || 'Merci d\'avoir noté au moins 3 lettres !'}
            </span>
          </div>
        )}
      </div>
    )
  }
)

ContributorBadge.displayName = "ContributorBadge"