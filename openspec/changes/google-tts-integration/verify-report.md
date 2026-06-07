# Verify Report: google-tts-integration

**Date:** 2026-06-07
**Status:** `partial`
**Verdict:** PASS WITH WARNINGS — implementation is functionally complete but letter MP3 assets are missing (blocked on manual script execution with API key).

---

## Executive Summary

All code changes are implemented, the build succeeds, and the composables are correctly wired into the application. The primary blocker is that the 26 letter MP3 files in `public/audio/letters/` have not been generated — this requires running `scripts/generate-letter-sounds.mjs` with a valid Google Cloud TTS API key, which is a manual step that cannot be automated in verification.

---

## Build Evidence

```
$ pnpm run build
✓ 87 modules transformed.
✓ built in 2.25s
PWA v1.3.0 — mode generateSW, precache 19 entries (1212.17 KiB)
```

Build completes without errors. No test runner is configured (`test_command: ""` in config).

---

## Definition Compliance Matrix

| REQ | Description | Status | Evidence |
|-----|-------------|--------|----------|
| REQ-1 | API Key Configuration | **PASS** | `ConfigTab.vue` stores key in `configuracion_global` under `googleTtsApiKey`. Key never enters source or bundle. Password field with show/hide toggle. Test button validates key via `GET /v1/voices`. |
| REQ-2 | Lazy Download on First Play | **PASS** | `useWordAudio.speakWord()` queries `audios_blob`, falls back to `SpeechSynthesis` immediately, then calls `useDownloadQueue().enqueueDownload()` fire-and-forget. |
| REQ-3 | Blob Playback from IndexedDB | **PASS** | `useWordAudio` checks `record.status === 'ready' && record.blob`, creates `URL.createObjectURL()`, plays via `new Audio()`, updates `lastPlayed`. |
| REQ-4 | Fallback on Fetch Failure | **PASS** | `useDownloadQueue` catches errors, marks record `status: 'failed'` in `audios_blob`. `useWordAudio` falls through to `SpeechSynthesis`. No user-facing error dialogs. |
| REQ-5 | Audio Status Column in ManageWordsTab | **PASS** | `ManageWordsTab.vue` shows 🎵 (ready), 🔊 (pending/missing), ⚠️ (failed) icons per word. Status fetched via `getAudioStatus()`. |
| REQ-6 | Retry Single Word Audio | **PASS** | Clicking ⚠️ icon calls `retrySingle()` → sets status to 'pending' → `downloadQueue.enqueueDownload()`. |
| REQ-7 | Retry All Failed Audios | **PASS** | "Retry All Failed Downloads" button visible when `hasFailedAudio` is true. Calls `downloadQueue.retryFailed()` which queries all `status: 'failed'` records and enqueues each. |
| REQ-8 | Rate Limiting | **PASS** | `useDownloadQueue` processes one item at a time with `QUEUE_DELAY_MS = 1000` between calls. Serial `processLoop()` with `isProcessing` guard. |
| REQ-9 | Letter Sound Assets | **WARN** | `useLetterAudio.js` correctly references `/audio/letters/${letter}.mp3`. `vite.config.js` includes `mp3` in `globPatterns`. Script exists at `scripts/generate-letter-sounds.mjs`. **BUT: No actual MP3 files exist** — `public/audio/letters/` contains only `.gitkeep` and `README.md`. |
| REQ-10 | Voice Selection Priority | **PASS** | `useGoogleTTS.js` exports `VOICE_PRIORITY = ['en-US-Neural2-F', 'en-US-Neural2-A', 'en-US-Standard-C']`. Iterates voices sequentially, throws on all failures. Voice name stored in record. Speaking rate 0.85 matches design. |

**Score: 9/10 PASS, 1 WARN**

---

## Design Alignment

| Design Decision | Implementation | Status |
|----------------|----------------|--------|
| Two composables (word vs letter) | `useWordAudio.js` + `useLetterAudio.js` | ✅ |
| Module-level singleton queue | `useDownloadQueue.js` — module-level `queue`, `enqueuedSet`, `isProcessing` | ✅ |
| API key from IndexedDB, not Pinia | `useGoogleTTS` reads `db.configuracion_global.get('googleTtsApiKey')` | ✅ |
| `[word+category]` compound index | `db.version(4).stores({ audios_blob: '++id, word, category, status, [word+category]' })` | ✅ |
| v4 upgrade clears old records | `await tx.table('audios_blob').clear()` | ✅ |
| AudioButton gets `category` prop | `defineProps({ category: { type: String, required: true } })` | ✅ |
| GameView uses `currentCategoryId` computed | `computed(() => gameStore.currentCategory?.id_cat \|\| gameStore.currentCategory?.id \|\| '')` | ✅ |
| Keyboard uses `useLetterAudio` | `import { useLetterAudio }` → `playLetter(key.value)` | ✅ |
| ManageWordsTab self-contained | Imports `useWordAudio` and `useDownloadQueue` directly; no ParentsView wiring needed | ✅ |
| `enqueuedSet` for dedup | `reactive(new Set())` with `"word\|\|category"` keys | ✅ |
| `speakingRate: 0.85` | Both `useGoogleTTS` and generation script use `speakingRate: 0.85` | ✅ |
| Error types defined | `NO_API_KEY`, `AUTH_ERROR`, `QUOTA_ERROR`, `NETWORK_ERROR`, `API_ERROR` | ✅ |

---

## Integration Points Verification

| Integration | Status | Evidence |
|------------|--------|----------|
| GameView uses useWordAudio for word playback | ✅ | `GameView.vue:83` — `const { speakWord } = useWordAudio()` |
| GameView uses useLetterAudio for letter feedback | ✅ | `GameView.vue:84` — `const { playLetter } = useLetterAudio()` |
| GameView passes category to AudioButton | ✅ | `GameView.vue:25` — `<AudioButton :word="wordString" :category="currentCategoryId" />` |
| AudioButton passes category to speakWord | ✅ | `AudioButton.vue:24` — `speakWord(props.word, props.category)` |
| Keyboard uses useLetterAudio | ✅ | `Keyboard.vue:24` — `import { useLetterAudio }` |
| ConfigTab saves API key to IndexedDB | ✅ | `ConfigTab.vue:154` — `db.configuracion_global.put({ key: 'googleTtsApiKey', value: key })` |
| ManageWordsTab shows audio status | ✅ | `ManageWordsTab.vue:44-48` — status icons with retry on ⚠️ |
| ManageWordsTab supports Retry All | ✅ | `ManageWordsTab.vue:19` — "Retry All Failed Downloads" button |
| ParentsView unchanged (self-contained ManageWordsTab) | ✅ | `ParentsView.vue` has no audio-status wiring — ManageWordsTab handles it internally |

---

## Offline Behavior

| Scenario | Status | Evidence |
|----------|--------|----------|
| Letter sounds offline | ⚠️ | `useLetterAudio` uses static MP3 path `/audio/letters/${letter}.mp3`. **Works offline ONLY after MP3s are generated and SW precaches them.** Currently: MP3s don't exist, so falls back to SpeechSynthesis. |
| Word sounds offline (cached blob) | ✅ | `useWordAudio` reads blob from IndexedDB — no network needed. |
| Word sounds offline (no blob) | ✅ | Falls back to `SpeechSynthesis` (browser-native, works offline for downloaded voices). Download queue fails silently. |
| No network calls when offline | ✅ | `fetchTtsAudio` will throw `NETWORK_ERROR` on `TypeError: Failed to fetch`, caught by queue, marked `failed`. |

---

## Error Handling

| Error Type | Defined | Caught | User-Visible |
|-----------|---------|--------|--------------|
| `NO_API_KEY` | ✅ `useGoogleTTS.js:31` | ✅ Queue catches, marks failed | No |
| `AUTH_ERROR` (401/403) | ✅ `useGoogleTTS.js:67` | ✅ Queue catches, marks failed | ⚠️ icon only |
| `QUOTA_ERROR` (429) | ✅ `useGoogleTTS.js:70` | ✅ Queue catches, marks failed | ⚠️ icon only |
| `NETWORK_ERROR` | ✅ `useGoogleTTS.js:101` | ✅ Queue catches, marks failed | No |
| `API_ERROR` (other) | ✅ `useGoogleTTS.js:72` | ✅ Queue catches, marks failed | ⚠️ icon only |
| IndexedDB write failure | Console.error | ✅ `useDownloadQueue.js:103-104` | No |
| Autoplay policy block | ✅ `useWordAudio.js:129-136` | Falls through to SpeechSynthesis | No |

---

## Issues

### WARNING

1. **Letter MP3 files not generated.** `public/audio/letters/` contains only `.gitkeep` and `README.md`. The 26 MP3 files (a.mp3–z.mp3) must be generated by running:
   ```bash
   node scripts/generate-letter-sounds.mjs "YOUR_GOOGLE_API_KEY"
   ```
   This is a manual step requiring a valid Google Cloud TTS API key. Without these files:
   - `useLetterAudio` falls back to SpeechSynthesis (functional but lower quality)
   - SW precache will have 0 MP3 entries (the glob pattern is correct but there's nothing to match)
   - Offline letter sounds will not work

   **Impact:** Degraded letter audio quality; no offline letter sounds. Game remains fully functional.

### SUGGESTION

2. **ConfigTab uses `googleTtsApiKey` as DB key.** The definition says the key should be stored under `google_tts_api_key` (snake_case), but the implementation uses `googleTtsApiKey` (camelCase). This is internally consistent (`useGoogleTTS.js:29` also reads `googleTtsApiKey`), so it works — but diverges from the definition's naming.

3. **Design says `X-Goog-Api-Key` header.** The implementation uses query parameter `?key=` instead (`useGoogleTTS.js:42`). Both are valid Google Cloud authentication methods. Functionally equivalent but diverges from the design spec.

4. **`useLetterAudio` falls back to SpeechSynthesis.** The design says "No error handling needed — static file either exists or it doesn't. If missing, silent failure is acceptable." The implementation adds a `useSpeech` import and `speechFallback(letter)` on error. This is strictly better than the design but diverges from it.

5. **`useGoogleTTS` function name is `fetchTtsAudio` not `fetchWordAudio`.** Design specifies `fetchWordAudio(word, category)`, implementation has `fetchTtsAudio(word, voicePriority)`. The queue calls it correctly as `fetchTtsAudio(word)`. Functionally correct but naming differs.

---

## Files Verified

| File | Status |
|------|--------|
| `src/composables/useGoogleTTS.js` | ✅ Created |
| `src/composables/useDownloadQueue.js` | ✅ Created |
| `src/composables/useWordAudio.js` | ✅ Created |
| `src/composables/useLetterAudio.js` | ✅ Created |
| `src/db/db.js` | ✅ v4 migration added |
| `src/components/ui/AudioButton.vue` | ✅ Updated |
| `src/views/GameView.vue` | ✅ Updated |
| `src/components/game/Keyboard.vue` | ✅ Updated |
| `src/components/parents/ConfigTab.vue` | ✅ Updated |
| `src/components/parents/ManageWordsTab.vue` | ✅ Updated |
| `src/views/ParentsView.vue` | ✅ Unchanged (correct — ManageWordsTab is self-contained) |
| `vite.config.js` | ✅ Updated (mp3 in globPatterns) |
| `scripts/generate-letter-sounds.mjs` | ✅ Created |
| `public/audio/letters/` | ⚠️ Empty (MP3s not generated) |

---

## Task Completion

All 13 frontiers (tasks 1.1 through 13.4) are marked `[x]` in tasks.md. Task 1.2 (Generate letter MP3 files) is marked complete but includes a note: "This step requires a valid Google API key and is not executed here."

---

## Verdict

**PASS WITH WARNINGS**

The implementation is functionally complete and architecturally sound. The single blocker is the missing letter MP3 assets, which require a manual generation step with a real API key.

**Next steps:**
- Run `node scripts/generate-letter-sounds.mjs "YOUR_API_KEY"` to generate the 26 letter MP3s
- Re-run `pnpm run build` to include MP3s in the SW precache
- Verify `dist/audio/letters/` contains 26 files after build

**Orchestrator recommendation:** This change is ready for archive after the letter MP3 generation step is completed. The warnings (naming divergences from design) are acceptable and do not require rework.
