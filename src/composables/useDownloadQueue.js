import { ref, reactive } from 'vue'
import { db } from '@/db/db'
import { useGoogleTTS } from './useGoogleTTS'

// ── Module-level singleton state ──────────────────────────────────────────
const queue = []
const enqueuedSet = reactive(new Set())
const isProcessing = ref(false)
const currentJob = ref(null)

const QUEUE_DELAY_MS = 1000

/**
 * Serial background download queue for Google TTS audio blobs.
 *
 * Module-level singleton — not tied to any component lifecycle.
 * Processes one API call at a time with a 1-second inter-call delay.
 * Non-blocking: enqueueDownload returns immediately, processing happens
 * in the background.
 */
export function useDownloadQueue() {
  const { fetchTtsAudio } = useGoogleTTS()

  /**
   * Internal processing loop. Runs until the queue is empty.
   */
  async function processLoop() {
    if (isProcessing.value) return
    isProcessing.value = true

    while (queue.length > 0) {
      const item = queue.shift()
      const { word, category } = item
      currentJob.value = { word, category }

      const key = `${word}||${category}`

      try {
        // Check if a 'ready' blob already exists — skip if so
        const existing = await db.audios_blob
          .where({ word, category })
          .first()

        if (existing && existing.status === 'ready') {
          enqueuedSet.delete(key)
          continue
        }

        // Fetch from Google TTS
        const { blob, voiceName, format } = await fetchTtsAudio(word)

        if (existing) {
          // Upsert: update existing record
          await db.audios_blob.update(existing.id, {
            word,
            category,
            voiceName,
            format,
            blob,
            status: 'ready',
            createdAt: new Date(),
            lastPlayed: null
          })
        } else {
          // Insert new record
          await db.audios_blob.add({
            word,
            category,
            voiceName,
            format,
            blob,
            status: 'ready',
            createdAt: new Date(),
            lastPlayed: null
          })
        }
      } catch (err) {
        // On any failure, mark as failed
        console.error(`Download failed for "${word}" [${category}]:`, err.message)

        try {
          const existing = await db.audios_blob
            .where({ word, category })
            .first()

          if (existing) {
            await db.audios_blob.update(existing.id, {
              status: 'failed',
              lastPlayed: null
            })
          } else {
            await db.audios_blob.add({
              word,
              category,
              voiceName: null,
              format: null,
              blob: null,
              status: 'failed',
              createdAt: new Date(),
              lastPlayed: null
            })
          }
        } catch (dbErr) {
          console.error(`Failed to write failure record for "${word}":`, dbErr)
        }
      } finally {
        enqueuedSet.delete(key)
        currentJob.value = null

        // 1-second delay between calls (rate limiting)
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY_MS))
        }
      }
    }

    isProcessing.value = false
  }

  /**
   * Enqueue a word for background download. Deduplicates — if the word is
   * already in the queue, the call is silently ignored.
   *
   * @param {string} word     - Lowercase word text.
   * @param {string} category - Category ID (e.g., 'places').
   */
  function enqueueDownload(word, category) {
    const key = `${word}||${category}`

    // Dedup: if already queued, skip
    if (enqueuedSet.has(key)) return

    enqueuedSet.add(key)
    queue.push({ word, category })

    // Start processing if not already running
    if (!isProcessing.value) {
      processLoop()
    }
  }

  /**
   * Returns current queue status for UI display.
   *
   * @returns {{ pending: number, isProcessing: boolean, currentJob: {word: string, category: string} | null }}
   */
  function getQueueStatus() {
    return {
      pending: queue.length,
      isProcessing: isProcessing.value,
      currentJob: currentJob.value
    }
  }

  /**
   * Re-enqueues all words whose audios_blob record has status 'failed'.
   * Typically called from Parent Zone's "Retry All" button.
   */
  async function retryFailed() {
    try {
      const failedRecords = await db.audios_blob
        .where({ status: 'failed' })
        .toArray()

      for (const record of failedRecords) {
        if (record.word && record.category) {
          enqueueDownload(record.word, record.category)
        }
      }
    } catch (err) {
      console.error('Failed to query failed audio records:', err)
    }
  }

  return {
    enqueueDownload,
    getQueueStatus,
    retryFailed,
    isProcessing,
    currentJob,
    enqueuedSet
  }
}
