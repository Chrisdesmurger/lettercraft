import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, adminSecret } = body

    // Vérifier le secret admin
    const expectedSecret = process.env.ADMIN_SECRET || 'lettercraft-admin-secret-2025'
    if (adminSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    console.log(`🔍 Debugging deletion for user ${userId}`)

    // 1. Vérifier si l'utilisateur existe
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    console.log(`Auth user:`, authUser?.user ? 'EXISTS' : 'NOT FOUND', authError)

    // 2. Vérifier dans auth.users
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single()
    console.log(`Auth.users query:`, authUsersData, authUsersError)

    // 3. Vérifier le profil utilisateur
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    console.log(`User profile:`, userProfile, profileError)

    // 4. Vérifier les demandes de suppression
    const { data: deletionRequests, error: deletionError } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    console.log(`Deletion requests:`, deletionRequests, deletionError)

    // 5. Vérifier les données liées (contraintes FK)
    const relations = await Promise.allSettled([
      supabaseAdmin.from('generated_letters').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('saved_letters').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('user_quotas').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('candidates_profile').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('job_offers').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('stripe_subscriptions').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('stripe_invoices').select('id', { count: 'exact' }).eq('user_id', userId)
    ])

    const relationsData = {
      generated_letters: relations[0].status === 'fulfilled' ? relations[0].value.count : 'ERROR',
      saved_letters: relations[1].status === 'fulfilled' ? relations[1].value.count : 'ERROR',
      user_quotas: relations[2].status === 'fulfilled' ? relations[2].value.count : 'ERROR',
      candidates_profile: relations[3].status === 'fulfilled' ? relations[3].value.count : 'ERROR',
      job_offers: relations[4].status === 'fulfilled' ? relations[4].value.count : 'ERROR',
      stripe_subscriptions: relations[5].status === 'fulfilled' ? relations[5].value.count : 'ERROR',
      stripe_invoices: relations[6].status === 'fulfilled' ? relations[6].value.count : 'ERROR'
    }

    console.log(`Related data counts:`, relationsData)

    // 6. Tester la fonction de suppression avec plus de détails
    try {
      console.log(`🧪 Testing hard delete function...`)
      const { data: hardDeleteResult, error: hardDeleteError } = await supabaseAdmin
        .rpc('execute_hard_delete_user', { p_user_id: userId })
      
      console.log(`Hard delete result:`, hardDeleteResult, hardDeleteError)
    } catch (deleteTestError) {
      console.error(`Hard delete test error:`, deleteTestError)
    }

    // 7. Vérifier les logs d'audit récents
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    console.log(`Recent audit logs:`, auditLogs, auditError)

    return NextResponse.json({
      success: true,
      debug: {
        userId,
        authUser: authUser?.user ? { id: authUser.user.id, email: authUser.user.email } : null,
        authUsersData,
        userProfile,
        deletionRequests,
        relationsData,
        auditLogs,
        errors: {
          authError,
          authUsersError,
          profileError,
          deletionError,
          auditError
        }
      }
    })

  } catch (error) {
    console.error('Debug deletion error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST with userId and adminSecret required',
    example: {
      userId: 'uuid-here',
      adminSecret: 'your-secret'
    }
  })
}