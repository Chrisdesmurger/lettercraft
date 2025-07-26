/**
 * Brevo Contact Synchronization Service
 * Handles bidirectional sync between LetterApp and Brevo
 */

import { supabase, db, Tables } from '@/lib/supabase-client';
import { getBrevoClient, formatUserForBrevo, handleBrevoError, BrevoContact } from './client';

export type SyncStatus = 'pending' | 'synced' | 'failed' | 'outdated';
export type JobType = 'import_single' | 'import_batch' | 'update_contact' | 'delete_contact' | 'sync_lists' | 'full_sync';

export interface SyncResult {
  success: boolean;
  brevoContactId?: number;
  error?: string;
  shouldRetry?: boolean;
}

export interface BatchSyncResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

export class BrevoSyncService {
  private brevoClient = getBrevoClient();

  /**
   * Sync a single user to Brevo
   */
  async syncUser(userId: string): Promise<SyncResult> {
    try {
      // Get user data from Supabase
      const userData = await this.getUserData(userId);
      if (!userData) {
        return { success: false, error: 'User not found' };
      }

      // Check if user already has a sync record
      const { data: existingSync } = await db.brevoContactsSync()
        .select('*')
        .eq('user_id', userId)
        .single();

      const brevoContact = formatUserForBrevo(userData);
      let result: SyncResult;

      if (existingSync?.brevo_contact_id) {
        // Update existing contact
        result = await this.updateContact(existingSync.brevo_contact_id, brevoContact);
      } else {
        // Create new contact
        result = await this.createContact(brevoContact);
      }

      // Update sync record
      await this.updateSyncRecord(userId, result, userData.email);

      return result;
    } catch (error) {
      console.error('Error syncing user:', error);
      await this.updateSyncRecord(userId, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create a new contact in Brevo
   */
  private async createContact(contact: BrevoContact): Promise<SyncResult> {
    const { getRetryHandler, RETRY_CONFIGS } = await import('./retry-handler');
    const retryHandler = getRetryHandler();
    
    const result = await retryHandler.withRetry(
      async () => {
        try {
          const response = await this.brevoClient.createContact(contact);
          return {
            success: true,
            brevoContactId: response.id,
          };
        } catch (error: any) {
          // If contact already exists (409), try to get the existing contact
          if (error.status === 409) {
            try {
              const existingContact = await this.brevoClient.getContact(contact.email);
              return {
                success: true,
                brevoContactId: existingContact.id,
              };
            } catch (getError) {
              console.error('Failed to get existing contact:', getError);
              throw error; // Re-throw original error
            }
          }
          throw error;
        }
      },
      RETRY_CONFIGS.CONTACT_SYNC,
      { operation: 'create_contact', userId: 'unknown' }
    );

    if (!result.success) {
      const errorInfo = handleBrevoError(new Error(result.error));
      return {
        success: false,
        error: errorInfo.message,
        shouldRetry: errorInfo.shouldRetry,
      };
    }

    return result.data!;
  }

  /**
   * Update an existing contact in Brevo
   */
  private async updateContact(contactId: number, contact: BrevoContact): Promise<SyncResult> {
    const { getRetryHandler, RETRY_CONFIGS } = await import('./retry-handler');
    const retryHandler = getRetryHandler();
    
    const result = await retryHandler.withRetry(
      async () => {
        await this.brevoClient.updateContact(contactId, contact);
        return {
          success: true,
          brevoContactId: contactId,
        };
      },
      RETRY_CONFIGS.CONTACT_SYNC,
      { operation: 'update_contact', userId: 'unknown' }
    );

    if (!result.success) {
      const errorInfo = handleBrevoError(new Error(result.error));
      return {
        success: false,
        error: errorInfo.message,
        shouldRetry: errorInfo.shouldRetry,
      };
    }

    return result.data!;
  }

  /**
   * Get comprehensive user data for sync
   */
  private async getUserData(userId: string) {
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (!user.user) return null;

    const { data: profile } = await db.userProfiles()
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: quota } = await db.userQuotas()
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: lettersCount } = await db.generatedLetters()
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const { data: lastLetter } = await db.generatedLetters()
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate profile completion
    let profileCompletion = 0;
    if (profile?.first_name) profileCompletion += 20;
    if (profile?.last_name) profileCompletion += 20;
    if (profile?.country) profileCompletion += 20;
    if (profile?.language) profileCompletion += 20;
    if (quota) profileCompletion += 20;

    // Calculate lead score
    const lettersGenerated = lettersCount?.length || 0;
    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(user.user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let leadScore = 0;
    leadScore += Math.min(lettersGenerated * 10, 50); // Max 50 points for usage
    if (daysSinceSignup <= 7) leadScore += 20; // Recent signup bonus
    if (profile?.subscription_tier === 'premium') leadScore += 30; // Premium bonus
    leadScore += Math.floor(profileCompletion * 0.4); // Profile completion bonus
    leadScore = Math.min(leadScore, 100);

    return {
      email: user.user.email!,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      subscription_tier: profile?.subscription_tier || 'free',
      country: profile?.country,
      language: profile?.language || 'fr',
      letters_generated: lettersGenerated,
      quota_remaining: quota ? quota.max_letters - quota.letters_generated : 0,
      created_at: user.user.created_at,
      last_letter_date: lastLetter?.created_at,
      lead_score: leadScore,
      profile_completion: profileCompletion,
    };
  }

  /**
   * Update sync record in database
   */
  private async updateSyncRecord(
    userId: string, 
    result: SyncResult, 
    email?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    
    const syncData: any = {
      user_id: userId,
      sync_status: result.success ? 'synced' : 'failed',
      error_message: result.error || null,
      last_synced_at: result.success ? now : null,
    };

    if (email) {
      syncData.email = email;
    }

    if (result.brevoContactId) {
      syncData.brevo_contact_id = result.brevoContactId;
    }

    // Try to update existing record, or create new one
    const { data: existing } = await db.brevoContactsSync()
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Increment sync attempts on failure
      if (!result.success) {
        const { data: currentRecord } = await db.brevoContactsSync()
          .select('sync_attempts')
          .eq('user_id', userId)
          .single();
        
        syncData.sync_attempts = (currentRecord?.sync_attempts || 0) + 1;
      } else {
        syncData.sync_attempts = 0; // Reset on success
      }

      await db.brevoContactsSync()
        .update(syncData)
        .eq('user_id', userId);
    } else {
      syncData.sync_attempts = result.success ? 0 : 1;
      await db.brevoContactsSync().insert(syncData);
    }
  }

  /**
   * Batch sync multiple users
   */
  async batchSyncUsers(userIds: string[]): Promise<BatchSyncResult> {
    const result: BatchSyncResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      result.totalProcessed++;
      
      try {
        const syncResult = await this.syncUser(userId);
        
        if (syncResult.success) {
          result.successful++;
        } else {
          result.failed++;
          result.errors.push({
            userId,
            error: syncResult.error || 'Unknown error',
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return result;
  }

  /**
   * Get users that need syncing
   */
  async getUsersNeedingSync(limit: number = 100): Promise<string[]> {
    // Get users with outdated or failed sync records
    const { data: outdatedSyncs } = await db.brevoContactsSync()
      .select('user_id')
      .or('sync_status.eq.outdated,sync_status.eq.failed,sync_status.eq.pending')
      .lt('sync_attempts', 3) // Don't retry more than 3 times
      .limit(limit);

    const outdatedUserIds = outdatedSyncs?.map(sync => sync.user_id) || [];

    // Also get users who don't have sync records at all
    const { data: allUsers } = await db.userProfiles()
      .select('user_id')
      .limit(limit);

    const allUserIds = allUsers?.map(user => user.user_id) || [];

    const { data: syncedUsers } = await db.brevoContactsSync()
      .select('user_id');

    const syncedUserIds = new Set(syncedUsers?.map(sync => sync.user_id) || []);
    const unsyncedUserIds = allUserIds.filter(userId => !syncedUserIds.has(userId));

    // Combine and deduplicate
    const needingSyncIds = [...new Set([...outdatedUserIds, ...unsyncedUserIds])];
    
    return needingSyncIds.slice(0, limit);
  }

  /**
   * Mark user sync as outdated (to trigger re-sync)
   */
  async markUserOutdated(userId: string): Promise<void> {
    await db.brevoContactsSync()
      .update({ sync_status: 'outdated' })
      .eq('user_id', userId);
  }

  /**
   * Delete contact from Brevo
   */
  async deleteContact(userId: string): Promise<SyncResult> {
    try {
      const { data: syncRecord } = await db.brevoContactsSync()
        .select('brevo_contact_id')
        .eq('user_id', userId)
        .single();

      if (!syncRecord?.brevo_contact_id) {
        return { success: true }; // Already not in Brevo
      }

      await this.brevoClient.deleteContact(syncRecord.brevo_contact_id);
      
      // Delete sync record
      await db.brevoContactsSync()
        .delete()
        .eq('user_id', userId);

      return { success: true };
    } catch (error: any) {
      const errorInfo = handleBrevoError(error);
      return {
        success: false,
        error: errorInfo.message,
        shouldRetry: errorInfo.shouldRetry,
      };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    total: number;
    synced: number;
    pending: number;
    failed: number;
    outdated: number;
  }> {
    const { data: stats } = await db.brevoContactsSync()
      .select('sync_status');

    const total = stats?.length || 0;
    const byStatus = stats?.reduce((acc, record) => {
      acc[record.sync_status] = (acc[record.sync_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      total,
      synced: byStatus.synced || 0,
      pending: byStatus.pending || 0,
      failed: byStatus.failed || 0,
      outdated: byStatus.outdated || 0,
    };
  }

  /**
   * Test Brevo connection
   */
  async testConnection(): Promise<boolean> {
    return this.brevoClient.testConnection();
  }
}

// Singleton instance
let syncService: BrevoSyncService | null = null;

export function getSyncService(): BrevoSyncService {
  if (!syncService) {
    syncService = new BrevoSyncService();
  }
  return syncService;
}