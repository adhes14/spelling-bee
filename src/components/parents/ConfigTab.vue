<template>
  <div class="config-tab-content">
    <div class="config-group">
      <label class="config-label">Word Difficulty Filter:</label>
      <select 
        v-model="wordDifficultyFilter" 
        @change="updateConfig"
        class="select-input"
      >
        <option value="easy">🟢 Easy Words Only (Recommended for beginners)</option>
        <option value="easy,medium">🟡 Easy + Medium Words</option>
        <option value="easy,medium,hard">🔴 All Words (No restrictions)</option>
      </select>
      <p class="config-helper">
        Controls the maximum difficulty level of words shown to children in gameplay.
      </p>
    </div>

    <div class="config-group">
      <label class="config-label">Session Word Limit:</label>
      <div class="slider-container">
        <input 
          type="range" 
          v-model="sessionWordLimit" 
          min="5" 
          max="20" 
          step="1"
          @change="updateConfig"
          class="config-slider"
        />
        <span class="slider-val">{{ sessionWordLimit }} words</span>
      </div>
      <p class="config-helper">
        Defines the maximum number of words per practice session (range: 5 to 20).
      </p>
    </div>

    <div class="config-group">
      <label class="config-label">Score Decay Per Day:</label>
      <div class="slider-container">
        <input 
          type="range" 
          v-model="scoreDecayPerDay" 
          min="1" 
          max="20" 
          step="1"
          @change="updateConfig"
          class="config-slider"
        />
        <span class="slider-val">{{ scoreDecayPerDay }} points/day</span>
      </div>
      <p class="config-helper">
        Defines the amount of score subtracted from practiced words per day (range: 1 to 20).
      </p>
    </div>

    <div class="config-group">
      <label class="config-label">Google TTS API Key (Optional):</label>
      <div class="api-key-row">
        <input 
          :type="showApiKey ? 'text' : 'password'"
          v-model="googleTtsApiKey"
          @blur="saveApiKey"
          placeholder="Paste your Google Cloud TTS API key"
          class="text-input"
          autocomplete="off"
        />
        <button
          type="button"
          class="toggle-vis-btn"
          @click="showApiKey = !showApiKey"
          :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
        >
          {{ showApiKey ? '🙈' : '👁' }}
        </button>
        <button
          type="button"
          class="validate-btn"
          @click="validateApiKey"
          :disabled="validating"
        >
          {{ validating ? 'Testing…' : 'Test' }}
        </button>
      </div>
      <p v-if="validationMessage" class="config-helper" :class="validationStatus">
        {{ validationMessage }}
      </p>
      <p v-else class="config-helper">
        Enables high-quality word pronunciation. Without it, built-in speech is used.
        <br />Get a key at
        <a href="https://cloud.google.com/text-to-speech" target="_blank" rel="noopener">cloud.google.com/text-to-speech</a>
      </p>
    </div>

    <!-- Export & Import Section -->
    <div class="config-group dev-separator">
      <label class="config-label">Backup & Restore:</label>
      
      <!-- Export -->
      <div class="backup-row">
        <button 
          type="button" 
          class="backup-btn export-btn" 
          @click="handleExport" 
          :disabled="exporting"
        >
          {{ exporting ? '📦 Exporting...' : '📥 Export Database & Progress' }}
        </button>
      </div>
      <p v-if="exportMessage" class="config-helper" :class="exportStatus">
        {{ exportMessage }}
      </p>
      
      <!-- Import -->
      <div class="backup-row margin-top-sm">
        <label class="file-input-label">
          📤 Import / Restore Backup
          <input 
            type="file" 
            accept=".zip" 
            @change="handleFileChange" 
            class="hidden-file-input"
          />
        </label>
      </div>

      <!-- Confirmation Panel -->
      <div v-if="selectedFile" class="confirm-panel">
        <p class="confirm-warning">
          ⚠️ <strong>WARNING:</strong> Importing will delete <strong>ALL</strong> current custom words, categories, progress, and settings, and replace them with the data from <code>{{ selectedFile.name }}</code>. This action cannot be undone.
        </p>
        <p class="confirm-instruction">
          To proceed, type <strong>CONFIRM</strong> in the box below:
        </p>
        <input 
          type="text" 
          v-model="confirmText" 
          placeholder="CONFIRM" 
          class="text-input confirm-input"
        />
        <div class="confirm-actions">
          <button 
            type="button" 
            class="confirm-btn cancel-btn" 
            @click="cancelImport"
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="confirm-btn restore-btn" 
            @click="handleImport" 
            :disabled="confirmText !== 'CONFIRM' || importing"
          >
            {{ importing ? 'Restoring...' : 'Restore Backup' }}
          </button>
        </div>
      </div>
      
      <p v-if="importMessage" class="config-helper error">
        {{ importMessage }}
      </p>

      <p class="config-helper">
        Export all of your vocabulary list, custom categories, user stars/progress, and voice logs to a backup ZIP file, or restore from a previously saved backup file.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { db } from '@/db/db'
import { exportDatabase, importDatabase } from '@/utils/exportImport'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['settings-updated'])

const wordDifficultyFilter = ref('easy')
const sessionWordLimit = ref(10)
const scoreDecayPerDay = ref(5)

// Google TTS API key
const googleTtsApiKey = ref('')
const showApiKey = ref(false)
const validating = ref(false)
const validationMessage = ref('')
const validationStatus = ref('')

watch(() => props.settings, (newVal) => {
  if (newVal) {
    wordDifficultyFilter.value = newVal.wordDifficultyFilter || 'easy'
    sessionWordLimit.value = newVal.sessionWordLimit || 10
    scoreDecayPerDay.value = newVal.scoreDecayPerDay || 5
  }
}, { immediate: true, deep: true })

onMounted(async () => {
  // Load saved API key from IndexedDB
  try {
    const record = await db.configuracion_global.get('googleTtsApiKey')
    if (record && record.value) {
      googleTtsApiKey.value = record.value
    }
  } catch (err) {
    // Silently fail — configuracion_global may not exist yet on first run
    console.warn('Could not load Google TTS API key:', err)
  }
})

const updateConfig = () => {
  emit('settings-updated', {
    wordDifficultyFilter: wordDifficultyFilter.value,
    sessionWordLimit: sessionWordLimit.value,
    scoreDecayPerDay: scoreDecayPerDay.value
  })
}

async function saveApiKey() {
  try {
    const key = googleTtsApiKey.value.trim()
    if (key) {
      await db.configuracion_global.put({ key: 'googleTtsApiKey', value: key })
    } else {
      await db.configuracion_global.delete('googleTtsApiKey')
    }
    // Clear validation state when key changes
    validationMessage.value = ''
    validationStatus.value = ''
  } catch (err) {
    console.error('Failed to save Google TTS API key:', err)
  }
}

async function validateApiKey() {
  const key = googleTtsApiKey.value.trim()
  if (!key) {
    validationMessage.value = 'Please enter an API key first.'
    validationStatus.value = 'error'
    return
  }

  validating.value = true
  validationMessage.value = ''
  validationStatus.value = ''

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${encodeURIComponent(key)}`
    )
    if (res.ok) {
      validationMessage.value = 'API key is valid. High-quality TTS is now available.'
      validationStatus.value = 'success'
      // Persist if not already saved
      await saveApiKey()
    } else {
      const data = await res.json().catch(() => ({}))
      const msg = data.error?.message || `HTTP ${res.status}`
      validationMessage.value = `Invalid key: ${msg}`
      validationStatus.value = 'error'
    }
  } catch (err) {
    validationMessage.value = `Network error: ${err.message}`
    validationStatus.value = 'error'
  } finally {
    validating.value = false
  }
}

// Backup & Restore
const exporting = ref(false)
const exportMessage = ref('')
const exportStatus = ref('')

const importing = ref(false)
const selectedFile = ref(null)
const confirmText = ref('')
const importMessage = ref('')

async function handleExport() {
  exporting.value = true
  exportMessage.value = ''
  exportStatus.value = ''
  try {
    await exportDatabase(db)
    exportMessage.value = 'Database exported successfully!'
    exportStatus.value = 'success'
  } catch (err) {
    console.error('Export failed:', err)
    exportMessage.value = `Export failed: ${err.message}`
    exportStatus.value = 'error'
  } finally {
    exporting.value = false
  }
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    confirmText.value = ''
    importMessage.value = ''
  }
}

function cancelImport() {
  selectedFile.value = null
  confirmText.value = ''
  importMessage.value = ''
}

async function handleImport() {
  if (confirmText.value !== 'CONFIRM' || !selectedFile.value) return
  
  importing.value = true
  importMessage.value = ''
  try {
    await importDatabase(db, selectedFile.value)
    alert('Database successfully restored! The page will now reload.')
    window.location.reload()
  } catch (err) {
    console.error('Import failed:', err)
    importMessage.value = `Import failed: ${err.message}`
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.config-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-light);
}

.select-input {
  background: rgba(13, 13, 43, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 12px;
  padding: 0.55rem;
  font-family: var(--font-main);
  font-size: 1rem;
  outline: none;
}

.config-helper {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  line-height: 1.3;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.config-slider {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  accent-color: var(--color-accent-purple);
}

.slider-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent-purple);
  min-width: 80px;
}

.api-key-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.text-input {
  flex: 1;
  background: rgba(13, 13, 43, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 12px;
  padding: 0.55rem;
  font-family: var(--font-main);
  font-size: 1rem;
  outline: none;
}

.text-input::placeholder {
  color: var(--color-text-dim);
}

.toggle-vis-btn {
  background: rgba(13, 13, 43, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 12px;
  padding: 0.5rem 0.65rem;
  font-size: 1.1rem;
  cursor: pointer;
  line-height: 1;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-vis-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.validate-btn {
  background: var(--color-accent-purple);
  border: none;
  color: white;
  border-radius: 12px;
  padding: 0.5rem 1rem;
  font-family: var(--font-main);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.validate-btn:hover {
  opacity: 0.85;
}

.validate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.config-helper.success {
  color: #4ade80;
}

.config-helper.error {
  color: #f87171;
}

.config-helper a {
  color: var(--color-accent-purple);
  text-decoration: underline;
}

.dev-separator {
  margin-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding-top: 1.5rem;
}

.backup-row {
  display: flex;
  gap: 1rem;
}

.margin-top-sm {
  margin-top: 0.5rem;
}

.backup-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--color-text-light);
  border-radius: 12px;
  padding: 0.65rem 1rem;
  font-family: var(--font-main);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
}

.backup-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.backup-btn:active:not(:disabled) {
  transform: translateY(0);
}

.backup-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-input-label {
  background: linear-gradient(135deg, var(--color-accent-purple) 0%, #7c3aed 100%);
  color: white;
  border-radius: 12px;
  padding: 0.65rem 1rem;
  font-family: var(--font-main);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
}

.file-input-label:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.file-input-label:active {
  transform: translateY(0);
}

.hidden-file-input {
  display: none;
}

.confirm-panel {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 14px;
  padding: 1rem;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}

.confirm-warning {
  font-size: 0.9rem;
  color: #fca5a5;
  line-height: 1.4;
}

.confirm-instruction {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-light);
}

.confirm-input {
  text-align: center;
  font-weight: 700;
  letter-spacing: 2px;
  border-color: rgba(239, 68, 68, 0.4);
}

.confirm-input:focus {
  border-color: #ef4444;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
}

.confirm-btn {
  flex: 1;
  border-radius: 10px;
  padding: 0.5rem;
  font-family: var(--font-main);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-light);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.restore-btn {
  background: #ef4444;
  color: white;
}

.restore-btn:hover:not(:disabled) {
  background: #dc2626;
}

.restore-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .config-tab-content {
    gap: 1rem;
  }

  .config-label {
    font-size: 0.95rem;
  }

  .config-helper {
    font-size: 0.85rem;
  }

  .slider-val {
    font-size: 0.95rem;
    min-width: 65px;
  }
}
</style>
