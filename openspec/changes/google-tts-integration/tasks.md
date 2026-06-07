# Tasks: google-tts-integration

## Frontier 1: Static Letter Assets

**depends_on:** []  
**parallel_safe:** true  
**writes:** `public/audio/letters/`, `scripts/generate-letter-audio.js`

### 1.1 Create letter audio generation script [x]
Create `scripts/generate-letter-sounds.mjs` — one-time Node.js script that:
- Accepts Google API key as `process.argv[2]` or `GOOGLE_TTS_API_KEY` env var
- Creates `public/audio/letters/` directory
- For each letter A–Z, POSTs to Google TTS (`en-US-Neural2-F`, MP3, rate 0.85)
- Writes decoded MP3 to `public/audio/letters/{letter}.mp3` (lowercase: a.mp3…z.mp3)
- Waits 1 second between calls (rate limiting)
- Also created `public/audio/letters/README.md` as fallback documentation

### 1.2 Generate letter MP3 files
Run the script with a valid Google API key:
```bash
node scripts/generate-letter-sounds.mjs "YOUR_API_KEY"
# or
GOOGLE_TTS_API_KEY="YOUR_API_KEY" node scripts/generate-letter-sounds.mjs
```
Verify 26 files exist in `public/audio/letters/` (a.mp3 through z.mp3).
**Note:** This step requires a valid Google API key and is not executed here.

---

## Frontier 2: Dexie Schema Migration

**depends_on:** []  
**parallel_safe:** false  
**writes:** `src/db/db.js`

### 2.1 Add v4 schema migration for audios_blob [x]
In `src/db/db.js`:
- Increment version to 4
- Update `audios_blob` stores to: `'++id, word, category, status, [word+category]'`
- Add `.upgrade()` that clears existing `audios_blob` records (unused table from prior versions)

---

## Frontier 3: Google TTS API Client

**depends_on:** [2]  
**parallel_safe:** true  
**writes:** `src/composables/useGoogleTTS.js`

### 3.1 Create useGoogleTTS composable [x]
Create `src/composables/useGoogleTTS.js`:
- Export `VOICE_PRIORITY` array: `['en-US-Neural2-F', 'en-US-Neural2-A', 'en-US-Standard-C']`
- Implement `fetchTtsAudio(word, voicePriority)`:
  1. Retrieve `googleTtsApiKey` from `db.configuracion_global`
  2. If key is empty, throw `Error('NO_API_KEY')`
  3. Iterate voices, POST to `https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}`
  4. Return `{ blob, voiceName, format: 'audio/mp3' }`
  5. On failure try next voice; if all fail, throw last error

---

## Frontier 4: Download Queue

**depends_on:** [3]  
**parallel_safe:** false  
**writes:** `src/composables/useDownloadQueue.js`

### 4.1 Create useDownloadQueue composable [x]
Create `src/composables/useDownloadQueue.js` as module-level singleton:
- Export `useDownloadQueue()` returning:
  - `enqueueDownload(word, category)` — dedup, add to queue, trigger processing
  - `getQueueStatus()` — returns `{ pending, isProcessing, currentJob }`
  - `retryFailed()` — re-enqueues all words with status 'failed'
  - `isProcessing` — ref<boolean>
  - `currentJob` — ref<{word, category} | null>
  - `enqueuedSet` — reactive Set of `"word||category"` keys
- Implement `processLoop()`:
  1. Check existing blob with status 'ready' → skip if exists
  2. Call `useGoogleTTS().fetchTtsAudio()`
  3. On success: `db.audios_blob` insert/update with status 'ready'
  4. On failure: `db.audios_blob` insert/update with status 'failed'
  5. Remove from enqueuedSet, wait 1000ms before next item

---

## Frontier 5: Word Audio Composable

**depends_on:** [2, 4]  
**parallel_safe:** false  
**writes:** `src/composables/useWordAudio.js`

### 5.1 Create useWordAudio composable [x]
Create `src/composables/useWordAudio.js`:
- Export `useWordAudio()` returning `{ speaking, speakWord, getAudioStatus }`
- `speakWord(word, category)`:
  1. Cancel any in-progress SpeechSynthesis and stop active `<Audio>` element
  2. Query `db.audios_blob.where({word, category}).first()`
  3. If `status === 'ready'` with blob: play via `URL.createObjectURL()` + `<Audio>`, update `lastPlayed`
  4. If autoplay blocked: fall through to SpeechSynthesis + enqueue download
  5. Else: call SpeechSynthesis immediately + `useDownloadQueue().enqueueDownload()` (fire-and-forget)
- `getAudioStatus(word, category)`: returns `'ready' | 'pending' | 'failed' | 'missing'`

---

## Frontier 6: Letter Audio Composable

**depends_on:** [1]  
**parallel_safe:** true  
**writes:** `src/composables/useLetterAudio.js`

### 6.1 Create useLetterAudio composable [x]
Create `src/composables/useLetterAudio.js`:
- Export `useLetterAudio()` returning `{ playLetter }`
- `playLetter(letter)`: lowercase the letter, validate a-z, create `<Audio src="/audio/letters/${letter}.mp3">`, play
- Returns a promise that resolves when playback starts
- Falls back to SpeechSynthesis on MP3 load failure (404/network) or autoplay policy block
- No IndexedDB lookups, no API calls

---

## Frontier 7: ConfigTab API Key Input

**depends_on:** []  
**parallel_safe:** true  
**writes:** `src/components/parents/ConfigTab.vue`

### 7.1 Add Google TTS API key field to ConfigTab [x]
In `src/components/parents/ConfigTab.vue`:
- Add reactive ref `googleTtsApiKey`
- Add password-type `<input>` with show/hide toggle button and placeholder text
- Add "Test" button that validates the API key via a minimal `GET /v1/voices` request
- On mount: load `googleTtsApiKey` from `db.configuracion_global`
- On blur: `saveApiKey()` writes to `db.configuracion_global` with key `googleTtsApiKey`
- Validation feedback shown inline (success/error message)

---

## Frontier 8: ManageWordsTab Audio Status UI

**depends_on:** [4]  
**parallel_safe:** false  
**writes:** `src/components/parents/ManageWordsTab.vue`

### 8.1 Add audio status column to ManageWordsTab [x]
In `src/components/parents/ManageWordsTab.vue`:
- Add prop `audioStatus` (Object: `"word||category"` → `'ready'|'failed'|'pending'`)
- Add emits: `retry-audio` ({word, category}), `retry-all-audio`
- Add audio icon column between `word-info` and `word-actions-row`:
  - 🎵 — ready, ⚠️ — failed (clickable retry), 🔊 — pending/missing
- Add "Retry All" button above word list (visible when any failed exists)

---

## Frontier 9: ParentsView Audio Status Coordination

**depends_on:** [8]  
**parallel_safe:** false  
**writes:** `src/views/ParentsView.vue`

### 9.1 Wire audio status in ParentsView [x]
In `src/views/ParentsView.vue`:
- Import `useDownloadQueue` and `db`
- Add `audioStatusMap` ref
- Add `refreshAudioStatus()`: batch query `audios_blob.toArray()`, build map, default missing words to 'pending'
- Pass `:audio-status="audioStatusMap"` to ManageWordsTab
- Handle `@retry-audio`: call `downloadQueue.enqueue()`, then refresh
- Handle `@retry-all-audio`: find all failed records, enqueue each, refresh
- Call `refreshAudioStatus()` on mount and when `activeTab === 'manage'`

**Actual:** No changes needed. ManageWordsTab is self-contained — it imports `useWordAudio` and `useDownloadQueue` directly and manages its own audio status fetching, retry, and refresh watchers. ParentsView's existing prop bindings (`categories`, `words`) and event handlers (`@word-deleted`, `@difficulty-changed`) are sufficient. The integration "just works" within the parent view context.

---

## Frontier 10: GameView Integration

**depends_on:** [5, 6]  
**parallel_safe:** false  
**writes:** `src/views/GameView.vue`, `src/components/ui/AudioButton.vue`

### 10.1 Update AudioButton to use useWordAudio [x]
In `src/components/ui/AudioButton.vue`:
- Replace `import { useSpeech }` with `import { useWordAudio }`
- Replace `useSpeech()` with `useWordAudio()`
- Add required prop `category` (String)
- Pass `category` to `speakWord(word, category)`

### 10.2 Update GameView to use new composables [x]
In `src/views/GameView.vue`:
- Import `useWordAudio` and `useLetterAudio`
- Remove direct `useSpeech` import
- Replace `speakWord` with `useWordAudio().speakWord`
- Replace `speakLetter` with `useLetterAudio().playLetter`
- Add computed `currentCategoryId` for AudioButton category prop
- Update `setupGame()` auto-play to pass category
- Update `handleLetterDrop()` to use `playLetter`

---

## Frontier 11: Keyboard Letter Audio

**depends_on:** [6]  
**parallel_safe:** false  
**writes:** `src/components/game/Keyboard.vue`

### 11.1 Update Keyboard to use useLetterAudio [x]
In `src/components/game/Keyboard.vue`:
- Replace `import { useSpeech }` with `import { useLetterAudio }`
- Replace `useSpeech()` with `useLetterAudio()`
- Change `speakLetter(key.value)` to `playLetter(key.value)` in `handleKeyPress()`

---

## Frontier 12: Service Worker Precache Update

**depends_on:** []  
**parallel_safe:** true  
**writes:** `vite.config.js`

### 12.1 Add mp3 to workbox globPatterns [x]
In `vite.config.js`:
- Update `globPatterns` from `['**/*.{js,css,html,ico,png,svg,woff,woff2}']`
- To: `['**/*.{js,css,html,ico,png,svg,woff,woff2,mp3}']`

---

## Frontier 13: Integration & Verification

**depends_on:** [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]  
**parallel_safe:** false  
**writes:** []

### 13.1 Run production build
```bash
pnpm run build
```
Verify build completes without errors.

### 13.2 Verify letter MP3s in dist output
Check `dist/audio/letters/*.mp3` (26 files) exist after build.

### 13.3 Verify Service Worker precache manifest
In `dist/sw.js` or precache manifest, confirm 26 MP3 entries are listed.

### 13.4 Manual offline verification
- Serve built app, open DevTools → Application → Service Workers
- Check precached MP3s are listed
- Go offline, reload app, verify letter sounds still play