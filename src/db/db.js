import Dexie from 'dexie'

export const db = new Dexie('SpellingBeeDatabase')

db.version(1).stores({
  diccionario_palabras: '++id, word, category, difficulty, isCustom, createdAt',
  categorias: '++id, id_cat, name, icon, color, isCustom',
  progreso_usuario: '++id, word, category, sublevel, stars, completedAt',
  audios_blob: '++id, word'
})

db.version(2).stores({
  progreso_usuario: '++id, word, category, sublevel, stars, completedAt, [word+category+sublevel]',
  configuracion_global: 'key'
})

// Request persistent storage
if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persisted) => {
    if (persisted) {
      console.log('Storage persistence granted.')
    } else {
      console.log('Storage persistence not granted. Storage may be cleared under pressure.')
    }
  }).catch((err) => {
    console.warn('Storage persistence request failed:', err)
  })
}
