import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase-client'
import { rateLimiters } from '@/lib/middleware/rate-limiter'

interface CSVRow {
  id: string
  letter_id: string
  user_id: string
  rating: number
  feedback: string | null
  categories: string
  created_at: string
}

/**
 * Check if user has export access
 */
async function checkExportAccess(userId: string): Promise<boolean> {
  // TODO: Implement proper role-based access control
  // For now, allow all authenticated users (this should be restricted in production)
  return true
}

/**
 * Convert rows to CSV format
 */
function convertToCSV(rows: CSVRow[]): string {
  const headers = ['id', 'letter_id', 'user_id', 'rating', 'feedback', 'categories', 'created_at']
  const csvRows = [headers.join(',')]

  for (const row of rows) {
    const values = [
      row.id,
      row.letter_id,
      row.user_id,
      row.rating.toString(),
      row.feedback ? `"${row.feedback.replace(/"/g, '""')}"` : '', // Escape quotes
      `"${row.categories}"`,
      row.created_at
    ]
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * GET /api/reviews/export - Export reviews as CSV
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - more restrictive for exports
    const rateLimitResult = rateLimiters.analytics.check(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Trop d\'exports. Veuillez réessayer plus tard.',
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

    // Check export access
    const hasAccess = await checkExportAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Accès non autorisé à l\'export', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const daysBack = Math.min(parseInt(searchParams.get('days') || '30'), 365)
    
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Call the database function for CSV export
    const { data: rows, error: exportError } = await supabase
      .rpc('export_reviews_csv', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })

    if (exportError) {
      console.error('Error exporting reviews:', exportError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'export des données', code: 'EXPORT_ERROR' },
        { status: 500 }
      )
    }

    // Convert to CSV
    const csvData = convertToCSV(rows || [])
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `lettercraft-reviews-${timestamp}.csv`

    // Log export (without PII)
    console.log(`CSV export: user=${user.id}, rows=${rows?.length || 0}, period=${daysBack}days`)

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        // Add UTF-8 BOM for proper Excel encoding
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/reviews/export:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}