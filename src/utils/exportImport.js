import JSZip from 'jszip'

/**
 * Exports the Dexie database tables to a single ZIP file containing structured JSON and audio files.
 * @param {Dexie} db - The Dexie database instance.
 */
export async function exportDatabase(db) {
  const zip = new JSZip()

  // 1. Fetch data from all tables
  const words = await db.diccionario_palabras.toArray()
  const categories = await db.categorias.toArray()
  const progress = await db.progreso_usuario.toArray()
  const settings = await db.configuracion_global.toArray()
  const album = await db.album_progreso.toArray()
  const audios = await db.audios_blob.toArray()

  // 2. Filter out googleTtsApiKey from settings (never export the secret)
  const filteredSettings = settings.filter(s => s.key !== 'googleTtsApiKey')

  // 3. Process audios: save blobs as separate files in the ZIP, keep metadata in JSON
  const serializedAudios = []
  for (const audio of audios) {
    const serialized = { ...audio }
    if (audio.status === 'ready' && audio.blob) {
      const filename = `audios/${encodeURIComponent(audio.word)}_${encodeURIComponent(audio.category)}.mp3`
      zip.file(filename, audio.blob)
      serialized.blobRef = filename
      delete serialized.blob
    } else {
      serialized.blob = null
    }
    serializedAudios.push(serialized)
  }

  // 4. Create data.json
  const backupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      diccionario_palabras: words,
      categorias: categories,
      progreso_usuario: progress,
      configuracion_global: filteredSettings,
      album_progreso: album,
      audios_blob: serializedAudios
    }
  }

  zip.file('data.json', JSON.stringify(backupData, null, 2))

  // 5. Generate ZIP blob and trigger browser download
  const content = await zip.generateAsync({ type: 'blob' })
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `spelling-bee-backup-${dateStr}.zip`

  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Imports tables from a ZIP file and fully replaces the current database contents.
 * Preserves the device's existing googleTtsApiKey.
 * @param {Dexie} db - The Dexie database instance.
 * @param {File} zipFile - The ZIP file uploaded by the user.
 */
export async function importDatabase(db, zipFile) {
  const zip = await JSZip.loadAsync(zipFile)
  
  const dataJsonFile = zip.file('data.json')
  if (!dataJsonFile) {
    throw new Error('Invalid backup file: data.json not found inside the ZIP.')
  }

  const dataText = await dataJsonFile.async('text')
  const backupData = JSON.parse(dataText)

  if (!backupData.tables || !backupData.version) {
    throw new Error('Invalid backup file: missing tables or version information.')
  }

  const tables = backupData.tables

  // 1. Preserve local TTS API Key
  let localTtsApiKey = null
  try {
    const config = await db.configuracion_global.get('googleTtsApiKey')
    if (config) {
      localTtsApiKey = config.value
    }
  } catch (err) {
    console.warn('Failed to retrieve existing TTS API key:', err)
  }

  // 2. Read and prepare all audio files from ZIP before starting the transaction
  // (to avoid yielding the event loop with non-IndexedDB promises inside the Dexie transaction)
  const audiosToRestore = []
  if (tables.audios_blob) {
    for (const audio of tables.audios_blob) {
      const restored = { ...audio }
      
      // Convert dates
      if (restored.createdAt) restored.createdAt = new Date(restored.createdAt)
      if (restored.lastPlayed) restored.lastPlayed = new Date(restored.lastPlayed)

      // Read blob file from ZIP if present
      if (restored.blobRef) {
        const zipFileEntry = zip.file(restored.blobRef)
        if (zipFileEntry) {
          const arrayBuffer = await zipFileEntry.async('arraybuffer')
          restored.blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
        } else {
          console.warn(`Audio file not found in ZIP: ${restored.blobRef}`)
          restored.blob = null
          restored.status = 'failed'
        }
        delete restored.blobRef
      } else {
        restored.blob = null
      }

      audiosToRestore.push(restored)
    }
  }

  // 3. Clear tables and insert imported data in a transaction
  await db.transaction('rw', [
    db.diccionario_palabras,
    db.categorias,
    db.progreso_usuario,
    db.configuracion_global,
    db.album_progreso,
    db.audios_blob
  ], async () => {
    // Clear all tables
    await db.diccionario_palabras.clear()
    await db.categorias.clear()
    await db.progreso_usuario.clear()
    await db.configuracion_global.clear()
    await db.album_progreso.clear()
    await db.audios_blob.clear()

    // Restore diccionario_palabras
    if (tables.diccionario_palabras) {
      const words = tables.diccionario_palabras.map(w => ({
        ...w,
        createdAt: w.createdAt ? new Date(w.createdAt) : undefined
      }))
      await db.diccionario_palabras.bulkAdd(words)
    }

    // Restore categorias
    if (tables.categorias) {
      await db.categorias.bulkAdd(tables.categorias)
    }

    // Restore progreso_usuario
    if (tables.progreso_usuario) {
      const progress = tables.progreso_usuario.map(p => ({
        ...p,
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        lastPracticedAt: p.lastPracticedAt ? new Date(p.lastPracticedAt) : undefined
      }))
      await db.progreso_usuario.bulkAdd(progress)
    }

    // Restore configuracion_global
    if (tables.configuracion_global) {
      await db.configuracion_global.bulkAdd(tables.configuracion_global)
    }
    // Restore preserved TTS key if it existed
    if (localTtsApiKey !== null) {
      await db.configuracion_global.put({ key: 'googleTtsApiKey', value: localTtsApiKey })
    }

    // Restore album_progreso
    if (tables.album_progreso) {
      const album = tables.album_progreso.map(a => ({
        ...a,
        unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined
      }))
      await db.album_progreso.bulkAdd(album)
    }

    // Restore audios_blob
    if (audiosToRestore.length > 0) {
      await db.audios_blob.bulkAdd(audiosToRestore)
    }
  })
}
