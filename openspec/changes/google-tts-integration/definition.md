# Change: google-tts-integration

## Context & Goal

**Purpose:** Integrate Google Cloud TTS to replace browser-native `SpeechSynthesis` for word pronunciation audio, delivering higher-quality voice output for the spelling bee app.

This change implements Fase 3 Paso 3.1 from the PRD. It follows completion of:
- Fase 1: Core game, keyboard, 3 sublevels
- Fase 2: IndexedDB, word classification, parent zone
- Fase 3 Paso 3.2: Service Worker & Manifest (via vite-plugin-pwa)
- Fase 3 Paso 3.3: Persistent Storage (via vite-plugin-pwa)

**Goal:** Download high-quality Google TTS MP3 blobs and store them in IndexedDB (`audios_blob`), falling back to `SpeechSynthesis` when no blob is available. Letter sounds (A-Z) remain static pre-recorded MP3s in `public/audio/letters/` — zero API calls.

---

## Scope

### In
- Google TTS API client composable (`useGoogleTTS`)
- Lazy-download logic triggered on first word play
- Background fetch queue with 1-second serial rate limiting
- Blob storage in `audios_blob` IndexedDB store with `[word+category]` index
- API key configuration field in `ConfigTab` (stored in `configuracion_global`)
- Audio status column + retry UI in `ManageWordsTab`
- "Retry All" button in `ManageWordsTab`
- `audios_blob` schema migration: add `category`, `voiceName`, `format`, `blob`, `status`, `createdAt`, `lastPlayed` fields and `[word+category]` index
- Voice priority: `en-US-Neural2-F` → `en-US-Neural2-A` → `en-US-Standard-C`
- Fallback chain: IndexedDB blob → SpeechSynthesis (silent, non-blocking)
- 26 static letter MP3 files in `public/audio/letters/` with Service Worker precache
- One-time generation script for letter MP3s using Google TTS locally
- Verify `vite-plugin-pwa` workbox config includes letter audio in precache

### Out
- Bulk download of all seed words on startup or session start
- UI for voice selection (hardcoded priority list only)
- Google TTS for letter sounds (letters are static assets)
- Changes to game logic or scoring
- Changes to word/category management (CRUD)
- Changes to PWA manifest or registration behavior

---

## Success Criteria

1. **Functional:** When a word is played and no blob exists, SpeechSynthesis fires immediately while a background fetch populates IndexedDB; subsequent plays use the cached blob.
2. **Storage:** `audios_blob` records contain all required fields (`word`, `category`, `voiceName`, `format`, `blob`, `status`, `createdAt`, `lastPlayed`).
3. **Config:** Parent can paste a Google API key in ConfigTab; key is stored in `configuracion_global` and never appears in source or bundle.
4. **Fallback:** If no API key is configured or fetch fails, app silently uses `SpeechSynthesis` with no user-visible error.
5. **Retry UX:** ManageWordsTab shows audio status icons per word; failed downloads show ⚠️ and can be retried individually or via "Retry All".
6. **Letters:** 26 static MP3s exist in `public/audio/letters/` and are precached by the Service Worker.
7. **Rate Limiting:** Only one API call is in-flight at a time, separated by 1-second delays.
8. **Build:** `pnpm run build` completes without errors.

---

## Normative Requirements

### REQ-1: API Key Configuration

**Requirement:** The system SHALL store a Google Cloud TTS API key entered by the parent in the Parent Zone config, and SHALL NOT include that key in source code or build artifacts.

**Given** a parent opens the ConfigTab
**When** they enter a Google Cloud TTS API key and save the configuration
**Then** the key is stored in the `configuracion_global` IndexedDB store under the key `googleTtsApiKey`
**And** the key is never written to any source file or environment variable

---

### REQ-2: Lazy Download on First Play

**Requirement:** When a word is played and no cached audio blob exists, the system SHALL immediately play the word via `SpeechSynthesis` AND begin a background fetch to Google TTS without blocking gameplay.

**Given** a word is played during gameplay
**When** no blob exists in `audios_blob` for that word+category
**Then** `SpeechSynthesis` speaks the word immediately (no delay)
**And** a background fetch to Google TTS is initiated
**And** on success the blob is stored in `audios_blob` with status `"ready"`
**And** on failure the record is marked with status `"failed"`

---

### REQ-3: Blob Playback from IndexedDB

**Requirement:** When a cached blob exists for a word, the system SHALL play the blob from IndexedDB instead of calling `SpeechSynthesis`.

**Given** a word is played during gameplay
**When** a blob with status `"ready"` exists in `audios_blob` for that word+category
**Then** the blob is retrieved from IndexedDB
**And** an `<audio>` element plays the blob URL
**And** `lastPlayed` is updated to the current timestamp

---

### REQ-4: Fallback on Fetch Failure

**Requirement:** When a Google TTS fetch fails, the system SHALL mark the record `"failed"` in `audios_blob` and SHALL NOT block or interrupt gameplay.

**Given** a Google TTS fetch fails (network error, API error, or no API key)
**When** the system attempts to fetch audio for a word
**Then** `SpeechSynthesis` is used as fallback (already fired before fetch started)
**And** the `audios_blob` record (if created) is updated to status `"failed"`
**And** no user-facing error dialog or toast is shown

---

### REQ-5: Audio Status Column in ManageWordsTab

**Requirement:** ManageWordsTab SHALL display an audio status icon for each word indicating whether a Google TTS blob is cached, pending, or failed.

**Given** a parent opens ManageWordsTab
**When** the word list is displayed
**Then** each word shows one of:
- 🎵 — blob with status `"ready"` exists in `audios_blob`
- 🔊 — no blob exists (uses `SpeechSynthesis`, download pending or not started)
- ⚠️ — blob with status `"failed"` exists (retry available)

---

### REQ-6: Retry Single Word Audio

**Requirement:** The parent SHALL be able to tap the ⚠️ icon on a failed word to retry the Google TTS download for that word only.

**Given** a word shows the ⚠️ icon in ManageWordsTab
**When** the parent taps the ⚠️ icon
**Then** the audio download is re-queued for that word
**And** the icon updates to 🔊 while retry is in progress
**And** on success the icon updates to 🎵
**And** on failure the icon remains ⚠️

---

### REQ-7: Retry All Failed Audios

**Requirement:** ManageWordsTab SHALL include a "Retry All" button that re-queues all words with status `"failed"` in `audios_blob`.

**Given** the parent is on ManageWordsTab
**When** they tap the "Retry All" button
**Then** all words with `"failed"` status are re-queued in the download queue
**And** each word's icon updates to 🔊 while its retry is in progress

---

### REQ-8: Rate Limiting

**Requirement:** The system SHALL process only one Google TTS API call at a time with a minimum 1-second gap between calls.

**Given** the download queue contains multiple pending words
**When** a fetch is in progress
**Then** no other fetch starts until the current one completes
**And** after completion there is a 1-second delay before the next fetch begins

---

### REQ-9: Letter Sound Assets

**Requirement:** The system SHALL serve 26 static MP3 files for letter sounds from `public/audio/letters/` which are precached by the Service Worker.

**Given** a letter key is pressed on the keyboard
**When** the letter sound is requested
**Then** the audio is served from the Service Worker precache
**And** no Google TTS API call is made
**And** no IndexedDB lookup occurs

---

### REQ-10: Voice Selection Priority

**Requirement:** The system SHALL attempt Google TTS voices in priority order: `en-US-Neural2-F`, `en-US-Neural2-A`, `en-US-Standard-C`, falling back to `SpeechSynthesis` if all fail.

**Given** a Google TTS fetch is initiated
**When** the system requests audio from Google TTS
**Then** it attempts `en-US-Neural2-F` first
**And** if that fails, it attempts `en-US-Neural2-A`
**And** if that fails, it attempts `en-US-Standard-C`
**And** if all fail, `SpeechSynthesis` is used
**And** the voice actually used is stored in the `voiceName` field of the blob record

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google TTS API key committed to source | Low | High | Key stored only in IndexedDB `configuracion_global`; no env vars used |
| Rate limit exceeded during bulk retry | Medium | Medium | Serial queue with 1s delay; retry queue is background-only |
| Blob storage grows unbounded | Low | Low | `lastPlayed` field supports future LRU eviction; storage is per-word ~10KB |
| Service Worker precache size for letter MP3s | Low | Low | 26 files × ~10KB ≈ 260KB; acceptable for PWA |
| Google TTS API cost for development testing | Medium | Low | Fallback to SpeechSynthesis when no key configured; no automatic bulk downloads |
| IndexedDB quota exceeded | Low | Low | PWA persistent storage already granted; fallback to no-cache behavior |

---

## Rollback Plan

### Identifying the Rollback Trigger
If `pnpm run build` fails OR the app crashes on startup due to this change, rollback immediately.

### Rollback Steps

1. **Database Migration Rollback:** Revert `audios_blob` schema to `++id, word` by removing the version 4 migration in `src/db/db.js`. The new fields (`category`, `voiceName`, `format`, `blob`, `status`, `createdAt`, `lastPlayed`) and `[word+category]` index are not used by any other feature.

2. **Remove Composable:** Delete `src/composables/useGoogleTTS.js` (to be created in design phase). The existing `useSpeech.js` continues to work without modification.

3. **Revert ConfigTab:** Remove the Google TTS API key input field from `ConfigTab.vue`. The existing settings controls remain.

4. **Revert ManageWordsTab:** Remove the audio status column and "Retry All" button from `ManageWordsTab.vue`. The existing difficulty dropdown and delete button remain.

5. **Remove Letter MP3s:** Delete `public/audio/letters/` directory. These are new assets with no prior version.

6. **Update vite.config.js:** Remove any `public/audio/` entries from the `includeAssets` or precache config if added.

7. **Remove Generation Script:** Delete the one-time generation script (e.g., `scripts/generate-letter-audio.js`) if created in the design phase.

### What Is NOT Rolled Back
- `vite-plugin-pwa` configuration (Paso 3.2 already complete)
- Persistent storage code (Paso 3.3 already complete)
- Game logic, scoring, word management

### Verification
After rollback, `pnpm run build` MUST succeed and the app MUST start without console errors.