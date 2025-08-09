# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler without emitting files
- `npm run format` - Format code with Prettier
- `db:migrate` - Run Supabase migrations
- `db:reset` - Reset Supabase database

## Environment Setup

The application requires these environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENAI_API_KEY` - OpenAI API key for letter generation and CV extraction

## Architecture Overview

This is a Next.js 15 application for AI-powered cover letter generation in French. Key architectural patterns:

### Core Flow
1. **User Authentication** - Supabase auth with auto-logout component
2. **Multi-Step Letter Creation** - Guided flow through profile → CV upload → job offer → generation → preview
3. **Data Persistence** - Local storage for flow state, Supabase for permanent data
4. **AI Integration** - OpenAI GPT-4 for letter generation and CV text extraction

### Key Components
- `LetterCreationFlow` - Main stepper component coordinating the entire process
- `OnboardingQuestionnaire` - Collects user profile data
- `CVUpload` - File upload with OpenAI extraction via `/api/extract-cv`
- `JobOfferExtractor` - Parses job posting text
- `LetterGenerator` - AI letter generation interface
- `LetterPreview` - Final output with PDF export

### Data Layer
- **Supabase Tables**: `user_profiles`, `candidates_profile`, `saved_letters`, `user_quotas`, `onboarding_responses`, `stripe_subscriptions`, `stripe_invoices`
- **Type Safety**: Full TypeScript types in `lib/supabase-client.ts`
- **Database Helpers**: Typed query helpers in `db` object

### API Routes

#### Core Application
- `/api/extract-cv` - Uses OpenAI File API for CV text extraction
- `/api/generate-letter` - Letter generation endpoint
- `/api/generate` - Generic generation endpoint

#### Stripe & Subscriptions
- `/api/create-checkout-session` - Creates Stripe checkout sessions with customer linking
- `/api/handle-payment-success` - Immediate subscription tier update after payment
- `/api/webhooks/stripe` - Processes all Stripe webhook events for subscription management

#### Debug & Development (temporary)
- `/api/debug-subscription` - Manual subscription testing
- `/api/debug-users` - User lookup and email debugging
- `/api/test-webhook` - Simulates webhook events for testing
- `/api/test-invoice-webhook` - Tests invoice webhook functionality
- `/api/test-ui-invoices` - Creates test invoices for UI testing

### State Management
- React hooks for local state (`useLetterFlow`, `useUser`, `useExtractCVData`, `useUserInvoices`)
- Local storage for flow persistence
- Supabase client for server state

#### Invoice Management UI
- **SubscriptionTab component**: Displays real invoice data from database
- **useUserInvoices hook**: Fetches and manages user invoice data
- **Real-time data**: Invoice dates, descriptions, amounts, and PDF links
- **Download functionality**: Direct links to `invoice_pdf` URLs from Stripe
- **Status indicators**: Visual status (paid, open, failed) with color coding
- **Responsive table**: Mobile-friendly invoice history display

### Styling
- Tailwind CSS with custom components in `components/ui/`
- Radix UI primitives for accessible components
- Framer Motion for animations
- React Hot Toast for notifications

## Development Patterns

### File Organization
- `app/` - Next.js app router pages and API routes
- `components/` - Reusable React components
- `hooks/` - Custom React hooks
- `lib/` - Utilities, API clients, and data helpers
- `services/` - Business logic services
- `types/` - TypeScript type definitions

### Database Migrations
Supabase migrations are in `supabase/migrations/`. Always run `npm run db:migrate` after pulling migration changes.

### Stripe Integration & Subscription Management

#### Architecture
The application uses a dedicated Stripe subscriptions system with automatic user tier synchronization:

- **`stripe_subscriptions` table**: Centralized storage for all Stripe subscription data
- **Automatic synchronization**: Triggers automatically update `user_profiles.subscription_tier` based on active subscriptions
- **Webhook processing**: Comprehensive handling of Stripe events for real-time updates

#### Key Components

**Stripe Webhooks** (`/api/webhooks/stripe`):
- **Subscription events**: `created`, `updated`, `deleted`
- **Invoice events**: `created`, `updated`, `payment_succeeded`, `payment_failed`
- Automatic user linking by customer ID or email
- Comprehensive logging for debugging

**Subscription Table** (`stripe_subscriptions`):
- Stores complete Stripe subscription data (customer_id, subscription_id, status, periods, etc.)
- Includes trial information, cancellation details, and metadata
- Row Level Security (RLS) for data protection
- Automatic `updated_at` timestamps

**Invoice Table** (`stripe_invoices`):
- **Complete invoice data**: amount, currency, description, invoice number
- **Important URLs**: `hosted_invoice_url` (lien Stripe), `invoice_pdf` (PDF)
- **Payment tracking**: dates, status, attempt count
- **Period information**: billing period start/end dates
- Linked to subscriptions via `stripe_subscription_id`

**Auto-Synchronization**:
- `sync_user_subscription_tier()` trigger function
- Updates `user_profiles.subscription_tier` when subscriptions change
- Handles multiple active subscriptions and grace periods
- Sets tier to 'premium' for active subscriptions, 'free' otherwise

#### Subscription Workflow

1. **Checkout Session Creation** (`/api/create-checkout-session`):
   - Creates/finds Stripe customer by email
   - Links `stripe_customer_id` to user profile immediately
   - Creates checkout session with customer ID

2. **Payment Success** (`/api/handle-payment-success`):
   - Provides immediate UI feedback by setting `subscription_tier: 'premium'`
   - Temporary `subscription_end_date` (30 days)

3. **Webhook Processing**:
   - **Subscription events**: Uses `upsert_stripe_subscription()` to store subscription data
   - **Invoice events**: Uses `upsert_stripe_invoice()` to store invoice data (amount, description, PDF URL)
   - Trigger automatically updates user tier based on subscription status
   - **Data captured**: invoice date, amount, description, hosted_invoice_url, invoice_pdf

#### Database Functions

**Subscription Management**:
- `upsert_stripe_subscription()`: Creates or updates subscription records from webhooks
- `sync_user_subscription_tier()`: Trigger function that maintains user tier consistency

**Invoice Management**:
- `upsert_stripe_invoice()`: Creates or updates invoice records with all billing data
- `invoices_with_subscription_details`: View combining invoice and subscription data

**User Lookup**:
- `get_user_by_stripe_customer_id()`: Finds users by Stripe customer ID
- `get_user_by_email()`: Finds users by email for webhook processing

#### Environment Variables Required
```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Monitoring & Debugging
- Comprehensive console logging in webhook processing
- Debug endpoints: `/api/debug-subscription`, `/api/debug-users`
- Structured error handling and event logging

### Email System (Brevo Integration)

The application uses Brevo (ex-Sendinblue) for transactional emails with comprehensive multilingual support:

#### Email Types
- **Welcome Email**: Sent on user registration
- **Subscription Confirmation**: Sent when premium subscription payment succeeds
- **Payment Failed**: Sent when subscription payment fails
- **Quota Warning**: Sent when user approaches their generation limit
- **Quota Limit Reached**: Sent when user reaches their generation limit

#### Architecture
- **Service Layer**: `lib/brevo-client.ts` - Core Brevo integration
- **API Route**: `/api/send-email` - REST endpoint for sending emails
- **Client Helper**: `lib/email-client.ts` - Frontend wrapper for email sending
- **Integration Points**: Registration, Stripe webhooks, quota system

#### Configuration
Environment variables required:
```env
BREVO_API_KEY=xkeysib-your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@lettercraft.fr
BREVO_SENDER_NAME=LetterCraft
BREVO_SUPPORT_EMAIL=support@lettercraft.fr
```

**Variable descriptions:**
- `BREVO_API_KEY`: Your Brevo API key for sending transactional emails
- `BREVO_SENDER_EMAIL`: Email address used as the sender for all outgoing emails
- `BREVO_SENDER_NAME`: Display name for the email sender
- `BREVO_SUPPORT_EMAIL`: Contact email displayed in user-facing emails for support inquiries

#### Multilingual Support
All email templates support French (fr) and English (en) with automatic language detection from user profiles.

#### Integration Points
1. **User Registration** (`app/register/page.tsx`): Welcome email after successful signup
2. **Stripe Webhooks** (`app/api/webhooks/stripe/route.ts`): Subscription and payment emails
3. **Quota System** (`hooks/useQuota.ts`): Automatic quota notifications
4. **Error Handling**: Non-blocking email failures to ensure user experience

### Contact Synchronization with Brevo

The application includes a comprehensive contact synchronization system with Brevo for email marketing:

#### Architecture
- **`lib/brevo-contacts.ts`**: Core service managing all Brevo API interactions
- **Automatic sync**: Triggers during user registration, profile updates, and subscription changes
- **Manual sync**: API endpoint for bulk operations and maintenance
- **List management**: Dynamic assignment to lists based on user attributes

#### Key Features

**Contact Management**:
- Create/update contacts with custom attributes
- Automatic list assignment based on user tier and activity
- Profile synchronization on changes (name, language, avatar, etc.)
- Subscription tier updates via Stripe webhooks

**Custom Attributes**:
- `USER_ID`: LetterCraft user identifier
- `SUBSCRIPTION_TIER`: free | premium
- `LANGUAGE`: User's preferred language
- `COUNTRY`: User's country
- `LETTERS_GENERATED`: Number of letters created
- `PROFILE_COMPLETE`: Boolean indicating complete profile
- `LAST_LOGIN`: Last sign-in timestamp

**List Segmentation**:
- `ALL_USERS`: Every registered user
- `FREE_USERS`: Users on free plan
- `PREMIUM_USERS`: Users with premium subscription
- `ACTIVE_USERS`: Users who have generated letters
- `CHURNED_USERS`: Inactive users (30+ days, no letters)

#### API Endpoints

**`/api/sync-contact`** - Endpoint principal pour la gestion des contacts Brevo

**Actions disponibles :**

| Action | Description | Paramètres requis | Paramètres optionnels |
|--------|-------------|-------------------|----------------------|
| `create` | Créer un nouveau contact | `email`, `firstName`, `lastName` | `language` |
| `update` | Mettre à jour un contact existant | `userId` OU `email` | `firstName`, `lastName`, `language` |
| `delete` | Supprimer un contact de Brevo | `email` | - |
| `bulk` | Synchroniser plusieurs utilisateurs | `userIds` (array) | - |
| `sync` | Synchronisation complète d'un utilisateur | `userId` | - |
| `update-lists` | Mettre à jour les listes d'un contact | `email`, `listIds` (array) | - |
| `sync-all-lists` | Synchroniser toutes les listes (maintenance) | - | - |
| `create-missing` | Créer tous les contacts manquants | - | - |

**Exemples d'utilisation :**

```javascript
// 1. Créer un nouveau contact
const createResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    email: 'user@example.com',
    firstName: 'Jean',
    lastName: 'Dupont',
    language: 'fr'
  })
})

// 2. Synchroniser un utilisateur existant
const updateResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    userId: 'user-uuid-here'
  })
})

// 3. Synchronisation en lot
const bulkResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'bulk',
    userIds: ['uuid1', 'uuid2', 'uuid3']
  })
})

// 4. Mettre à jour les listes d'un contact
const listsResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update-lists',
    email: 'user@example.com',
    listIds: [1, 2, 4] // ALL_USERS, FREE_USERS, ACTIVE_USERS
  })
})

// 5. Créer tous les contacts manquants (migration initiale)
const createMissingResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create-missing'
  })
})

// 6. Synchroniser toutes les listes (maintenance)
const syncAllResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'sync-all-lists'
  })
})

// 7. Supprimer un contact
const deleteResponse = await fetch('/api/sync-contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete',
    email: 'user@example.com'
  })
})
```

**Récupération d'un contact :**
```javascript
// GET - Récupérer les informations d'un contact
const getResponse = await fetch('/api/sync-contact?email=user@example.com')
const contactData = await getResponse.json()
```

**Réponses API :**

Format de réponse standard :
```json
{
  "success": true,
  "message": "Description du résultat",
  "contactId": 12345,  // Pour les actions create/update
  "created": 15,       // Pour create-missing
  "already_exists": 5, // Pour create-missing
  "failed": 0,         // Pour les actions en lot
  "updated": 10        // Pour sync-all-lists
}
```

**Gestion d'erreurs :**
- Erreurs de validation : status 400 avec message explicite
- Erreurs internes : status 500 avec détails d'erreur
- Toutes les opérations sont non-bloquantes pour l'expérience utilisateur

#### Environment Variables

Required in `.env.local`:
```env
BREVO_API_KEY=your-brevo-api-key
BREVO_LIST_ALL_USERS=1
BREVO_LIST_FREE_USERS=2
BREVO_LIST_PREMIUM_USERS=3
BREVO_LIST_ACTIVE_USERS=4
BREVO_LIST_CHURNED_USERS=5
```

#### Sync Triggers

**Automatic synchronization occurs during**:
- User registration (`app/register/page.tsx`)
- Profile updates (`components/profile/tabs/ProfileTab.tsx`)
- Language changes (`components/profile/tabs/SettingsTab.tsx`)
- Subscription changes (`app/api/webhooks/stripe/route.ts`)

**Error Handling**:
- Non-blocking: Sync failures don't interrupt user operations
- Comprehensive logging for debugging
- Retry logic built into API service

**Documentation complète** : Voir `docs/BREVO_API.md` pour la documentation détaillée de l'API.

**Script utilitaire** : `scripts/brevo-sync.js` pour l'utilisation en ligne de commande.

**Sécurité** : Voir `docs/SECURITY.md` pour la documentation de sécurité complète.

#### Sécurité

L'API Brevo implémente plusieurs couches de protection :

**Authentification & Autorisation :**
- JWT tokens Supabase requis pour tous les appels externes
- Contrôle d'accès basé sur les rôles (utilisateur/admin)
- Vérification des permissions par action

**Protection contre les abus :**
- Rate limiting adaptatif (10-1000 req/min selon l'action)
- Validation stricte des données avec schémas TypeScript
- Audit des actions sensibles

**Appels internes sécurisés :**
- Secret interne pour les synchronisations automatiques
- Bypass sécurisé pour les opérations système
- Logging détaillé des sources d'appels

### CV Extraction
Uses OpenAI File API with GPT-4-turbo model. Files are temporarily stored in `/tmp` and cleaned up after processing.

### PDF Generation
The application includes a comprehensive PDF generation system with multiple templates and customization options:

#### Core System (`lib/pdf.ts`)
- `generateLetterPdf(letterHtml, fileName, options?)` - Generates PDF from HTML string
- `generatePdfFromElement(element, fileName, options?)` - Generates PDF from DOM element  
- `generateLetterPdfWithTemplate(letterData, fileName, options?)` - **NEW**: Uses predefined templates
- `generateTextFile(content, fileName)` - Downloads content as text file

#### Template System (`lib/pdf-templates.ts`)
**4 Professional Templates Available:**
- **Classic**: Traditional French style with Times New Roman (banking, legal, administration)
- **Modern**: Clean contemporary design with Helvetica (tech, startups)
- **Elegant**: Sophisticated with gradient header (consulting, luxury)
- **Creative**: Colorful modern style with emojis (design, marketing)

#### UI Components
- **`PdfExportControls`**: Complete export interface with template selection
- **`TemplateSelector`**: Standalone template picker with visual previews
- **Integration examples**: Available in `examples/pdf-integration-example.tsx`

#### Usage in Components
- **LetterPreview**: Can use either legacy system or new template system
- **LetterCard**: Supports both approaches for saved letters
- **Configurable options**: margin, format (a4/letter/legal), orientation, quality, scale, templateId

#### Advanced Features
- **SSR-Safe**: Dynamic imports prevent server-side errors
- **Template Customization**: Easy to add/modify templates
- **Automatic Data Mapping**: Converts app data to template format
- **Error Handling**: Comprehensive logging and user-friendly messages
- **Performance**: Client-side generation, no server dependencies

#### Dependencies
- `html2pdf.js` - Core PDF generation library (dynamically imported)
- Supports high-quality output with customizable options
- Automatic cleanup of temporary DOM elements and object URLs

#### Documentation
- Complete guide: `docs/PDF_TEMPLATES_GUIDE.md`
- Integration examples: `examples/pdf-integration-example.tsx`

### Error Handling
Components use React Hot Toast for user-facing errors. API routes return structured error responses.

### Account Deletion Automation

The application uses **cron-job.org** for automated account deletion maintenance:

#### Architecture
- **Automated cleanup**: Removes expired deletion requests (7+ days old, unconfirmed)
- **Scheduled deletions**: Executes confirmed account deletions after 48h cooldown
- **Stripe data handling**: Transfers subscription/invoice data to generic system user
- **GDPR compliance**: Full audit logs and data anonymization

#### Cron-Job.org Configuration

**Service**: [cron-job.org](https://cron-job.org) (Free tier)

**Job 1 - Cleanup Expired Requests (Every 6 hours)**:
- URL: `https://lettercraft.vercel.app/api/cleanup`
- Method: `POST`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "action": "cleanup_expired_requests",
    "adminSecret": "lettercraft-admin-secret-2025"
  }
  ```
- Schedule: `0 */6 * * *`

**Job 2 - Execute Pending Deletions (Daily at 2:00 AM)**:
- URL: `https://lettercraft.vercel.app/api/cleanup`  
- Method: `POST`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "action": "execute_pending_deletions", 
    "adminSecret": "lettercraft-admin-secret-2025"
  }
  ```
- Schedule: `0 2 * * *`

#### API Endpoints
- `/api/cleanup` - Main maintenance endpoint with actions: `cleanup_expired_requests`, `execute_pending_deletions`, `full_maintenance`
- `/api/setup-generic-user` - Creates system user for deleted account data preservation
- `/api/debug-deletion` - Diagnostic tools for deletion troubleshooting

#### Generic User System
- **Purpose**: Preserves Stripe subscription/invoice data for accounting compliance
- **Email**: `deleted-user@system.local`
- **Metadata**: Original user UUID stored in `metadata.original_user_id`
- **Setup**: Must be created via `/api/setup-generic-user` before first deletion

#### Database Functions
- `cleanup_expired_deletion_requests()` - Cancels unconfirmed requests after 7 days
- `execute_hard_delete_user()` - Complete user deletion with Stripe data transfer
- `execute_soft_delete_user()` - User anonymization with data preservation

#### Environment Variables Required
```env
ADMIN_SECRET=lettercraft-admin-secret-2025
```

#### Monitoring
- Health check: `GET /api/cleanup` returns system status and statistics
- Audit logs: All operations logged in `audit_logs` table
- Error handling: Non-blocking failures with detailed logging

### Authentication
Supabase auth with session persistence. `AutoLogout` component handles session management.