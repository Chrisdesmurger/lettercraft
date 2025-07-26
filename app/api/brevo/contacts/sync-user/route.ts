/**
 * API Route: Sync Specific User to Brevo
 * POST /api/brevo/contacts/sync-user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSyncService } from '@/lib/brevo/sync-service';
import { supabase, db } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, force = false } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
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

    // Check authorization
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin && user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to sync this user' },
        { status: 403 }
      );
    }

    const syncService = getSyncService();

    // Check if sync is needed (unless forced)
    if (!force) {
      const { data: syncRecord } = await db.brevoContactsSync()
        .select('sync_status, last_synced_at, sync_attempts')
        .eq('user_id', userId)
        .single();

      if (syncRecord) {
        // If recently synced and successful, skip
        if (syncRecord.sync_status === 'synced' && syncRecord.last_synced_at) {
          const lastSync = new Date(syncRecord.last_synced_at);
          const now = new Date();
          const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

          if (hoursSinceSync < 1) {
            return NextResponse.json({
              success: true,
              skipped: true,
              message: 'User was recently synced. Use force=true to override.',
              lastSynced: syncRecord.last_synced_at,
            });
          }
        }

        // If failed too many times, don't retry without force
        if (syncRecord.sync_attempts >= 3 && syncRecord.sync_status === 'failed') {
          return NextResponse.json({
            success: false,
            error: 'User has failed sync too many times. Use force=true to retry.',
            syncAttempts: syncRecord.sync_attempts,
          });
        }
      }
    }

    // Perform the sync
    const result = await syncService.syncUser(userId);

    // Get updated sync record for response
    const { data: updatedSync } = await db.brevoContactsSync()
      .select('*')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      success: result.success,
      brevoContactId: result.brevoContactId,
      error: result.error,
      shouldRetry: result.shouldRetry,
      syncRecord: updatedSync,
      forced: force,
    });

  } catch (error) {
    console.error('Error in sync-user API:', error);
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
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

    // Check authorization
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin && user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this user sync status' },
        { status: 403 }
      );
    }

    // Get sync record
    const { data: syncRecord } = await db.brevoContactsSync()
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!syncRecord) {
      return NextResponse.json({
        exists: false,
        message: 'User has not been synced to Brevo yet',
      });
    }

    return NextResponse.json({
      exists: true,
      syncRecord,
    });

  } catch (error) {
    console.error('Error in sync-user GET API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}