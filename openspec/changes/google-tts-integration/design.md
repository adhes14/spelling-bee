# Design: Google TTS Integration

## 1. Architecture Overview

The change introduces a layered audio pipeline that sits between the UI components and the existing `SpeechSynthesis` fallback:

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer                                                │
│  AudioButton.vue  GameView.vue  Keyboard.vue            │
│  ConfigTab.vue    ManageWordsTab.vue                    │
└────────┬──────────────────┬──────────────────┬──────────┘
         │                  │                  │
    ┌────▼──────┐    ┌──────▼──────┐   ┌───────▼────────┐
    │ useWord   │    │ useLetter   │   │ useDownload    │
    │ Audio     │    │ Audio       │   │ Queue          │
    └─┬──┬──────┘    └─────────────┘   └──┬─────────┬───┘
      │  │                                 │         │
      │  │  ┌──────────────────────────────┘         │
      │  └──┤  useSpeech.js (fallback)               │
      │     │                                        │
 ┌────▼──┐  │                              ┌─────────▼──┐
 │ audios│  │                              │ useGoogle   │
 │ _blob │  │                              │ TTS         │
 │ (Dexie│  │                              └──────┬──────┘
 │  DB)  │  │                                     │
 └───────┘  │                              Google Cloud
            │                              TTS REST API
     SpeechSynthesis
     (browser API)
```

**Key architectural decision:** Two separate composables for words vs. letters, because they have completely different data sources (IndexedDB blobs vs. static MP3 files) and fallback behaviors (SpeechSynthesis vs. none — static files never fail).

### Dependency Graph

```
useWordAudio
  ├─► db.audios_blob        (lookup cached blobs)
  ├─► useSpeech             (immediate fallback)
  └─► useDownloadQueue      (lazy background fetch)

useDownloadQueue (module-level singleton)
  ├─► useGoogleTTS          (API calls)
  └─► db.audios_blob        (write results)

useGoogleTTS
  └─► db.configuracion_global (retrieve API key)

useLetterAudio
  └─► public/audio/letters/  (static assets, SW-precached)

useSpeech (unchanged)
  └─► window.speechSynthesis
```

---

## 2. Component/Module Design

### 2.1 New Files

#### `src/composables/useGoogleTTS.js`

Pure API client. No pinia/store dependencies — only reads the API key directly from IndexedDB.

```js
// Exports:
export const VOICE_PRIORITY = [
  'en-US-Neural2-F',
  'en-US-Neural2-A',
  'en-US-Standard-C'
]

export function useGoogleTTS() {
  async function fetchWordAudio(word, category) { ... }
  return { fetchWordAudio }
}
```

**`fetchWordAudio(word, category)` behavior:**
1. Retrieve `google_tts_api_key` from `db.configuracion_global`
2. If key is falsy/empty, throw `new Error('NO_API_KEY')` (caller handles silently)
3. Iterate `VOICE_PRIORITY` array
4. For each voice, `POST` to `https://texttospeech.googleapis.com/v1/text:synthesize` with:
   - Header: `X-Goog-Api-Key: {key}`
   - Body: `{ input: { text: word }, voice: { languageCode: 'en-US', name: voiceName }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 } }`
5. On success (HTTP 200): decode `response.audioContent` base64 → `Uint8Array` → `Blob`, return `{ blob, voiceName, format: 'audio/mp3' }`
6. On HTTP error (4xx/5xx): if more voices in priority list, try next. If all exhausted, throw.
7. If all three voices fail, throw with the last error.

**Rationale for direct `db` access (not store):** The API key is a secret and should never enter Pinia's reactive state where it could be inadvertently serialized or logged. The composable queries `configuracion_global` directly at call time, keeping the secret's window of exposure minimal.

**Rationale for `speakingRate: 0.85`:** Consistent with `useSpeech.js`'s rate of 0.75–0.8 for kids. Google TTS defaults to 1.0 which is too fast for spelling bee context.

#### `src/composables/useDownloadQueue.js`

Module-level singleton serial queue. Not tied to any component lifecycle.

```js
// Exports:
export function useDownloadQueue() {
  function enqueue(word, category) { ... }
  function enqueueAll(items) { ... }
  const isProcessing   // ref<boolean>
  const queueLength    // computed<number>
  const currentJob     // ref<{word, category} | null>
  const enqueuedSet    // reactive Set<string> — keys like "word||category"
  return { enqueue, enqueueAll, isProcessing, queueLength, currentJob, enqueuedSet }
}
```

**Queue processing algorithm:**
```
1. enqueue(word, category):
   - If already in enqueuedSet, return (dedup)
   - Add to enqueuedSet
   - Push {word, category} to internal array
   - If not currently processing, start processLoop()

2. processLoop():
   - Set isProcessing = true
   - While queue has items:
     a. Shift first item from queue
     b. Set currentJob = item
     c. Try db.audios_blob.where({word, category}).first()
        - If record exists with status 'ready', skip (already cached)
     d. Call googleTTS.fetchWordAudio(word, category)
        - On success: db.audios_blob.put({ word, category, voiceName, format, blob, status: 'ready', createdAt: now, lastPlayed: null })
        - On failure: db.audios_blob.put({ word, category, status: 'failed', ... })
     e. Remove from enqueuedSet
     f. Wait 1000ms before next item
   - Set isProcessing = false, currentJob = null
```

**Rationale for singleton pattern:** Downloads must be serialized globally regardless of which component triggered them. A module-level array + flag achieves this without Vue provide/inject complexity that could break across route navigations.

**Rationale for `enqueuedSet`:** Prevents duplicate enqueues while a download is pending. The set uses `"word||category"` keys (same composite key format used elsewhere). The `enqueuedSet` is reactive so ManageWordsTab can detect "download in progress" state.

#### `src/composables/useWordAudio.js`

Orchestrator that components call when a word needs to be spoken.

```js
// Exports:
export function useWordAudio() {
  const speaking   // ref<boolean>
  function speakWord(word, category) { ... }
  return { speaking, speakWord }
}
```

**`speakWord(word, category)` behavior:**
1. Set `speaking = true`
2. Cancel any in-progress SpeechSynthesis (via `window.speechSynthesis.cancel()`)
3. Stop any active `<Audio>` element playback
4. Query `db.audios_blob.where({word, category}).first()`
5. If record exists AND `status === 'ready'` AND `blob` is not null:
   - Create blob URL via `URL.createObjectURL(record.blob)`
   - Create `<Audio>` element, play it
   - Update `lastPlayed` to `new Date()` on the record
   - On ended/error: `URL.revokeObjectURL()`, set `speaking = false`
6. If NO cached blob OR status is not 'ready':
   - **Immediately** call `useSpeech().speakWord(word)` (non-blocking, zero latency)
   - Call `useDownloadQueue().enqueue(word, category)` (fire-and-forget)
   - Set `speaking = false` when speech ends

**Rationale for immediate SpeechSynthesis:** The definition requires zero-delay playback when no blob exists. SpeechSynthesis fires synchronously (well, near-synchronously — `speechSynthesis.speak()` queues it immediately). The download is pure background. The user never waits.

**Rationale for HTMLAudioElement over SpeechSynthesis for blob playback:** The cached MP3 is high-quality Google TTS audio. Playing it via `<audio>` preserves quality and avoids browser voice selection variance. This also gives us full control over playback lifecycle.

#### `src/composables/useLetterAudio.js`

Simple static MP3 player for letter sounds (A-Z).

```js
// Exports:
export function useLetterAudio() {
  function playLetter(letter) { ... }
  return { playLetter }
}
```

**`playLetter(letter)` behavior:**
1. Uppercase the letter (e.g., `'a'` → `'A'`)
2. If letter is not A-Z, silently return
3. Create `<Audio>` element with `src="/audio/letters/${letter}.mp3"`
4. Play it. No error handling needed — static file either exists or it doesn't. If missing, silent failure is acceptable (it's a cosmetic letter sound, not critical for gameplay).

**Rationale for zero IndexedDB/API calls:** Per REQ-9, letter sounds must use precached static assets only. This avoids latency (IndexedDB lookup) and cost (API calls) for the most frequent audio interaction in the app (every key press).

#### `scripts/generate-letter-audio.js`

One-time Node.js script. Not part of the build pipeline.

```js
// Usage: node scripts/generate-letter-audio.js <GOOGLE_API_KEY>
// Generates 26 MP3 files in public/audio/letters/A.mp3 through Z.mp3
```

**Script algorithm:**
1. Parse API key from `process.argv[2]`
2. Create `public/audio/letters/` directory if missing
3. For each letter 'A' through 'Z':
   - POST to `https://texttospeech.googleapis.com/v1/text:synthesize`
   - Voice: `en-US-Neural2-F`, audioEncoding: `MP3`
   - Decode base64 response, write to `public/audio/letters/${letter}.mp3`
   - Wait 1 second (rate limiting)
4. Print summary

**Rationale for one-time script:** The 26 letter MP3s are generated once and committed to the repo as static assets. They never change. Running it as a build step would require API key availability in CI and introduce network dependency to the build. A manual script keeps the build deterministic and zero-cost.

### 2.2 Modified Files

#### `src/db/db.js` — Schema v4 Migration

Add version 4 schema:

```js
db.version(4).stores({
  audios_blob: '++id, word, category, status, [word+category]'
}).upgrade(async tx => {
  // Existing v1-v3 records have only {id, word}. The migration adds
  // fields via Dexie's schema change. No data migration needed since
  // the old records are from the unused audios_blob table.
  await tx.table('audios_blob').clear()
})
```

**New `audios_blob` record shape:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | auto | Primary key |
| `word` | string | Lowercase word text |
| `category` | string | Category ID (e.g., `places`) |
| `voiceName` | string | Voice used for TTS (e.g., `en-US-Neural2-F`) |
| `format` | string | MIME type (`audio/mp3`) |
| `blob` | Blob | The audio blob |
| `status` | string | `'ready'` or `'failed'` |
| `createdAt` | Date | When the blob was fetched |
| `lastPlayed` | Date | Last time the blob was played |

**Compound index `[word+category]`:** Primary lookup key for gameplay and manage tab.

**Rationale for `upgrade` clearing old records:** The current v1 `audios_blob` is unused (no code writes or reads it). Clearing it avoids schema mismatch. If any records existed, they lacked the new required fields and would cause type errors.

#### `src/components/ui/AudioButton.vue`

**Changes:**
1. Replace `import { useSpeech }` with `import { useWordAudio }`
2. Replace `const { speakWord, speaking } = useSpeech()` with `const { speakWord, speaking } = useWordAudio()`
3. Add `category` prop (String, required)
4. Pass category to `speakWord(props.word, props.category)`

**Rationale:** AudioButton is the primary "play word" trigger in GameView. It now routes through the TTS pipeline instead of directly to SpeechSynthesis. The category prop is needed for the `[word+category]` IndexedDB index lookup.

#### `src/views/GameView.vue`

**Changes:**
1. Add imports: `import { useWordAudio } from '@/composables/useWordAudio'` and `import { useLetterAudio } from '@/composables/useLetterAudio'`
2. Replace `import { useSpeech } from '@/composables/useSpeech'` — no longer directly imported
3. Replace `const { speakWord, speakLetter } = useSpeech()` with `const { speakWord } = useWordAudio()` and `const { playLetter } = useLetterAudio()`
4. Add computed: `const currentCategoryId = computed(() => gameStore.currentCategory?.id_cat || gameStore.currentCategory?.id || '')`
5. Update template: `<AudioButton :word="wordString" :category="currentCategoryId" />`
6. Update `setupGame()` auto-play: change `speakWord(word)` to `speakWord(word, currentCategoryId.value)` on line 165
7. Update `handleLetterDrop()` letter feedback: change `speakLetter(letter)` to `playLetter(letter)` on line 187

**Rationale:** GameView is the only place besides AudioButton that triggers word speech (auto-play on word load). It also triggers letter sounds on correct drag-drop. Both now use the new composables. `speakLetter` in `handleLetterDrop` was previously SpeechSynthesis; now it's the static MP3, giving consistent letter sounds regardless of browser voice availability.

#### `src/components/game/Keyboard.vue`

**Changes:**
1. Replace `import { useSpeech }` with `import { useLetterAudio }`
2. Replace `const { speakLetter } = useSpeech()` with `const { playLetter } = useLetterAudio()`
3. In `handleKeyPress()`, change `speakLetter(key.value)` to `playLetter(key.value)` on line 80

**Rationale:** Every key press currently triggers SpeechSynthesis for letter feedback. This has ~200-500ms latency and varies by browser. Static MP3s from precache have ~0ms latency and consistent quality. This is the highest-frequency audio interaction in the app (dozens of presses per game session).

#### `src/components/parents/ConfigTab.vue`

**Changes:**
1. Add a new config group below the existing three (score decay) for the Google TTS API key
2. New reactive ref: `googleTtsApiKey`
3. New input: password-type `<input>` with placeholder "Paste your Google Cloud TTS API key"
4. Helper text: brief note about optionality + link to Google Cloud docs
5. On mount: load `google_tts_api_key` from `db.configuracion_global`
6. On change/blur: persist directly to `db.configuracion_global` (key: `google_tts_api_key`)
7. The API key does NOT flow through the `settings-updated` emit or `dictionaryStore` — it's handled locally for security

**Component script additions (pseudocode):**
```js
import { db } from '@/db/db'
const googleTtsApiKey = ref('')

onMounted(async () => {
  const record = await db.configuracion_global.get('google_tts_api_key')
  if (record) googleTtsApiKey.value = record.value
})

async function saveApiKey() {
  const key = googleTtsApiKey.value.trim()
  if (key) {
    await db.configuracion_global.put({ key: 'google_tts_api_key', value: key })
  } else {
    await db.configuracion_global.delete('google_tts_api_key')
  }
}
```

**Rationale for not using `dictionaryStore`:** The existing `globalSettings` is a reactive object that gets passed around and could be logged. The API key is a secret and should have minimal surface area. Direct IndexedDB access from ConfigTab keeps it contained. The key is only read by `useGoogleTTS` at API call time.

#### `src/components/parents/ManageWordsTab.vue`

**Changes:**
1. Add new prop: `audioStatus` (type: Object, maps `"word||category"` → `'ready' | 'failed' | 'pending'`)
2. Add new emits: `retry-audio` (payload: `{word, category}`), `retry-all-audio` (no payload)
3. Add audio status icon column between `word-info` and `word-actions-row` in the template
4. Add "Retry All" button above the word list (only visible when any word has `failed` status)
5. Icon logic:
   - `'ready'` → `<span class="audio-icon ready" @click="preview">🎵</span>`
   - `'failed'` → `<span class="audio-icon failed" @click="retryOne">⚠️</span>`
   - `'pending'` or missing → `<span class="audio-icon pending">🔊</span>`

**Template structure change (per word item):**
```
word-item
├── word-info (unchanged)
├── audio-icon (NEW)
└── word-actions-row (unchanged)
```

**Rationale for audioStatus as a prop (not internal fetch):** Following the existing data-down pattern where ParentsView is the data coordinator. ParentsView can batch-query `audios_blob` once and pass results down. This avoids N+1 DB queries if ManageWordsTab queried per word.

#### `src/views/ParentsView.vue`

**Changes:**
1. Add imports: `import { useDownloadQueue } from '@/composables/useDownloadQueue'`
2. Add import: `import { db } from '@/db/db'`
3. Add ref: `audioStatusMap = ref({})` — computed from `audios_blob` queries
4. Add function: `refreshAudioStatus()` — queries `audios_blob` for all custom words, builds status map
5. Pass `:audio-status="audioStatusMap"` to ManageWordsTab
6. Handle `@retry-audio`: calls `downloadQueue.enqueue(word, category)` then refreshes status
7. Handle `@retry-all-audio`: finds all `failed` records, enqueues each, refreshes status
8. Call `refreshAudioStatus()` on mount and when the `manage` tab becomes active (watch `activeTab`)
9. Inject `useDownloadQueue()` at the top level and pass down or handle emits

**`refreshAudioStatus()` algorithm:**
```js
async function refreshAudioStatus() {
  const customWords = dictionaryStore.words.filter(w => w.isCustom)
  if (customWords.length === 0) { audioStatusMap.value = {}; return }
  
  const records = await db.audios_blob.toArray()
  const map = {}
  for (const r of records) {
    map[`${r.word}||${r.category}`] = r.status || 'pending'
  }
  // For words not in audios_blob, status is 'pending'
  for (const w of customWords) {
    const key = `${w.word}||${w.category}`
    if (!(key in map)) map[key] = 'pending'
  }
  audioStatusMap.value = map
}
```

**Rationale for batch query over per-word:** IndexedDB queries have overhead. A single `toArray()` on `audios_blob` (which will have at most ~100 records) is O(n) in JS and near-instant. This avoids N queries where N = number of custom words.

#### `vite.config.js`

**Change:** Add `mp3` to the `workbox.globPatterns` array:

```js
// Before:
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']

// After:
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,mp3}']
```

**Rationale:** The 26 letter MP3 files in `public/audio/letters/` are copied by Vite to the dist root as `dist/audio/letters/*.mp3`. The updated glob pattern ensures Workbox includes them in the precache manifest. Once precached, they're available offline and load instantly.

---

## 3. Data Flow

### 3.1 Word Play — First Time (No Cached Blob)

```
User taps 🔊 button
        │
        ▼
AudioButton.speak() ──► useWordAudio.speakWord("airport", "places")
        │
        ├──► Cancel prior speech
        ├──► db.audios_blob.where({word:"airport", category:"places"}).first()
        │         │
        │         └──► null (no record)
        │
        ├──► useSpeech.speakWord("airport")  ◄── IMMEDIATE, zero-delay
        │         │
        │         └──► User hears word via SpeechSynthesis
        │
        └──► useDownloadQueue.enqueue("airport", "places")
                  │
                  ▼
           [Queue processes in background]
           ┌─────────────────────────────────────┐
           │ 1. Get API key from DB              │
           │ 2. POST Google TTS with voice 1     │
           │    → 200 OK, returns base64 audio   │
           │ 3. Decode base64 → Blob             │
           │ 4. db.audios_blob.put({             │
           │      word: "airport",               │
           │      category: "places",            │
           │      voiceName: "en-US-Neural2-F",  │
           │      format: "audio/mp3",           │
           │      blob: <Blob>,                  │
           │      status: "ready",               │
           │      createdAt: Date,               │
           │      lastPlayed: null               │
           │    })                                │
           │ 5. Wait 1000ms                       │
           └─────────────────────────────────────┘
```

### 3.2 Word Play — Cached Blob Exists

```
User taps 🔊 button
        │
        ▼
useWordAudio.speakWord("airport", "places")
        │
        ├──► db.audios_blob.where({word:"airport", category:"places"}).first()
        │         │
        │         └──► { status: "ready", blob: <Blob>, ... }
        │
        ├──► URL.createObjectURL(blob)  →  "blob:...-abc123"
        ├──► const audio = new Audio("blob:...-abc123")
        ├──► audio.play()
        │         │
        │         └──► User hears high-quality Google TTS audio
        │
        └──► db.audios_blob.update(id, { lastPlayed: new Date() })
```

### 3.3 Letter Key Press

```
User presses 'A' key
        │
        ▼
Keyboard.handleKeyPress({ value: 'a', type: 'letter' })
        │
        └──► useLetterAudio.playLetter('a')
                  │
                  ├──► new Audio("/audio/letters/A.mp3")
                  ├──► audio.play()
                  │         │
                  │         └──► Served from Service Worker precache (offline-ready)
                  │
                  └──► No IndexedDB, no API call, no SpeechSynthesis
```

### 3.4 Config Tab — API Key Save

```
Parent pastes key and blurs field
        │
        ▼
ConfigTab.saveApiKey()
        │
        └──► db.configuracion_global.put({
               key: "google_tts_api_key",
               value: "AIzaSy..."
             })
                  │
                  └──► Key is now in IndexedDB, never in source/bundle
```

### 3.5 ManageWordsTab — Retry Single Failed Audio

```
Parent taps ⚠️ icon on "restaurant"
        │
        ▼
ManageWordsTab emits 'retry-audio', { word: "restaurant", category: "places" }
        │
        ▼
ParentsView handles event:
  ├──► downloadQueue.enqueue("restaurant", "places")
  └──► refreshAudioStatus()  → icon becomes 🔊
              │
              ▼
       [Queue downloads in background]
              │
              ▼
       On completion: refreshAudioStatus() → icon becomes 🎵 (or stays ⚠️ if failed)
```

---

## 4. API Integration Design

### Google Cloud TTS REST API

**Endpoint:** `POST https://texttospeech.googleapis.com/v1/text:synthesize`

**Authentication:** API key via `X-Goog-Api-Key` header (NOT OAuth — per definition, parent pastes a key).

**Request body shape:**
```json
{
  "input": { "text": "airport" },
  "voice": {
    "languageCode": "en-US",
    "name": "en-US-Neural2-F"
  },
  "audioConfig": {
    "audioEncoding": "MP3",
    "speakingRate": 0.85
  }
}
```

**Response shape (success):**
```json
{
  "audioContent": "//NExAASCC..."  // base64-encoded MP3
}
```

**Error responses handled:**
| HTTP Status | Meaning | Handling |
|-------------|---------|----------|
| 400 | Invalid request (bad word text, missing field) | Mark failed, don't retry |
| 401/403 | Invalid API key | Mark failed, don't retry |
| 429 | Rate limited | Mark failed (may succeed on manual retry) |
| 5xx | Server error | Mark failed, don't retry |
| Network error | Offline / CORS | Mark failed, don't retry |

**Voice priority fallback:** Each voice is tried sequentially within a single `fetchWordAudio` call. If voice 1 returns 4xx/5xx, try voice 2, then voice 3. The first successful voice's name is stored in `voiceName`. All voices share `languageCode: 'en-US'` and all are WaveNet/Neural quality except the fallback Standard.

**Rate limiting:** No built-in retry-with-backoff. The queue's 1-second inter-call delay is the sole rate limiting mechanism. Failed API calls are NOT automatically retried — they go to `status: 'failed'` and require manual parent action (or another gameplay-triggered lazy download attempt).

**Rationale for no automatic retry:** The definition specifies retry is a parent action (REQ-6). Automatic retry could burn through API quota silently. The 1-second delay provides basic rate limiting without complex backoff logic.

---

## 5. IndexedDB Integration Design

### Schema Changes

**Table: `audios_blob`** — currently v1 (`'++id, word'`), migrated to v4.

**Migration strategy:** Clear existing `audios_blob` records in the v4 upgrade handler. The table was defined but never used in v1-v3. No data loss risk.

### Index Design

**Primary index:** `++id` (auto-incrementing, used for `put`/`update` operations).

**Compound index: `[word+category]`** — used by `where({word, category})` queries in `useWordAudio` and `useDownloadQueue`. This is the hot path for every word-play operation.

**Rationale for compound index over separate indexes:** The lookup key is always the pair `(word, category)`. A compound index gives O(log n) lookup vs. O(n) filter if we had separate indexes. Dexie's `where({word, category})` automatically uses the compound index.

### Read Patterns

| Operation | Query | Frequency |
|-----------|-------|-----------|
| Check cached blob | `audios_blob.where({word, category}).first()` | Every word play |
| Get all statuses | `audios_blob.toArray()` | ManageWordsTab open |
| Check before download | `audios_blob.where({word, category}).first()` | Queue processing |

### Write Patterns

| Operation | Method | When |
|-----------|--------|------|
| Store fetched blob | `audios_blob.put({...status:'ready'})` | Successful TTS fetch |
| Mark failed | `audios_blob.put({...status:'failed'})` | Failed TTS fetch |
| Update lastPlayed | `audios_blob.update(id, {lastPlayed})` | Each blob playback |

**Rationale for `put` over `add`:** `put` with a compound key allows upsert. If a record already exists for `[word+category]`, it updates; otherwise it inserts. This handles re-downloads (retry) without needing to find the existing record first.

### Storage Size Estimate

- Each blob: ~5-15KB for a 1-3 second word MP3 at standard bitrate
- 100 words × 10KB = ~1MB worst-case
- 26 letter MP3s × ~10KB = ~260KB in SW cache
- Total: well within typical IndexedDB quotas (browsers allow 30-50% of disk, typically 500MB+ on mobile)

---

## 6. UI Changes

### 6.1 ConfigTab — New API Key Field

Added as the 4th config group, below "Score Decay Per Day":

```
┌──────────────────────────────────────────┐
│ Google TTS API Key (Optional):           │
│ ┌──────────────────────────────────────┐ │
│ │ ●●●●●●●●●●●●●●●●●●● (password field) │ │
│ └──────────────────────────────────────┘ │
│ Enables high-quality word pronunciation. │
│ Without it, built-in speech is used.     │
│ Get a key → cloud.google.com/text-to-    │
│ speech                                    │
└──────────────────────────────────────────┘
```

Visual style: same `config-group` class as existing controls. Password-type input to prevent shoulder-surfing.

### 6.2 ManageWordsTab — Audio Status Column

New layout per word item:

```
┌──────────────────────────────────────────────────────┐
│ restaurant                    🎵  [Medium ▼] [🗑️]   │
│ ✈️ Places                                            │
├──────────────────────────────────────────────────────┤
│ rhythm                        ⚠️  [Hard  ▼] [🗑️]   │
│ 🎵 Music                                             │
├──────────────────────────────────────────────────────┤
│ coding                        🔊  [Medium ▼] [🗑️]   │
│ 🏡 Daily Life                                        │
└──────────────────────────────────────────────────────┘
```

The audio icon sits between `word-info` and `word-actions-row`. Uses `display: flex; align-items: center; gap: 0.5rem`.

**"Retry All" button:** Positioned between filter bar and word list. Only visible when `audioStatusMap` contains any `'failed'` values. Styled as a secondary button with ⚠️ icon.

### 6.3 AudioButton — No Visual Change

The AudioButton component keeps its existing appearance (purple circle, 🔊 icon, pulse animation). The only change is internal — it now routes through `useWordAudio` instead of directly to SpeechSynthesis. The `speaking` animation still works since `useWordAudio` exposes the same reactive `speaking` ref.

---

## 7. Service Worker Updates

### Precache Configuration

**Before:**
```js
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
}
```

**After:**
```js
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,mp3}']
}
```

### What Gets Precached

When `vite build` runs:
1. Vite copies `public/audio/letters/*.mp3` → `dist/audio/letters/*.mp3`
2. `vite-plugin-pwa` runs Workbox's `generateSW` on the `dist/` directory
3. The glob `**/*.mp3` matches 26 files in `audio/letters/`
4. Each file gets a revision hash and is added to the precache manifest

### Runtime Behavior

- First visit: SW installs, precaches all 26 MP3s (~260KB)
- Subsequent visits: MP3s served from cache instantly
- Offline: Letter sounds still work
- Update: If letter MP3s change (re-run generation script and rebuild), SW detects revision hash change and updates cache

**Rationale for precache (not runtime cache):** Letter sounds are a fixed, small set of assets needed by every user. Precaching ensures they're available offline from the first install. Runtime caching would require the user to press every letter key at least once while online. Precaching is the correct strategy for known static assets.

---

## 8. Migration / Deployment Strategy

### Database Migration

Handled automatically by Dexie's versioning system on first page load after deployment:

1. User opens app
2. Dexie detects database version < 4
3. Runs `db.version(4).stores({...}).upgrade(...)` 
4. Old `audios_blob` records cleared, new schema applied
5. App continues normally — `audios_blob` starts empty

No user intervention required. No data migration scripts needed.

### Asset Deployment

The 26 letter MP3s must be generated BEFORE the first build with this change:

```bash
# One-time: generate letter audio (requires API key)
node scripts/generate-letter-audio.js "YOUR_GOOGLE_API_KEY"

# Verify files exist
ls public/audio/letters/  # Should show A.mp3 through Z.mp3

# Build
pnpm run build
```

The generated MP3s are committed to the repository as static assets. CI/CD does NOT run the generation script.

### Feature Rollout

This change is backward-compatible:
- **No API key configured:** Behaves exactly like current version (SpeechSynthesis for all audio)
- **API key added later:** Google TTS activates on next word play, blobs accumulate lazily
- **API key removed:** Existing cached blobs continue working; new words fall back to SpeechSynthesis
- **ManageWordsTab:** Audio status column gracefully handles empty `audios_blob` (all 🔊)

### Rollback

If rollback is needed:
1. Remove v4 schema from `db.js` (or increment to v5 with old schema)
2. Delete new composables: `useGoogleTTS.js`, `useDownloadQueue.js`, `useWordAudio.js`, `useLetterAudio.js`
3. Revert modified files to their pre-change state
4. Delete `public/audio/letters/` directory
5. Revert `vite.config.js` globPatterns
6. Build and deploy

No database corruption risk on rollback — `audios_blob` records from v4 are not read by v3 code. The `configuracion_global` key `google_tts_api_key` is harmless if left behind.

---

## 9. Error Handling & Edge Cases

### Error Matrix

| Scenario | Behavior | User-Visible? |
|----------|----------|---------------|
| No API key configured | SpeechSynthesis used, queue skips all items | No |
| API key invalid (403) | Fetch fails, marked `failed`, SpeechSynthesis used | Only via ⚠️ in ManageWordsTab |
| Network offline | Fetch fails immediately, SpeechSynthesis used | No |
| Google TTS 429 (rate limit) | Fetch fails, marked `failed` | Only via ⚠️ in ManageWordsTab |
| Google TTS 5xx | Fetch fails, marked `failed` | Only via ⚠️ in ManageWordsTab |
| All 3 voices fail | Marked `failed`, SpeechSynthesis used | Only via ⚠️ in ManageWordsTab |
| IndexedDB write fails (quota) | Console.error, marked `failed` | No |
| HTMLAudioElement.play() rejected | Catch and suppress (autoplay policy) | No |
| Letter MP3 file missing | Silent failure, no sound on key press | Subtle: no letter feedback |
| Rapid audio button taps | Cancel prior audio, start new one | Smooth UX |
| Word with spaces ("go away") | TTS API handles it — "go away" is valid text | Correct pronunciation |
| Word with special chars | Google TTS API accepts UTF-8; punctuation affects prosody | Slight prosody changes |
| SW precache fails for letter MP3s | Network fetch on first play, then browser cache | Slight first-play latency |

### Autoplay Policy Handling

Browsers block `audio.play()` without user gesture. The AudioButton component IS a user gesture (click), so playback is allowed. For the auto-play in `GameView.setupGame()`:

```js
// In setupGame, auto-play is triggered from onMounted, NOT a user gesture.
// Solution: Use the existing pattern — setTimeout with a slight delay.
// The page navigation itself may constitute a user gesture in some browsers,
// but we don't rely on it. The speakWord call uses SpeechSynthesis (which
// is not subject to autoplay policy) when no blob exists.
```

**Risk mitigation:** The auto-play path primarily hits SpeechSynthesis (no blob = fast path), which is exempt from autoplay restrictions. When a blob does exist, `HTMLAudioElement.play()` may fail, in which case we silently fall back to SpeechSynthesis.

### Memory Management

- Blob URLs are revoked in `onended` and `onerror` handlers via `URL.revokeObjectURL()`
- The `<Audio>` element reference is nulled after playback
- `useSpeech` cancels prior `speechSynthesis.speak()` before new utterance
- Queue array is shifted (not grown) — max size is number of distinct word+category pairs being eagerly fetched

### Concurrent Play Prevention

Both `useWordAudio` and `useSpeech` cancel prior audio before starting new playback. This prevents overlapping audio if the user taps the button rapidly.

---

## 10. Open Questions

1. **Google TTS API key format validation:** Should ConfigTab perform basic format validation (e.g., starts with "AIza") before saving? Currently: no validation, API errors surface silently. **Decision needed:** Add client-side format hint or keep simple?

2. **Audio preview in ManageWordsTab:** Should tapping the 🎵 icon in ManageWordsTab play the cached audio as a preview? The definition only specifies ⚠️ is tappable for retry. **Decision:** Keep 🎵 non-interactive for now per spec. Can be added as enhancement.

3. **Letter audio accent:** The generation script uses `en-US-Neural2-F` voice. Is a female American English voice the right choice for letter sounds in a kids' app? **Decision:** Use the same voice priority as word TTS (Neural2-F first). Consistent voice quality across letter and word audio.

4. **`audios_blob` schema migration cleanup:** The v4 upgrade clears all existing records. Is there any scenario where the currently unused `audios_blob` table could contain user data? **Decision:** It cannot — no code in v1-v3 writes to `audios_blob`. Safe to clear.
