# Change Definition: daily-progress-visualization

**Change name:** daily-progress-visualization
**Status:** proposed
**Created:** 2026-06-07

---

## Intent

Add a daily progress visualization feature to the Parents Zone that tracks score changes per word over time. This requires a new history table, modifications to existing score-update logic, and a new tab component for viewing daily change logs.

---

## Scope

### In

- New `historial_scores` IndexedDB table
- Modification of `saveProgress()` in `gameStore.js` to record history on score changes
- Modification of `applyDecayOnStartup()` in `gameStore.js` to record history on decay changes
- New `DailyProgressTab.vue` component with date selector, word-change list, and summary stats
- Integration of `DailyProgressTab` as a 5th tab in `ParentsView.vue`

### Out

- No changes to game logic or scoring algorithm
- No changes to existing `ProgressTab.vue` (remains separate)
- No external date picker library dependency
- No history recorded when score is unchanged (no-op saves skipped)

---

## Capabilities

| Capability | Description |
|---|---|
| History tracking | Every score change (practice or decay) is logged with old/new values and timestamp |
| Daily view | Date picker filters history by calendar date (date portion only, time ignored) |
| Quick navigation | "Today" button and prev/next day arrows for fast date browsing |
| Summary stats | Total words practiced, total positive changes, total negative changes for selected day |
| Category filter | Dropdown to filter history rows by category |
| Color-coded variation | Positive variation displayed in green, negative in red |
| New tab integration | Appears as 5th tab in Parents Zone alongside Add/Manage/Progress/Config |

---

## Affected Areas

| Area | Change |
|---|---|
| `src/db/db.js` | Add `historial_scores` table via schema migration (version 4) |
| `src/stores/gameStore.js` | Modify `saveProgress()` and `applyDecayOnStartup()` to write history rows |
| `src/components/parents/DailyProgressTab.vue` | New component |
| `src/views/ParentsView.vue` | Import and register `DailyProgressTab`, add 5th tab button |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Large history table over time (many writes per day) | Medium | Low | Only writes on actual score change; no-op saves excluded |
| Migration failure if `progreso_usuario` upgrade path is unexpected | Low | Medium | Versioned Dexie migration; existing data untouched |
| Date timezone edge cases | Low | Low | Use local date comparison (date portion only, no time comparison) |

---

## Dependencies

- `db.js` schema version 3 must already exist (verified in repo-context)
- `gameStore.js` `saveProgress()` and `applyDecayOnStartup()` must be the current implementations
- `ParentsView.vue` tab pattern (4 tabs) must be stable

---

## Rollback Plan

1. Revert `db.js` to remove `historial_scores` table from version 4
2. Revert `gameStore.js` to remove history-insert logic from `saveProgress()` and `applyDecayOnStartup()`
3. Remove `DailyProgressTab.vue`
4. Remove the 5th tab from `ParentsView.vue`
5. Users will lose any history data recorded; no other user data is affected

---

## Success Criteria

1. `historial_scores` table exists and is queryable by `changedAt` date
2. `saveProgress()` writes a history row when score changes, and skips writing when score is unchanged
3. `applyDecayOnStartup()` writes a history row when decay modifies a score
4. `DailyProgressTab` renders with a date picker, word-change list, and summary section
5. Summary shows correct counts: total words, positive changes, negative changes for selected date
6. Variation column shows green for positive values, red for negative values
7. "Today" button selects current date; prev/next arrows navigate by one day
8. Category filter dropdown correctly filters the list
9. New tab appears in Parents Zone and is navigable without errors
10. Build (`pnpm run build`) completes without errors

---

## Normative Requirements

All requirements use RFC 2119 keywords: MUST, SHALL, SHOULD, MAY.

### REQ-1: History Table Schema

The system SHALL implement a `historial_scores` IndexedDB table with schema:

```
++id, word, category, sublevel, oldScore, newScore, variation, changedAt
```

**Given** a Dexie database named `db`
**When** version 4 migration runs
**Then** a table named `historial_scores` exists with an auto-increment `id` primary key and an index on `changedAt`

---

### REQ-2: saveProgress() History Recording

When `saveProgress()` updates an existing record and the new score differs from the old score, the system SHALL insert a row into `historial_scores` containing the word, category, sublevel, oldScore, newScore, variation (newScore - oldScore), and changedAt timestamp.

**Given** an existing `progreso_usuario` record with score 50
**When** `saveProgress(word, category, sublevel, 70)` is called
**Then** a `historial_scores` row is inserted with oldScore=50, newScore=70, variation=20, and the current timestamp

**Given** an existing `progreso_usuario` record with score 70
**When** `saveProgress(word, category, sublevel, 70)` is called with the same score
**Then** no `historial_scores` row is inserted

---

### REQ-3: applyDecayOnStartup() History Recording

When `applyDecayOnStartup()` modifies a score due to decay, the system SHALL insert a row into `historial_scores` with the old score, new score, negative variation, and current timestamp.

**Given** a `progreso_usuario` record with score 80 and lastPracticedAt 5 days ago
**When** `applyDecayOnStartup(2)` is called with decayPerDay=2
**Then** the record score is updated to 70, and a `historial_scores` row is inserted with oldScore=80, newScore=70, variation=-10

---

### REQ-4: DailyProgressTab Date Selection

The `DailyProgressTab` component SHALL include a date input field that, when changed, filters the `historial_scores` table to show only rows where the date portion of `changedAt` matches the selected date.

**Given** the user is on the Daily Progress tab
**When** the user selects "2026-06-07" from the date picker
**Then** only history rows with `changedAt` on 2026-06-07 are displayed

---

### REQ-5: DailyProgressTab Summary Statistics

For the selected date, the component SHALL display:
- Total count of distinct words with changes
- Total count of changes with positive variation
- Total count of changes with negative variation

**Given** 3 history rows on 2026-06-07: variations +20, -10, +15
**When** the date "2026-06-07" is selected
**Then** the summary shows: 3 words practiced, 2 positive changes, 1 negative change

---

### REQ-6: DailyProgressTab Variation Display

Each history row SHALL display the variation value. Positive variations SHALL be displayed in green. Negative variations SHALL be displayed in red.

**Given** a history row with variation=20
**When** the row is rendered
**Then** the variation is displayed in green text

**Given** a history row with variation=-10
**When** the row is rendered
**Then** the variation is displayed in red text

---

### REQ-7: DailyProgressTab Quick Navigation

The component SHALL provide a "Today" button that sets the date to the current date, and left/right arrow buttons that navigate to the previous/next calendar day.

**Given** any selected date
**When** the user clicks the "Today" button
**Then** the date picker is set to the current date and history for today is displayed

**Given** the selected date is 2026-06-07
**When** the user clicks the right arrow
**Then** the selected date becomes 2026-06-08

---

### REQ-8: DailyProgressTab Category Filter

The component SHALL provide a category dropdown that, when a category is selected, filters the displayed history rows to only those matching the selected category.

**Given** history rows for categories "Animals" and "Colors"
**When** the user selects "Animals" from the category filter
**Then** only rows with category="Animals" are displayed

---

### REQ-9: ParentsView Tab Integration

`DailyProgressTab` SHALL be integrated into `ParentsView.vue` as a 5th tab labeled "Daily Progress" (or similar), positioned after Config tab.

**Given** the user is authenticated in the Parents Zone
**When** the user clicks the "Daily Progress" tab
**Then** the `DailyProgressTab` component is rendered and is functional