import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDictionaryStore } from './dictionaryStore'
import { db } from '@/db/db'

export const useGameStore = defineStore('game', () => {
  const dictionaryStore = useDictionaryStore()

  const currentCategory = ref(null)
  const currentSublevel = ref(1) // 1 = Easy, 2 = Medium, 3 = Hard
  const sessionIndex = ref(0)
  const currentWordIndex = computed(() => sessionIndex.value)
  const errorCount = ref(0)
  const gamePhase = ref('idle') // 'idle' (menu), 'playing', 'result'
  const stars = ref(0)

  const sessionWords = ref([])
  const sessionScores = ref({})

  const isSessionComplete = computed(() => {
    return sessionWords.value.length > 0 && sessionIndex.value >= sessionWords.value.length
  })

  // Filter words by active category and word difficulty filter
  const filteredWords = computed(() => {
    if (!currentCategory.value) return []
    const catId = currentCategory.value.id_cat || currentCategory.value.id
    const allowedDifficulties = (dictionaryStore.globalSettings?.wordDifficultyFilter || 'easy').split(',')
    return dictionaryStore.words.filter(w => w.category === catId && allowedDifficulties.includes(w.difficulty))
  })

  // Get active word object
  const currentWordObj = computed(() => {
    const list = sessionWords.value
    if (list.length === 0 || sessionIndex.value >= list.length) return null
    return list[sessionIndex.value]
  })

  // Set category
  function setCategory(catId) {
    const cat = dictionaryStore.categories.find(c => c.id_cat === catId || c.id === catId)
    currentCategory.value = cat || null
    sessionIndex.value = 0
    sessionWords.value = []
  }

  // Set sublevel
  function setSublevel(level) {
    currentSublevel.value = level
  }

  // Prepare session words (N lowest-rated first, shuffle ties)
  async function prepareSession() {
    if (!currentCategory.value) return
    const catId = currentCategory.value.id_cat || currentCategory.value.id
    const sublevel = currentSublevel.value
    const limit = dictionaryStore.globalSettings?.sessionWordLimit || 10
    sessionScores.value = {}

    const list = filteredWords.value
    if (list.length === 0) {
      sessionWords.value = []
      sessionIndex.value = 0
      return
    }

    try {
      const records = await db.progreso_usuario
        .where({ category: catId, sublevel })
        .toArray()

      const recordMap = new Map(records.map(r => [r.word, r.stars]))

      const wordsWithRating = list.map(w => ({
        wordObj: w,
        stars: recordMap.get(w.word) || 0
      }))

      // Group by rating (0, 1, 2, 3)
      const groups = { 0: [], 1: [], 2: [], 3: [] }
      wordsWithRating.forEach(item => {
        const s = item.stars
        if (groups[s] !== undefined) {
          groups[s].push(item.wordObj)
        } else {
          groups[0].push(item.wordObj)
        }
      })

      // Shuffle helper
      const shuffle = (arr) => {
        const newArr = [...arr]
        for (let i = newArr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
        }
        return newArr
      }

      const sortedWords = [
        ...shuffle(groups[0]),
        ...shuffle(groups[1]),
        ...shuffle(groups[2]),
        ...shuffle(groups[3])
      ]

      sessionWords.value = sortedWords.slice(0, limit)
      sessionIndex.value = 0
    } catch (error) {
      console.error('Error preparing session words:', error)
      sessionWords.value = list.slice(0, limit)
      sessionIndex.value = 0
    }
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
      sessionScores.value[currentWordObj.value.word] = stars.value
    }

    gamePhase.value = 'result'
  }

  // Save progress to IndexedDB (overwrite with latest score)
  async function saveProgress(word, category, sublevel, starsObtained) {
    try {
      const existing = await db.progreso_usuario
        .where({ word, category, sublevel })
        .first()

      if (existing) {
        await db.progreso_usuario.update(existing.id, {
          stars: starsObtained,
          completedAt: new Date()
        })
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

  // Get sublevel progress (percentage of active/visible words with 3 stars)
  async function getSublevelProgress(sublevel) {
    if (!currentCategory.value) return { percent: 0, rated: 0, total: 0 }
    const catId = currentCategory.value.id_cat || currentCategory.value.id

    const list = filteredWords.value
    if (list.length === 0) return { percent: 0, rated: 0, total: 0 }

    try {
      const records = await db.progreso_usuario
        .where({ category: catId, sublevel })
        .toArray()

      const recordMap = new Map(records.map(r => [r.word, r.stars]))

      let threeStarsCount = 0
      let ratedCount = 0

      for (const w of list) {
        const starsVal = recordMap.get(w.word)
        if (starsVal !== undefined) {
          ratedCount++
          if (starsVal === 3) {
            threeStarsCount++
          }
        }
      }

      const percent = Math.round((threeStarsCount / list.length) * 100)
      return { percent, rated: ratedCount, total: list.length }
    } catch (error) {
      console.error('Error fetching sublevel progress:', error)
      return { percent: 0, rated: 0, total: 0 }
    }
  }

  // Get category progress (percentage of 3-star entries over all 3 levels for all active words)
  async function getCategoryProgress(cat) {
    const catId = cat.id_cat || cat.id
    const allowedDifficulties = (dictionaryStore.globalSettings?.wordDifficultyFilter || 'easy').split(',')
    const list = dictionaryStore.words.filter(w => w.category === catId && allowedDifficulties.includes(w.difficulty))

    if (list.length === 0) return { percent: 0, hasPlayed: false }

    try {
      const records = await db.progreso_usuario
        .where({ category: catId })
        .toArray()

      const hasPlayed = records.length > 0
      let threeStarsCount = 0

      const visibleWordSet = new Set(list.map(w => w.word))

      for (const r of records) {
        if (visibleWordSet.has(r.word) && r.stars === 3) {
          threeStarsCount++
        }
      }

      const totalPossible = list.length * 3
      const percent = Math.round((threeStarsCount / totalPossible) * 100)
      return { percent, hasPlayed }
    } catch (error) {
      console.error('Error fetching category progress:', error)
      return { percent: 0, hasPlayed: false }
    }
  }

  // Next word
  function nextWord() {
    const list = sessionWords.value
    if (sessionIndex.value < list.length - 1) {
      sessionIndex.value++
      startWord()
    } else {
      sessionIndex.value = list.length // mark complete
    }
  }

  // Reset
  function reset() {
    currentCategory.value = null
    currentSublevel.value = 1
    sessionIndex.value = 0
    sessionWords.value = []
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
    sessionWords,
    sessionIndex,
    sessionScores,
    isSessionComplete,
    setCategory,
    setSublevel,
    prepareSession,
    getCategoryProgress,
    startWord,
    incrementError,
    finishWord,
    nextWord,
    reset,
    getSublevelProgress
  }
})
