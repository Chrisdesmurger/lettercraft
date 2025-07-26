/**
 * API Route: Brevo Webhooks Handler
 * POST /api/brevo/webhooks/brevo-events
 * Handles incoming webhooks from Brevo
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase-client';
import crypto from 'crypto';

interface BrevoWebhookEvent {
  event: string;
  contact?: {
    id: number;
    email: string;
    attributes?: Record<string, any>;
  };
  list?: {
    id: number;
    name: string;
  };
  campaign?: {
    id: number;
    name: string;
  };
  timestamp?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-brevo-signature');
    
    // Verify webhook signature if configured
    if (process.env.BREVO_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.BREVO_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event: BrevoWebhookEvent = JSON.parse(body);
    
    console.log('Received Brevo webhook:', event.event, event);

    // Process the webhook event
    await processWebhookEvent(event);

    return NextResponse.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Error processing Brevo webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(event: BrevoWebhookEvent): Promise<void> {
  switch (event.event) {
    case 'contact_created':
    case 'contact_updated':
      await handleContactEvent(event);
      break;
    
    case 'contact_deleted':
      await handleContactDeleted(event);
      break;
    
    case 'list_updated':
      await handleListEvent(event);
      break;
    
    case 'campaign_sent':
    case 'campaign_opened':
    case 'campaign_clicked':
      await handleCampaignEvent(event);
      break;
    
    case 'unsubscribed':
    case 'subscribed':
      await handleSubscriptionEvent(event);
      break;
    
    default:
      console.log(`Unhandled webhook event: ${event.event}`);
  }
}

async function handleContactEvent(event: BrevoWebhookEvent): Promise<void> {
  if (!event.contact) return;

  try {
    // Find the user in our system by email or Brevo contact ID
    const { data: syncRecord } = await db.brevoContactsSync()
      .select('user_id, brevo_contact_id')
      .or(`email.eq.${event.contact.email},brevo_contact_id.eq.${event.contact.id}`)
      .single();

    if (!syncRecord) {
      console.log(`No sync record found for contact ${event.contact.email}`);
      return;
    }

    // Update sync record with latest Brevo data
    await db.brevoContactsSync()
      .update({
        brevo_contact_id: event.contact.id,
        brevo_attributes: event.contact.attributes || {},
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
      })
      .eq('user_id', syncRecord.user_id);

    // Log the event
    await db.brevoContactEvents().insert({
      user_id: syncRecord.user_id,
      event_type: `brevo_${event.event}`,
      event_data: {
        brevoContactId: event.contact.id,
        email: event.contact.email,
        attributes: event.contact.attributes,
        timestamp: event.timestamp || new Date().toISOString(),
      },
      source: 'brevo_webhook',
      processed: true,
    });

    console.log(`Processed ${event.event} for user ${syncRecord.user_id}`);

  } catch (error) {
    console.error(`Error handling contact event ${event.event}:`, error);
  }
}

async function handleContactDeleted(event: BrevoWebhookEvent): Promise<void> {
  if (!event.contact) return;

  try {
    // Find and remove sync record
    const { data: syncRecord } = await db.brevoContactsSync()
      .select('user_id')
      .eq('brevo_contact_id', event.contact.id)
      .single();

    if (syncRecord) {
      // Don't delete the sync record, just mark it as outdated
      await db.brevoContactsSync()
        .update({
          sync_status: 'outdated',
          brevo_contact_id: null,
        })
        .eq('user_id', syncRecord.user_id);

      // Log the event
      await db.brevoContactEvents().insert({
        user_id: syncRecord.user_id,
        event_type: 'brevo_contact_deleted',
        event_data: {
          brevoContactId: event.contact.id,
          email: event.contact.email,
          timestamp: event.timestamp || new Date().toISOString(),
        },
        source: 'brevo_webhook',
        processed: true,
      });

      console.log(`Contact deleted in Brevo for user ${syncRecord.user_id}`);
    }

  } catch (error) {
    console.error('Error handling contact deletion:', error);
  }
}

async function handleListEvent(event: BrevoWebhookEvent): Promise<void> {
  if (!event.list) return;

  try {
    // Update list information
    const { data: listRecord } = await db.brevoLists()
      .select('id')
      .eq('brevo_list_id', event.list.id)
      .single();

    if (listRecord) {
      await db.brevoLists()
        .update({
          name: event.list.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listRecord.id);

      console.log(`Updated list ${event.list.name} (${event.list.id})`);
    }

  } catch (error) {
    console.error('Error handling list event:', error);
  }
}

async function handleCampaignEvent(event: BrevoWebhookEvent): Promise<void> {
  if (!event.contact) return;

  try {
    // Find user by contact email or ID
    const { data: syncRecord } = await db.brevoContactsSync()
      .select('user_id')
      .or(`email.eq.${event.contact.email},brevo_contact_id.eq.${event.contact.id}`)
      .single();

    if (syncRecord) {
      // Log campaign engagement
      await db.brevoContactEvents().insert({
        user_id: syncRecord.user_id,
        event_type: `brevo_${event.event}`,
        event_data: {
          campaignId: event.campaign?.id,
          campaignName: event.campaign?.name,
          contactId: event.contact.id,
          email: event.contact.email,
          timestamp: event.timestamp || new Date().toISOString(),
        },
        source: 'brevo_webhook',
        processed: true,
      });

      console.log(`Campaign ${event.event} for user ${syncRecord.user_id}`);
    }

  } catch (error) {
    console.error(`Error handling campaign event ${event.event}:`, error);
  }
}

async function handleSubscriptionEvent(event: BrevoWebhookEvent): Promise<void> {
  if (!event.contact) return;

  try {
    // Find user and update subscription status
    const { data: syncRecord } = await db.brevoContactsSync()
      .select('user_id')
      .or(`email.eq.${event.contact.email},brevo_contact_id.eq.${event.contact.id}`)
      .single();

    if (syncRecord) {
      // Log subscription change
      await db.brevoContactEvents().insert({
        user_id: syncRecord.user_id,
        event_type: `brevo_${event.event}`,
        event_data: {
          contactId: event.contact.id,
          email: event.contact.email,
          subscriptionStatus: event.event,
          timestamp: event.timestamp || new Date().toISOString(),
        },
        source: 'brevo_webhook',
        processed: true,
      });

      console.log(`Subscription ${event.event} for user ${syncRecord.user_id}`);
    }

  } catch (error) {
    console.error(`Error handling subscription event ${event.event}:`, error);
  }
}

// GET method for webhook verification (if needed by Brevo)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  
  return NextResponse.json({ message: 'Brevo webhook endpoint is active' });
}