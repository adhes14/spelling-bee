import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { words, categories } from '@/data/words'

export const useGameStore = defineStore('game', () => {
  const currentCategory = ref(null)
  const currentSublevel = ref(1) // 1 = Easy, 2 = Medium, 3 = Hard
  const currentWordIndex = ref(0)
  const errorCount = ref(0)
  const gamePhase = ref('idle') // 'idle' (menu), 'playing', 'result'
  const stars = ref(0)

  // Filter words by active category
  const filteredWords = computed(() => {
    if (!currentCategory.value) return []
    return words.filter(w => w.category === currentCategory.value.id)
  })

  // Get active word object
  const currentWordObj = computed(() => {
    const list = filteredWords.value
    if (list.length === 0 || currentWordIndex.value >= list.length) return null
    return list[currentWordIndex.value]
  })

  // Set category
  function setCategory(catId) {
    const cat = categories.find(c => c.id === catId)
    currentCategory.value = cat || null
    currentWordIndex.value = 0
  }

  // Set sublevel
  function setSublevel(level) {
    currentSublevel.value = level
  }

  // Start playing a word
  function startWord() {
    errorCount.value = 0
    stars.value = 0
    gamePhase.value = 'playing'
  }

  // Increment error
  function incrementError() {
    errorCount.value++
  }

  // Finish word spelling
  function finishWord() {
    // Calculate stars:
    // 0 errors = 3 stars (Gold)
    // 1-2 errors = 2 stars (Silver)
    // 3+ errors = 1 star (Bronze)
    if (errorCount.value === 0) {
      stars.value = 3
    } else if (errorCount.value <= 2) {
      stars.value = 2
    } else {
      stars.value = 1
    }
    gamePhase.value = 'result'
  }

  // Next word
  function nextWord() {
    const list = filteredWords.value
    if (currentWordIndex.value < list.length - 1) {
      currentWordIndex.value++
      startWord()
    } else {
      // Loop back to the first word
      currentWordIndex.value = 0
      startWord()
    }
  }

  // Reset
  function reset() {
    currentCategory.value = null
    currentSublevel.value = 1
    currentWordIndex.value = 0
    errorCount.value = 0
    gamePhase.value = 'idle'
    stars.value = 0
  }

  return {
    currentCategory,
    currentSublevel,
    currentWordIndex,
    errorCount,
    gamePhase,
    stars,
    filteredWords,
    currentWordObj,
    setCategory,
    setSublevel,
    startWord,
    incrementError,
    finishWord,
    nextWord,
    reset
  }
})
