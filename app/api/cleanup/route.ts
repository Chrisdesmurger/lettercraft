import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// API endpoint pour les tâches de maintenance automatisées
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, adminSecret } = body

    // Vérifier le secret admin
    const expectedSecret = process.env.ADMIN_SECRET || 'lettercraft-admin-secret-2025'
    if (adminSecret !== expectedSecret) {
      console.warn(`🚨 [SECURITY] Unauthorized cleanup attempt from IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const startTime = Date.now()
    console.log(`🧹 Starting cleanup task: ${action}`)

    switch (action) {
      case 'cleanup_expired_requests':
        return await cleanupExpiredRequests()
      
      case 'execute_pending_deletions':
        return await executePendingDeletions()
      
      case 'full_maintenance':
        return await fullMaintenance()
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Error in cleanup API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function cleanupExpiredRequests() {
  console.log('🗑️ Cleaning up expired deletion requests...')
  
  try {
    // Appeler la fonction SQL pour nettoyer les demandes expirées
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_deletion_requests')
    
    if (error) {
      console.error('❌ Error calling cleanup function:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    const cleanedCount = data || 0
    console.log(`✅ Cleanup completed: ${cleanedCount} expired requests cleaned`)
    
    // Créer un log d'audit pour le nettoyage
    try {
      await supabaseAdmin.rpc('create_audit_log', {
        p_user_id: null, // Action système
        p_action_type: 'maintenance_cleanup',
        p_entity_type: 'user_account',
        p_entity_id: 'system',
        p_metadata: {
          action: 'cleanup_expired_requests',
          cleaned_count: cleanedCount,
          execution_time: Date.now() - Date.now()
        }
      })
    } catch (logError) {
      console.warn('Failed to create audit log:', logError)
      // Ne pas faire échouer si le log échoue
    }
    
    return NextResponse.json({
      success: true,
      action: 'cleanup_expired_requests',
      cleanedCount,
      message: `${cleanedCount} expired deletion requests cleaned successfully`
    })

  } catch (error) {
    console.error('❌ Error in cleanupExpiredRequests:', error)
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to ensure generic user exists
async function ensureGenericUserExists(): Promise<boolean> {
  const genericUserId = '00000000-0000-0000-0000-000000000001'
  
  try {
    // Check if generic user exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(genericUserId)
    
    if (existingUser?.user) {
      console.log('✅ Generic user already exists')
      return true
    }
    
    console.log('🔧 Creating generic user for deletion operations...')
    
    // Create generic user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'deleted-user@system.local',
      password: 'system-user-no-login-' + Math.random().toString(36).substring(7),
      email_confirm: true,
      user_metadata: {
        system_user: true,
        purpose: 'deleted_accounts_placeholder',
        created_by: 'account_deletion_system'
      }
    })

    if (createError) {
      console.error('❌ Error creating generic user:', createError)
      return false
    }

    // Create profile for generic user
    const actualUserId = newUser?.user?.id || genericUserId
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: actualUserId,
        first_name: 'Utilisateur',
        last_name: 'Supprimé',
        subscription_tier: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.warn('⚠️ Warning: Could not create generic user profile:', profileError.message)
      // Don't fail the operation if profile creation fails
    }

    console.log('✅ Generic user created successfully')
    return true
    
  } catch (error) {
    console.error('❌ Error ensuring generic user exists:', error)
    return false
  }
}

async function executePendingDeletions() {
  console.log('⚡ Executing pending account deletions...')
  
  try {
    // Ensure generic user exists before any deletion operations
    const genericUserReady = await ensureGenericUserExists()
    if (!genericUserReady) {
      console.warn('⚠️ Generic user not available, proceeding with caution...')
    }
    // Trouver les demandes confirmées prêtes pour suppression
    const { data: pendingDeletions, error } = await supabaseAdmin
      .from('account_deletion_requests')
      .select(`
        id, user_id, deletion_type, reason, scheduled_deletion_at,
        users_with_profiles!inner(email, first_name, last_name, stripe_customer_id, stripe_subscription_id)
      `)
      .eq('status', 'confirmed')
      .lte('scheduled_deletion_at', new Date().toISOString())

    if (error) {
      console.error('❌ Error fetching pending deletions:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      console.log('ℹ️ No pending deletions found')
      return NextResponse.json({ 
        success: true,
        executed: 0, 
        message: 'No pending deletions to execute' 
      })
    }

    console.log(`📋 Found ${pendingDeletions.length} pending deletions`)

    let executed = 0
    let failed = 0
    const results = []

    for (const deletion of pendingDeletions) {
      try {
        const userProfile = deletion.users_with_profiles as any
        console.log(`🗑️ Processing deletion for user ${deletion.user_id} (${userProfile.email})`)
        
        // Exécuter la suppression selon le type
        let deletionResult: boolean
        if (deletion.deletion_type === 'soft') {
          const { data: result } = await supabaseAdmin
            .rpc('execute_soft_delete_user', { p_user_id: deletion.user_id })
          deletionResult = result
        } else {
          const { data: result } = await supabaseAdmin
            .rpc('execute_hard_delete_user', { p_user_id: deletion.user_id })
          deletionResult = result
        }

        if (deletionResult) {
          executed++
          results.push({
            userId: deletion.user_id,
            email: userProfile.email,
            status: 'success',
            deletionType: deletion.deletion_type
          })
          console.log(`✅ Successfully deleted user ${deletion.user_id} (${deletion.deletion_type})`)
        } else {
          failed++
          results.push({
            userId: deletion.user_id,
            email: userProfile.email,
            status: 'failed',
            error: 'Deletion function returned false'
          })
          console.error(`❌ Failed to delete user ${deletion.user_id}`)
        }

      } catch (error) {
        console.error(`❌ Error executing deletion for user ${deletion.user_id}:`, error)
        failed++
        results.push({
          userId: deletion.user_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Deletion batch completed: ${executed} executed, ${failed} failed`)

    // Log d'audit pour l'exécution des suppressions
    try {
      await supabaseAdmin.rpc('create_audit_log', {
        p_user_id: null, // Action système
        p_action_type: 'maintenance_execution',
        p_entity_type: 'user_account',
        p_entity_id: 'system',
        p_metadata: {
          action: 'execute_pending_deletions',
          executed_count: executed,
          failed_count: failed,
          total_processed: pendingDeletions.length
        }
      })
    } catch (logError) {
      console.warn('Failed to create audit log:', logError)
    }

    return NextResponse.json({
      success: true,
      action: 'execute_pending_deletions',
      executed,
      failed,
      total: pendingDeletions.length,
      results,
      message: `Processed ${pendingDeletions.length} deletions: ${executed} executed, ${failed} failed`
    })

  } catch (error) {
    console.error('❌ Error in executePendingDeletions:', error)
    return NextResponse.json({ 
      error: 'Execution failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function fullMaintenance() {
  console.log('🔧 Running full maintenance...')
  
  try {
    // 1. Nettoyer les demandes expirées
    const cleanupResult = await cleanupExpiredRequests()
    const cleanupData = await cleanupResult.json()
    
    // 2. Exécuter les suppressions en attente
    const executionResult = await executePendingDeletions()
    const executionData = await executionResult.json()
    
    return NextResponse.json({
      success: true,
      action: 'full_maintenance',
      cleanup: cleanupData,
      execution: executionData,
      message: 'Full maintenance completed successfully'
    })

  } catch (error) {
    console.error('❌ Error in fullMaintenance:', error)
    return NextResponse.json({ 
      error: 'Full maintenance failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Endpoint GET pour vérifier le statut
export async function GET() {
  try {
    // Compter les demandes actives
    const { data: activeRequests } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('status', { count: 'exact' })
      .in('status', ['pending', 'confirmed'])

    // Compter les demandes prêtes pour suppression
    const { data: readyForDeletion } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'confirmed')
      .lte('scheduled_deletion_at', new Date().toISOString())

    // Compter les demandes expirées
    const { data: expiredRequests } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    return NextResponse.json({
      status: 'healthy',
      stats: {
        activeRequests: activeRequests?.length || 0,
        readyForDeletion: readyForDeletion?.length || 0,
        expiredRequests: expiredRequests?.length || 0
      },
      actions: [
        'cleanup_expired_requests',
        'execute_pending_deletions', 
        'full_maintenance'
      ]
    })

  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Méthodes non supportées
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}