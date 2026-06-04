<template>
  <div class="game-view">
    <!-- Game Header: Back Button, Progress Info, and Errors -->
    <header class="game-header">
      <button class="btn-back" @click="confirmQuit">
        🏠
      </button>
      
      <div class="word-progress-badge">
        Palabra {{ gameStore.currentWordIndex + 1 }} de {{ gameStore.filteredWords.length }}
      </div>

      <ErrorCounter :count="gameStore.errorCount" />
    </header>

    <!-- Game Arena (60% Height) -->
    <main class="game-arena">
      <!-- Active Level Indicator badge -->
      <div class="level-indicator" :class="`level-${gameStore.currentSublevel}`">
        Subnivel {{ gameStore.currentSublevel }} - {{ levelName }}
      </div>

      <!-- Play Word Audio Button -->
      <div class="audio-trigger-wrapper">
        <AudioButton :word="wordString" />
        <p class="audio-hint">Toca para escuchar</p>
      </div>

      <!-- Gameplay layout -->
      <div class="play-field" :class="{ 'shake-animation': shakeActive }">
        <!-- Sublevel 1 and 2: Drag & Drop Slots -->
        <DropZone 
          v-if="gameStore.currentSublevel <= 2"
          :word="wordString"
          :solved-slots="solvedSlots"
          :active-slot-index="activeSlotIndex"
          @letter-dropped="handleLetterDrop"
        />

        <!-- Sublevel 3: Notebook writing line -->
        <WritingLine 
          v-else
          :value="typedText"
          placeholder="Escribe la palabra..."
        />
      </div>
    </main>

    <!-- Game Controls / Input Area (40% Height) -->
    <footer class="game-controls">
      <!-- Sublevel 1 and 2: Letters Pool -->
      <LetterPool 
        v-if="gameStore.currentSublevel <= 2"
        :letters="poolLetters"
      />

      <!-- Sublevel 3: Virtual Keyboard -->
      <Keyboard 
        v-else
        @key-press="handleKeyboardPress"
      />
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useSpeech } from '@/composables/useSpeech'
import { useAudioFeedback } from '@/composables/useAudioFeedback'

import ErrorCounter from '@/components/game/ErrorCounter.vue'
import DropZone from '@/components/game/DropZone.vue'
import LetterPool from '@/components/game/LetterPool.vue'
import WritingLine from '@/components/game/WritingLine.vue'
import Keyboard from '@/components/game/Keyboard.vue'
import AudioButton from '@/components/ui/AudioButton.vue'

const router = useRouter()
const gameStore = useGameStore()
const { speakWord, speakLetter } = useSpeech()
const { playSuccessSound, playErrorSound, playClickSound } = useAudioFeedback()

const wordString = computed(() => gameStore.currentWordObj?.word || '')
const levelName = computed(() => {
  if (gameStore.currentSublevel === 1) return 'Fácil'
  if (gameStore.currentSublevel === 2) return 'Medio'
  return 'Avanzado'
})

// Sublevel 1 & 2 states
const solvedSlots = ref({})
const activeSlotIndex = ref(0)
const poolLetters = ref([])

// Sublevel 3 states
const typedText = ref('')

// Shake state
const shakeActive = ref(false)

// Generate letter pool (shuffled word letters + distractors if level 2)
const setupGame = () => {
  solvedSlots.value = {}
  activeSlotIndex.value = 0
  typedText.value = ''
  shakeActive.value = false

  const word = wordString.value
  if (!word) return

  // Initialize solved map. Spaces are pre-solved so the user doesn't drag/type them.
  for (let i = 0; i < word.length; i++) {
    if (word[i] === ' ') {
      solvedSlots.value[i] = true
    } else {
      solvedSlots.value[i] = false
    }
  }

  if (gameStore.currentSublevel <= 2) {
    // Collect letters of the word (excluding spaces)
    const lettersArr = word
      .split('')
      .map((l, index) => ({
        id: `letter-${l}-${index}`,
        letter: l,
        isDistractor: false
      }))
      .filter(item => item.letter !== ' ')

    // Add distractors for level 2
    if (gameStore.currentSublevel === 2) {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'
      const wordLetters = word.toLowerCase()
      let distractorsCount = 3 // 3 distractors
      
      // Filter out alphabet letters present in word to ensure clear discrimination
      const availableDistractors = alphabet
        .split('')
        .filter(l => !wordLetters.includes(l))

      for (let i = 0; i < distractorsCount; i++) {
        if (availableDistractors.length === 0) break
        const randomIndex = Math.floor(Math.random() * availableDistractors.length)
        const distLetter = availableDistractors.splice(randomIndex, 1)[0]
        
        lettersArr.push({
          id: `distractor-${distLetter}-${i}`,
          letter: distLetter,
          isDistractor: true
        })
      }
    }

    // Shuffle letters
    poolLetters.value = shuffleArray(lettersArr)
  }

  findNextSlot()

  // Proactively say the word shortly after view setup
  setTimeout(() => {
    speakWord(word)
  }, 600)
}

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
  const newArr = [...arr]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
  }
  return newArr
}

// Sublevel 1 & 2 logic: handle dropped letter
const handleLetterDrop = ({ index, letter }) => {
  const correctLetter = wordString.value[index]

  if (letter.toLowerCase() === correctLetter.toLowerCase()) {
    // Correct!
    solvedSlots.value[index] = true
    playClickSound()
    speakLetter(letter)

    // Remove letter from pool
    poolLetters.value = poolLetters.value.filter(item => {
      // Find the first instance of this letter in pool and remove it
      return !(item.letter.toLowerCase() === letter.toLowerCase() && !item.isUsed)
    })

    // Advance active slot index
    findNextSlot()

    // Check game completed
    checkSublevelCompleted()
  } else {
    // Incorrect drop!
    triggerShake()
    playErrorSound()
    gameStore.incrementError()
  }
}

const findNextSlot = () => {
  const len = wordString.value.length
  for (let i = 0; i < len; i++) {
    if (!solvedSlots.value[i]) {
      activeSlotIndex.value = i
      return
    }
  }
  activeSlotIndex.value = len // All solved
}

const checkSublevelCompleted = () => {
  const allSolved = Object.values(solvedSlots.value).every(v => v === true)
  if (allSolved) {
    playSuccessSound()
    setTimeout(() => {
      gameStore.finishWord()
      router.push({ name: 'result' })
    }, 1200)
  }
}

// Sublevel 3 logic: Keyboard presses
const handleKeyboardPress = (keyValue) => {
  const word = wordString.value

  if (keyValue === 'backspace') {
    typedText.value = typedText.value.slice(0, -1)
  } else if (keyValue === 'enter') {
    // Submit check
    if (typedText.value.toLowerCase() === word.toLowerCase()) {
      // Correct spelling!
      playSuccessSound()
      setTimeout(() => {
        gameStore.finishWord()
        router.push({ name: 'result' })
      }, 1200)
    } else {
      // Incorrect spelling!
      triggerShake()
      playErrorSound()
      gameStore.incrementError()
      typedText.value = '' // Clear input as per specs
    }
  } else {
    // Letter keys
    if (typedText.value.length < word.length) {
      typedText.value += keyValue
    }
  }
}

const triggerShake = () => {
  shakeActive.value = true
  setTimeout(() => {
    shakeActive.value = false
  }, 350)
}

const confirmQuit = () => {
  if (confirm('¿Quieres salir al menú principal? Perderás el progreso de esta palabra.')) {
    gameStore.reset()
    router.push({ name: 'home' })
  }
}

// Watch word changes
watch(() => wordString.value, () => {
  setupGame()
})

onMounted(() => {
  setupGame()
})
</script>

<style scoped>
.game-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 1;
}

.game-header {
  width: 100%;
  padding: calc(0.75rem + var(--safe-area-top)) 1rem 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(13, 13, 43, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-back {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 1.15rem;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  color: var(--color-text-light);
  line-height: 1;
  transition: transform 0.1s ease, background 0.2s ease;
}

.btn-back:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.15);
}

.word-progress-badge {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-dim);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
}

.game-arena {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: 1rem;
}

.level-indicator {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.25rem 0.75rem;
  border-radius: 10px;
  color: white;
}

.level-1 { background-color: var(--color-accent-cyan); }
.level-2 { background-color: var(--color-accent-pink); }
.level-3 { background-color: var(--color-accent-purple); }

.audio-trigger-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.audio-hint {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  font-weight: 600;
}

.play-field {
  width: 100%;
  display: flex;
  justify-content: center;
  transition: transform 0.3s ease;
}

/* Shake styling */
.shake-animation {
  animation: shake 0.35s ease-in-out;
}

.game-controls {
  width: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
</style>
