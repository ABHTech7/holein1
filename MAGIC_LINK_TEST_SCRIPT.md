# Magic Link Authentication Test Script

## Manual Test Scenarios

### Test A: Normal Flow with Refresh
1. Go to any competition entry page
2. Fill out the entry form with your email
3. Click "Send Secure Link"
4. **→ Verify "Check your email" page appears**
5. **Refresh the page**
6. **→ Verify Resend button is still visible with 60s cooldown**
7. Click the magic link in your email
8. **→ Verify successful authentication and redirect to entry success**

### Test B: PKCE Verifier Missing (Cross-Tab/Browser)
1. Complete steps 1-4 from Test A
2. **Copy the magic link URL from your email**
3. **Open the link in a different browser or incognito tab** (this simulates PKCE verifier missing)
4. **→ Verify you are redirected to `/auth/expired-link`**
5. **→ Verify you see "Your sign-in link expired" message**
6. **→ Verify Resend button is visible with your email pre-filled**
7. Click "Resend Link"
8. **→ Verify new magic link is sent and 60s cooldown appears**
9. Open the new link in the original tab/browser
10. **→ Verify successful authentication**

## Console Log Examples

### Expected AuthCallback Logs
```
[AuthCallback] Processing callback with: {code: true, error: null, fullUrl: "..."}
[AuthCallback] Code found, attempting exchange
[AuthCallback] Code exchange successful
```

### Expected PKCE Error Handling
```
[AuthCallback] Code exchange failed: both auth code and code verifier should be non-empty
[AuthCallback] PKCE verifier missing - link opened in different browser/tab
```

### Expected Resend Logs  
```
[Auth] requested magic link for user@example.com to https://demo.holein1challenge.co.uk/auth/callback
[Resend] started for user@example.com to https://demo.holein1challenge.co.uk/auth/callback
[ResendMagicLink] Successfully resent magic link
```

## Success Criteria
✅ Entry context persists through page refreshes  
✅ PKCE verifier errors redirect to friendly expired page  
✅ Resend functionality works with proper cooldown  
✅ Email is pre-filled on expired link page  
✅ All magic links redirect to `/auth/callback`  
✅ Dashboard buttons navigate to correct routes  

## Troubleshooting
- If redirected to localhost:3000 → Check Supabase Site URL settings
- If "requested path is invalid" → Check Redirect URL configuration
- If resend doesn't work → Check browser console for rate limiting messages