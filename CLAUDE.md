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
- **Supabase Tables**: `user_profiles`, `candidates_profile`, `saved_letters`, `user_quotas`, `onboarding_responses`
- **Type Safety**: Full TypeScript types in `lib/supabase-client.ts`
- **Database Helpers**: Typed query helpers in `db` object

### API Routes
- `/api/extract-cv` - Uses OpenAI File API for CV text extraction
- `/api/generate-letter` - Letter generation endpoint
- `/api/generate` - Generic generation endpoint

### State Management
- React hooks for local state (`useLetterFlow`, `useUser`, `useExtractCVData`)
- Local storage for flow persistence
- Supabase client for server state

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

### CV Extraction
Uses OpenAI File API with GPT-4-turbo model. Files are temporarily stored in `/tmp` and cleaned up after processing.

### Error Handling
Components use React Hot Toast for user-facing errors. API routes return structured error responses.

### Authentication
Supabase auth with session persistence. `AutoLogout` component handles session management.