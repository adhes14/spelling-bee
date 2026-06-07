import { useSpeech } from '@/composables/useSpeech'

export function useLetterAudio() {
  const { speakLetter: speechFallback } = useSpeech()

  /**
   * Play a letter sound from a static MP3 file.
   * Falls back to SpeechSynthesis if the MP3 fails to load
   * (404, network error, or autoplay policy blocks playback).
   *
   * @param {string} letter - The letter to play (case-insensitive)
   * @returns {Promise<void>} Resolves when playback starts or fallback fires
   */
  function playLetter(letter) {
    const lower = letter.toLowerCase()

    // Only handle a-z
    if (!/^[a-z]$/.test(lower)) {
      return Promise.resolve()
    }

    const audio = new Audio(`/audio/letters/${lower}.mp3`)
    const playPromise = audio.play()

    // Older browsers may not return a promise from play()
    if (playPromise === undefined) {
      return Promise.resolve()
    }

    return playPromise.catch((err) => {
      // Fall back to SpeechSynthesis on any failure:
      // - File not found (404)
      // - Network error
      // - Autoplay policy blocked
      console.warn(
        `Letter audio '${lower}' failed (${err.message}), falling back to SpeechSynthesis`
      )
      speechFallback(letter)
    })
  }

  return { playLetter }
}
