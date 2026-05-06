# Authentication Fix Summary

## Issues Fixed

### 1. **Unregistered Users Could Login**

**Problem**: Users who had a Supabase auth account but were NOT in your system's `profiles` table could still login. The system would auto-create a profile for them.

**Solution**: Added a check during login that verifies the user exists in the `profiles` table FIRST before allowing access.

---

### 2. **"Already Registered" Error on First Signup**

**Problem**: When users signed up for the first time, they received an "already registered" error message because the system was confused about when to create the profile.

**Solution**: Separated the signup and login logic - signup now explicitly uses `createUserProfile()` to create the profile, while login uses `addUserToProfiles()` only for existing users.

---

## Changes Made

### File: `src/utils/autoAddUser.js`

#### 1. Added `isUserRegistered(email)` function

```javascript
export async function isUserRegistered(email)
```

- Checks if a user exists in the `profiles` table
- Returns `true` if registered, `false` if not
- Used during login to verify registration status

#### 2. Modified `addUserToProfiles()` function

- **OLD**: Auto-created a new profile if the user wasn't found
- **NEW**: Returns `false` if the user is not registered (doesn't auto-create)
- Used ONLY during login for existing registered users

#### 3. Added `createUserProfile(user, profileData)` function (NEW)

- Explicitly creates a new profile during signup
- Handles the case where a user already has a profile (just updates status)
- Used ONLY during signup registration
- Properly handles errors and throws them for signup to catch

### File: `src/views/auth/LoginView.vue`

#### 1. Updated Imports

```javascript
import { addUserToProfiles, createUserProfile, isUserRegistered } from '@/utils/autoAddUser'
```

#### 2. Modified `signInWithPassword()` Function

**New Flow**:

1. User enters email/password
2. Supabase authenticates them
3. **NEW**: Check if they're registered in `profiles` table via `isUserRegistered()`
4. If NOT registered:
   - Sign them out immediately
   - Show error: "Your account is not yet registered in our system. Please create a new account..."
5. If registered:
   - Update their profile status to active
   - Redirect to dashboard

#### 3. Modified `signUpWithPassword()` Function

**New Flow**:

1. Validate form inputs
2. Supabase creates the auth account
3. **NEW**: Call `createUserProfile()` to create their profile
4. If profile creation fails, sign them out and show error
5. If successful, redirect to dashboard

---

## User Experience

### Login Scenario 1: Registered User ✅

```
User enters email/password
→ Supabase validates credentials
→ System checks profiles table (found)
→ Updates status to active
→ Redirects to dashboard
```

### Login Scenario 2: Not Registered Yet ❌

```
User enters email/password
→ Supabase validates credentials
→ System checks profiles table (NOT found)
→ Shows error message directing to signup
→ User signs out automatically
```

### Signup Scenario 1: New User ✅

```
User enters email/password/confirm
→ Supabase creates auth account
→ System creates profile in profiles table
→ Sets role to 'member' (default)
→ Redirects to dashboard
```

### Signup Scenario 2: Email Already Exists ❌

```
User enters existing email
→ Supabase rejects (already registered)
→ Shows error: "Email is already registered. Try signing in instead."
```

---

## Key Improvements

1. **Registration Required**: Users MUST register (sign up) before they can login
2. **Clear Separation**: Signup creates profiles, login only accesses existing profiles
3. **Better Error Handling**:
   - Clear messages when not registered
   - Proper handling of duplicate signups
4. **Admin Control**: Only admins can create user profiles; self-signup creates 'member' role
5. **Status Tracking**: Profiles track when users are active

---

## Testing Checklist

- [ ] Test signup with new email → should create profile and redirect to dashboard
- [ ] Test signup with existing email → should show "already registered" error
- [ ] Test login with registered email → should login successfully
- [ ] Test login with unregistered email (create auth account but no profile) → should show "not registered" error
- [ ] Test password reset flow (should work as before)
- [ ] Check browser console for debug logs (look for ✅ ✅ ❌ icons)

---

## Admin Manual Registration

Users who are not in the system can be manually added by admins by:

1. Creating a record in the `profiles` table with the user's email
2. Setting the appropriate `role`, `designation_label`, and `positions_label`
3. User can then register/login with their email

---

## Future Enhancements (Optional)

- Add email verification requirement before allowing login
- Add admin approval step for new signups
- Add invitation-based registration (admins send links)
- Add LDAP/Active Directory integration for CARSU
