# FitLog Rehab Centre Test Plan

## Application Overview

Covers /rehab (list page, empty state, Log an injury form) and /rehab/:id (injury detail: pain rating and trend, rehab plan exercises and protocols, aggravating lifts, resolve/reopen, delete). All Rehab state lives in the profiles.rehab jsonb column of the test account; every test starts from api.resetRehab() then page.goto('/rehab') (see tests/agents/seed.spec.ts). CONVENTIONS: specs import { test, expect } from '../fixtures/test-options' and use the `page` and `api` fixtures; page objects extend pages/BasePage (abstract `path`, goto()) so a new pages/RehabPage.ts (path '/rehab') and an injury detail object would fit; prefer role/name locators (the app exposes good aria names: "Log an injury", "Start tracking", "Pain 7 of 10", "Done today", "Remove <exercise>", "Mark resolved", "Reopen", "Delete", "Delete for good"). Cleanup: add to SupabaseApi (utils/supabase-api.ts) an existing resetRehab() call in beforeEach/afterEach via api.bestEffort(); the E2E_PREFIX sweep in cleanup.teardown does NOT cover rehab, so rely on resetRehab. Injury ids are random short strings (e.g. afsdbmpgp9), so tests should navigate via the card, not hard-coded URLs. Injury names are derived (side + site, e.g. "Left shoulder", "Both knee", "Low back"), so free-text notes are the only unique label; use E2E_PREFIX-style notes for identification. Data written is client-persisted: after actions reload the page to verify persistence (a freshly navigated page can be blank for ~1s while loading, so wait for the 'Rehab' heading before clicking). Tests that depend on date ('Day N', 'Today') should compute dates relative to the browser's today.  Not covered: the 'From your lifts' section populated state (requires Coach pill in workout, outside Rehab scope); only its empty text is checked.

## Test Scenarios

### 1. Rehab list and empty state

**Seed:** `tests/agents/seed.spec.ts`

#### 1.1. Empty state shows guidance and disclaimers

**File:** `tests/rehab/empty-state.spec.ts`

**Steps:**
  1. Run the seed (resetRehab, open /rehab).
    - expect: Heading 'Rehab' with Back and 'Log an injury' buttons is visible
  2. Read the Active section.
    - expect: 'Active' heading with text 'Nothing in rehab. Tap + when something starts bothering you...' and no injury cards, no 'Resolved' section
  3. Read the 'From your lifts' section.
    - expect: Heading with '90 days' badge and text 'Pain is only recorded while the Coach pill is on in a workout...'
  4. Read the footer.
    - expect: 'Not medical advice...' disclaimer is visible

#### 1.2. Active card shows name, day count, pain and weekly target summary

**File:** `tests/rehab/list-card.spec.ts`

**Steps:**
  1. Log a Shoulder/left injury, rate pain 3, add 5 exercises via a protocol, return with Back.
    - expect: Card 'Left shoulder' shows 'Day 1', 'pain 3/10' and 'This week · 0 of 5 on target'
  2. Open the card, press 'Done today' on one exercise until its target (e.g. 3/3) is reached, go Back.
    - expect: Card's 'N of M on target' counts exercises that reached their weekly target (verify 1 of 5)
  3. Create an injury with no rating and no exercises.
    - expect: Card has no 'pain x/10' line and no 'on target' summary (or sensible fallback); verify exact text, none observed with ratings absent

#### 1.3. Resolved injuries move to a Resolved section

**File:** `tests/rehab/resolved-section.spec.ts`

**Steps:**
  1. Log two injuries, open one and click 'Mark resolved', then reload /rehab.
    - expect: Resolved injury appears under a 'Resolved' heading as 'Both knee  Closed Today · 15 days' style card with chevron; the other stays under Active
  2. Click the resolved card.
    - expect: Navigates to its detail page showing 'Closed ...' status

#### 1.4. Multiple injuries listed and independently navigable

**File:** `tests/rehab/multiple-injuries.spec.ts`

**Steps:**
  1. Log three injuries with different sites (Knee, Hip, Wrist) and notes.
    - expect: Three cards under Active, each with its own name
  2. Open each card, then Back.
    - expect: Each opens its own detail page (URL /rehab/<id>) with matching title; Back returns to /rehab

#### 1.5. Back button on /rehab leaves the Rehab page

**File:** `tests/rehab/back-nav.spec.ts`

**Steps:**
  1. Click Back in the /rehab header.
    - expect: Navigates away from /rehab to the previous page (assert URL only; do not test the destination)

### 2. Log an injury form

**Seed:** `tests/agents/seed.spec.ts`

#### 2.1. Open form and verify fields and defaults

**File:** `tests/rehab/log-form.spec.ts`

**Steps:**
  1. Click 'Log an injury' (+).
    - expect: Form opens above the Active section with 'Where' buttons Shoulder, Elbow, Wrist, Low back, Hip, Knee, Other
    - expect: 'Which side' buttons left, right, both
    - expect: Optional textbox 'What it feels like (optional)' (placeholder 'Aches on overhead press')
    - expect: 'Started' date input defaulting to today
    - expect: 'Cancel' and 'Start tracking' buttons

#### 2.2. Create injury with defaults (no selection made)

**File:** `tests/rehab/create-defaults.spec.ts`

**Steps:**
  1. Open the form and immediately click 'Start tracking'.
    - expect: No validation error; navigates to /rehab/<id>
    - expect: Title 'Left shoulder' (defaults are Shoulder + left), subtitle 'Day 1 · started Today', no note paragraph

#### 2.3. Create injury with every field set

**File:** `tests/rehab/create-full.spec.ts`

**Steps:**
  1. Open the form, choose Knee, both, type 'E2E Twinge on deep squats', set Started to 14 days ago, click 'Start tracking'.
    - expect: Detail title 'Both knee'
    - expect: Subtitle 'Day 15 · started <weekday>, <Mon d>' (date inclusive count)
    - expect: Note 'E2E Twinge on deep squats' shown under header
  2. Go Back to /rehab.
    - expect: Card 'Both knee' with 'Day 15'

#### 2.4. Each body site produces the expected injury name

**File:** `tests/rehab/sites.spec.ts`

**Steps:**
  1. For each site (Shoulder, Elbow, Wrist, Hip, Knee) with side left/right/both create an injury and read the title (parameterize a few combinations).
    - expect: Title is '<Left|Right|Both> <site lowercase>'
  2. Choose Low back and observe the form.
    - expect: The 'Which side' row disappears (not applicable) and title is 'Low back' with no side prefix
  3. Choose Other.
    - expect: Verify and record the resulting name and whether the side row shows (not explored; check for sensible title)

#### 2.5. Side selector hides for Low back and returns for other sites

**File:** `tests/rehab/side-toggle.spec.ts`

**Steps:**
  1. Open form, click Low back, then Hip.
    - expect: Side buttons absent after Low back, present again after Hip

#### 2.6. Cancel discards the form

**File:** `tests/rehab/cancel.spec.ts`

**Steps:**
  1. Open form, select Hip and type a note, click Cancel.
    - expect: Form closes, no injury created, empty state still shown
  2. Reopen the form.
    - expect: Fields are reset to defaults (note empty, date today)

#### 2.7. Started date cannot be in the future

**File:** `tests/rehab/date-bounds.spec.ts`

**Steps:**
  1. Open form and inspect the Started input.
    - expect: max attribute equals today's date; value defaults to today
  2. Fill a future date via keyboard entry and submit.
    - expect: Future date is rejected or clamped; no injury is created with a future start (behaviour unverified: confirm)

#### 2.8. Started date edge cases: empty and far past

**File:** `tests/rehab/date-edge.spec.ts`

**Steps:**
  1. Clear the Started field and click 'Start tracking'.
    - expect: Either blocked or falls back to today; no crash or 'NaN' day count (unverified, record actual)
  2. Set Started to a date a year ago.
    - expect: Detail shows 'Day 366'-style count and formatted start date including year if applicable

#### 2.9. Free-text note: special characters, HTML and long text

**File:** `tests/rehab/note-text.spec.ts`

**Steps:**
  1. Create Low back injury with note '<b>x</b> Ache "quoted" & long text' plus ~120 characters.
    - expect: Note rendered as literal text (no bold element injected, verified no <b> in DOM)
    - expect: Long text is shown in full or truncated without breaking layout
  2. Create injury with whitespace-only note.
    - expect: Note treated as empty (no blank paragraph) - verify

#### 2.10. Create injury is persisted across reload

**File:** `tests/rehab/persistence.spec.ts`

**Steps:**
  1. Create an injury, reload /rehab.
    - expect: Card still present (data stored in profiles.rehab); verify via api.getProfile().rehab if helpful

#### 2.11. Double-click on Start tracking does not create duplicates

**File:** `tests/rehab/double-submit.spec.ts`

**Steps:**
  1. Fill the form and double-click 'Start tracking'.
    - expect: Only one injury exists after returning to /rehab

### 3. Injury detail: pain rating

**Seed:** `tests/agents/seed.spec.ts`

#### 3.1. Initial detail layout for a new injury

**File:** `tests/rehab/detail-layout.spec.ts`

**Steps:**
  1. Create a default injury and review the detail page.
    - expect: Back button, title and 'Day 1 · started Today'
    - expect: 'Pain trend' with text 'Rate it below now and then — two ratings is enough to draw a trend.'
    - expect: 'How is it today? Optional' with buttons 'Pain 0 of 10' .. 'Pain 10 of 10' and labels '0 none' / '10 severe'
    - expect: 'Rehab plan · this week' with add (+) button and empty text
    - expect: 'Aggravates' with add (+) button and empty text
    - expect: 'Mark resolved' and 'Delete' buttons and disclaimer

#### 3.2. Rate pain once

**File:** `tests/rehab/pain-rate.spec.ts`

**Steps:**
  1. Click 'Pain 7 of 10'.
    - expect: Pain trend text changes to 'Rated 7/10 once. Rate it again in a few days and a trend appears here.'
  2. Go back to /rehab.
    - expect: Card shows 'pain 7/10'

#### 3.3. Re-rating on the same day replaces the rating

**File:** `tests/rehab/pain-rerate.spec.ts`

**Steps:**
  1. Click 'Pain 7 of 10' then 'Pain 3 of 10'.
    - expect: Text becomes 'Rated 3/10 once...' (not two ratings); card shows 'pain 3/10'

#### 3.4. Boundary ratings 0 and 10

**File:** `tests/rehab/pain-bounds.spec.ts`

**Steps:**
  1. Rate 0, then 10.
    - expect: 0 is a valid rating (text 'Rated 0/10', card 'pain 0/10', not treated as unrated); 10 likewise

#### 3.5. Pain trend with multiple days of ratings

**File:** `tests/rehab/pain-trend.spec.ts`

**Steps:**
  1. Seed an injury with ratings on two or more different days directly in profiles.rehab via REST (UI can only rate today), then open it.
    - expect: Trend chart/summary is drawn instead of the 'Rate it again' hint (inspect actual format; unexplored in UI)

#### 3.6. Selected pain value state is visible

**File:** `tests/rehab/pain-selected.spec.ts`

**Steps:**
  1. Rate 5 and inspect the pain buttons.
    - expect: Chosen value has distinct selected styling or aria state; note buttons currently expose no aria-pressed so assert via visible class or add a11y improvement

### 4. Injury detail: rehab plan exercises

**Seed:** `tests/agents/seed.spec.ts`

#### 4.1. Open the exercise picker

**File:** `tests/rehab/plan-picker.spec.ts`

**Steps:**
  1. On a shoulder injury click 'Add rehab exercise'.
    - expect: Panel shows 'Protocols for shoulder' (Rotator cuff basics 4 exercises, Scapular control 4, Overhead prep 3)
    - expect: 'Shoulder exercises' list with 'Show all' button, 'Search rehab exercises' textbox
    - expect: 'Or add your own' with 'Custom exercise name' textbox and disabled 'Add' button, and 'Done' button
    - expect: Timed items show a badge such as '30s hold'

#### 4.2. Picker content depends on body site

**File:** `tests/rehab/plan-picker-sites.spec.ts`

**Steps:**
  1. Open the picker for a Knee injury and a Low back injury.
    - expect: Heading and protocol/exercise lists are specific to the site (e.g. 'Protocols for knee')
  2. Click 'Show all'.
    - expect: Exercises from all sites are listed (verify count increases)

#### 4.3. Add a single exercise from the library

**File:** `tests/rehab/plan-add-one.spec.ts`

**Steps:**
  1. Open picker, click 'Banded external rotation', click 'Done'.
    - expect: Plan lists 'Banded external rotation' with '0 / 3' (default weekly target), 'Done today' and 'Remove Banded external rotation' buttons
    - expect: Picker closes

#### 4.4. Picker stays open for multiple additions

**File:** `tests/rehab/plan-add-many.spec.ts`

**Steps:**
  1. Open picker, click two exercises without pressing Done.
    - expect: Both added to the plan behind/below the picker; picker still open until Done

#### 4.5. Add a whole protocol

**File:** `tests/rehab/plan-protocol.spec.ts`

**Steps:**
  1. Click the protocol 'Rotator cuff basics (4 exercises)'.
    - expect: Four exercises are added with targets (e.g. 3-4 per week each)
  2. Click the same protocol again, and a single exercise already in the plan.
    - expect: No duplicates are created; clicking an exercise already present does not add a second row (observed: the protocol dedups against an existing 'Banded external rotation')

#### 4.6. Search rehab exercises

**File:** `tests/rehab/plan-search.spec.ts`

**Steps:**
  1. Type 'wall' into 'Search rehab exercises'.
    - expect: List narrows to 'Scapular wall slide' and 'Serratus wall press'
  2. Type 'zzzz'.
    - expect: Empty-result message is shown (verify text)

#### 4.7. Add a custom exercise

**File:** `tests/rehab/plan-custom.spec.ts`

**Steps:**
  1. Type 'E2E Pendulum swings' in 'Custom exercise name'.
    - expect: 'Add' button becomes enabled (disabled while empty)
  2. Click Add then Done.
    - expect: Plan shows 'E2E Pendulum swings' with '0 / 3'; textbox cleared

#### 4.8. Custom exercise validation: empty, whitespace, duplicate, long, HTML

**File:** `tests/rehab/plan-custom-validation.spec.ts`

**Steps:**
  1. Leave the name empty, then type only spaces.
    - expect: 'Add' stays disabled (or whitespace-only is rejected); verify whitespace case
  2. Add the same custom name twice and a name like '<i>x</i>'.
    - expect: Behaviour for duplicates recorded; HTML rendered as literal text

#### 4.9. Log sessions with 'Done today' and Undo

**File:** `tests/rehab/plan-sessions.spec.ts`

**Steps:**
  1. Click 'Done today' on an exercise.
    - expect: Counter goes 0/3 -> 1/3 and an 'Undo' button appears
  2. Click 'Done today' again.
    - expect: Counter goes to 2/3 (multiple sessions per day are allowed)
  3. Click 'Undo'.
    - expect: Counter decreases by one (1/3)
  4. Click 'Done today' past the target (4 times with target 3).
    - expect: Record behaviour: counter either caps or shows 4 / 3; no layout break
  5. Reload the page.
    - expect: Counts persist

#### 4.10. Remove an exercise from the plan

**File:** `tests/rehab/plan-remove.spec.ts`

**Steps:**
  1. Click 'Remove Pendulum swings'.
    - expect: Row disappears immediately with no confirmation dialog; list card summary denominator updates (e.g. 0 of 4)
  2. Remove all exercises.
    - expect: Empty-plan message 'No exercises yet...' returns

#### 4.11. Exercise weekly target adjustment

**File:** `tests/rehab/plan-target.spec.ts`

**Steps:**
  1. Look for a way to change an exercise's weekly target (empty text says 'set how many sessions a week you're aiming for'; control not found in exploration, tapping the row/counter is unexplored).
    - expect: If a target editor exists, changing it updates 'x / N' and the list card; otherwise log as a gap between copy and UI

### 5. Injury detail: aggravating lifts

**Seed:** `tests/agents/seed.spec.ts`

#### 5.1. Flag an aggravating lift

**File:** `tests/rehab/aggravates-add.spec.ts`

**Steps:**
  1. Click 'Add a lift' (+).
    - expect: 'Search lifts' box and a list of lifts relevant to the site (chest/back lifts for the shoulder: Bench Press, Incline Bench Press, ..., Barbell Row)
  2. Click 'Bench Press'.
    - expect: A 'Bench Press' chip appears above the picker; picker stays open
  3. Reload.
    - expect: Chip persists

#### 5.2. Unflag a lift by clicking its chip

**File:** `tests/rehab/aggravates-remove.spec.ts`

**Steps:**
  1. Flag Bench Press then click the chip.
    - expect: Chip removed; empty Aggravates text returns once the picker is closed

#### 5.3. Search lifts with and without matches

**File:** `tests/rehab/aggravates-search.spec.ts`

**Steps:**
  1. Type 'deadlift'.
    - expect: Only matching lift(s) displayed
  2. Type 'zzzz'.
    - expect: 'No lifts match.' is shown

#### 5.4. Closing the lift picker

**File:** `tests/rehab/aggravates-close.spec.ts`

**Steps:**
  1. Open the picker via '+', then click '+' again.
    - expect: Picker toggles closed (observed: no Done button; also note an already-flagged lift stays in the list and typing a search term persists while chips are removed)

### 6. Injury detail: status changes and delete

**Seed:** `tests/agents/seed.spec.ts`

#### 6.1. Mark resolved then Reopen

**File:** `tests/rehab/resolve-reopen.spec.ts`

**Steps:**
  1. On an active injury click 'Mark resolved'.
    - expect: Subtitle becomes 'Closed Today · ran N days'; pain rating widget is hidden; button labels become 'Reopen' and 'Delete'; plan and aggravates sections remain visible
  2. Click 'Reopen'.
    - expect: Returns to 'Day N · started <date>', pain rating widget returns, 'Mark resolved' shown
  3. Resolve, reload /rehab.
    - expect: Injury listed under 'Resolved' with 'Closed Today · N days'

#### 6.2. Resolved data is preserved

**File:** `tests/rehab/resolve-preserves.spec.ts`

**Steps:**
  1. Rate pain, add exercises, flag a lift, resolve, then reopen.
    - expect: Rating, plan counts and flagged lift are unchanged

#### 6.3. Delete requires confirmation; Cancel keeps injury

**File:** `tests/rehab/delete-cancel.spec.ts`

**Steps:**
  1. Click 'Delete'.
    - expect: Inline confirmation replaces Delete with 'Cancel' and 'Delete for good' (no browser dialog)
  2. Click 'Cancel'.
    - expect: Delete button returns; still on detail page; injury remains in /rehab list

#### 6.4. Delete injury for good

**File:** `tests/rehab/delete-confirm.spec.ts`

**Steps:**
  1. Click 'Delete' then 'Delete for good'.
    - expect: Redirects to /rehab; the card is gone; empty state shown if it was the only one
  2. Navigate directly to the deleted injury's URL.
    - expect: Page shows 'That injury is no longer here.' message

#### 6.5. Delete a resolved injury

**File:** `tests/rehab/delete-resolved.spec.ts`

**Steps:**
  1. Resolve an injury, then delete it from its detail page.
    - expect: Removed from the Resolved section

### 7. Routing and robustness

**Seed:** `tests/agents/seed.spec.ts`

#### 7.1. Unknown injury id shows not-found message

**File:** `tests/rehab/unknown-id.spec.ts`

**Steps:**
  1. Navigate to /rehab/doesnotexist and wait for load.
    - expect: Page is initially blank for about a second, then shows 'Rehab' header with 'That injury is no longer here.'; no crash

#### 7.2. Deep link to a valid injury and browser history

**File:** `tests/rehab/deep-link.spec.ts`

**Steps:**
  1. Create an injury, copy URL, reload directly on it.
    - expect: Detail page renders with the same data
  2. Use browser Back.
    - expect: Returns to /rehab with the card listed

#### 7.3. Unauthenticated access redirects

**File:** `tests/rehab/unauth.spec.ts`

**Steps:**
  1. Using a fresh context without storageState, open /rehab.
    - expect: User is sent to the login screen, no rehab data visible

#### 7.4. Mobile viewport layout

**File:** `tests/rehab/mobile.spec.ts`

**Steps:**
  1. At 375x667 create an injury with a long note and add exercises with long custom names.
    - expect: No horizontal scroll; pain buttons 0-10 remain tappable in one or wrapped row; text wraps

#### 7.5. Data isolation between tests via resetRehab

**File:** `tests/rehab/reset.spec.ts`

**Steps:**
  1. Create an injury, call api.resetRehab(), reload /rehab.
    - expect: Empty state is shown again, confirming the cleanup helper works
