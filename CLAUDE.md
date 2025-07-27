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
```

#### Multilingual Support
All email templates support French (fr) and English (en) with automatic language detection from user profiles.

#### Integration Points
1. **User Registration** (`app/register/page.tsx`): Welcome email after successful signup
2. **Stripe Webhooks** (`app/api/webhooks/stripe/route.ts`): Subscription and payment emails
3. **Quota System** (`hooks/useQuota.ts`): Automatic quota notifications
4. **Error Handling**: Non-blocking email failures to ensure user experience

### CV Extraction
Uses OpenAI File API with GPT-4-turbo model. Files are temporarily stored in `/tmp` and cleaned up after processing.

### Error Handling
Components use React Hot Toast for user-facing errors. API routes return structured error responses.

### Authentication
Supabase auth with session persistence. `AutoLogout` component handles session management.