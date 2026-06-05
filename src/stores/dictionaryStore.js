import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/db'
import { seedDatabase } from '@/db/seedDatabase'

export const useDictionaryStore = defineStore('dictionary', () => {
  const words = ref([])
  const categories = ref([])
  const isLoading = ref(false)

  // Initialize DB and load all records
  async function init() {
    isLoading.value = true
    try {
      // Ensure seed data is populated
      await seedDatabase()
      await loadAll()
    } catch (error) {
      console.error('Failed to initialize dictionary store:', error)
    } finally {
      isLoading.value = false
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
    init,
    loadAll,
    addWord,
    deleteWord,
    updateWordDifficulty,
    addCategory
  }
})
