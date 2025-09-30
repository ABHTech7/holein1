# 6-Hour Attempt Window & 12-Hour Auto-Miss Implementation

## Overview
This document describes the implementation of the 6-hour attempt window and 12-hour auto-miss feature for golf competition entries.

## Architecture

### Timing Windows
- **6-hour attempt window**: Players have 6 hours to take their shot and report their outcome (win/miss)
- **12-hour auto-miss window**: If no outcome is reported within 12 hours, the entry is automatically marked as missed

### Database Schema
Added to `entries` table:
- `auto_miss_at` (timestamp): When the entry should be automatically marked as missed (12 hours after creation)
- `auto_miss_applied` (boolean): Flag to prevent duplicate processing by the background job

### Edge Function: verify-magic-link

#### New Entry Creation
When a new entry is created:
```typescript
attempt_window_start = now()
attempt_window_end   = now() + 6 hours
auto_miss_at         = now() + 12 hours
auto_miss_applied    = false
```

#### Existing Entry (PENDING status)
When reusing an existing PENDING entry:
1. If `attempt_window_start` is NULL → Backfill with current timestamps (6h/12h windows)
2. If `attempt_window_end` is in the past → Don't extend, player sees "Time up" options
3. If `attempt_window_end` is in the future → Reuse existing entry, countdown continues

#### Logging
All window creation and backfilling operations are logged with:
- `[traceId]` for request tracking
- ✅/❌ emojis for success/failure
- Detailed timestamps for debugging

### Frontend: EntryConfirmation.tsx

#### Countdown Display
- Uses `attempt_window_end` for the 6-hour countdown timer
- Shows hours and minutes remaining

#### User Actions Based on Timer State

**Before 6 hours (countdown active):**
- Shows `SimpleAttemptFlow` component
- Player can report win or miss anytime

**After 6 hours (time up):**
- Shows action panel with three options:
  1. "I Won!" → Report win and navigate to evidence submission
  2. "Missed" → Mark as missed, offer "Have another go" (when payments enabled)
  3. "Start a New Entry" → Navigate to home page
- Note displayed: "Entry will auto-miss after 12 hours if no outcome is reported"

**After 12 hours (auto-miss applied):**
- Entry automatically marked as `auto_miss` by background job
- Status shows "Auto-Missed" with "Time Expired" badge

### Background Job: process-auto-miss

**Purpose**: Automatically mark expired entries as missed

**How it works**:
1. Runs periodically (recommended: every 15 minutes)
2. Queries for entries where:
   - `auto_miss_at <= now()`
   - `auto_miss_applied = false`
   - `outcome_self IS NULL`
3. Updates matching entries:
   - Sets `outcome_self = 'auto_miss'`
   - Sets `outcome_reported_at = now()`
   - Sets `status = 'completed'`
   - Sets `auto_miss_applied = true`

**Scheduling with pg_cron**:
```sql
SELECT cron.schedule(
  'process-auto-miss',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url:='https://srnbylbbsdckkwatfqjg.supabase.co/functions/v1/process-auto-miss',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

## User Journey

### Happy Path (Outcome Reported Within 6 Hours)
1. Player receives magic link → clicks it
2. Entry created with 6h/12h windows
3. Player sees countdown timer
4. Player takes shot within 6 hours
5. Player reports outcome (win/miss)
6. If win → Navigate to evidence submission
7. If miss → Show "Try again" option

### Window Expired (6-12 Hours)
1. Player receives magic link → doesn't click immediately
2. Clicks link after 6 hours have passed
3. Sees "Time's Up!" panel with action buttons
4. Can still report outcome (win/miss) or start new entry
5. If no action taken, auto-miss triggers after 12 hours

### Auto-Miss (After 12 Hours)
1. Player doesn't report outcome within 12 hours
2. Background job marks entry as `auto_miss`
3. Entry shows "Auto-Missed" status
4. Player can start a new entry

## Testing Checklist

- [ ] New entry shows 6-hour countdown
- [ ] Countdown accurately decrements
- [ ] Actions appear when timer reaches 00:00
- [ ] "I Won!" button reports win and navigates to evidence page
- [ ] "Missed" button marks entry as missed
- [ ] "Start a New Entry" navigates to home page
- [ ] Reused PENDING entry without windows gets backfilled
- [ ] Reused entry with expired window shows "Time up" immediately
- [ ] Background job correctly identifies expired entries
- [ ] Auto-miss only triggers after 12 hours (not 6)
- [ ] Auto-miss doesn't double-process (auto_miss_applied flag works)

## Configuration

No environment variables needed - timing is hardcoded:
- 6 hours for attempt window (reporting outcome)
- 12 hours for auto-miss (automatic missed marking)

## Monitoring

**Key metrics to track**:
- Number of entries auto-missed per day
- Percentage of entries reported within 6 hours
- Background job execution time and success rate
- Entries stuck in PENDING state without windows

**Logs to watch**:
- `[traceId] 🆕 Creating new entry` - New entry creation with windows
- `[traceId] ✅ Backfilled attempt window` - Existing entry backfill
- `[traceId] ⏰ Attempt window expired` - Time-up detection
- `[traceId] 🤖 Auto-miss job started` - Background job execution
- `[traceId] ✅ Successfully auto-missed N entries` - Job completion

## Troubleshooting

**Issue**: Entries not getting auto-missed
- Check if background job is scheduled and running
- Verify `auto_miss_at` is set on entries
- Check logs for background job errors

**Issue**: Countdown shows wrong time
- Verify `attempt_window_end` is correctly set (6 hours from creation)
- Check client clock vs server time

**Issue**: Players can't report outcome after 6 hours
- This is expected behavior - they see action buttons instead
- Buttons still allow reporting win/miss manually
