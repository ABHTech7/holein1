# PKCE/Expired Magic Link Implementation Summary

## ✅ Completed Implementation

### 1. Auth Diagnostics & Configuration
- **Created:** `src/lib/authDiagnostics.ts` - Logs SITE_URL mismatches on app start
- **Updated:** `src/main.tsx` - Runs diagnostics on app initialization
- **Logs:** Console warnings when current origin ≠ expected SITE_URL

### 2. Enhanced Sign-in Link Generation  
- **Updated:** `src/hooks/useAuth.ts`
  - Added `shouldCreateUser: true` to magic link requests
  - Enhanced context persistence with `persistContext` parameter
  - Consistent `emailRedirectTo: ${window.location.origin}/auth/callback`
  - Improved logging for all magic link requests

### 3. Robust PKCE Callback Handling
- **Updated:** `src/pages/AuthCallback.tsx`
  - Graceful handling of PKCE verifier missing errors
  - No more cryptic toasts - direct redirect to `/auth/expired-link`
  - Proper error categorization (expired vs PKCE vs other)
  - Default redirect to `/players/entries` instead of root

### 4. Always-Visible Resend Functionality
- **Created:** `src/components/entry/EntryResendBanner.tsx`
  - Persistent banner showing "Check your email" with Resend button
  - Survives page refresh using localStorage
  - 60s cooldown with visual feedback
  - Dismissible but remembers email context

- **Updated:** `src/pages/EntryPageNew.tsx` - Added resend banner above entry form
- **Updated:** `src/pages/ExpiredLinkPage.tsx` - Enhanced with better email handling
- **Updated:** `src/components/auth/ResendMagicLink.tsx` - Context persistence enabled

### 5. Email Reuse for Deleted Users
- **Database Migration:** Replaced unique constraint with partial index
  ```sql
  DROP CONSTRAINT profiles_email_unique;
  CREATE UNIQUE INDEX profiles_email_active_uidx ON profiles (lower(email)) WHERE status = 'active';
  ```

- **Updated:** `supabase/functions/admin-delete-incomplete-user/index.ts`
  - Deletes auth user in both soft and hard delete modes
  - Frees email for immediate reuse
  - Returns `freed_email: true` in response

- **Updated:** `src/components/admin/IncompletePlayersModal.tsx`
  - Shows "X email(s) freed for re-use" in success messages
  - Tracks email liberation in deletion results

### 6. Route & Navigation Fixes
- **Updated:** `src/routes.ts` - Added `/competitions` browse route
- **Updated:** `src/pages/PlayerDashboard.tsx` - Fixed "Browse Competitions" link
- **Created:** `src/pages/AuthExpiredPage.tsx` - Alternative expired link handler

### 7. E2E Testing
- **Created:** `tests/e2e/auth-pkce-enhanced.spec.ts`
  - Tests missing verifier → expired link page flow
  - Validates resend functionality and cooldown
  
- **Created:** `tests/e2e/delete-reuse-enhanced.spec.ts`  
  - Tests admin deletion flow and email reuse
  - Validates UI feedback for freed emails

## 🎯 Key Behaviors

### Magic Link Flow
1. **Entry Form Submit:** Immediately stores `pending_entry_context` + `last_auth_email`
2. **Email Sent:** Shows "Check your email" with persistent Resend banner
3. **Page Refresh:** Resend banner remains visible using localStorage
4. **Link Click (same tab):** Normal PKCE flow → continues entry or redirects to `/players/entries`
5. **Link Click (different tab):** PKCE missing → `/auth/expired-link` (no error toast)
6. **Expired Link:** Shows dedicated page with email + Resend button

### Admin Deletion Flow
1. **Delete Incomplete User:** Removes both profile and auth.users record
2. **Email Freed:** Same email can immediately sign up again  
3. **UI Feedback:** "X email(s) freed for re-use" message
4. **Database:** Partial unique index allows reuse for non-active users

## 🚨 User Actions Required

### Supabase Configuration
Update these settings in Supabase Authentication → URL Configuration:
- **SITE_URL:** `https://demo.holein1challenge.co.uk`
- **Redirect URLs:** `https://demo.holein1challenge.co.uk/auth/callback`

### Environment Variables  
Ensure `VITE_SOFT_DELETE_PLAYERS=true` is set for soft deletion mode.

## 🔍 Testing Instructions

### Manual Test: PKCE Missing Flow
1. Submit entry form → see "Check your email" 
2. Refresh page → Resend banner still visible
3. Open magic link in different browser/app → lands on `/auth/expired-link`
4. Click "Resend Link" → new valid link arrives
5. Click new link → successful entry continuation

### Manual Test: Email Reuse
1. Admin: Delete incomplete player with email `test@example.com`
2. See "1 email(s) freed for re-use" success message  
3. Try signing up again with `test@example.com`
4. Should succeed without "email already exists" error

## 🏗️ Architecture Notes

- **Context Persistence:** Uses localStorage with 30-minute TTL
- **Error Boundaries:** Graceful degradation for missing context
- **Rate Limiting:** 5 attempts per 15 minutes per email
- **Security:** PKCE errors don't expose technical details to users
- **Database:** Partial indexes prevent email conflicts for active users only