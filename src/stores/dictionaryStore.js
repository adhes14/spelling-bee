import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/db'
import { seedDatabase } from '@/db/seedDatabase'

export const useDictionaryStore = defineStore('dictionary', () => {
  const words = ref([])
  const categories = ref([])
  const isLoading = ref(false)
  const globalSettings = ref({
    wordDifficultyFilter: 'easy', // 'easy' | 'easy,medium' | 'easy,medium,hard'
    sessionWordLimit: 10
  })

  let initPromise = null

  // Initialize DB and load all records
  async function init() {
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      isLoading.value = true
      try {
        // Ensure seed data is populated
        await seedDatabase()
        await loadAll()
        await loadSettings()
      } catch (error) {
        console.error('Failed to initialize dictionary store:', error)
        initPromise = null // Allow retrying if failed
      } finally {
        isLoading.value = false
      }
    })()

    return initPromise
  }

  async function loadSettings() {
    try {
      const filter = await db.configuracion_global.get('word_difficulty_filter')
      const limit = await db.configuracion_global.get('session_word_limit')
      
      if (filter) {
        globalSettings.value.wordDifficultyFilter = filter.value
      } else {
        await db.configuracion_global.put({ key: 'word_difficulty_filter', value: 'easy' })
      }
      
      if (limit) {
        globalSettings.value.sessionWordLimit = Number(limit.value)
      } else {
        await db.configuracion_global.put({ key: 'session_word_limit', value: 10 })
      }
    } catch (error) {
      console.error('Failed to load settings from DB:', error)
    }
  }

  async function updateSettings({ wordDifficultyFilter, sessionWordLimit }) {
    try {
      if (wordDifficultyFilter !== undefined) {
        globalSettings.value.wordDifficultyFilter = wordDifficultyFilter
        await db.configuracion_global.put({ key: 'word_difficulty_filter', value: wordDifficultyFilter })
      }
      if (sessionWordLimit !== undefined) {
        globalSettings.value.sessionWordLimit = Number(sessionWordLimit)
        await db.configuracion_global.put({ key: 'session_word_limit', value: Number(sessionWordLimit) })
      }
    } catch (error) {
      console.error('Failed to update settings in DB:', error)
    }
  }

  // Reloads all categories and words from IndexedDB
  async function loadAll() {
    try {
      const dbCategories = await db.categorias.toArray()
      const dbWords = await db.diccionario_palabras.toArray()

      // Sort categories: seed categories first, then custom ones alphabetically
      categories.value = dbCategories.sort((a, b) => {
        if (a.isCustom === b.isCustom) {
          return a.name.localeCompare(b.name)
        }
        return a.isCustom ? 1 : -1
      })

      // Sort words by word text
      words.value = dbWords.sort((a, b) => a.word.localeCompare(b.word))
    } catch (error) {
      console.error('Failed to load dictionary from DB:', error)
    }
  }

  // Adds a custom word
  async function addWord({ word, category, difficulty }) {
    const cleanWord = word.trim().toLowerCase()
    if (!cleanWord) return null

    // Check if word already exists in this category
    const existing = await db.diccionario_palabras
      .where({ word: cleanWord, category })
      .first()

    if (existing) {
      throw new Error(`The word "${cleanWord}" already exists in the "${category}" category.`)
    }

    const newWordId = await db.diccionario_palabras.add({
      word: cleanWord,
      category,
      difficulty,
      isCustom: true,
      createdAt: new Date()
    })

    await loadAll()
    return newWordId
  }

  // Deletes a custom word
  async function deleteWord(id) {
    await db.diccionario_palabras.delete(id)
    await loadAll()
  }

  // Updates word difficulty
  async function updateWordDifficulty(id, difficulty) {
    await db.diccionario_palabras.update(id, { difficulty })
    await loadAll()
  }

  // Adds a custom category
  async function addCategory({ name, icon, color }) {
    const cleanName = name.trim()
    if (!cleanName) return null

    const id_cat = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')

    // Check if category ID already exists
    const existing = await db.categorias.where({ id_cat }).first()
    if (existing) {
      throw new Error(`A category with the name "${cleanName}" already exists.`)
    }

    const newCatId = await db.categorias.add({
      id_cat,
      name: cleanName,
      icon: icon || '📁',
      color: color || 'var(--color-accent-cyan)',
      isCustom: true
    })

    await loadAll()
    return { id: newCatId, id_cat }
  }

  return {
    words,
    categories,
    isLoading,
    globalSettings,
    init,
    loadAll,
    addWord,
    deleteWord,
    updateWordDifficulty,
    addCategory,
    loadSettings,
    updateSettings
  }
})
