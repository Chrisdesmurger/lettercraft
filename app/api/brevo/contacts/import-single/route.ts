/**
 * API Route: Import Single Contact to Brevo
 * POST /api/brevo/contacts/import-single
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSyncService } from '@/lib/brevo/sync-service';
import { queueUserSync } from '@/lib/brevo/job-queue';
import { supabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, immediate = false } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists and get auth context
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

    // Check if user is admin or syncing their own account
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin && user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to sync this user' },
        { status: 403 }
      );
    }

    if (immediate) {
      // Sync immediately
      const syncService = getSyncService();
      const result = await syncService.syncUser(userId);

      return NextResponse.json({
        success: result.success,
        brevoContactId: result.brevoContactId,
        error: result.error,
        immediate: true,
      });
    } else {
      // Queue for background processing
      const jobId = await queueUserSync(userId);

      return NextResponse.json({
        success: true,
        jobId,
        message: 'User sync queued for processing',
        immediate: false,
      });
    }
  } catch (error) {
    console.error('Error in import-single API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}