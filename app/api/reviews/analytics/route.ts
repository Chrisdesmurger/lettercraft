import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase-client'
import { rateLimiters } from '@/lib/middleware/rate-limiter'

interface AnalyticsResponse {
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

/**
 * Check if user has admin/analytics access
 * For now, this is a placeholder - in production this should check proper roles
 */
async function checkAnalyticsAccess(userId: string): Promise<boolean> {
  // TODO: Implement proper role-based access control
  // For now, allow all authenticated users (this should be restricted in production)
  return true
}

/**
 * GET /api/reviews/analytics - Get review statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.analytics.check(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Trop de requêtes d\'analytics. Veuillez réessayer plus tard.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }

    // Get authenticated user
    const cookieStore = await cookies()
    const supabaseClient = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check analytics access
    const hasAccess = await checkAnalyticsAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès non autorisé aux analytics', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const daysBack = Math.min(parseInt(searchParams.get('days') || '30'), 365)
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Call the database function for analytics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_review_statistics', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      .single()

    if (statsError) {
      console.error('Error fetching review statistics:', statsError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des statistiques', code: 'ANALYTICS_ERROR' },
        { status: 500 }
      )
    }

    const response: AnalyticsResponse = {
      total_reviews: stats.total_reviews || 0,
      average_rating: parseFloat(stats.average_rating) || 0,
      rating_distribution: stats.rating_distribution || {},
      total_users_with_reviews: stats.total_users_with_reviews || 0,
      total_users_with_letters: stats.total_users_with_letters || 0,
      participation_rate: parseFloat(stats.participation_rate) || 0,
      category_breakdown: stats.category_breakdown || {},
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }
    }

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/reviews/analytics:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}