import { db } from './db'
import { words as seedWords, categories as seedCategories } from '@/data/words'

export async function seedDatabase() {
  try {
    // Check if categories table is empty
    const categoryCount = await db.categorias.count()
    if (categoryCount === 0) {
      console.log('Seeding categories database...')
      const categoriesToInsert = seedCategories.map(cat => ({
        id_cat: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isCustom: false
      }))
      await db.categorias.bulkAdd(categoriesToInsert)
      console.log('Categories seeded successfully.')
    }

    // Check if words table is empty
    const wordCount = await db.diccionario_palabras.count()
    if (wordCount === 0) {
      console.log('Seeding words database...')
      const wordsToInsert = seedWords.map(w => ({
        word: w.word.trim().toLowerCase(),
        category: w.category,
        difficulty: w.difficulty,
        isCustom: false,
        createdAt: new Date()
      }))
      await db.diccionario_palabras.bulkAdd(wordsToInsert)
      console.log('Words seeded successfully.')
    }
  } catch (error) {
    console.error('Failed to seed database:', error)
  }
}
