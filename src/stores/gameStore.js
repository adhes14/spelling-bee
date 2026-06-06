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
  const isRetryRound = ref(false)

  const sessionWords = ref([])
  const fullSessionWords = ref([])
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

  // Prepare session words (lowest-score first, shuffle ties)
  async function prepareSession() {
    isRetryRound.value = false
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

    // Shuffle helper
    const shuffle = (arr) => {
      const newArr = [...arr]
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
      }
      return newArr
    }

    try {
      const records = await db.progreso_usuario
        .where({ category: catId, sublevel })
        .toArray()

      const recordMap = new Map(records.map(r => [r.word, r.score || 0]))

      const wordsWithScore = list.map(w => ({
        wordObj: w,
        score: recordMap.get(w.word) || 0
      }))

      // Group words by score to shuffle ties
      const scoreGroups = {}
      wordsWithScore.forEach(item => {
        const s = item.score
        if (!scoreGroups[s]) {
          scoreGroups[s] = []
        }
        scoreGroups[s].push(item.wordObj)
      })

      // Sort scores ascending (lowest score = highest priority)
      const sortedScores = Object.keys(scoreGroups)
        .map(Number)
        .sort((a, b) => a - b)

      let sortedWords = []
      sortedScores.forEach(s => {
        sortedWords = sortedWords.concat(shuffle(scoreGroups[s]))
      })

      sessionWords.value = sortedWords.slice(0, limit)
      fullSessionWords.value = [...sessionWords.value]
      sessionIndex.value = 0
    } catch (error) {
      console.error('Error preparing session words:', error)
      sessionWords.value = shuffle(list).slice(0, limit)
      fullSessionWords.value = [...sessionWords.value]
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
  async function finishWord() {
    let starsObtained = 0
    if (errorCount.value === 0) {
      starsObtained = 3
    } else if (errorCount.value === 1) {
      starsObtained = 2
    } else if (errorCount.value === 2) {
      starsObtained = 1
    } else {
      starsObtained = 0
    }
    stars.value = starsObtained

    if (currentWordObj.value) {
      const catId = currentCategory.value.id_cat || currentCategory.value.id
      const sublevel = currentSublevel.value
      const word = currentWordObj.value.word

      // Only update database progress if it is not a retry round
      if (!isRetryRound.value) {
        // Calculate score increment
        let increment = 0
        if (errorCount.value === 0) {
          increment = 20
        } else if (errorCount.value === 1) {
          increment = 15
        } else if (errorCount.value === 2) {
          increment = 10
        } else if (errorCount.value === 3) {
          increment = 5
        }

        // Fetch current score from DB
        let currentScore = 0
        try {
          const existing = await db.progreso_usuario
            .where({ word, category: catId, sublevel })
            .first()
          if (existing) {
            currentScore = existing.score || 0
          }
        } catch (err) {
          console.error('Error fetching score for finishWord:', err)
        }

        const newScore = Math.min(100, currentScore + increment)
        await saveProgress(word, catId, sublevel, newScore)
      }
      sessionScores.value[word] = Math.max(sessionScores.value[word] || 0, starsObtained)
    }

    gamePhase.value = 'result'
  }

  // Save progress to IndexedDB (overwrite with latest score)
  async function saveProgress(word, category, sublevel, newScore) {
    try {
      const existing = await db.progreso_usuario
        .where({ word, category, sublevel })
        .first()

      if (existing) {
        await db.progreso_usuario.update(existing.id, {
          score: newScore,
          lastPracticedAt: new Date()
        })
      } else {
        await db.progreso_usuario.add({
          word,
          category,
          sublevel,
          score: newScore,
          lastPracticedAt: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to save progress in DB:', error)
    }
  }

  // Get sublevel progress (percentage based on average score of active/visible words)
  async function getSublevelProgress(sublevel) {
    if (!currentCategory.value) return { percent: 0, rated: 0, total: 0 }
    const catId = currentCategory.value.id_cat || currentCategory.value.id

    const list = filteredWords.value
    if (list.length === 0) return { percent: 0, rated: 0, total: 0 }

    try {
      const records = await db.progreso_usuario
        .where({ category: catId, sublevel })
        .toArray()

      const recordMap = new Map(records.map(r => [r.word, r.score || 0]))

      let totalScore = 0
      let ratedCount = 0

      for (const w of list) {
        const scoreVal = recordMap.get(w.word)
        if (scoreVal !== undefined) {
          ratedCount++
          totalScore += scoreVal
        }
      }

      const percent = Math.round(totalScore / list.length)
      return { percent, rated: ratedCount, total: list.length }
    } catch (error) {
      console.error('Error fetching sublevel progress:', error)
      return { percent: 0, rated: 0, total: 0 }
    }
  }

  // Get category progress (percentage based on average score across all 3 levels for all active words)
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
      const recordMap = new Map(records.map(r => [`${r.word}||${r.sublevel}`, r.score || 0]))

      let totalScore = 0
      const totalPossibleEntries = list.length * 3

      for (const w of list) {
        for (let sl = 1; sl <= 3; sl++) {
          const scoreVal = recordMap.get(`${w.word}||${sl}`) || 0
          totalScore += scoreVal
        }
      }

      const percent = Math.round(totalScore / totalPossibleEntries)
      return { percent, hasPlayed }
    } catch (error) {
      console.error('Error fetching category progress:', error)
      return { percent: 0, hasPlayed: false }
    }
  }

  // Apply linear score decay based on lastPracticedAt
  async function applyDecayOnStartup(decayPerDay) {
    try {
      const records = await db.progreso_usuario.toArray()
      const now = new Date()
      
      for (const record of records) {
        if (!record.lastPracticedAt) continue
        
        const lastPracticed = new Date(record.lastPracticedAt)
        const diffTime = Math.abs(now - lastPracticed)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays > 0) {
          const decayAmount = diffDays * decayPerDay
          const newScore = Math.max(0, (record.score || 0) - decayAmount)
          
          if (newScore !== record.score) {
            await db.progreso_usuario.update(record.id, {
              score: newScore,
              lastPracticedAt: now
            })
          }
        }
      }
      console.log('Decay applied successfully on startup.')
    } catch (error) {
      console.error('Failed to apply score decay on startup:', error)
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

  // Start retry round with a list of failed words
  function startRetryRound(failedWordObjs) {
    isRetryRound.value = true
    sessionWords.value = [...failedWordObjs]
    sessionIndex.value = 0
  }

  // End retry round
  function endRetryRound() {
    isRetryRound.value = false
    sessionWords.value = [...fullSessionWords.value]
  }

  // Reset
  function reset() {
    currentCategory.value = null
    currentSublevel.value = 1
    sessionIndex.value = 0
    sessionWords.value = []
    fullSessionWords.value = []
    errorCount.value = 0
    gamePhase.value = 'idle'
    stars.value = 0
    isRetryRound.value = false
  }

  return {
    currentCategory,
    currentSublevel,
    currentWordIndex,
    errorCount,
    gamePhase,
    stars,
    isRetryRound,
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
    startRetryRound,
    endRetryRound,
    nextWord,
    reset,
    getSublevelProgress,
    applyDecayOnStartup
  }
})
