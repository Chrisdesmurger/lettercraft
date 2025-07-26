# Brevo Contact Import & Synchronization System

## Overview

This document describes the comprehensive Brevo API integration for LetterApp, providing automated contact synchronization, dynamic list management, and email marketing capabilities while maintaining LetterApp as the single source of truth for user data.

## Architecture

### Core Components

1. **Brevo API Client** (`lib/brevo/client.ts`)
   - Rate-limited API wrapper
   - Authentication handling
   - Error standardization

2. **Sync Service** (`lib/brevo/sync-service.ts`) 
   - Contact synchronization logic
   - User data mapping
   - Batch processing

3. **Job Queue System** (`lib/brevo/job-queue.ts`)
   - Background job processing
   - Retry mechanisms
   - Progress tracking

4. **List Manager** (`lib/brevo/list-manager.ts`)
   - Dynamic list creation/management
   - Criteria-based segmentation
   - Automatic membership updates

5. **Event Processor** (`lib/brevo/event-processor.ts`)
   - Real-time event handling
   - Automatic sync triggers
   - List maintenance

6. **Retry Handler** (`lib/brevo/retry-handler.ts`)
   - Exponential backoff
   - Error categorization
   - Failure tracking

## Database Schema

### Core Tables

#### `brevo_contacts_sync`
Tracks contact synchronization status between LetterApp and Brevo.

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- brevo_contact_id: INTEGER (Brevo contact ID)
- email: TEXT
- sync_status: TEXT (pending, synced, failed, outdated)
- last_synced_at: TIMESTAMPTZ
- sync_attempts: INTEGER
- error_message: TEXT
- brevo_attributes: JSONB
- created_at/updated_at: TIMESTAMPTZ
```

#### `brevo_lists`
Manages Brevo contact lists and their criteria.

```sql
- id: UUID (primary key)
- brevo_list_id: INTEGER (Brevo list ID)
- name: TEXT
- type: TEXT (manual, dynamic)
- criteria: JSONB
- contact_count: INTEGER
- is_active: BOOLEAN
- created_at/updated_at: TIMESTAMPTZ
```

#### `brevo_sync_jobs`
Tracks background synchronization jobs.

```sql
- id: UUID (primary key)
- job_type: TEXT (import_single, import_batch, etc.)
- status: TEXT (pending, running, completed, failed)
- total_items: INTEGER
- processed_items: INTEGER
- failed_items: INTEGER
- data: JSONB
- error_details: JSONB
- started_at/completed_at: TIMESTAMPTZ
```

#### `brevo_contact_events`
Logs contact-related events for processing.

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- event_type: TEXT
- event_data: JSONB
- source: TEXT
- processed: BOOLEAN
- created_at: TIMESTAMPTZ
```

## Contact Attributes

LetterApp syncs the following custom attributes to Brevo:

- `FNAME` / `LNAME`: First/Last name
- `SUBSCRIPTION_TYPE`: free, premium, enterprise
- `LETTERS_GENERATED`: Total letters count
- `LAST_LETTER_DATE`: Date of last generated letter
- `REGISTRATION_DATE`: User signup date
- `COUNTRY`: User's country
- `LANGUAGE`: User's language preference
- `QUOTA_REMAINING`: Letters remaining in quota
- `MAX_QUOTA`: Maximum letters allowed
- `LAST_LOGIN`: Last login timestamp
- `LEAD_SCORE`: Calculated engagement score (0-100)
- `PROFILE_COMPLETION`: Profile completion percentage

## Dynamic Lists

### Automatic Lists Created

1. **All Users** - All active users
2. **Free Users** - Users with free subscription
3. **Premium Users** - Users with premium subscription
4. **Active Users** - Last login < 30 days
5. **Inactive Users** - Last login > 30 days
6. **High Usage** - >5 letters generated
7. **Low Usage** - <2 letters generated
8. **Quota Warning** - 1-2 letters remaining
9. **Quota Reached** - 0 letters remaining

### List Criteria System

Lists use JSON criteria for dynamic membership:

```json
{
  "conditions": [
    {
      "field": "SUBSCRIPTION_TYPE",
      "operator": "equals",
      "value": "premium"
    }
  ],
  "logic": "AND"
}
```

## API Routes

### Contact Management

#### `POST /api/brevo/contacts/import-single`
Import single user to Brevo.

**Request:**
```json
{
  "userId": "user-uuid",
  "immediate": false
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-uuid",
  "message": "User sync queued for processing"
}
```

#### `POST /api/brevo/contacts/import-batch`
Import multiple users with filtering.

**Request:**
```json
{
  "userIds": ["uuid1", "uuid2"],
  "filters": {
    "subscriptionTier": "premium",
    "country": "FR"
  },
  "batchSize": 100,
  "immediate": false
}
```

#### `POST /api/brevo/contacts/sync-user`
Sync specific user with force option.

**Request:**
```json
{
  "userId": "user-uuid",
  "force": true
}
```

### Synchronization

#### `POST /api/brevo/sync/full-sync`
Full synchronization of all users.

**Request:**
```json
{
  "limit": 1000,
  "immediate": false
}
```

#### `GET /api/brevo/sync/full-sync`
Get sync statistics and recommendations.

### Job Management

#### `GET /api/brevo/jobs/status`
Get job status and queue statistics.

**Query Parameters:**
- `jobId`: Specific job ID
- `status`: Filter by status
- `jobType`: Filter by job type
- `limit`: Limit results

#### `POST /api/brevo/jobs/status`
Control job execution.

**Request:**
```json
{
  "action": "cancel|retry",
  "jobId": "job-uuid"
}
```

### List Management

#### `GET /api/brevo/lists/manage`
Get all managed lists.

#### `POST /api/brevo/lists/manage`
Manage list operations.

**Request:**
```json
{
  "action": "initialize|refresh_single|refresh_all",
  "listName": "Premium Users"
}
```

### Dashboard

#### `GET /api/brevo/dashboard`
Comprehensive sync dashboard data.

**Response:**
```json
{
  "connection": {
    "brevo": true,
    "healthy": true
  },
  "sync": {
    "stats": {
      "total": 1000,
      "synced": 950,
      "pending": 30,
      "failed": 20
    },
    "healthScore": 85
  },
  "jobs": {
    "stats": {
      "pending": 5,
      "running": 2,
      "completed": 100,
      "failed": 3
    },
    "queueHealth": "healthy"
  },
  "recommendations": [
    "✅ All systems operating normally"
  ]
}
```

## React Hooks

### `useBrevoSync()`
Admin hook for Brevo management.

```typescript
const {
  dashboardData,
  loading,
  error,
  syncUser,
  batchSync,
  fullSync,
  manageLists,
  isHealthy,
  syncHealthScore
} = useBrevoSync();
```

### `useUserSync(userId?)`
User-specific sync status.

```typescript
const {
  syncRecord,
  loading,
  isSynced,
  lastSynced,
  requestSync
} = useUserSync();
```

## Environment Variables

Add to `.env.local`:

```env
# Brevo Configuration
BREVO_API_KEY=xkeysib-xxx
BREVO_API_URL=https://api.brevo.com/v3
BREVO_RATE_LIMIT=10
BREVO_IMPORT_BATCH_SIZE=1000

# Webhook Security
BREVO_WEBHOOK_SECRET=your-webhook-secret
SUPABASE_WEBHOOK_SECRET=your-supabase-secret
```

## Setup Instructions

### 1. Database Migration

Run the migration to create Brevo tables:

```bash
npm run db:migrate
```

### 2. Environment Configuration

Set up environment variables in `.env.local`.

### 3. Initialize Lists

```typescript
import { getListManager } from '@/lib/brevo/list-manager';

const listManager = getListManager();
await listManager.initializeDefaultLists();
```

### 4. Start Background Processors

```typescript
import { getJobQueue } from '@/lib/brevo/job-queue';
import { getEventProcessor } from '@/lib/brevo/event-processor';

// Start job processing
const jobQueue = getJobQueue();
jobQueue.startProcessing();

// Start event processing
const eventProcessor = getEventProcessor();
eventProcessor.startProcessing();
```

## Usage Examples

### Basic User Sync

```typescript
import { getSyncService } from '@/lib/brevo/sync-service';

const syncService = getSyncService();
const result = await syncService.syncUser('user-uuid');

if (result.success) {
  console.log('User synced successfully:', result.brevoContactId);
} else {
  console.error('Sync failed:', result.error);
}
```

### Batch Processing

```typescript
import { queueBatchSync } from '@/lib/brevo/job-queue';

const jobId = await queueBatchSync(['user1', 'user2', 'user3']);
console.log('Batch sync queued:', jobId);
```

### Custom Event Triggering

```typescript
import { triggerLetterGenerated } from '@/lib/brevo/event-processor';

await triggerLetterGenerated('user-uuid', 'letter-uuid');
```

## Monitoring & Maintenance

### Health Checks

The system provides several health indicators:

- **Sync Health Score**: Percentage of successful syncs
- **Queue Health**: Job queue status (healthy/warning/critical)
- **Processing Health**: Event processing status
- **Brevo Connection**: API connectivity status

### Maintenance Tasks

1. **Cleanup Old Jobs**: Remove completed jobs older than 7 days
2. **Cleanup Old Events**: Remove processed events older than 30 days
3. **Refresh Dynamic Lists**: Update list memberships
4. **Retry Failed Syncs**: Retry contacts with sync failures

### Error Handling

The system includes comprehensive error handling:

- **Exponential Backoff**: Automatic retry with increasing delays
- **Error Categorization**: Retryable vs. permanent errors
- **Failure Tracking**: Detailed error logs and statistics
- **Rate Limiting**: Respects Brevo API limits (10 req/sec)

## Security Considerations

1. **API Key Protection**: Store Brevo API key securely
2. **Webhook Verification**: Verify webhook signatures
3. **Data Minimization**: Only sync necessary user data
4. **GDPR Compliance**: Handle data deletion requests
5. **Rate Limiting**: Prevent API abuse
6. **Access Control**: Admin-only access to sync operations

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Check `BREVO_API_KEY` environment variable
2. **Rate Limiting**: Reduce batch sizes or increase delays
3. **Sync Failures**: Check error logs and retry failed contacts
4. **List Not Updating**: Refresh dynamic lists manually
5. **Webhook Not Working**: Verify webhook URL and secret

### Debug Commands

```typescript
// Test Brevo connection
const syncService = getSyncService();
const connected = await syncService.testConnection();

// Get sync statistics
const stats = await syncService.getSyncStats();

// Check job queue status
const jobQueue = getJobQueue();
const queueStats = await jobQueue.getQueueStats();
```

## Performance Considerations

- **Batch Processing**: Process contacts in batches of 100-1000
- **Rate Limiting**: Respect 10 requests/second limit
- **Async Processing**: Use job queue for large operations
- **Caching**: Cache frequently accessed data
- **Database Indexing**: Ensure proper indexes on sync tables

## Future Enhancements

1. **A/B Testing Integration**: Segment users for campaign testing
2. **Advanced Segmentation**: More sophisticated list criteria
3. **Real-time Analytics**: Live sync monitoring dashboard
4. **Campaign Management**: Create and manage email campaigns
5. **Template Sync**: Synchronize email templates
6. **Automation Workflows**: Trigger-based email sequences

---

This integration provides a robust, scalable foundation for email marketing while maintaining full control over user data within LetterApp's ecosystem.