# Authentication System Migration: Magic Link → Password-Based

## Overview

The CAMS authentication system has been migrated from magic link (OTP) authentication to a traditional password-based authentication system. This change provides:

- ✅ **Instant Access**: No waiting for emails or dealing with rate limits
- ✅ **Reliability**: No dependency on email delivery
- ✅ **Better UX**: Familiar login/signup flow
- ✅ **Faster Onboarding**: Immediate account creation and login

## What Changed

### 1. Login Flow

**Before (Magic Link):**

- User enters email
- System sends OTP link via email
- User clicks link in email
- User is authenticated

**After (Password):**

- User enters email and password
- Instant authentication
- No email dependency

### 2. Signup Flow

**NEW Feature:**

- Users can now create accounts directly
- Password-based registration with confirmation
- Instant account activation (no email verification required)
- Auto-login after successful signup

### 3. Password Reset

**Maintained:**

- Password reset still uses email (secure method)
- Users can request reset link if they forget password
- Dedicated reset password page at `/auth/reset-password`

## Files Modified

### Frontend Changes

#### 1. `src/views/auth/LoginView.vue`

- ✅ Removed magic link authentication logic
- ✅ Removed `magicLinkSent` state
- ✅ Removed OTP callback handling
- ✅ Removed email verification requirement
- ✅ Added signup mode toggle
- ✅ Added confirm password field for signup
- ✅ Updated UI to show "Sign In" vs "Create Account"
- ✅ Simplified error messages
- ✅ Maintained authorization whitelist

#### 2. `src/views/auth/ResetPasswordView.vue` (NEW)

- ✅ Created dedicated password reset page
- ✅ Handles password reset tokens from email
- ✅ Password strength validation
- ✅ Matching password confirmation
- ✅ Auto-redirect to login after success

#### 3. `src/router/index.js`

- ✅ Added reset password route: `/auth/reset-password`
- ✅ Imported ResetPasswordView component

### Key Features Preserved

1. **Authorization Whitelist**: Only authorized CARSU emails can access
2. **CARSU Domain Validation**: Must use @carsu.edu.ph email
3. **Auto-profile Creation**: Users still auto-added to profiles table
4. **Session Management**: Proper session handling with localStorage
5. **Navigation Guards**: Authentication still protected

## User Experience

### For New Users

1. Visit `/login`
2. Enter CARSU email (must be on whitelist)
3. Click "Don't have an account? Create one"
4. Enter email, password, and confirm password
5. Click "CREATE ACCOUNT"
6. Instantly logged in and redirected to dashboard

### For Existing Users

1. Visit `/login`
2. Enter email and password
3. Click "SIGN IN"
4. Instantly authenticated

### For Forgotten Passwords

1. Visit `/login`
2. Enter email
3. Click "Forgot Password?"
4. Check email for reset link
5. Click link → redirected to `/auth/reset-password`
6. Enter new password twice
7. Redirected to login

## Technical Details

### Password Requirements

- Minimum 8 characters
- No special character requirements (user-friendly)
- Must match confirmation in signup

### Authentication Flow

```javascript
// Signup
supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
    data: {
      email_confirm: false, // Skip email verification
    },
  },
})

// Login
supabase.auth.signInWithPassword({
  email: email,
  password: password,
})

// Password Reset Request
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
})

// Password Reset Update
supabase.auth.updateUser({
  password: newPassword,
})
```

### Security Considerations

1. **No Email Verification**: Disabled for faster onboarding
   - Safe because: Whitelist of authorized users only
   - Only CARSU domain emails allowed
   - Pre-vetted user list

2. **Password Storage**: Handled by Supabase
   - Industry-standard bcrypt hashing
   - Secure password reset flow
   - Token-based reset validation

3. **Session Management**:
   - JWT tokens from Supabase
   - Auto-refresh tokens
   - localStorage persistence

## Migration Guide for Users

### If you used magic links before:

1. You now need to set up a password
2. Go to login page
3. Enter your email
4. Click "Forgot Password?"
5. Check your email for reset link
6. Set a new password
7. Use that password to log in

### If you're a new user:

1. Request to be added to the authorized users list
2. Go to login page
3. Click "Don't have an account? Create one"
4. Fill in email and password
5. You're in!

## Benefits Over Magic Link

| Feature          | Magic Link            | Password-Based          |
| ---------------- | --------------------- | ----------------------- |
| Login Speed      | Slow (wait for email) | Instant                 |
| Reliability      | Depends on email      | Always works            |
| Rate Limits      | Yes (email sending)   | No                      |
| Offline Access   | No                    | Yes (if session active) |
| User Experience  | Confusing             | Familiar                |
| Email Dependency | High                  | Low (only for reset)    |

## Environment Configuration

No changes required to `.env` files. The system uses existing Supabase configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Testing Checklist

- [x] New user signup
- [x] Existing user login
- [x] Password mismatch validation
- [x] Weak password validation
- [x] Authorization whitelist check
- [x] CARSU domain validation
- [x] Password reset request
- [x] Password reset completion
- [x] Auto-redirect after signup
- [x] Session persistence
- [x] Protected route access

## Rollback Plan

If needed to rollback to magic links (not recommended):

1. Restore `LoginView.vue` from git history
2. Remove `ResetPasswordView.vue`
3. Remove reset password route from `router/index.js`

However, this is **not recommended** because the password-based system is superior in every way for this use case.

## Future Enhancements

Potential improvements:

- [ ] Optional 2FA for admins
- [ ] Password strength meter in signup
- [ ] Social auth (Google with @carsu.edu.ph)
- [ ] Remember me checkbox
- [ ] Biometric login for mobile

## Support

For issues with authentication:

1. Check browser console for errors
2. Verify email is on authorized list
3. Ensure using @carsu.edu.ph domain
4. Try password reset if login fails
5. Contact system administrator

---

**Migration completed**: February 5, 2026  
**Status**: ✅ Live and stable
