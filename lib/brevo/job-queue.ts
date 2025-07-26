/**
 * Brevo Job Queue System
 * Manages background sync jobs with retry logic
 */

import { db, Tables } from '@/lib/supabase-client';
import { getSyncService, BatchSyncResult } from './sync-service';

export type JobType = 'import_single' | 'import_batch' | 'update_contact' | 'delete_contact' | 'sync_lists' | 'full_sync';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobData {
  userIds?: string[];
  userId?: string;
  batchSize?: number;
  listIds?: number[];
  [key: string]: any;
}

export interface Job {
  id: string;
  job_type: JobType;
  status: JobStatus;
  total_items: number | null;
  processed_items: number;
  failed_items: number;
  data: JobData | null;
  error_details: any | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class BrevoJobQueue {
  private syncService = getSyncService();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Add a new job to the queue
   */
  async addJob(
    jobType: JobType,
    data: JobData,
    totalItems?: number
  ): Promise<string> {
    const { data: job, error } = await db.brevoSyncJobs()
      .insert({
        job_type: jobType,
        data,
        total_items: totalItems || null,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    // Start processing if not already running
    this.startProcessing();

    return job.id;
  }

  /**
   * Start the job processing loop
   */
  startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      await this.processNextJob();
    }, 5000); // Check for jobs every 5 seconds

    console.log('Brevo job queue processing started');
  }

  /**
   * Stop the job processing loop
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('Brevo job queue processing stopped');
  }

  /**
   * Process the next pending job
   */
  private async processNextJob(): Promise<void> {
    try {
      // Get the oldest pending job
      const { data: job } = await db.brevoSyncJobs()
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!job) return; // No pending jobs

      await this.executeJob(job);
    } catch (error) {
      console.error('Error processing job:', error);
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: Job): Promise<void> {
    const jobId = job.id;
    
    try {
      // Mark job as running
      await this.updateJobStatus(jobId, 'running', {
        started_at: new Date().toISOString(),
      });

      let result: any;

      switch (job.job_type) {
        case 'import_single':
          result = await this.executeImportSingle(job);
          break;
        case 'import_batch':
          result = await this.executeImportBatch(job);
          break;
        case 'update_contact':
          result = await this.executeUpdateContact(job);
          break;
        case 'delete_contact':
          result = await this.executeDeleteContact(job);
          break;
        case 'full_sync':
          result = await this.executeFullSync(job);
          break;
        case 'sync_lists':
          result = await this.executeSyncLists(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark job as completed
      await this.updateJobStatus(jobId, 'completed', {
        completed_at: new Date().toISOString(),
        processed_items: result.processed || job.total_items || 1,
        failed_items: result.failed || 0,
      });

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      await this.updateJobStatus(jobId, 'failed', {
        completed_at: new Date().toISOString(),
        error_details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Execute single contact import
   */
  private async executeImportSingle(job: Job): Promise<{ processed: number; failed: number }> {
    const userId = job.data?.userId;
    if (!userId) {
      throw new Error('Missing userId for single import job');
    }

    const result = await this.syncService.syncUser(userId);
    
    return {
      processed: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
    };
  }

  /**
   * Execute batch contact import
   */
  private async executeImportBatch(job: Job): Promise<{ processed: number; failed: number }> {
    const userIds = job.data?.userIds;
    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('Missing or invalid userIds for batch import job');
    }

    const batchSize = job.data?.batchSize || 100;
    let totalProcessed = 0;
    let totalFailed = 0;

    // Process in smaller batches to avoid overwhelming the API
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchResult = await this.syncService.batchSyncUsers(batch);
      
      totalProcessed += batchResult.successful;
      totalFailed += batchResult.failed;

      // Update progress
      await this.updateJobProgress(job.id, totalProcessed + totalFailed, totalFailed);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      processed: totalProcessed,
      failed: totalFailed,
    };
  }

  /**
   * Execute contact update
   */
  private async executeUpdateContact(job: Job): Promise<{ processed: number; failed: number }> {
    const userId = job.data?.userId;
    if (!userId) {
      throw new Error('Missing userId for update contact job');
    }

    const result = await this.syncService.syncUser(userId);
    
    return {
      processed: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
    };
  }

  /**
   * Execute contact deletion
   */
  private async executeDeleteContact(job: Job): Promise<{ processed: number; failed: number }> {
    const userId = job.data?.userId;
    if (!userId) {
      throw new Error('Missing userId for delete contact job');
    }

    const result = await this.syncService.deleteContact(userId);
    
    return {
      processed: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
    };
  }

  /**
   * Execute full sync of all users
   */
  private async executeFullSync(job: Job): Promise<{ processed: number; failed: number }> {
    const limit = job.data?.limit || 1000;
    const userIds = await this.syncService.getUsersNeedingSync(limit);
    
    if (userIds.length === 0) {
      return { processed: 0, failed: 0 };
    }

    // Update job with actual total items
    await this.updateJobStatus(job.id, 'running', {
      total_items: userIds.length,
    });

    const result = await this.syncService.batchSyncUsers(userIds);
    
    return {
      processed: result.successful,
      failed: result.failed,
    };
  }

  /**
   * Execute list synchronization
   */
  private async executeSyncLists(job: Job): Promise<{ processed: number; failed: number }> {
    // This would implement dynamic list management
    // For now, just return success
    return { processed: 1, failed: 0 };
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: Partial<Job> = {}
  ): Promise<void> {
    await db.brevoSyncJobs()
      .update({
        status,
        ...updates,
      })
      .eq('id', jobId);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    processed: number,
    failed: number
  ): Promise<void> {
    await db.brevoSyncJobs()
      .update({
        processed_items: processed,
        failed_items: failed,
      })
      .eq('id', jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Job | null> {
    const { data } = await db.brevoSyncJobs()
      .select('*')
      .eq('id', jobId)
      .single();

    return data || null;
  }

  /**
   * Get all jobs with optional filtering
   */
  async getJobs(filters?: {
    status?: JobStatus;
    jobType?: JobType;
    limit?: number;
  }): Promise<Job[]> {
    let query = db.brevoSyncJobs().select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.jobType) {
      query = query.eq('job_type', filters.jobType);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data } = await query;
    return data || [];
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'cancelled', {
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'pending', {
      started_at: null,
      completed_at: null,
      error_details: null,
      processed_items: 0,
      failed_items: 0,
    });

    // Start processing if not already running
    this.startProcessing();
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const { data: jobs } = await db.brevoSyncJobs()
      .select('status');

    const total = jobs?.length || 0;
    const byStatus = jobs?.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      pending: byStatus.pending || 0,
      running: byStatus.running || 0,
      completed: byStatus.completed || 0,
      failed: byStatus.failed || 0,
      total,
    };
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await db.brevoSyncJobs()
      .delete()
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup jobs: ${error.message}`);
    }

    return data?.length || 0;
  }
}

// Singleton instance
let jobQueue: BrevoJobQueue | null = null;

export function getJobQueue(): BrevoJobQueue {
  if (!jobQueue) {
    jobQueue = new BrevoJobQueue();
  }
  return jobQueue;
}

// Helper functions for common job types
export async function queueUserSync(userId: string): Promise<string> {
  const queue = getJobQueue();
  return queue.addJob('import_single', { userId }, 1);
}

export async function queueBatchSync(userIds: string[], batchSize: number = 100): Promise<string> {
  const queue = getJobQueue();
  return queue.addJob('import_batch', { userIds, batchSize }, userIds.length);
}

export async function queueFullSync(limit: number = 1000): Promise<string> {
  const queue = getJobQueue();
  return queue.addJob('full_sync', { limit });
}

export async function queueUserUpdate(userId: string): Promise<string> {
  const queue = getJobQueue();
  return queue.addJob('update_contact', { userId }, 1);
}

export async function queueUserDeletion(userId: string): Promise<string> {
  const queue = getJobQueue();
  return queue.addJob('delete_contact', { userId }, 1);
}