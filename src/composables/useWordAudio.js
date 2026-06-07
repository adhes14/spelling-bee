import { ref } from 'vue'
import { db } from '@/db/db'
import { useDownloadQueue } from './useDownloadQueue'

/**
 * Unified word audio playback with automatic fallback.
 *
 * The playback priority chain:
 *   1. Cached Google TTS blob in IndexedDB (audios_blob, status 'ready')
 *   2. Browser SpeechSynthesis (immediate, zero-delay fallback)
 *
 * When no cached blob exists, SpeechSynthesis fires immediately while a
 * background download is enqueued. Subsequent plays of the same word use
 * the high-quality Google TTS blob.
 */
export function useWordAudio() {
  const speaking = ref(false)
  let currentAudio = null

  /**
   * Stop any currently-playing audio (both blob and SpeechSynthesis).
   */
  function stopAll() {
    // Cancel any in-progress SpeechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Stop active HTMLAudioElement if any
    if (currentAudio) {
      currentAudio.pause()
      if (currentAudio.src) {
        URL.revokeObjectURL(currentAudio.src)
      }
      currentAudio.removeAttribute('src')
      currentAudio.load()
      currentAudio = null
    }

    speaking.value = false
  }

  /**
   * Fallback: speak the word via browser SpeechSynthesis.
   * Used when no cached blob exists or blob playback fails.
   */
  function synthesizeFallback(word) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      speaking.value = false
      return
    }

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.75 // Slower for target spelling words

    utterance.onstart = () => {
      speaking.value = true
    }
    utterance.onend = () => {
      speaking.value = false
    }
    utterance.onerror = () => {
      speaking.value = false
    }

    window.speechSynthesis.speak(utterance)
  }

  /**
   * Play a word's audio, with automatic fallback and background download.
   *
   * 1. Checks audios_blob for a cached blob with status 'ready'.
   * 2. If found: plays via HTMLAudioElement (preserves Google TTS quality).
   * 3. If not found (or status 'pending'/'failed'):
   *    a. Plays immediately via browser SpeechSynthesis.
   *    b. Enqueues a background download via useDownloadQueue.
   * 4. If HTMLAudioElement.play() is blocked by browser autoplay policy,
   *    falls through to SpeechSynthesis and still enqueues download.
   *
   * @param {string} word     - Lowercase word text to speak.
   * @param {string} category - Category ID (e.g., 'places').
   * @returns {Promise<void>} Resolves when audio starts playing.
   */
  async function speakWord(word, category) {
    // Cancel any prior audio
    stopAll()

    try {
      // Query IndexedDB for cached blob
      const record = await db.audios_blob
        .where({ word, category })
        .first()

      if (record && record.status === 'ready' && record.blob) {
        // ── Path A: Cached blob exists → play it ──
        const url = URL.createObjectURL(record.blob)
        currentAudio = new Audio(url)

        // Cleanup handler
        const cleanup = () => {
          if (currentAudio) {
            URL.revokeObjectURL(url)
            currentAudio = null
          }
          speaking.value = false
        }

        currentAudio.onended = cleanup
        currentAudio.onerror = () => {
          console.warn('Blob playback error, falling back to SpeechSynthesis')
          cleanup()
          // Fall through to SpeechSynthesis on error
          synthesizeFallback(word)
        }

        try {
          await currentAudio.play()
          speaking.value = true

          // Update lastPlayed timestamp
          try {
            await db.audios_blob.update(record.id, {
              lastPlayed: new Date()
            })
          } catch (_) {
            // Non-critical: timestamp update can fail silently
          }
        } catch (playErr) {
          // Autoplay policy blocked by browser — fall through
          console.warn('Autoplay blocked, falling back to SpeechSynthesis:', playErr.name)
          cleanup()
          synthesizeFallback(word)
          // Still enqueue download for future plays
          useDownloadQueue().enqueueDownload(word, category)
        }
      } else {
        // ── Path B: No cached blob → immediate SpeechSynthesis + background download ──
        synthesizeFallback(word)
        // Fire-and-forget background download
        useDownloadQueue().enqueueDownload(word, category)
      }
    } catch (err) {
      // DB query failed or other unexpected error — fallback to SpeechSynthesis
      console.error('useWordAudio: DB lookup failed, falling back to SpeechSynthesis:', err)
      synthesizeFallback(word)
    }
  }

  /**
   * Get the audio status for a word+category pair.
   *
   * @param {string} word     - Lowercase word text.
   * @param {string} category - Category ID.
   * @returns {Promise<'ready'|'pending'|'failed'|'missing'>}
   */
  async function getAudioStatus(word, category) {
    const key = `${word}||${category}`

    // Check if currently in download queue (fast, synchronous)
    if (useDownloadQueue().enqueuedSet.has(key)) {
      return 'pending'
    }

    // Check IndexedDB
    try {
      const record = await db.audios_blob
        .where({ word, category })
        .first()

      if (!record) return 'missing'
      return record.status // 'ready' or 'failed'
    } catch (_) {
      return 'missing'
    }
  }

  return {
    speaking,
    speakWord,
    getAudioStatus
  }
}
