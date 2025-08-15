import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db, supabase } from '@/lib/supabase-client'
import { rateLimiters } from '@/lib/middleware/rate-limiter'

// Types for request validation
interface CreateReviewRequest {
  letterId: string
  rating: number
  feedback?: string
  categories?: string[]
}

interface ReviewResponse {
  id: string
  letter_id: string
  user_id: string
  rating: number
  feedback: string | null
  categories: string[]
  created_at: string
  updated_at: string
}

// Validation schemas
const VALID_CATEGORIES = ['content', 'style', 'relevance', 'length'] as const
const MIN_RATING = 1
const MAX_RATING = 5
const MAX_FEEDBACK_LENGTH = 250

/**
 * Validate review data
 */
function validateReviewData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  if (!data.letterId || typeof data.letterId !== 'string') {
    errors.push('letterId is required and must be a string')
  }

  if (!data.rating || typeof data.rating !== 'number') {
    errors.push('rating is required and must be a number')
  } else if (data.rating < MIN_RATING || data.rating > MAX_RATING) {
    errors.push(`rating must be between ${MIN_RATING} and ${MAX_RATING}`)
  }

  // Check optional feedback
  if (data.feedback !== undefined) {
    if (typeof data.feedback !== 'string') {
      errors.push('feedback must be a string')
    } else if (data.feedback.length > MAX_FEEDBACK_LENGTH) {
      errors.push(`feedback must not exceed ${MAX_FEEDBACK_LENGTH} characters`)
    }
  }

  // Check optional categories
  if (data.categories !== undefined) {
    if (!Array.isArray(data.categories)) {
      errors.push('categories must be an array')
    } else {
      if (data.categories.length > 4) {
        errors.push('maximum 4 categories allowed')
      }
      
      const uniqueCategories = [...new Set(data.categories)]
      if (uniqueCategories.length !== data.categories.length) {
        errors.push('duplicate categories are not allowed')
      }

      for (const category of data.categories) {
        if (!VALID_CATEGORIES.includes(category)) {
          errors.push(`invalid category: ${category}. Valid categories: ${VALID_CATEGORIES.join(', ')}`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Sanitize feedback text
 */
function sanitizeFeedback(feedback: string): string {
  return feedback
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[<>]/g, '') // Remove potential HTML/script chars
}

/**
 * Check CSRF protection
 */
function checkCSRF(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // In production, implement proper CSRF checking
  // For now, basic origin check
  if (!origin && !referer) {
    return false
  }
  
  return true
}

/**
 * POST /api/reviews - Create a new review
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.reviews.check(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Trop de tentatives. Veuillez réessayer plus tard.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      )
    }

    // CSRF check
    if (!checkCSRF(request)) {
      return NextResponse.json(
        { error: 'Requête non autorisée', code: 'INVALID_ORIGIN' },
        { status: 403 }
      )
    }

    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log('POST Auth debug:', { hasAuthHeader: !!authHeader, hasToken: !!token })
    
    if (!token) {
      console.error('No token provided')
      return NextResponse.json(
        { error: 'Token d\'authentification manquant', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Create Supabase client and verify token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    console.log('User authentication result:', { hasUser: !!user, userId: user?.id, authError })

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateReviewData(body)
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          code: 'VALIDATION_ERROR',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    const { letterId, rating, feedback, categories = [] } = body as CreateReviewRequest

    console.log('Checking letter:', { letterId, userId: user.id })

    // Check if letter exists and belongs to user
    const { data: letter, error: letterError } = await supabaseClient
      .from('generated_letters')
      .select('id, user_id')
      .eq('id', letterId)
      .eq('user_id', user.id)
      .single()

    console.log('Letter query result:', { letter, letterError })

    if (letterError || !letter) {
      console.error('Letter not found:', { letterId, userId: user.id, letterError })
      return NextResponse.json(
        { error: 'Lettre non trouvée', code: 'LETTER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Sanitize feedback if provided
    const sanitizedFeedback = feedback ? sanitizeFeedback(feedback) : null

    // Create review
    const { data: review, error: reviewError } = await supabaseClient
      .from('letter_reviews')
      .insert({
        letter_id: letterId,
        user_id: user.id,
        rating,
        feedback: sanitizedFeedback,
        categories
      })
      .select()
      .single()

    if (reviewError) {
      // Check for unique constraint violation (user already reviewed this letter)
      if (reviewError.code === '23505') {
        return NextResponse.json(
          { error: 'Vous avez déjà noté cette lettre', code: 'ALREADY_REVIEWED' },
          { status: 409 }
        )
      }

      console.error('Error creating review:', reviewError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la note', code: 'CREATE_ERROR' },
        { status: 500 }
      )
    }

    // Log success (without PII)
    console.log(`Review created: user=${user.id}, letter=${letterId}, rating=${rating}`)

    return NextResponse.json(
      { 
        success: true, 
        review: review as ReviewResponse 
      },
      { 
        status: 201,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        }
      }
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/reviews:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reviews - Get user's reviews
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.api.check(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Trop de requêtes. Veuillez réessayer plus tard.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }

    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Create Supabase client and verify token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Get user's reviews
    const { data: reviews, error: reviewsError } = await supabaseClient
      .from('letter_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des notes', code: 'FETCH_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        reviews: reviews as ReviewResponse[],
        pagination: {
          limit,
          offset,
          hasMore: reviews.length === limit
        }
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        }
      }
    )

  } catch (error) {
    console.error('Unexpected error in GET /api/reviews:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}