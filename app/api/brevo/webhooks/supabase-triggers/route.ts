/**
 * API Route: Supabase Database Triggers
 * POST /api/brevo/webhooks/supabase-triggers
 * Handles database change notifications from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerUserSync, triggerLetterGenerated, triggerSubscriptionChange } from '@/lib/brevo/event-processor';
import { queueUserUpdate } from '@/lib/brevo/job-queue';

interface SupabaseTriggerPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record?: any;
  old_record?: any;
  schema: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: SupabaseTriggerPayload = await request.json();
    
    console.log('Received Supabase trigger:', payload.type, payload.table);

    // Verify the request is from our internal system or Supabase
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process the trigger based on table and operation
    await processDatabaseTrigger(payload);

    return NextResponse.json({ success: true, message: 'Trigger processed' });

  } catch (error) {
    console.error('Error processing Supabase trigger:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processDatabaseTrigger(payload: SupabaseTriggerPayload): Promise<void> {
  const { type, table, record, old_record } = payload;

  switch (table) {
    case 'user_profiles':
      await handleUserProfileTrigger(type, record, old_record);
      break;
    
    case 'user_quotas':
      await handleUserQuotaTrigger(type, record, old_record);
      break;
    
    case 'generated_letters':
      await handleGeneratedLetterTrigger(type, record, old_record);
      break;
    
    case 'auth.users':
      await handleAuthUserTrigger(type, record, old_record);
      break;
    
    default:
      console.log(`Unhandled table trigger: ${table}`);
  }
}

async function handleUserProfileTrigger(
  type: string,
  record: any,
  old_record: any
): Promise<void> {
  if (!record?.user_id) return;

  try {
    switch (type) {
      case 'INSERT':
        // New user profile created - queue immediate sync
        await triggerUserSync(record.user_id);
        console.log(`Queued sync for new user profile: ${record.user_id}`);
        break;
      
      case 'UPDATE':
        // Profile updated - check what changed
        const significantFields = [
          'first_name', 'last_name', 'subscription_tier', 
          'country', 'language', 'phone'
        ];
        
        const hasSignificantChanges = significantFields.some(field => 
          record[field] !== old_record?.[field]
        );

        if (hasSignificantChanges) {
          await queueUserUpdate(record.user_id);
          
          // If subscription tier changed, trigger special handling
          if (record.subscription_tier !== old_record?.subscription_tier) {
            await triggerSubscriptionChange(
              record.user_id,
              old_record?.subscription_tier || 'free',
              record.subscription_tier
            );
          }
          
          console.log(`Queued update for user profile changes: ${record.user_id}`);
        }
        break;
    }
  } catch (error) {
    console.error(`Error handling user profile trigger for ${record.user_id}:`, error);
  }
}

async function handleUserQuotaTrigger(
  type: string,
  record: any,
  old_record: any
): Promise<void> {
  if (!record?.user_id) return;

  try {
    switch (type) {
      case 'INSERT':
      case 'UPDATE':
        // Quota changed - update user attributes
        await queueUserUpdate(record.user_id);
        
        // Check if quota status changed significantly
        const oldRemaining = old_record ? 
          old_record.max_letters - old_record.letters_generated : null;
        const newRemaining = record.max_letters - record.letters_generated;
        
        if (oldRemaining !== null) {
          const oldStatus = getQuotaStatus(oldRemaining);
          const newStatus = getQuotaStatus(newRemaining);
          
          if (oldStatus !== newStatus) {
            console.log(`User ${record.user_id} quota status changed: ${oldStatus} -> ${newStatus}`);
          }
        }
        
        console.log(`Queued update for quota change: ${record.user_id}`);
        break;
    }
  } catch (error) {
    console.error(`Error handling quota trigger for ${record.user_id}:`, error);
  }
}

async function handleGeneratedLetterTrigger(
  type: string,
  record: any,
  old_record: any
): Promise<void> {
  if (!record?.user_id) return;

  try {
    switch (type) {
      case 'INSERT':
        // New letter generated - trigger analytics update
        await triggerLetterGenerated(record.user_id, record.id);
        console.log(`Letter generated event triggered for user: ${record.user_id}`);
        break;
    }
  } catch (error) {
    console.error(`Error handling letter trigger for ${record.user_id}:`, error);
  }
}

async function handleAuthUserTrigger(
  type: string,
  record: any,
  old_record: any
): Promise<void> {
  if (!record?.id) return;

  try {
    switch (type) {
      case 'INSERT':
        // New user signed up - will be handled when profile is created
        console.log(`New user registered: ${record.id}`);
        break;
      
      case 'UPDATE':
        // Check if email changed
        if (record.email !== old_record?.email) {
          await queueUserUpdate(record.id);
          console.log(`User email changed, queued update: ${record.id}`);
        }
        
        // Track last sign in
        if (record.last_sign_in_at !== old_record?.last_sign_in_at) {
          // Could update last_login attribute here
          await queueUserUpdate(record.id);
        }
        break;
    }
  } catch (error) {
    console.error(`Error handling auth user trigger for ${record.id}:`, error);
  }
}

function getQuotaStatus(remaining: number): 'available' | 'warning' | 'reached' {
  if (remaining <= 0) return 'reached';
  if (remaining <= 2) return 'warning';
  return 'available';
}

// GET method for health check
export async function GET() {
  return NextResponse.json({ 
    message: 'Supabase triggers webhook is active',
    timestamp: new Date().toISOString()
  });
}