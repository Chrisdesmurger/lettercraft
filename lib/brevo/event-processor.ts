/**
 * Brevo Event Processor
 * Processes contact events for automatic synchronization
 */

import { db } from '@/lib/supabase-client';
import { getSyncService } from './sync-service';
import { getListManager } from './list-manager';
import { queueUserSync, queueUserUpdate } from './job-queue';

export interface ContactEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  source: string;
  processed: boolean;
  created_at: string;
}

export class BrevoEventProcessor {
  private syncService = getSyncService();
  private listManager = getListManager();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Start processing events
   */
  startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      await this.processEvents();
    }, 10000); // Process every 10 seconds

    console.log('Brevo event processor started');
  }

  /**
   * Stop processing events
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    console.log('Brevo event processor stopped');
  }

  /**
   * Process pending events
   */
  async processEvents(): Promise<void> {
    try {
      // Get unprocessed events
      const { data: events } = await db.brevoContactEvents()
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(50); // Process in batches

      if (!events || events.length === 0) return;

      console.log(`Processing ${events.length} Brevo events`);

      for (const event of events) {
        try {
          await this.processEvent(event);
          
          // Mark as processed
          await db.brevoContactEvents()
            .update({ processed: true })
            .eq('id', event.id);

        } catch (error) {
          console.error(`Failed to process event ${event.id}:`, error);
          
          // Don't mark as processed so it can be retried
          // Consider implementing a retry count mechanism
        }
      }
    } catch (error) {
      console.error('Error in event processing loop:', error);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: ContactEvent): Promise<void> {
    console.log(`Processing event ${event.event_type} for user ${event.user_id}`);

    switch (event.event_type) {
      case 'INSERT':
        await this.handleUserCreated(event);
        break;
      
      case 'UPDATE':
        await this.handleUserUpdated(event);
        break;
      
      case 'letter_generated':
        await this.handleLetterGenerated(event);
        break;
      
      case 'subscription_changed':
        await this.handleSubscriptionChanged(event);
        break;
      
      case 'quota_updated':
        await this.handleQuotaUpdated(event);
        break;
      
      case 'profile_completed':
        await this.handleProfileCompleted(event);
        break;
      
      default:
        console.log(`Unknown event type: ${event.event_type}`);
    }
  }

  /**
   * Handle user creation
   */
  private async handleUserCreated(event: ContactEvent): Promise<void> {
    // Queue immediate sync for new users
    await queueUserSync(event.user_id);
    
    // Refresh "All Users" list
    try {
      await this.listManager.refreshDynamicList('All Users');
    } catch (error) {
      console.error('Failed to refresh All Users list:', error);
    }
  }

  /**
   * Handle user profile updates
   */
  private async handleUserUpdated(event: ContactEvent): Promise<void> {
    const { table, old: oldData, new: newData } = event.event_data;
    
    // Determine what changed
    const changes = this.getChangedFields(oldData, newData);
    
    // If significant fields changed, trigger sync
    const significantFields = [
      'first_name', 'last_name', 'subscription_tier', 
      'country', 'language', 'phone'
    ];
    
    const hasSignificantChanges = changes.some(field => 
      significantFields.includes(field)
    );

    if (hasSignificantChanges) {
      await queueUserUpdate(event.user_id);
      
      // If subscription changed, refresh relevant lists
      if (changes.includes('subscription_tier')) {
        await this.refreshSubscriptionLists();
      }
      
      // If country changed, refresh country-based lists if any
      if (changes.includes('country')) {
        // Could refresh country-specific lists here
      }
    }
  }

  /**
   * Handle letter generation
   */
  private async handleLetterGenerated(event: ContactEvent): Promise<void> {
    // Update user's letter count attribute
    await queueUserUpdate(event.user_id);
    
    // Refresh usage-based lists
    await this.refreshUsageLists();
    
    // Check if user moved to different usage category
    const { data: letterCount } = await db.generatedLetters()
      .select('id', { count: 'exact' })
      .eq('user_id', event.user_id);

    const count = letterCount?.length || 0;
    
    // If user just crossed usage thresholds, refresh lists
    if (count === 2 || count === 5) {
      await this.refreshUsageLists();
    }
  }

  /**
   * Handle subscription changes
   */
  private async handleSubscriptionChanged(event: ContactEvent): Promise<void> {
    const { oldTier, newTier } = event.event_data;
    
    // Update contact in Brevo
    await queueUserUpdate(event.user_id);
    
    // Refresh subscription-based lists
    await this.refreshSubscriptionLists();
    
    console.log(`User ${event.user_id} subscription changed: ${oldTier} -> ${newTier}`);
  }

  /**
   * Handle quota updates
   */
  private async handleQuotaUpdated(event: ContactEvent): Promise<void> {
    const { oldQuota, newQuota } = event.event_data;
    
    // Update contact attributes
    await queueUserUpdate(event.user_id);
    
    // Check if quota status changed
    const oldRemaining = oldQuota.max_letters - oldQuota.letters_generated;
    const newRemaining = newQuota.max_letters - newQuota.letters_generated;
    
    // If quota status changed, refresh quota lists
    if (this.getQuotaStatus(oldRemaining) !== this.getQuotaStatus(newRemaining)) {
      await this.refreshQuotaLists();
    }
  }

  /**
   * Handle profile completion
   */
  private async handleProfileCompleted(event: ContactEvent): Promise<void> {
    // Update lead score and profile completion percentage
    await queueUserUpdate(event.user_id);
  }

  /**
   * Refresh subscription-based lists
   */
  private async refreshSubscriptionLists(): Promise<void> {
    try {
      await Promise.all([
        this.listManager.refreshDynamicList('Free Users'),
        this.listManager.refreshDynamicList('Premium Users'),
      ]);
    } catch (error) {
      console.error('Failed to refresh subscription lists:', error);
    }
  }

  /**
   * Refresh usage-based lists
   */
  private async refreshUsageLists(): Promise<void> {
    try {
      await Promise.all([
        this.listManager.refreshDynamicList('High Usage Users'),
        this.listManager.refreshDynamicList('Low Usage Users'),
      ]);
    } catch (error) {
      console.error('Failed to refresh usage lists:', error);
    }
  }

  /**
   * Refresh quota-based lists
   */
  private async refreshQuotaLists(): Promise<void> {
    try {
      await Promise.all([
        this.listManager.refreshDynamicList('Quota Warning'),
        this.listManager.refreshDynamicList('Quota Reached'),
      ]);
    } catch (error) {
      console.error('Failed to refresh quota lists:', error);
    }
  }

  /**
   * Get changed fields between old and new data
   */
  private getChangedFields(oldData: any, newData: any): string[] {
    if (!oldData || !newData) return [];
    
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      if (oldData[key] !== newData[key]) {
        changes.push(key);
      }
    }
    
    return changes;
  }

  /**
   * Get quota status category
   */
  private getQuotaStatus(remaining: number): 'available' | 'warning' | 'reached' {
    if (remaining <= 0) return 'reached';
    if (remaining <= 2) return 'warning';
    return 'available';
  }

  /**
   * Create event manually (for testing or custom triggers)
   */
  async createEvent(
    userId: string,
    eventType: string,
    eventData: any,
    source: string = 'letterapp'
  ): Promise<void> {
    await db.brevoContactEvents().insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      source,
      processed: false,
    });
  }

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<{
    total: number;
    processed: number;
    pending: number;
    byEventType: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    const { data: events } = await db.brevoContactEvents()
      .select('event_type, source, processed');

    if (!events) {
      return {
        total: 0,
        processed: 0,
        pending: 0,
        byEventType: {},
        bySource: {},
      };
    }

    const total = events.length;
    const processed = events.filter(e => e.processed).length;
    const pending = total - processed;

    const byEventType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySource = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      processed,
      pending,
      byEventType,
      bySource,
    };
  }

  /**
   * Clean up old processed events
   */
  async cleanupOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await db.brevoContactEvents()
      .delete()
      .eq('processed', true)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup events: ${error.message}`);
    }

    return data?.length || 0;
  }
}

// Singleton instance
let eventProcessor: BrevoEventProcessor | null = null;

export function getEventProcessor(): BrevoEventProcessor {
  if (!eventProcessor) {
    eventProcessor = new BrevoEventProcessor();
  }
  return eventProcessor;
}

// Helper functions for common events
export async function triggerUserSync(userId: string): Promise<void> {
  const processor = getEventProcessor();
  await processor.createEvent(userId, 'sync_requested', {
    timestamp: new Date().toISOString(),
  });
}

export async function triggerLetterGenerated(userId: string, letterId: string): Promise<void> {
  const processor = getEventProcessor();
  await processor.createEvent(userId, 'letter_generated', {
    letterId,
    timestamp: new Date().toISOString(),
  });
}

export async function triggerSubscriptionChange(
  userId: string,
  oldTier: string,
  newTier: string
): Promise<void> {
  const processor = getEventProcessor();
  await processor.createEvent(userId, 'subscription_changed', {
    oldTier,
    newTier,
    timestamp: new Date().toISOString(),
  });
}