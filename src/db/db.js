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

db.version(3).stores({
  progreso_usuario: '++id, word, category, sublevel, score, lastPracticedAt, [word+category+sublevel]'
}).upgrade(async tx => {
  await tx.table('progreso_usuario').clear()
})

db.version(4).stores({
  audios_blob: '++id, word, category, status, [word+category]'
}).upgrade(async tx => {
  // Existing v1-v3 records have only {id, word}. The audios_blob table was
  // defined but never used in prior versions. Clear it to avoid schema
  // mismatch with the new required fields (voiceName, format, blob, etc.).
  await tx.table('audios_blob').clear()
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
