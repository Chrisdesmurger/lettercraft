/**
 * API Route: Brevo Sync Dashboard
 * GET /api/brevo/dashboard - Get comprehensive sync status and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSyncService } from '@/lib/brevo/sync-service';
import { getJobQueue } from '@/lib/brevo/job-queue';
import { getListManager } from '@/lib/brevo/list-manager';
import { getEventProcessor } from '@/lib/brevo/event-processor';
import { supabase } from '@/lib/supabase-client';

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
        { error: 'Admin access required for dashboard data' },
        { status: 403 }
      );
    }

    // Get all dashboard data concurrently
    const [
      syncStats,
      jobStats,
      listData,
      eventStats,
      brevoConnection,
      usersNeedingSync,
      recentJobs,
      recentEvents,
    ] = await Promise.all([
      getSyncStats(),
      getJobStats(),
      getListData(),
      getEventStats(),
      testBrevoConnection(),
      getUsersNeedingSync(),
      getRecentJobs(),
      getRecentEvents(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      connection: {
        brevo: brevoConnection,
        healthy: brevoConnection && syncStats.total > 0,
      },
      sync: {
        stats: syncStats,
        usersNeedingSync: usersNeedingSync.count,
        healthScore: calculateSyncHealthScore(syncStats),
      },
      jobs: {
        stats: jobStats,
        recent: recentJobs,
        queueHealth: calculateQueueHealth(jobStats),
      },
      lists: {
        total: listData.lists.length,
        active: listData.lists.filter(l => l.is_active).length,
        totalContacts: listData.totalContacts,
        lists: listData.lists,
      },
      events: {
        stats: eventStats,
        recent: recentEvents,
        processingHealth: calculateEventProcessingHealth(eventStats),
      },
      recommendations: generateRecommendations({
        syncStats,
        jobStats,
        eventStats,
        usersNeedingSync: usersNeedingSync.count,
        brevoConnection,
      }),
    });

  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getSyncStats() {
  const syncService = getSyncService();
  return syncService.getSyncStats();
}

async function getJobStats() {
  const jobQueue = getJobQueue();
  return jobQueue.getQueueStats();
}

async function getListData() {
  const listManager = getListManager();
  const lists = await listManager.getAllLists();
  const totalContacts = lists.reduce((sum, list) => sum + list.contact_count, 0);
  
  return { lists, totalContacts };
}

async function getEventStats() {
  const eventProcessor = getEventProcessor();
  return eventProcessor.getEventStats();
}

async function testBrevoConnection() {
  try {
    const syncService = getSyncService();
    return await syncService.testConnection();
  } catch (error) {
    return false;
  }
}

async function getUsersNeedingSync() {
  const syncService = getSyncService();
  const userIds = await syncService.getUsersNeedingSync(1000);
  return { count: userIds.length, userIds: userIds.slice(0, 10) }; // Return sample of 10
}

async function getRecentJobs() {
  const jobQueue = getJobQueue();
  return jobQueue.getJobs({ limit: 10 });
}

async function getRecentEvents() {
  const { db } = await import('@/lib/supabase-client');
  const { data: events } = await db.brevoContactEvents()
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  return events || [];
}

function calculateSyncHealthScore(stats: any): number {
  if (stats.total === 0) return 0;
  
  const syncedRatio = stats.synced / stats.total;
  const failedRatio = stats.failed / stats.total;
  
  // Health score based on sync success rate
  let score = syncedRatio * 100;
  
  // Penalize high failure rate
  score -= failedRatio * 50;
  
  // Penalize pending items (slight)
  const pendingRatio = stats.pending / stats.total;
  score -= pendingRatio * 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateQueueHealth(jobStats: any): 'healthy' | 'warning' | 'critical' {
  const { pending, failed, running, total } = jobStats;
  
  if (total === 0) return 'healthy';
  
  const failedRatio = failed / total;
  const pendingRatio = pending / total;
  
  // Critical if high failure rate or too many pending
  if (failedRatio > 0.3 || (pending > 50 && pendingRatio > 0.5)) {
    return 'critical';
  }
  
  // Warning if moderate issues
  if (failedRatio > 0.1 || pending > 20) {
    return 'warning';
  }
  
  return 'healthy';
}

function calculateEventProcessingHealth(eventStats: any): 'healthy' | 'warning' | 'critical' {
  const { total, pending } = eventStats;
  
  if (total === 0) return 'healthy';
  
  const pendingRatio = pending / total;
  
  // Critical if too many unprocessed events
  if (pending > 1000 || pendingRatio > 0.8) {
    return 'critical';
  }
  
  // Warning if moderate backlog
  if (pending > 100 || pendingRatio > 0.3) {
    return 'warning';
  }
  
  return 'healthy';
}

function generateRecommendations(data: {
  syncStats: any;
  jobStats: any;
  eventStats: any;
  usersNeedingSync: number;
  brevoConnection: boolean;
}): string[] {
  const recommendations: string[] = [];
  
  if (!data.brevoConnection) {
    recommendations.push('❌ Brevo connection failed. Check API key and network connectivity.');
  }
  
  if (data.usersNeedingSync > 100) {
    recommendations.push(`🔄 ${data.usersNeedingSync} users need syncing. Consider running a full sync.`);
  }
  
  if (data.syncStats.failed > 10) {
    recommendations.push(`⚠️ ${data.syncStats.failed} contacts failed to sync. Review error logs.`);
  }
  
  if (data.jobStats.failed > 5) {
    recommendations.push(`🔧 ${data.jobStats.failed} jobs failed. Consider retrying failed jobs.`);
  }
  
  if (data.eventStats.pending > 50) {
    recommendations.push(`📊 ${data.eventStats.pending} events pending. Event processor may need attention.`);
  }
  
  const syncHealthScore = calculateSyncHealthScore(data.syncStats);
  if (syncHealthScore < 70) {
    recommendations.push(`📈 Sync health score is ${syncHealthScore}%. Consider investigating sync issues.`);
  }
  
  if (data.jobStats.pending > 20) {
    recommendations.push(`⏳ ${data.jobStats.pending} jobs pending. Queue may be backed up.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operating normally. No immediate action required.');
  }
  
  return recommendations;
}