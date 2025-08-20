# Create Pull Request

## Branch: feature/account-deletion-and-cv-upload-fix → main

**Title:** Complete account deletion system and CV upload fixes

**Description:**

## Summary

• Complete multilingual account deletion system with email confirmation flow
• Subscription plan updates with new feature organization  
• Support email configuration and email confirmation field removal
• Authentication and validation fixes for account deletion API
• German and Italian translations for account deletion process

## Key Features

• **Account deletion workflow**: Request → Email confirmation → Scheduled deletion (72h grace period)
• **Subscription cancellation**: Immediate Stripe subscription cancellation on account deletion
• **Multilingual support**: Full i18n support (FR, EN, DE, IT, ES) for deletion process
• **Email notifications**: Brevo integration for deletion confirmation and warnings
• **Security**: Token-based confirmation system with expiration
• **CV upload fixes**: Resolved authentication issues in upload flow

## Test plan

- [ ] Test account deletion request flow in all supported languages
- [ ] Verify email confirmation system works correctly
- [ ] Test subscription cancellation on account deletion
- [ ] Verify CV upload functionality works without authentication errors
- [ ] Test grace period cancellation functionality
- [ ] Verify all email templates render correctly in multiple languages

🤖 Generated with [Claude Code](https://claude.ai/code)

---

## Manual PR Creation Steps:

1. Go to: https://github.com/Chrisdesmurger/lettercraft/compare/main...feature/account-deletion-and-cv-upload-fix
2. Copy the title and description above
3. Click "Create pull request"
