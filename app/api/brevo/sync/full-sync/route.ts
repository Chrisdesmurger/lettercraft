/**
 * API Route: Full Brevo Synchronization
 * POST /api/brevo/sync/full-sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { queueFullSync } from '@/lib/brevo/job-queue';
import { getSyncService } from '@/lib/brevo/sync-service';
import { supabase } from '@/lib/supabase-client';

interface FullSyncRequest {
  limit?: number;
  immediate?: boolean;
  forceAll?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { limit = 1000, immediate = false, forceAll = false }: FullSyncRequest = await request.json();

    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required for full sync operations' },
        { status: 403 }
      );
    }

    const syncService = getSyncService();

    // Get users that need syncing
    const usersNeedingSync = await syncService.getUsersNeedingSync(limit);

    if (usersNeedingSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users are up to date',
        usersToSync: 0,
      });
    }

    // Get current sync statistics
    const stats = await syncService.getSyncStats();

    if (immediate) {
      // Immediate processing (limited to smaller batches)
      if (usersNeedingSync.length > 100) {
        return NextResponse.json(
          { error: 'Immediate full sync limited to 100 users. Use queue for larger operations.' },
          { status: 400 }
        );
      }

      const result = await syncService.batchSyncUsers(usersNeedingSync);

      // Get updated stats
      const updatedStats = await syncService.getSyncStats();

      return NextResponse.json({
        success: true,
        immediate: true,
        result: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          errors: result.errors,
        },
        statsBeforeSync: stats,
        statsAfterSync: updatedStats,
      });
    } else {
      // Queue for background processing
      const jobId = await queueFullSync(limit);

      return NextResponse.json({
        success: true,
        jobId,
        message: `Full sync queued for ${usersNeedingSync.length} users`,
        usersToSync: usersNeedingSync.length,
        currentStats: stats,
        immediate: false,
      });
    }
  } catch (error) {
    console.error('Error in full-sync API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const syncService = getSyncService();

    // Get sync statistics
    const stats = await syncService.getSyncStats();
    
    // Get users that need syncing
    const usersNeedingSync = await syncService.getUsersNeedingSync(1000);

    // Test Brevo connection
    const brevoConnected = await syncService.testConnection();

    return NextResponse.json({
      stats,
      usersNeedingSync: usersNeedingSync.length,
      brevoConnected,
      recommendation: usersNeedingSync.length > 0 
        ? `Consider running a full sync for ${usersNeedingSync.length} users`
        : 'All users are up to date',
    });

  } catch (error) {
    console.error('Error in full-sync GET API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}