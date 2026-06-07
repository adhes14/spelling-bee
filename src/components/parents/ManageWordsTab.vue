<template>
  <div class="manage-tab-content">
    <div class="filter-bar">
      <label class="filter-label">Filter by Category:</label>
      <select v-model="filterCategory" class="select-input select-filter">
        <option 
          v-for="cat in categories" 
          :key="cat.id_cat || cat.id" 
          :value="cat.id_cat || cat.id"
        >
          {{ cat.icon }} {{ cat.name }}
        </option>
      </select>
    </div>

    <!-- Retry All button (only visible when any word has failed audio) -->
    <div v-if="hasFailedAudio" class="retry-bar">
      <button class="btn-retry-all" @click="retryAllFailed" :disabled="isRetryingAll">
        {{ isRetryingAll ? '⟳ Retrying...' : '⚠️ Retry All Failed Downloads' }}
      </button>
      <span class="retry-hint">Downloads run in background. Status updates automatically.</span>
    </div>

    <!-- Custom Words list -->
    <div class="words-list-container">
      <div v-if="filteredWords.length === 0" class="no-words">
        No words in this category
      </div>
      <div v-else class="words-list">
        <div 
          v-for="item in filteredWords" 
          :key="item.id" 
          class="word-item glass-panel"
        >
          <div class="word-info">
            <span class="word-text">{{ item.word }}</span>
            <span class="word-cat-badge">
              {{ getCategoryName(item.category) }}
            </span>
          </div>

          <!-- Audio Status Icon -->
          <div class="audio-status-col" :title="audioTooltip(item)">
            <span v-if="audioStatuses[audioKey(item)] === 'ready'" class="audio-icon ready-audio">🎵</span>
            <span v-else-if="audioStatuses[audioKey(item)] === 'failed'" class="audio-icon failed-audio" @click="retrySingle(item)">⚠️</span>
            <span v-else class="audio-icon missing-audio">🔊</span>
          </div>
          
          <div class="word-actions-row">
            <!-- Inline difficulty select -->
            <select 
              :value="item.difficulty" 
              @change="changeWordDifficulty(item.id, $event.target.value)"
              class="select-input select-mini"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button v-if="item.isCustom === true || item.isCustom === 1" class="btn-delete" @click="deleteCustomWord(item.id, item.word)">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useWordAudio } from '@/composables/useWordAudio'
import { useDownloadQueue } from '@/composables/useDownloadQueue'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  words: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['word-deleted', 'difficulty-changed'])

const { getAudioStatus } = useWordAudio()
const downloadQueue = useDownloadQueue()

const filterCategory = ref(props.categories[0]?.id_cat || props.categories[0]?.id || '')
const audioStatuses = ref({})       // "word||category" → 'ready'|'failed'|'missing'|'pending'
const isRetryingAll = ref(false)

const filteredWords = computed(() => {
  return props.words.filter(w => w.category === filterCategory.value)
})

// Composite key for a word item
const audioKey = (item) => `${item.word}||${item.category}`

// Whether any visible word has failed audio status
const hasFailedAudio = computed(() => {
  return Object.values(audioStatuses.value).some(s => s === 'failed')
})

// Tooltip text for audio status icon
const audioTooltip = (item) => {
  const status = audioStatuses.value[audioKey(item)]
  switch (status) {
    case 'ready': return 'Google TTS audio cached — tap to hear'
    case 'failed': return 'Download failed — tap to retry'
    case 'pending': return 'Download in progress…'
    default: return 'No cached audio — using device speech'
  }
}

// Refresh audio statuses for all currently visible words
async function refreshAudioStatuses() {
  const words = filteredWords.value
  if (words.length === 0) {
    audioStatuses.value = {}
    return
  }

  const fresh = {}
  const promises = words.map(async (item) => {
    const key = audioKey(item)
    try {
      fresh[key] = await getAudioStatus(item.word, item.category)
    } catch (_) {
      fresh[key] = 'missing'
    }
  })
  await Promise.all(promises)
  audioStatuses.value = fresh
}

// Retry a single failed audio download
async function retrySingle(item) {
  const key = audioKey(item)
  // Immediately reflect pending state
  audioStatuses.value = { ...audioStatuses.value, [key]: 'pending' }
  downloadQueue.enqueueDownload(item.word, item.category)
}

// Retry all failed downloads
async function retryAllFailed() {
  isRetryingAll.value = true
  try {
    // Immediately mark all failed entries as pending
    const fresh = { ...audioStatuses.value }
    for (const key of Object.keys(fresh)) {
      if (fresh[key] === 'failed') fresh[key] = 'pending'
    }
    audioStatuses.value = fresh

    await downloadQueue.retryFailed()
  } finally {
    isRetryingAll.value = false
  }
}

const getCategoryName = (catId) => {
  const cat = props.categories.find(c => c.id_cat === catId || c.id === catId)
  return cat ? `${cat.icon} ${cat.name}` : catId
}

const changeWordDifficulty = (wordId, difficulty) => {
  emit('difficulty-changed', { id: wordId, difficulty })
}

const deleteCustomWord = (wordId, wordText) => {
  if (confirm(`Are you sure you want to delete the word "${wordText}"?`)) {
    emit('word-deleted', wordId)
  }
}

// ── Reactive watchers ──────────────────────────────────────────────────

// Refresh statuses whenever the filtered word list changes
watch(filteredWords, () => {
  refreshAudioStatuses()
}, { immediate: false })

// Refresh when download queue finishes processing
watch(() => downloadQueue.isProcessing.value, (now, was) => {
  if (was && !now) {
    // Queue just finished — refresh to show final states
    refreshAudioStatuses()
  }
})

// Mount: initial status fetch
onMounted(() => {
  refreshAudioStatuses()
})
</script>

<style scoped>
.manage-tab-content {
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.filter-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-dim);
}

.select-filter {
  width: 100%;
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

.words-list-container {
  flex: 1;
}

.no-words {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-dim);
  font-size: 1rem;
}

.words-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Retry Bar ─────────────────────────────────────────────── */
.retry-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
  flex-wrap: wrap;
}

.btn-retry-all {
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(234, 179, 8, 0.35);
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  color: #facc15;
  font-family: var(--font-main);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;
}

.btn-retry-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-retry-all:not(:disabled):active {
  background: rgba(234, 179, 8, 0.3);
}

.retry-hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-style: italic;
}

/* ── Audio Status Column ──────────────────────────────────── */
.audio-status-col {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  flex-shrink: 0;
}

.audio-icon {
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.15s ease;
}

.audio-icon.ready-audio {
  cursor: default;
}

.audio-icon.failed-audio {
  cursor: pointer;
  color: #f87171;
}

.audio-icon.failed-audio:hover {
  transform: scale(1.2);
}

.audio-icon.failed-audio:active {
  transform: scale(0.95);
}

.audio-icon.missing-audio {
  cursor: default;
  opacity: 0.5;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-color: rgba(255, 255, 255, 0.08);
  gap: 0.5rem;
}

.word-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.word-item .word-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  text-transform: capitalize;
}

.word-cat-badge {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  font-weight: 600;
}

.word-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-mini {
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  border-radius: 8px;
}

.btn-delete {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.9rem;
  line-height: 1;
}

.btn-delete:active {
  background: rgba(239, 68, 68, 0.3);
}

@media (max-width: 480px) {
  .filter-bar {
    margin-bottom: 0.75rem;
    gap: 0.15rem;
  }

  .filter-label {
    font-size: 0.85rem;
  }

  .select-input {
    padding: 0.45rem;
    font-size: 0.9rem;
    border-radius: 10px;
  }

  .word-item {
    padding: 0.5rem 0.75rem;
    border-radius: 16px;
    gap: 0.35rem;
  }

  .audio-icon {
    font-size: 1rem;
  }

  .btn-retry-all {
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
  }

  .retry-hint {
    font-size: 0.7rem;
  }

  .word-item .word-text {
    font-size: 1.1rem;
  }

  .word-cat-badge {
    font-size: 0.75rem;
  }

  .select-mini {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
  }

  .btn-delete {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
  }
}
</style>
