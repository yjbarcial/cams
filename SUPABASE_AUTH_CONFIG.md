# Supabase Configuration for Password-Based Auth

## Important: Disable Email Confirmation

Since we've moved to password-based authentication and want instant account creation for authorized users, you need to **disable email confirmation** in your Supabase project.

### Steps to Configure Supabase

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Authentication** → **Settings**

2. **Disable Email Confirmation**
   - Find "Enable email confirmations"
   - **UNCHECK** this option
   - This allows instant signup without email verification

3. **Email Templates (Optional)**
   You may want to update email templates for:
   - Password Reset
   - Email Change Confirmation (if applicable)

### Why Disable Email Confirmation?

1. **Whitelist Security**: Since only authorized CARSU emails can sign up, we don't need email verification
2. **Better UX**: Instant access for authorized users
3. **No Rate Limits**: Fewer email sends = no rate limit issues
4. **Faster Onboarding**: Users can start immediately

### Authentication Flow Settings

Your Supabase Auth settings should be:

```
Enable email confirmations: ❌ OFF
Enable email change confirmations: ✅ ON (for security)
Secure password change: ✅ ON
Enable manual linking: ❌ OFF (not needed)
```

### Email Provider

Make sure your email provider is configured for:

- Password reset emails (this is the only email we still send)
- Should be reliable and not rate-limited

### Site URL Configuration

Ensure these are set correctly in Supabase:

```
Site URL: https://your-production-domain.com
Redirect URLs:
  - https://your-production-domain.com/auth/reset-password
  - http://localhost:5173/auth/reset-password (for development)
```

### Auth Providers

Since we're using email/password only:

```
Email: ✅ Enabled
Other providers (Google, GitHub, etc.): ❌ Disabled
```

### Rate Limiting

For password reset emails, configure reasonable limits:

```
Rate limiting per hour: 10 requests per IP
Rate limiting per day: 30 requests per IP
```

### Security Settings

Recommended security settings:

```
Password Requirements:
  - Minimum length: 8 characters (handled in frontend)
  - Complexity: Not enforced (for better UX)

Session Settings:
  - JWT expiry: 3600 seconds (1 hour)
  - Refresh token: 604800 seconds (7 days)

Additional Security:
  - Enable password breach detection: ✅ ON
  - Enable MFA/TOTP: ❌ OFF (optional for future)
```

## Testing Configuration

After making these changes, test:

1. ✅ New user signup (should work instantly)
2. ✅ Login with password
3. ✅ Password reset email (should send)
4. ✅ Password reset completion
5. ✅ Session persistence

## Rollback

If you need to enable email confirmation again:

1. Go to Supabase Auth settings
2. Enable "Enable email confirmations"
3. Update LoginView.vue to handle unverified emails

## Notes

- Email confirmation disabled = instant signup
- Still secure because of whitelist
- Password reset still uses email (secure)
- Consider enabling MFA for admin users in the future

---

**Last Updated**: February 5, 2026  
**Status**: Configuration required in Supabase Dashboard
