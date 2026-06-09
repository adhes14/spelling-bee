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

  /**
   * Play the letter names of a word sequentially with 2000ms gaps.
   * Letters [a-zA-Z] are spoken via playLetter, spaces insert a
   * silent 2000ms gap, and any other character is skipped.
   *
   * @param {string} word - The word whose letters to spell
   * @returns {{ promise: Promise<void>, timers: number[] }} Promise that
   *   resolves after all letters are spoken, plus an array of setTimeout
   *   IDs for cancellation via clearTimeout.
   */
  function playLetterSequence(word) {
    const timers = []
    return {
      promise: new Promise((resolve) => {
        let delay = 0
        for (const ch of word) {
          if (ch === ' ') {
            delay += 2000
          } else if (/^[a-z]$/i.test(ch)) {
            const t = setTimeout(() => playLetter(ch), delay)
            timers.push(t)
            delay += 2000
          }
          // non-letter, non-space → skip (catalog has none)
        }
        const t = setTimeout(resolve, delay)
        timers.push(t)
      }),
      timers
    }
  }

  return { playLetter, playLetterSequence }
}
