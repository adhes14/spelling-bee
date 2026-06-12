import { defineStore } from 'pinia'
import { db } from '@/db/db'
import { useGameStore } from './gameStore'
import { categories } from '@/data/words'

export const useAlbumStore = defineStore('album', () => {
  const gameStore = useGameStore()

  // Checks progress for the specified category and sublevel, and unlocks the piece if progress is 100%
  async function checkAndUnlockPiece(categoryId, sublevel) {
    const progress = await gameStore.getSublevelProgress(sublevel)
    if (progress.percent >= 100) {
      const existing = await db.album_progreso
        .where('[category+sublevel]')
        .equals([categoryId, sublevel])
        .first()
      
      if (!existing) {
        await db.album_progreso.add({
          category: categoryId,
          sublevel: Number(sublevel),
          unlockedAt: new Date()
        })
        return true
      }
    }
    return false
  }

  // Returns array of 4 pieces for a category
  async function getAlbumForCategory(categoryId) {
    const unlockedRecords = await db.album_progreso
      .where('category')
      .equals(categoryId)
      .toArray()
    
    const unlockedMap = new Map(unlockedRecords.map(r => [r.sublevel, r.unlockedAt]))
    
    const pieces = []
    for (let sl = 1; sl <= 4; sl++) {
      const unlockedAt = unlockedMap.get(sl) || null
      pieces.push({
        sublevel: sl,
        unlocked: !!unlockedAt,
        unlockedAt
      })
    }
    return pieces
  }

  // Returns the album data for all categories
  async function getAllAlbum() {
    const allUnlocked = await db.album_progreso.toArray()
    // Group by category and sublevel
    const unlockedSet = new Set(allUnlocked.map(r => `${r.category}||${r.sublevel}`))
    
    const albumData = categories.map(cat => {
      const pieces = []
      let unlockedCount = 0
      for (let sl = 1; sl <= 4; sl++) {
        const unlocked = unlockedSet.has(`${cat.id}||${sl}`)
        if (unlocked) unlockedCount++
        pieces.push({
          sublevel: sl,
          unlocked
        })
      }
      return {
        ...cat,
        pieces,
        unlockedCount
      }
    })
    
    return albumData
  }

  return {
    checkAndUnlockPiece,
    getAlbumForCategory,
    getAllAlbum
  }
})
