/**
 * API Route: Import Batch of Contacts to Brevo
 * POST /api/brevo/contacts/import-batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { queueBatchSync } from '@/lib/brevo/job-queue';
import { supabase, db } from '@/lib/supabase-client';

interface ImportBatchRequest {
  userIds?: string[];
  filters?: {
    subscriptionTier?: 'free' | 'premium';
    country?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    quotaStatus?: 'warning' | 'reached' | 'available';
  };
  batchSize?: number;
  immediate?: boolean;
  allUsers?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportBatchRequest = await request.json();
    const { userIds, filters, batchSize = 100, immediate = false, allUsers = false } = body;

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
        { error: 'Admin access required for batch operations' },
        { status: 403 }
      );
    }

    let targetUserIds: string[] = [];

    if (userIds && userIds.length > 0) {
      // Use provided user IDs
      targetUserIds = userIds;
    } else if (allUsers) {
      // Get all users
      const { data: users } = await db.userProfiles().select('user_id');
      targetUserIds = users?.map(u => u.user_id) || [];
    } else if (filters) {
      // Apply filters to get user IDs
      targetUserIds = await getUserIdsByFilters(filters);
    } else {
      return NextResponse.json(
        { error: 'Either userIds, filters, or allUsers must be specified' },
        { status: 400 }
      );
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users found matching criteria',
        count: 0,
      });
    }

    // Limit batch size to prevent overwhelming the system
    if (targetUserIds.length > 10000) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 10,000 users per batch.' },
        { status: 400 }
      );
    }

    if (immediate && targetUserIds.length > 50) {
      return NextResponse.json(
        { error: 'Immediate processing limited to 50 users. Use queue for larger batches.' },
        { status: 400 }
      );
    }

    if (immediate) {
      // Process immediately (limited to small batches)
      const { getSyncService } = await import('@/lib/brevo/sync-service');
      const syncService = getSyncService();
      const result = await syncService.batchSyncUsers(targetUserIds);

      return NextResponse.json({
        success: true,
        immediate: true,
        result: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          errors: result.errors,
        },
      });
    } else {
      // Queue for background processing
      const jobId = await queueBatchSync(targetUserIds, batchSize);

      return NextResponse.json({
        success: true,
        jobId,
        message: `Batch sync queued for ${targetUserIds.length} users`,
        count: targetUserIds.length,
        immediate: false,
      });
    }
  } catch (error) {
    console.error('Error in import-batch API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getUserIdsByFilters(filters: ImportBatchRequest['filters']): Promise<string[]> {
  let query = db.userProfiles().select('user_id, subscription_tier, country, created_at');

  // Apply subscription tier filter
  if (filters?.subscriptionTier) {
    query = query.eq('subscription_tier', filters.subscriptionTier);
  }

  // Apply country filter
  if (filters?.country) {
    query = query.eq('country', filters.country);
  }

  // Apply date range filter
  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.start)
      .lte('created_at', filters.dateRange.end);
  }

  const { data: profiles } = await query;
  let userIds = profiles?.map(p => p.user_id) || [];

  // Apply quota status filter
  if (filters?.quotaStatus && userIds.length > 0) {
    const { data: quotas } = await db.userQuotas()
      .select('user_id, letters_generated, max_letters')
      .in('user_id', userIds);

    const filteredByQuota = quotas?.filter(quota => {
      const remaining = quota.max_letters - quota.letters_generated;
      
      switch (filters.quotaStatus) {
        case 'warning':
          return remaining >= 1 && remaining <= 2;
        case 'reached':
          return remaining <= 0;
        case 'available':
          return remaining > 2;
        default:
          return true;
      }
    }).map(q => q.user_id) || [];

    userIds = userIds.filter(id => filteredByQuota.includes(id));
  }

  return userIds;
}