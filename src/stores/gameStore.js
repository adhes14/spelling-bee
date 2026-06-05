import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDictionaryStore } from './dictionaryStore'
import { db } from '@/db/db'

export const useGameStore = defineStore('game', () => {
  const dictionaryStore = useDictionaryStore()

  const currentCategory = ref(null)
  const currentSublevel = ref(1) // 1 = Easy, 2 = Medium, 3 = Hard
  const currentWordIndex = ref(0)
  const errorCount = ref(0)
  const gamePhase = ref('idle') // 'idle' (menu), 'playing', 'result'
  const stars = ref(0)

  // Filter words by active category
  const filteredWords = computed(() => {
    if (!currentCategory.value) return []
    const catId = currentCategory.value.id_cat || currentCategory.value.id
    return dictionaryStore.words.filter(w => w.category === catId)
  })

  // Get active word object
  const currentWordObj = computed(() => {
    const list = filteredWords.value
    if (list.length === 0 || currentWordIndex.value >= list.length) return null
    return list[currentWordIndex.value]
  })

  // Set category
  function setCategory(catId) {
    const cat = dictionaryStore.categories.find(c => c.id_cat === catId || c.id === catId)
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

    if (currentWordObj.value) {
      const catId = currentCategory.value.id_cat || currentCategory.value.id
      saveProgress(currentWordObj.value.word, catId, currentSublevel.value, stars.value)
    }

    gamePhase.value = 'result'
  }

  // Save progress to IndexedDB
  async function saveProgress(word, category, sublevel, starsObtained) {
    try {
      const existing = await db.progreso_usuario
        .where({ word, category, sublevel })
        .first()

      if (existing) {
        // Keep the best score
        if (starsObtained > existing.stars) {
          await db.progreso_usuario.update(existing.id, {
            stars: starsObtained,
            completedAt: new Date()
          })
        }
      } else {
        await db.progreso_usuario.add({
          word,
          category,
          sublevel,
          stars: starsObtained,
          completedAt: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to save progress in DB:', error)
    }
  }

  // Get average stars earned for a sublevel in the current category
  async function getSublevelProgress(sublevel) {
    if (!currentCategory.value) return 0
    const catId = currentCategory.value.id_cat || currentCategory.value.id
    try {
      const records = await db.progreso_usuario
        .where({ category: catId, sublevel })
        .toArray()

      if (records.length === 0) return 0
      
      // Calculate average stars
      const sum = records.reduce((acc, r) => acc + r.stars, 0)
      return Math.round(sum / records.length)
    } catch (error) {
      console.error('Error fetching sublevel progress:', error)
      return 0
    }
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
    reset,
    getSublevelProgress
  }
})
