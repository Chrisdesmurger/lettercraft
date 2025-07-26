/**
 * React Hook for Brevo Sync Management
 * Provides interface for monitoring and controlling Brevo synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './useUser';

interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
  outdated: number;
}

interface JobStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

interface ListData {
  id: string;
  brevo_list_id: number;
  name: string;
  type: 'manual' | 'dynamic';
  contact_count: number;
  is_active: boolean;
}

interface EventStats {
  total: number;
  processed: number;
  pending: number;
  byEventType: Record<string, number>;
  bySource: Record<string, number>;
}

interface DashboardData {
  connection: {
    brevo: boolean;
    healthy: boolean;
  };
  sync: {
    stats: SyncStats;
    usersNeedingSync: number;
    healthScore: number;
  };
  jobs: {
    stats: JobStats;
    recent: any[];
    queueHealth: 'healthy' | 'warning' | 'critical';
  };
  lists: {
    total: number;
    active: number;
    totalContacts: number;
    lists: ListData[];
  };
  events: {
    stats: EventStats;
    recent: any[];
    processingHealth: 'healthy' | 'warning' | 'critical';
  };
  recommendations: string[];
  timestamp: string;
}

export function useBrevoSync() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.user_metadata?.role === 'admin';

  // Get auth token for API calls
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    
    const { data: { session } } = await import('@/lib/supabase-client').then(m => m.supabase.auth.getSession());
    if (!session?.access_token) throw new Error('No access token');

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }, [user]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/brevo/dashboard', { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, getAuthHeaders]);

  // Sync single user
  const syncUser = useCallback(async (userId: string, force = false) => {
    if (!isAdmin) throw new Error('Admin access required');

    const headers = await getAuthHeaders();
    const response = await fetch('/api/brevo/contacts/sync-user', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, force }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync user: ${response.statusText}`);
    }

    return response.json();
  }, [isAdmin, getAuthHeaders]);

  // Batch sync users
  const batchSync = useCallback(async (options: {
    userIds?: string[];
    filters?: any;
    batchSize?: number;
    immediate?: boolean;
    allUsers?: boolean;
  }) => {
    if (!isAdmin) throw new Error('Admin access required');

    const headers = await getAuthHeaders();
    const response = await fetch('/api/brevo/contacts/import-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Failed to batch sync: ${response.statusText}`);
    }

    return response.json();
  }, [isAdmin, getAuthHeaders]);

  // Full sync
  const fullSync = useCallback(async (options: {
    limit?: number;
    immediate?: boolean;
  } = {}) => {
    if (!isAdmin) throw new Error('Admin access required');

    const headers = await getAuthHeaders();
    const response = await fetch('/api/brevo/sync/full-sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Failed to start full sync: ${response.statusText}`);
    }

    return response.json();
  }, [isAdmin, getAuthHeaders]);

  // Manage lists
  const manageLists = useCallback(async (action: 'initialize' | 'refresh_single' | 'refresh_all', listName?: string) => {
    if (!isAdmin) throw new Error('Admin access required');

    const headers = await getAuthHeaders();
    const response = await fetch('/api/brevo/lists/manage', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, listName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to manage lists: ${response.statusText}`);
    }

    return response.json();
  }, [isAdmin, getAuthHeaders]);

  // Get job status
  const getJobStatus = useCallback(async (jobId?: string) => {
    if (!isAdmin) throw new Error('Admin access required');

    const headers = await getAuthHeaders();
    const url = jobId ? `/api/brevo/jobs/status?jobId=${jobId}` : '/api/brevo/jobs/status';
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    return response.json();
  }, [isAdmin, getAuthHeaders]);

  // Job actions
  const jobAction = useCallback(async (action: 'cancel' | 'retry', jobId: string) => {
    if (!isAdmin) throw new Error('Admin access required');

    const headers = await getAuthHeaders();
    const response = await fetch('/api/brevo/jobs/status', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, jobId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} job: ${response.statusText}`);
    }

    return response.json();
  }, [isAdmin, getAuthHeaders]);

  // Auto-refresh dashboard data
  useEffect(() => {
    if (isAdmin) {
      fetchDashboard();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchDashboard]);

  return {
    // Data
    dashboardData,
    loading,
    error,
    isAdmin,

    // Actions
    fetchDashboard,
    syncUser,
    batchSync,
    fullSync,
    manageLists,
    getJobStatus,
    jobAction,

    // Computed values
    isHealthy: dashboardData?.connection.healthy ?? false,
    syncHealthScore: dashboardData?.sync.healthScore ?? 0,
    queueHealth: dashboardData?.jobs.queueHealth ?? 'healthy',
    processingHealth: dashboardData?.events.processingHealth ?? 'healthy',
    usersNeedingSync: dashboardData?.sync.usersNeedingSync ?? 0,
    totalContacts: dashboardData?.lists.totalContacts ?? 0,
  };
}

// Helper hook for non-admin users to check their own sync status
export function useUserSync(userId?: string) {
  const { user } = useUser();
  const [syncRecord, setSyncRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const checkSyncStatus = useCallback(async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { supabase } = await import('@/lib/supabase-client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) throw new Error('No access token');

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`/api/brevo/contacts/sync-user?userId=${targetUserId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to check sync status: ${response.statusText}`);
      }

      const data = await response.json();
      setSyncRecord(data.exists ? data.syncRecord : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const requestSync = useCallback(async (force = false) => {
    if (!targetUserId) throw new Error('No user ID');

    const { supabase } = await import('@/lib/supabase-client');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) throw new Error('No access token');

    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch('/api/brevo/contacts/sync-user', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: targetUserId, force }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request sync: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Refresh sync status after successful sync
    if (result.success) {
      await checkSyncStatus();
    }

    return result;
  }, [targetUserId, checkSyncStatus]);

  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  return {
    syncRecord,
    loading,
    error,
    checkSyncStatus,
    requestSync,
    isSynced: syncRecord?.sync_status === 'synced',
    lastSynced: syncRecord?.last_synced_at,
    syncAttempts: syncRecord?.sync_attempts ?? 0,
  };
}