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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

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

watch(() => props.settings, (newVal) => {
  if (newVal) {
    wordDifficultyFilter.value = newVal.wordDifficultyFilter || 'easy'
    sessionWordLimit.value = newVal.sessionWordLimit || 10
    scoreDecayPerDay.value = newVal.scoreDecayPerDay || 5
  }
}, { immediate: true, deep: true })

const updateConfig = () => {
  emit('settings-updated', {
    wordDifficultyFilter: wordDifficultyFilter.value,
    sessionWordLimit: sessionWordLimit.value,
    scoreDecayPerDay: scoreDecayPerDay.value
  })
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
