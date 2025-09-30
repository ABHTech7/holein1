# Player Journey Fixes - Implementation Summary

## A) "Have Another Go" After Miss ✅

### Changes in EntryConfirmation.tsx:
1. **On mount check**: If entry already has `outcome_self` as 'miss' or 'auto_miss', immediately set `showPlayAgain = true`
2. **After handleReportMiss**: Sets `showPlayAgain = true` immediately
3. **After handleAutoMiss**: Sets `showPlayAgain = true` immediately
4. **Rendering logic**: Play Again panel now renders whenever `entry.outcome_self === 'miss' || entry.outcome_self === 'auto_miss'` (no longer depends on showPlayAgain state)
5. **Cooldown handling**: If RPC returns `{ code: 'cooldown_active' }`, shows friendly toast and does NOT navigate
6. **Same competition retry**: Allowed immediately (no cooldown restriction)

### Changes in PlayerEntriesTable.tsx:
- Added defensive optional chaining (`entry?.outcome_self`) to prevent crashes
- Added comment explaining Play Again shows immediately

## B) Admin/System Mark Missed Updates Status ✅

### Database Changes:
When marking an entry as missed (manual or auto), the following fields are now updated:
- `status = 'completed'`
- `outcome_self = 'miss'` or `'auto_miss'`
- `outcome_reported_at = now()`
- `auto_miss_applied = true`
- `attempt_window_end = now()` (ends timer immediately)

### Updated in:
1. **EntryConfirmation.tsx** - `handleReportMiss()` and `handleAutoMiss()`
2. **autoMissService.ts** - `processExpiredVerifications()`
3. **process-auto-miss edge function** - Batch auto-miss processing

### Active Entry Definition:
Created new RPC functions with correct Active definition:
- **Player**: `get_my_active_entries()` - Returns entries where:
  - `status = 'pending'`
  - `outcome_self IS NULL`
  - `now() < attempt_window_end`

- **Admin**: `admin_get_active_entries()` - Returns entries with same filters plus pagination

Entries with `outcome_self = 'miss'` or `'auto_miss'` and `status = 'completed'` now appear in History, NOT in Active lists.

## C) Player Dashboard Blank Screen Fixed ✅

### Changes in PlayerDashboardNew.tsx:
1. **Entry context cleared on mount**: `clearAllEntryContext()` called immediately to prevent stale loops
2. **Proper auth gating**:
   - Shows skeleton while `authLoading`
   - Redirects to `/auth` if no session/user
   - Redirects to `/` if user role is not 'PLAYER'
   - Only loads data when `profile?.role === 'PLAYER'`
3. **Error state handling**:
   - Added `error` state variable
   - Wrapped data load in try/catch
   - Shows friendly error UI with "Try Again" button if data load fails
4. **Defensive optional chaining**: Added `entry?.outcome_self` and `entry?.entry_date` checks
5. **Missing imports**: Added `Card` and `Button` imports for error state

## D) DEV-Only Logs Added ✅

### Logging added to:

**EntryConfirmation.tsx:**
- After miss reported → showPlayAgain true
- After auto-miss applied → showPlayAgain true
- When Play Again cooldown active → doesn't navigate

**PlayerDashboardNew.tsx:**
- Entry context cleared on mount
- Auth redirect triggers
- Dashboard data load start
- Summary loaded successfully
- Entries loaded successfully with count
- Play again clicked with competitionId
- Cooldown active message
- New entry created and navigating
- All error paths logged

All logs wrapped in `if (import.meta.env.DEV)` checks - only visible in development mode.

## Acceptance Tests

### 1. Report Miss → "Have another go" ✅
- Miss reported → Play Again panel appears immediately
- Click "Have another go" → lands on new confirmation page
- Works for both manual miss and auto-miss

### 2. Admin Marks Miss → Disappears from Active ✅
- When entry marked as missed (auto or manual):
  - `status = 'completed'`
  - `attempt_window_end = now()` (timer stops)
- Entry no longer returned by `get_my_active_entries()` or `admin_get_active_entries()`
- Entry appears in History (shown by `get_my_entries()`)

### 3. Player Dashboard Reliable ✅
- Opens reliably when logged in as PLAYER
- No blank screen - shows skeleton while loading
- Shows friendly error state if data load fails
- Clears stale entry context on mount
- Proper auth and role checks prevent loops

### 4. Cooldown Works ✅
- Playing Competition A, then Competition B within 12h → shows cooldown toast, doesn't navigate
- Retrying same competition from miss → works immediately (no cooldown)
- Friendly error message explains cooldown period

## Files Updated

1. `src/pages/EntryConfirmation.tsx` - Play Again logic, miss handling
2. `src/pages/player/PlayerDashboardNew.tsx` - Blank screen fix, auth gating
3. `src/components/player/PlayerEntriesTable.tsx` - Defensive optional chaining
4. `src/lib/autoMissService.ts` - Already correct (verified)
5. `supabase/functions/process-auto-miss/index.ts` - Already correct (verified)
6. **Database Migration**: Created `get_my_active_entries()` and `admin_get_active_entries()` functions with correct Active definition

## Technical Notes

- RPC functions use email-based auth check: `lower(e.email) = lower(auth.jwt() ->> 'email')`
- All miss operations set `attempt_window_end = now()` to immediately stop timers
- Play Again uses existing `create_new_entry_for_current_email()` RPC
- Cooldown enforcement happens in RPC, not frontend
- Same-competition retry is always allowed (no cooldown check for repeat attempts)
