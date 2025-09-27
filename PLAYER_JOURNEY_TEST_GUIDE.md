# Player Journey Testing Guide v2.0

## Pre-Testing Checklist ✅

All critical issues have been resolved:
- ✅ Database schema (slugs, user_roles, competition status)
- ✅ Edge functions (send-branded-magic-link, verify-magic-link)
- ✅ RLS policies and security
- ✅ Entry context persistence
- ✅ Safe data access functions
- ⚠️ Minor: Password protection disabled (auth setting - doesn't block testing)

## Test Environment Setup

### 1. Initial System Health Check
1. Visit `/dashboard/admin` - verify you can access admin dashboard
2. Check browser console for any critical errors
3. Verify auth state shows as SUPER_ADMIN
4. Test basic navigation between admin pages

### 2. Demo Data Preparation
1. Go to Admin Dashboard → Quick Actions → "Reset Demo Data"
2. Verify demo clubs and competitions are created
3. Check that at least one active competition exists

---

## Primary Test Scenarios

### A. New Player Journey (Complete Flow)

#### Step 1: Competition Discovery
1. **Open incognito/private browser window**
2. **Navigate to homepage** - verify loading without errors
3. **Click "Browse Competitions"** or find competition on homepage
4. **Select a demo competition** - click "Enter Now"

**Expected Behavior:**
- Page loads competition details
- "Enter Now" CTA is visible and clickable
- No auth prompts yet (form first)

#### Step 2: Form Submission
1. **Fill out entry form:**
   - First Name: `Test`
   - Last Name: `Player`
   - Email: `testplayer@example.com`
   - Phone: `+44 7700 900000`
   - Age: `25`
   - Handicap: `18`
2. **Accept terms and conditions**
3. **Click "Submit Entry"**

**Expected Behavior:**
- Form validates successfully
- Shows "Check your email" message
- Entry context stored in localStorage
- Magic link sent via edge function

#### Step 3: Magic Link Authentication
1. **Check browser console** for magic link URL (development mode)
2. **Copy the magic link** and paste into address bar
3. **Press Enter** to follow the link

**Expected Behavior:**
- Redirects to `/auth/callback?token=...`
- Token verification happens via edge function
- User account created automatically
- Profile populated with form data
- Entry record created in database

#### Step 4: Entry Completion
1. **Should redirect to entry success/confirmation page**
2. **Verify user is now authenticated** (check browser storage)
3. **Test navigation to player dashboard** via menu/button

**Expected Behavior:**
- Entry shows in player dashboard
- User profile shows correct data
- No authentication loops or errors

---

### B. Returning Player Journey

#### Step 1: Existing User Re-entry
1. **Use same email** (`testplayer@example.com`) 
2. **Try to enter SAME competition again**
3. **Fill form and submit**

**Expected Behavior:**
- Should show cooldown message OR
- Allow repeat entry based on competition rules
- Magic link should authenticate existing user
- No duplicate user accounts created

#### Step 2: Different Competition Entry
1. **Enter a DIFFERENT competition** with same email
2. **Follow magic link process**

**Expected Behavior:**
- Same user account used
- New entry record created
- Both entries visible in player dashboard

---

### C. Edge Cases & Error Handling

#### Test 1: Expired Magic Link
1. **Generate magic link** but don't click immediately
2. **Wait or manually modify token** to simulate expiry
3. **Click expired link**

**Expected Behavior:**
- Redirects to `/auth/expired-link`
- Shows resend option
- Email field pre-populated
- Resend functionality works

#### Test 2: Multiple Link Clicks
1. **Generate magic link**
2. **Click link multiple times** (within 6-hour window)
3. **Before and after selecting Win/Miss outcome**

**Expected Behavior:**
- Link works multiple times before outcome selection
- Link stops working after outcome selected
- No authentication errors or loops

#### Test 3: Browser Session Persistence
1. **Complete entry process**
2. **Close browser tab**
3. **Reopen application**
4. **Check if still authenticated**

**Expected Behavior:**
- User remains authenticated
- Can access player dashboard
- Entry data persists

#### Test 4: URL Slug Handling
1. **Test competition URLs with special characters:**
   - `St. Andrew's Golf Club`
   - `Smith & Jones Tournament`
   - `O'Reilly's Championship`

**Expected Behavior:**
- Slugs generated consistently
- URLs work correctly
- No 404 errors or routing issues

---

## Performance & UX Testing

### Load Times
- [ ] Homepage loads within 2 seconds
- [ ] Competition pages load quickly
- [ ] Magic link processing < 5 seconds
- [ ] Form submissions respond immediately

### Mobile Responsiveness
- [ ] Test form on mobile device/viewport
- [ ] Magic link works on mobile email clients
- [ ] Touch interactions work properly

### Error Recovery
- [ ] Network failures handled gracefully
- [ ] Form validation shows helpful messages
- [ ] Back button doesn't break flow
- [ ] Page refresh doesn't lose progress

---

## Success Criteria

### ✅ Critical Success Indicators
- [ ] New user can complete full entry flow without errors
- [ ] Magic link authentication works reliably
- [ ] Entry data persists correctly in database
- [ ] Player dashboard shows accurate information
- [ ] No console errors during happy path
- [ ] Returning users don't create duplicate accounts

### ✅ Acceptable Behaviors
- [ ] Form validation prevents invalid submissions
- [ ] Expired links redirect to resend page
- [ ] Cooldown periods work as designed
- [ ] Admin tools remain accessible

### ❌ Failure Indicators
- Console errors during critical flows
- Magic links not sending or failing to authenticate
- User accounts not created or data missing
- Authentication loops or redirect failures
- Database errors or RLS policy blocks
- Entry context lost during auth flow

---

## Debugging Tools

### Browser DevTools
- **Console**: Check for errors and debug logs
- **Application > Local Storage**: Verify entry context persistence
- **Network**: Monitor API calls and edge function responses

### Admin Dashboard
- **Players**: Verify new accounts created
- **Entries**: Check entry records and status
- **System Diagnostics**: Review auth and RLS health

### Database Direct Access
- Check `profiles` table for user data
- Check `entries` table for entry records
- Check `magic_link_tokens` for token usage

---

## Test Reporting

### When Tests Pass ✅
- Note successful flow completion time
- Document any minor UI/UX observations
- Confirm data integrity in admin dashboard

### When Tests Fail ❌
1. **Record exact error messages** from console
2. **Note reproduction steps** leading to failure
3. **Check browser network tab** for failed requests
4. **Screenshot error states** for reference
5. **Test in different browsers** if needed

---

## Next Steps After Testing

### If Tests Pass
- Deploy to production environment
- Monitor initial user interactions
- Set up proper email domain for magic links
- Configure auth settings in Supabase dashboard

### If Tests Fail
- Review error logs and debug information
- Check edge function logs in Supabase dashboard
- Verify database RLS policies aren't blocking operations
- Test individual components in isolation

---

**Happy Testing! 🚀**

The system is ready for your player journey validation.