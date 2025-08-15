// Types for the review and feedback system

export type FeedbackCategory = 'content' | 'style' | 'relevance' | 'length'

export interface FeedbackCategoryLabel {
  key: FeedbackCategory
  label_fr: string
  label_en: string
}

export interface LetterReview {
  id: string
  letter_id: string
  user_id: string
  rating: number // 1-5
  feedback?: string | null
  categories: FeedbackCategory[]
  created_at: string
  updated_at: string
}

export interface CreateReviewData {
  letterId: string
  rating: number
  feedback?: string
  categories?: FeedbackCategory[]
}

export interface ReviewValidationResult {
  valid: boolean
  errors: string[]
}

export interface ReviewStatistics {
  total_reviews: number
  average_rating: number
  rating_distribution: Record<string, number>
  total_users_with_reviews: number
  total_users_with_letters: number
  participation_rate: number
  category_breakdown: Record<string, number>
  period: {
    start_date: string
    end_date: string
  }
}

export interface ReviewModalState {
  isOpen: boolean
  letterId: string | null
  hasBeenShown: boolean
}

export interface ReviewFormData {
  rating: number
  feedback: string
  categories: FeedbackCategory[]
}

// UI component props
export interface StarRatingProps {
  rating: number
  onRatingChange: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  className?: string
}

export interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateReviewData) => Promise<void>
  letterId: string
  isSubmitting?: boolean
}

export interface CategorySelectorProps {
  selectedCategories: FeedbackCategory[]
  onCategoriesChange: (categories: FeedbackCategory[]) => void
  maxCategories?: number
  className?: string
}

export interface ReviewListProps {
  reviews: LetterReview[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

// API response types
export interface CreateReviewResponse {
  success: boolean
  review: LetterReview
}

export interface GetReviewsResponse {
  reviews: LetterReview[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface ApiError {
  error: string
  code: string
  details?: string[]
}

// Rate limiting
export interface RateLimitInfo {
  remaining: number
  resetTime: number
}

// Gamification
export interface ContributorBadge {
  earned: boolean
  reviewCount: number
  requiredReviews: number
}

// Local storage types
export interface ReviewModalMemory {
  [letterId: string]: {
    dismissed: boolean
    dismissedAt: number
  }
}

// Constants
export const FEEDBACK_CATEGORIES: FeedbackCategoryLabel[] = [
  { key: 'content', label_fr: 'Contenu', label_en: 'Content' },
  { key: 'style', label_fr: 'Style', label_en: 'Style' },
  { key: 'relevance', label_fr: 'Pertinence', label_en: 'Relevance' },
  { key: 'length', label_fr: 'Longueur', label_en: 'Length' }
]

export const REVIEW_CONSTRAINTS = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_FEEDBACK_LENGTH: 250,
  MAX_CATEGORIES: 4,
  CONTRIBUTOR_BADGE_THRESHOLD: 3
} as const

// Helper type guards
export function isFeedbackCategory(value: any): value is FeedbackCategory {
  return typeof value === 'string' && ['content', 'style', 'relevance', 'length'].includes(value)
}

export function isValidRating(rating: any): rating is number {
  return typeof rating === 'number' && 
         rating >= REVIEW_CONSTRAINTS.MIN_RATING && 
         rating <= REVIEW_CONSTRAINTS.MAX_RATING &&
         Number.isInteger(rating)
}