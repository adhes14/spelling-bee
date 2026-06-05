<template>
  <div class="result-view">
    <!-- Celebratory title -->
    <div class="celebration-header">
      <div class="emoji-badge pop-in">{{ celebrationEmoji }}</div>
      <h1 class="celebration-title pop-in" :style="{ animationDelay: '100ms' }">
        {{ celebrationText }}
      </h1>
    </div>

    <!-- Main Results Details Card -->
    <div class="results-card glass-panel pop-in" :style="{ animationDelay: '200ms' }">
      <!-- Target Spelt Word display -->
      <div class="word-reveal">
        <p class="reveal-label">You spelled:</p>
        <h2 class="word-text">{{ wordString.toUpperCase() }}</h2>
      </div>

      <!-- Star Rating display -->
      <StarRating 
        :stars="gameStore.stars" 
        size="large" 
        show-label 
      />

      <!-- Score details -->
      <div class="score-details">
        <span class="detail-item">
          ❌ Mistakes: <strong>{{ gameStore.errorCount }}</strong>
        </span>
      </div>
    </div>

    <!-- Actions Panel -->
    <div class="actions-panel pop-in" :style="{ animationDelay: '400ms' }">
      <button class="btn-action next btn-bouncy" @click="goNextWord">
        Next word ➡️
      </button>

      <div class="secondary-actions">
        <button class="btn-action retry btn-bouncy" @click="retryWord">
          🔄 Try again
        </button>
        
        <button class="btn-action home btn-bouncy" @click="goToMenu">
          🏠 Levels
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useSpeech } from '@/composables/useSpeech'
import StarRating from '@/components/ui/StarRating.vue'

const router = useRouter()
const gameStore = useGameStore()
const { speakWord } = useSpeech()

const wordString = computed(() => gameStore.currentWordObj?.word || '')

const celebrationEmoji = computed(() => {
  if (gameStore.stars === 3) return '🥳'
  if (gameStore.stars === 2) return '🎉'
  return '👍'
})

const celebrationText = computed(() => {
  if (gameStore.stars === 3) return 'Amazing!'
  if (gameStore.stars === 2) return 'Well Done!'
  return 'Completed!'
})

const goNextWord = () => {
  gameStore.nextWord()
  if (gameStore.isSessionComplete) {
    router.push({ name: 'session-summary' })
  } else {
    router.push({ name: 'game' })
  }
}

const retryWord = () => {
  gameStore.startWord()
  router.push({ name: 'game' })
}

const goToMenu = () => {
  router.push({ name: 'select-level' })
}

onMounted(() => {
  // Congratulate children by reading the word aloud once more
  if (wordString.value) {
    setTimeout(() => {
      speakWord(wordString.value)
    }, 500)
  }
})
</script>

<style scoped>
.result-view {
  width: 100%;
  height: 100%;
  padding: calc(1.5rem + var(--safe-area-top)) 1.5rem calc(1.5rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.celebration-header {
  text-align: center;
  margin-top: 1rem;
}

.emoji-badge {
  font-size: 4.5rem;
  line-height: 1;
  filter: drop-shadow(0 8px 12px rgba(255,255,255,0.15));
}

.celebration-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--color-accent-star);
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

.results-card {
  width: 100%;
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.word-reveal {
  text-align: center;
}

.reveal-label {
  font-size: 0.95rem;
  color: var(--color-text-dim);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.word-text {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-accent-cyan);
  letter-spacing: 2px;
  line-height: 1.1;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.25);
}

.score-details {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
  padding-top: 1rem;
  display: flex;
  justify-content: center;
}

.detail-item {
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--color-text-light);
}

.detail-item strong {
  color: var(--color-letter-red);
}

/* Actions Panel */
.actions-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-action {
  width: 100%;
  padding: 1rem;
  font-size: 1.25rem;
  border-radius: 20px;
  border-bottom: 5px solid rgba(0, 0, 0, 0.25);
}

.btn-action.next {
  background: linear-gradient(135deg, var(--color-accent-pink) 0%, #be185d 100%);
  font-weight: 800;
}

.secondary-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.btn-action.retry {
  background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%);
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem;
  border-radius: 16px;
}

.btn-action.home {
  background: linear-gradient(135deg, #1e1b4b 0%, #0f0c2d 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 5px solid rgba(0,0,0,0.3);
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem;
  border-radius: 16px;
}
</style>
