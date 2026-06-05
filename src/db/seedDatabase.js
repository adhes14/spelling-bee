import { db } from './db'
import { words as seedWords, categories as seedCategories } from '@/data/words'

export async function seedDatabase() {
  try {
    await db.transaction('rw', [db.categorias, db.diccionario_palabras], async () => {
      // 1. Deduplicate existing categories
      const existingCategories = await db.categorias.toArray()
      const categoriesByCatId = {}
      const categoryIdsToDelete = []

      for (const cat of existingCategories) {
        const catId = cat.id_cat
        if (!categoriesByCatId[catId]) {
          categoriesByCatId[catId] = cat
        } else {
          // If duplicate found, keep the first one and plan to delete this one
          categoryIdsToDelete.push(cat.id)
        }
      }

      if (categoryIdsToDelete.length > 0) {
        console.log(`Cleaning up ${categoryIdsToDelete.length} duplicate category entries...`)
        await db.categorias.bulkDelete(categoryIdsToDelete)
      }

      // 2. Seed missing categories
      const existingCatIds = new Set(Object.keys(categoriesByCatId))
      const categoriesToInsert = []
      for (const cat of seedCategories) {
        if (!existingCatIds.has(cat.id)) {
          categoriesToInsert.push({
            id_cat: cat.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            isCustom: false
          })
        }
      }

      if (categoriesToInsert.length > 0) {
        console.log(`Seeding ${categoriesToInsert.length} missing categories...`)
        await db.categorias.bulkAdd(categoriesToInsert)
        console.log('Categories seeded successfully.')
      }

      // 3. Deduplicate existing words
      const existingWords = await db.diccionario_palabras.toArray()
      const wordsByKey = {}
      const wordIdsToDelete = []

      for (const w of existingWords) {
        const key = `${w.word.trim().toLowerCase()}||${w.category}`
        if (!wordsByKey[key]) {
          wordsByKey[key] = w
        } else {
          // Keep the first one and plan to delete this duplicate
          wordIdsToDelete.push(w.id)
        }
      }

      if (wordIdsToDelete.length > 0) {
        console.log(`Cleaning up ${wordIdsToDelete.length} duplicate word entries...`)
        await db.diccionario_palabras.bulkDelete(wordIdsToDelete)
      }

      // 4. Seed missing words
      const existingWordKeys = new Set(Object.keys(wordsByKey))
      const wordsToInsert = []
      for (const w of seedWords) {
        const key = `${w.word.trim().toLowerCase()}||${w.category}`
        if (!existingWordKeys.has(key)) {
          wordsToInsert.push({
            word: w.word.trim().toLowerCase(),
            category: w.category,
            difficulty: w.difficulty,
            isCustom: false,
            createdAt: new Date()
          })
        }
      }

      if (wordsToInsert.length > 0) {
        console.log(`Seeding ${wordsToInsert.length} missing words...`)
        await db.diccionario_palabras.bulkAdd(wordsToInsert)
        console.log('Words seeded successfully.')
      }
    })
  } catch (error) {
    console.error('Failed to seed database:', error)
  }
}
