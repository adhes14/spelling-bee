import { db } from '@/db/db'

export const VOICE_PRIORITY = [
  'en-US-Neural2-F',
  'en-US-Neural2-A',
  'en-US-Standard-C'
]

const API_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

/**
 * Google Cloud TTS API client.
 *
 * Reads the API key directly from IndexedDB (configuracion_global) at call time
 * to minimize the secret's window of exposure. Never enters Pinia reactive state.
 *
 * @param {string}  word          - The word text to synthesize.
 * @param {string[]} [voicePriority] - Optional voice priority override (defaults to VOICE_PRIORITY).
 * @returns {Promise<{blob: Blob, voiceName: string, format: string}>}
 * @throws {Error} NO_API_KEY  - No API key configured in IndexedDB.
 * @throws {Error} AUTH_ERROR  - Invalid or revoked API key (HTTP 401/403).
 * @throws {Error} QUOTA_ERROR - Rate limit or quota exceeded (HTTP 429).
 * @throws {Error} NETWORK_ERROR - Offline or CORS failure.
 * @throws {Error} API_ERROR   - Other non-retryable API errors (HTTP 4xx/5xx).
 */
export function useGoogleTTS() {
  async function fetchTtsAudio(word, voicePriority) {
    // 1. Retrieve API key from IndexedDB
    const config = await db.configuracion_global.get('googleTtsApiKey')
    if (!config || !config.value || config.value.trim() === '') {
      throw new Error('NO_API_KEY')
    }

    const apiKey = config.value.trim()
    const voices = voicePriority || VOICE_PRIORITY

    let lastError = null

    // 2. Try voices in priority order
    for (const voiceName of voices) {
      try {
        const url = `${API_ENDPOINT}?key=${encodeURIComponent(apiKey)}`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: { text: word },
            voice: {
              languageCode: 'en-US',
              name: voiceName
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 0.85
            }
          })
        })

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          const statusMessage = `Google TTS API error: HTTP ${response.status}${errorBody ? ' - ' + errorBody : ''}`

          if (response.status === 401 || response.status === 403) {
            throw new Error(`AUTH_ERROR: ${statusMessage}`)
          }
          if (response.status === 429) {
            throw new Error(`QUOTA_ERROR: ${statusMessage}`)
          }
          throw new Error(`API_ERROR: ${statusMessage}`)
        }

        const data = await response.json()

        if (!data.audioContent) {
          throw new Error('API_ERROR: Response missing audioContent')
        }

        // Decode base64-encoded MP3 audio
        const binaryString = atob(data.audioContent)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        const blob = new Blob([bytes], { type: 'audio/mpeg' })

        return { blob, voiceName, format: 'audio/mp3' }
      } catch (err) {
        lastError = err

        // Auth errors are fatal — no point trying other voices
        if (err.message.startsWith('AUTH_ERROR')) {
          throw err
        }

        // Network errors: try next voice (same endpoint, different payload)
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          lastError = new Error(`NETWORK_ERROR: ${err.message}`)
          continue
        }

        // Other errors: try next voice
        continue
      }
    }

    // All voices exhausted
    throw lastError || new Error('API_ERROR: All voices failed with unknown error')
  }

  return { fetchTtsAudio }
}
