# Review System Documentation

## Overview

The LetterCraft review system allows users to rate and provide feedback on generated letters using a 1-5 star rating system with optional text feedback and predefined categories. The system includes analytics, gamification, and multilingual support.

## Features

- ✅ **Star Rating**: 1-5 star rating system with keyboard navigation
- ✅ **Text Feedback**: Optional feedback up to 250 characters with sanitization
- ✅ **Categories**: Predefined feedback categories (Content, Style, Relevance, Length)
- ✅ **Auto-Modal**: Non-intrusive modal that appears 2.5s after letter display
- ✅ **Gamification**: Contributor badge for users with 3+ reviews
- ✅ **Analytics**: Aggregated statistics and CSV export
- ✅ **Rate Limiting**: 5 reviews per 5 minutes per user
- ✅ **Multilingual**: Support for FR, EN, ES, DE, IT
- ✅ **Security**: CSRF protection, input validation, XSS prevention
- ✅ **Accessibility**: ARIA labels, keyboard navigation, focus management

## Architecture

### Database Schema

```sql
-- Feedback categories (seeded)
feedback_categories (key, label_fr, label_en, created_at)

-- User reviews
letter_reviews (
  id, letter_id, user_id, rating, feedback, categories[],
  created_at, updated_at
  UNIQUE(letter_id, user_id) -- One review per letter per user
)
```

### API Endpoints

- `POST /api/reviews` - Submit a review
- `GET /api/reviews` - Get user's reviews
- `GET /api/reviews/analytics` - Get review statistics
- `GET /api/reviews/export` - Export reviews as CSV

### Components

- `StarRating` - Accessible star rating component
- `CategorySelector` - Multi-select category component  
- `ReviewModal` - Complete review submission modal
- `ContributorBadge` - Gamification badge display
- `ReviewSystem` - Main integration component
- `AnalyticsDashboard` - Admin analytics interface

## Quick Integration

### 1. Basic Usage

```tsx
import { ReviewSystem } from '@/components/reviews'

function LetterDisplay({ letter }) {
  return (
    <div>
      {/* Your letter content */}
      <div>{letter.content}</div>
      
      {/* Review system - will auto-show modal after 2.5s */}
      <ReviewSystem 
        letterId={letter.id}
        autoShow={true}
        showBadge={true}
        onReviewSubmitted={(review) => {
          console.log('Review submitted:', review)
        }}
      />
    </div>
  )
}
```

### 2. Custom Hook Usage

```tsx
import { useReviewSystem } from '@/components/reviews'

function CustomLetterComponent({ letter }) {
  const {
    badge,
    isOpen,
    showReviewModal,
    closeReviewModal,
    submitReview,
    currentLetterId
  } = useReviewSystem({
    autoShow: false, // Manual control
    onReviewSubmitted: (review) => {
      // Custom handling
      analytics.track('review_submitted', { rating: review.rating })
    }
  })

  return (
    <div>
      <div>{letter.content}</div>
      
      {/* Manual trigger */}
      <button onClick={() => showReviewModal(letter.id)}>
        Rate this letter
      </button>
      
      {/* Show badge if earned */}
      {badge.earned && (
        <ContributorBadge badge={badge} />
      )}
      
      {/* Custom modal rendering */}
      <ReviewModal
        isOpen={isOpen}
        onClose={closeReviewModal}
        onSubmit={submitReview}
        letterId={currentLetterId || letter.id}
      />
    </div>
  )
}
```

### 3. Analytics Dashboard

```tsx
import { AnalyticsDashboard } from '@/components/reviews/analytics-dashboard'

function AdminPage() {
  return (
    <div>
      <h1>Review Analytics</h1>
      <AnalyticsDashboard defaultPeriodDays={30} />
    </div>
  )
}
```

## Database Setup

Run the migration to set up the database schema:

```bash
# Apply the migration
npm run db:migrate

# Verify tables are created
npx supabase db describe
```

The migration creates:
- `feedback_categories` table with seeded data
- `letter_reviews` table with constraints and indexes
- RLS policies for data security
- Database functions for analytics and badge checking

## Configuration

### Environment Variables

No additional environment variables are required. The system uses existing Supabase configuration.

### Rate Limiting

Current limits (configurable in `lib/middleware/rate-limiter.ts`):
- Reviews: 5 requests per 5 minutes
- General API: 100 requests per minute  
- Analytics: 10 requests per hour

### Validation Rules

- Rating: 1-5 integer (required)
- Feedback: ≤250 characters (optional)
- Categories: Max 4 from predefined list (optional)
- One review per user per letter

## Security Features

### Input Validation
- Server-side validation for all inputs
- HTML/script tag sanitization for feedback
- Category validation against predefined list

### Rate Limiting
- Per-user + per-IP rate limiting
- Exponential backoff for repeated violations

### CSRF Protection
- Origin/Referer header validation
- SameSite cookie policies

### Access Control
- Users can only review their own letters
- Users can only see their own reviews
- Analytics restricted to admin users

## Accessibility

### Keyboard Navigation
- Tab navigation through star rating
- Arrow keys to change rating
- Space/Enter to select rating

### Screen Readers
- ARIA labels for all interactive elements
- Role attributes for custom components
- Descriptive error messages

### Focus Management
- Visible focus indicators
- Focus trapping in modal
- Logical tab order

## Internationalization

The system supports 5 languages with complete translations:

- **French (fr)**: Default language
- **English (en)**: Full translation
- **Spanish (es)**: Full translation  
- **German (de)**: Full translation
- **Italian (it)**: Full translation

### Adding New Languages

1. Create translation file in `lib/i18n/[locale].json`
2. Add locale to `lib/i18n/index.tsx`
3. Update `languageCodeToLocale` mapping

Example translation structure:
```json
{
  "reviews": {
    "modal": {
      "title": "How would you rate this letter?",
      "description": "Your feedback helps us improve..."
    },
    "rating": {
      "label": "Rating",
      "labels": {
        "1": "Very dissatisfied",
        "2": "Dissatisfied",
        "3": "Neutral", 
        "4": "Satisfied",
        "5": "Very satisfied"
      }
    }
  }
}
```

## Performance Considerations

### Client-Side Optimizations
- Local storage for modal dismissal state
- Debounced API calls
- Lazy component loading

### Database Optimizations
- Indexes on frequently queried columns
- Efficient aggregation queries
- Pagination for large datasets

### Caching Strategy
- Client-side caching of user reviews
- Server-side caching of analytics data
- CDN caching for static assets

## Analytics & Monitoring

### Available Metrics
- Total reviews count
- Average rating over time
- Rating distribution (1-5 stars)
- User participation rate
- Category breakdown for negative reviews
- Export capabilities for detailed analysis

### Usage Analytics
```typescript
// Track review events
analytics.track('review_modal_shown', { letterId })
analytics.track('review_submitted', { rating, hasCategories })
analytics.track('review_skipped', { letterId })
analytics.track('contributor_badge_earned', { reviewCount })
```

## Error Handling

### Client-Side Errors
- Network failures with retry logic
- Validation errors with user-friendly messages
- Rate limit exceeded notifications

### Server-Side Errors
- Structured error responses with codes
- Detailed logging without PII
- Graceful degradation for non-critical features

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `ALREADY_REVIEWED`: User already reviewed this letter
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `LETTER_NOT_FOUND`: Letter doesn't exist or access denied
- `UNAUTHORIZED`: Authentication required

## Testing

### Unit Tests
```bash
# Test individual components
npm test components/reviews/

# Test API endpoints
npm test app/api/reviews/

# Test database functions
npm test lib/db/reviews/
```

### Integration Tests
```bash
# Test complete review flow
npm test e2e/reviews.test.ts

# Test analytics dashboard
npm test e2e/analytics.test.ts
```

### Manual Testing Checklist
- [ ] Review modal appears after 2.5s delay
- [ ] Star rating works with keyboard navigation
- [ ] Category selection enforces max 4 limit
- [ ] Feedback respects 250 character limit
- [ ] Rate limiting prevents spam
- [ ] Badge appears after 3rd review
- [ ] Analytics dashboard loads correctly
- [ ] CSV export downloads properly
- [ ] All languages display correctly

## Troubleshooting

### Common Issues

**Modal doesn't appear**
- Check if user is authenticated
- Verify letterId is valid
- Check browser console for errors
- Ensure autoShow is enabled

**Reviews not saving**
- Verify database migration ran successfully
- Check API endpoint responses
- Confirm user owns the letter being reviewed
- Check rate limiting status

**Badge not showing**
- Verify user has 3+ reviews in database
- Check badge component props
- Ensure badge checking function works

**Analytics not loading**
- Verify user has admin permissions
- Check database function permissions
- Review network requests for errors

### Debug Tools

```typescript
// Enable debug logging
localStorage.setItem('debug', 'reviews:*')

// Check review modal memory
console.log(localStorage.getItem('lettercraft_review_modal_memory'))

// Test badge checking
import { supabase } from '@/lib/supabase-client'
const result = await supabase.rpc('check_contributor_badge', { 
  p_user_id: 'user-id' 
})
```

## Migration Guide

### From No Review System

1. Apply database migration
2. Add review components to letter display pages
3. Configure rate limiting if needed
4. Set up analytics dashboard for admins
5. Test with sample data

### Updating Existing Implementation

1. Backup existing review data
2. Run new migration
3. Update component imports
4. Test thoroughly before deployment

## Support

For questions or issues:
1. Check this documentation
2. Review error logs in console
3. Test in development environment
4. Contact development team with specific error details