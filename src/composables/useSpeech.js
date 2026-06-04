import { ref, onMounted } from 'vue'

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// We store the selected English voice
let englishVoice = null

function loadVoices() {
  if (!isSupported) return
  const voices = window.speechSynthesis.getVoices()
  // Try to find a premium/natural English voice first, then any English, then fallback
  englishVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                 voices.find(v => v.lang === 'en-US') ||
                 voices.find(v => v.lang.startsWith('en')) ||
                 voices[0]
}

if (isSupported) {
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices
  }
  loadVoices()
}

export function useSpeech() {
  const speaking = ref(false)

  const speak = (text, rate = 0.8) => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported in this browser.')
      return
    }

    // Cancel active speech to prevent queuing lag
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = rate // Slightly slower for kids to hear clearly
    
    if (englishVoice) {
      utterance.voice = englishVoice
    }

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

  const speakWord = (word) => {
    speak(word, 0.75) // even slower for the target spelling word
  }

  const speakLetter = (letter) => {
    // Single letters can sometimes sound too short or incorrect, 
    // but en-US synthesis usually handles capitalized single letters well.
    speak(letter.toUpperCase(), 0.9)
  }

  return {
    isSupported,
    speaking,
    speakWord,
    speakLetter
  }
}
