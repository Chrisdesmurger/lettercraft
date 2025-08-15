"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const starRatingVariants = cva(
  "inline-flex items-center gap-1",
  {
    variants: {
      size: {
        sm: "[&>button]:h-4 [&>button]:w-4",
        md: "[&>button]:h-5 [&>button]:w-5",
        lg: "[&>button]:h-6 [&>button]:w-6"
      }
    },
    defaultVariants: {
      size: "md"
    }
  }
)

const starVariants = cva(
  "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5", 
        lg: "h-6 w-6"
      },
      state: {
        empty: "text-gray-300 hover:text-yellow-400",
        filled: "text-yellow-400 hover:text-yellow-500",
        readOnly: "text-yellow-400"
      }
    },
    defaultVariants: {
      size: "md",
      state: "empty"
    }
  }
)

export interface StarRatingProps extends VariantProps<typeof starRatingVariants> {
  rating: number
  onRatingChange?: (rating: number) => void
  readOnly?: boolean
  className?: string
  maxRating?: number
}

const StarRating = React.forwardRef<HTMLDivElement, StarRatingProps>(
  ({ 
    rating, 
    onRatingChange, 
    readOnly = false, 
    size = "md", 
    className, 
    maxRating = 5,
    ...props 
  }, ref) => {
    const [hoverRating, setHoverRating] = React.useState(0)
    const [focusedStar, setFocusedStar] = React.useState(0)

    const handleStarClick = (starValue: number) => {
      if (!readOnly && onRatingChange) {
        onRatingChange(starValue)
      }
    }

    const handleStarHover = (starValue: number) => {
      if (!readOnly) {
        setHoverRating(starValue)
      }
    }

    const handleMouseLeave = () => {
      if (!readOnly) {
        setHoverRating(0)
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent, starValue: number) => {
      if (readOnly) return

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          handleStarClick(starValue)
          break
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault()
          const nextStar = Math.min(starValue + 1, maxRating)
          setFocusedStar(nextStar)
          // Focus next star button
          const nextButton = event.currentTarget.parentElement?.children[nextStar - 1] as HTMLButtonElement
          nextButton?.focus()
          break
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault()
          const prevStar = Math.max(starValue - 1, 1)
          setFocusedStar(prevStar)
          // Focus previous star button
          const prevButton = event.currentTarget.parentElement?.children[prevStar - 1] as HTMLButtonElement
          prevButton?.focus()
          break
      }
    }

    const getStarState = (starValue: number) => {
      if (readOnly) {
        return starValue <= rating ? "readOnly" : "empty"
      }
      
      const displayRating = hoverRating || rating
      return starValue <= displayRating ? "filled" : "empty"
    }

    return (
      <div
        ref={ref}
        className={cn(starRatingVariants({ size, className }))}
        role="radiogroup"
        aria-label={`Note de ${rating} sur ${maxRating} étoiles`}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1
          const starState = getStarState(starValue)
          
          return (
            <button
              key={starValue}
              type="button"
              className={cn(
                starVariants({ size, state: starState }),
                readOnly && "cursor-default"
              )}
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => handleStarHover(starValue)}
              onKeyDown={(e) => handleKeyDown(e, starValue)}
              onFocus={() => setFocusedStar(starValue)}
              disabled={readOnly}
              role="radio"
              aria-checked={starValue <= rating}
              aria-label={`${starValue} étoile${starValue > 1 ? 's' : ''}`}
              tabIndex={readOnly ? -1 : starValue === 1 ? 0 : -1}
            >
              <Star 
                className={cn(
                  "fill-current",
                  starState === "empty" && "fill-transparent"
                )}
              />
            </button>
          )
        })}
      </div>
    )
  }
)

StarRating.displayName = "StarRating"

export { StarRating, starRatingVariants }