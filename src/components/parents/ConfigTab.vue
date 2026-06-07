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
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { db } from '@/db/db'

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
