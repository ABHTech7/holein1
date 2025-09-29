# Environment & Configuration Audit

**Generated:** 2025-09-29  
**Purpose:** Complete runtime environment documentation for debugging, security audits, and deployment reference

---

## 1. Frontend Runtime Environment (VITE_* Variables)

### From `.env` file:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_PROJECT_ID` | `srnbylbbsdckkwatfqjg` | Hardcoded in client.ts |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `...rfvc` (redacted) | Hardcoded in client.ts |
| `VITE_SUPABASE_URL` | `https://srnbylbbsdckkwatfqjg.supabase.co` | Hardcoded in client.ts |
| `VITE_PLAYER_JOURNEY_V2_ENABLED` | `true` | ✅ Active |
| `VITE_ENHANCED_WIN_CLAIM_ENABLED` | `true` | ✅ Active |
| `VITE_VERIFICATION_TIMEOUT_HOURS` | `6` | Used in config |
| `VITE_SOFT_DELETE_PLAYERS` | `true` | ✅ Active |
| `VITE_ENTRY_CONTEXT_TTL_MINUTES` | `360` | 6-hour TTL |
| `VITE_AUTH_EMAIL_TTL_MINUTES` | `360` | 6-hour TTL |
| `VITE_RESEND_COOLDOWN_SECONDS` | `60` | Resend throttle |
| `VITE_EXPECTED_SITE_URL` | `https://officialholein1.com` | Auth validation |
| `VITE_DEMO_DOMAINS` | `demo.holein1challenge.co.uk` | Demo mode trigger |
| `VITE_PAYMENT_PROVIDER_STRIPE_ENABLED` | `false` | ❌ Disabled |
| `VITE_PAYMENT_PROVIDER_FONDY_ENABLED` | `false` | ❌ Disabled |
| `VITE_PAYMENT_PROVIDER_WISE_ENABLED` | `false` | ❌ Disabled |

### ⚠️ Critical Note:
**VITE_* variables in .env are NOT actually used at runtime.** The Supabase client (`src/integrations/supabase/client.ts`) uses **hardcoded** values instead of `import.meta.env.VITE_*` references.

---

## 2. Edge Functions Environment

**Location:** `supabase/functions/**/index.ts`

### Available Secrets (via Supabase Dashboard):

| Secret | Usage | Redacted Value |
|--------|-------|----------------|
| `SUPABASE_URL` | All functions | `https://srnb...jg.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | `...rfvc` |
| `RESEND_API_KEY` | 6 email functions | `re_...` (if configured) |

### Functions Using RESEND_API_KEY:
1. `send-magic-link`
2. `send-magic-link-secure`
3. `send-branded-magic-link`
4. `send-claim-notification`
5. `send-lead-notification`
6. `send-winners-email`

### Functions Using Service Role Key (Admin Operations):
- `admin-*` functions (9 functions)
- `reset-demo-data`
- `seed-demo-data`
- `top-up-*` functions (4 functions)
- `calculate-monthly-premiums`
- `cleanup-expired-files`
- `update-user-email`

---

## 3. Feature Flags Configuration

**Source:** `src/lib/featureFlags.ts`

| Flag | Effective Value | Source | Impact |
|------|----------------|--------|---------|
| `VITE_PLAYER_JOURNEY_V2_ENABLED` | `true` | .env | Player verification flow |
| `VITE_ENHANCED_WIN_CLAIM_ENABLED` | `true` | .env | Win claim UX |
| `VITE_AUTO_MISS_JOB_ENABLED` | `true` | Default | Auto-miss processing |
| `VITE_PAYMENT_PROVIDER_STRIPE_ENABLED` | `false` | .env | **Payments disabled** |
| `VITE_PAYMENT_PROVIDER_FONDY_ENABLED` | `false` | .env | **Payments disabled** |
| `VITE_PAYMENT_PROVIDER_WISE_ENABLED` | `false` | .env | **Payments disabled** |
| `VITE_FILE_UPLOAD_VALIDATION_ENABLED` | `true` | Default | File validation |
| `VITE_COPY_ENGINE_ENABLED` | `true` | Default | Copy system |
| `VITE_MOBILE_FIRST_UI_ENABLED` | `true` | Default | Mobile UX |
| `VITE_ENHANCED_ROLE_GUARDS` | `true` | Default | Role-based access |
| `VITE_ENTRY_CONTEXT_PERSISTENCE` | `true` | Default | Context storage |
| `VITE_RESEND_MAGIC_LINK` | `true` | Default | Resend capability |
| `VITE_BANKING_BANNER_FIX` | `true` | Default | Banking UX |
| `VITE_DEMO_MODE_ENABLED` | `false` | Default | Demo mode off |

### Payment Mode:
**Current Mode:** `"No-Payments"`  
**Logic:** All payment providers disabled → No-Payments mode active

---

## 4. Authentication Flow Configuration

### Base URL Construction:
```typescript
// Location: src/lib/enhancedAuth.ts (line 15-16)
const baseURL = `${window.location.origin}/auth/callback`;
```
**Dynamic:** Uses current browser origin at runtime.

### Redirect Patterns:

| Flow | redirect_to Value | File Location |
|------|------------------|---------------|
| Magic Link | `${window.location.origin}/auth/callback` | `src/lib/enhancedAuth.ts:15` |
| Entry Form | `${window.location.origin}/auth/callback` | `src/components/entry/PlayerJourneyEntryForm.tsx:89` |
| Auth Callback | Handles OTP exchange | `src/pages/AuthCallback.tsx` |

### Auth Client Configuration:
```typescript
// Location: src/integrations/supabase/client.ts (lines 11-16)
{
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
}
```

### Session Persistence:
- **Storage:** Browser localStorage
- **Auto-refresh:** Enabled
- **Session TTL:** Managed by Supabase (default: 1 hour access token, 7 days refresh token)

---

## 5. Supabase Client Audit

### ✅ Single Client Confirmation:
**Primary Client:** `src/integrations/supabase/client.ts`

### Client Configuration:
```typescript
const SUPABASE_URL = "https://srnbylbbsdckkwatfqjg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...rfvc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { ... }
});
```

### ⚠️ Hardcoded Values:
The client uses **hardcoded strings** instead of `import.meta.env.VITE_*` references. This means:
- Changes to `.env` file **do NOT affect** the Supabase client
- URL and key are **baked into the bundle** at build time
- To change credentials, you must edit `src/integrations/supabase/client.ts` directly

### Import Pattern (Used Throughout App):
```typescript
import { supabase } from "@/integrations/supabase/client";
```

### No Other Clients Found:
Audit confirmed no duplicate or alternative Supabase client instances exist in the codebase.

---

## 6. Domain Configuration

### Demo Mode Detection:
**Source:** `src/lib/demoMode.ts`

| Domain | Environment | Demo Mode |
|--------|-------------|-----------|
| `demo.holein1challenge.co.uk` | Demo | ✅ Enabled |
| `officialholein1.com` | Production | ❌ Disabled |
| `localhost` / `127.0.0.1` | Development | ✅ Enabled (if DEV) |

### Environment Badge Logic:
```typescript
// Shown in: src/components/ui/environment-badge.tsx
demo: { text: 'Demo Environment', variant: 'secondary' }
production: { text: 'Live Site', variant: 'default' }
development: { text: 'Development', variant: 'outline' }
```

### Demo Data Filtering:
- **Production:** Filters out demo data (RLS policies)
- **Demo:** Shows all data (demo + production)
- **Implementation:** `src/lib/supabaseHelpers.ts`

---

## 7. Security Audit Notes

### 🔴 Critical Issues:

1. **Hardcoded Credentials in Source**
   - Supabase URL and publishable key are hardcoded
   - Visible in browser dev tools and source maps
   - **Impact:** Anyone can access anon-key authenticated endpoints
   - **Mitigation:** This is standard for Supabase (anon key is public by design), but verify RLS policies are strict

2. **Environment Variables Ignored**
   - `.env` VITE_SUPABASE_* vars are defined but **not used**
   - Creates confusion and potential misconfig
   - **Recommendation:** Remove unused .env vars or update client.ts to use them

3. **Service Role Key Security**
   - Only accessible in Edge Functions (not exposed to frontend)
   - ✅ Correct implementation
   - Verify Supabase Dashboard → Settings → Functions secrets are configured

### 🟡 Moderate Concerns:

4. **Payment Providers All Disabled**
   - No payment processing enabled
   - `getPaymentMode()` returns `"No-Payments"`
   - **Impact:** Users cannot make payments
   - **Action Required:** Enable at least one provider before production

5. **Dynamic Base URL**
   - Auth callbacks use `window.location.origin`
   - **Risk:** Could cause issues if accessed via unexpected domain
   - **Mitigation:** Verify Supabase Auth → URL Configuration whitelist includes all domains

6. **Demo Mode on Localhost**
   - Localhost always enables demo mode in DEV
   - May show test data unintentionally
   - **Mitigation:** Override with `VITE_DEMO_MODE_ENABLED=false` in .env if needed

### 🟢 Secure Patterns:

7. **Single Supabase Client**
   - ✅ No duplicate clients found
   - ✅ Consistent configuration
   - ✅ Proper typing with Database types

8. **RLS Policies Active**
   - All tables have Row Level Security enabled
   - Admin-only functions use `get_current_user_is_admin()`
   - ✅ Defense in depth approach

9. **Session Management**
   - localStorage persistence (standard for web apps)
   - Auto-refresh enabled (prevents session expiry UX issues)
   - ✅ Secure defaults

---

## 8. Recommendations for Production

### Before Production Deployment:

1. **Fix Environment Variable Usage**
   ```typescript
   // Update src/integrations/supabase/client.ts to:
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
   const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
   ```

2. **Enable Payment Provider**
   - Set `VITE_PAYMENT_PROVIDER_STRIPE_ENABLED=true` (or other provider)
   - Configure Stripe keys in Supabase Dashboard secrets
   - Test payment flow end-to-end

3. **Verify Auth URL Configuration**
   - Supabase Dashboard → Authentication → URL Configuration
   - Site URL: `https://officialholein1.com`
   - Redirect URLs: `https://officialholein1.com/auth/callback`

4. **Configure Email Secrets**
   - Add `RESEND_API_KEY` to Supabase Dashboard → Settings → Functions
   - Test magic link emails work in production

5. **Demo Data Management**
   - Verify `VITE_DEMO_DOMAINS` matches intended demo domain
   - Test that `officialholein1.com` properly filters demo data
   - Run `cleanup_demo_data()` function before launch

6. **Security Checklist**
   - [ ] All RLS policies reviewed and tested
   - [ ] Admin functions require `get_current_user_is_admin()`
   - [ ] File upload policies validated
   - [ ] CORS headers set correctly in Edge Functions
   - [ ] Rate limiting enabled (Supabase Dashboard → Auth → Rate Limits)

---

## 9. Quick Reference

### Key File Locations:
- **Supabase Client:** `src/integrations/supabase/client.ts`
- **Feature Flags:** `src/lib/featureFlags.ts`
- **Demo Mode Logic:** `src/lib/demoMode.ts`
- **Auth Helpers:** `src/lib/enhancedAuth.ts`
- **Environment Variables:** `.env` (❌ not used by client)

### Debug Commands:
```typescript
// In browser console:
logFeatureFlags(); // Shows all feature flag states
isDemoModeEnabled(); // Returns true/false for current domain
getCurrentEnvironmentType(); // Returns 'demo' | 'production' | 'development'
```

### Common Issues:

**"Auth callback failed"**
→ Check Supabase Dashboard → Auth → URL Configuration

**"Payment not working"**
→ All providers disabled, enable one in `.env` and restart

**"Demo data showing in production"**
→ Check domain matches `VITE_EXPECTED_SITE_URL`, not `VITE_DEMO_DOMAINS`

**"Environment variables not applying"**
→ Client uses hardcoded values, edit `src/integrations/supabase/client.ts`

---

**Last Updated:** 2025-09-29  
**Audit Version:** 1.0  
**Next Review:** Before production deployment
