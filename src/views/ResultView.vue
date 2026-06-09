<template>
  <div class="result-view">
    <!-- Icon/Emoji -->
    <div class="celebration-header">
      <div class="emoji-badge pop-in" v-if="isFailure">💡</div>
      <div class="emoji-badge pop-in" v-else>✅</div>
    </div>

    <!-- Main Results Details Card -->
    <div class="results-card glass-panel pop-in" :style="{ animationDelay: '200ms' }">
      <!-- Target Spelt Word display -->
      <div class="word-reveal">
        <p class="reveal-label">{{ isFailure ? 'The word was:' : 'You spelled:' }}</p>
        <h2 class="word-text" :class="{ 'failed-word': isFailure }">{{ wordString.toUpperCase() }}</h2>
      </div>
    </div>

    <!-- Actions Panel -->
    <div class="actions-panel pop-in" :style="{ animationDelay: '400ms' }">
      <button class="btn-action next btn-bouncy" @click="goNextWord">
        Next word ➡️
      </button>

      <button class="btn-action exit btn-bouncy" @click="goToMenu">
        Exit 🚪
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useWordAudio } from '@/composables/useWordAudio'

const router = useRouter()
const gameStore = useGameStore()
const { speakWord } = useWordAudio()

const wordString = gameStore.currentWordObj?.word || ''
const isFailure = computed(() => gameStore.errorCount >= 4)
const categoryId = computed(() => {
  const cat = gameStore.currentCategory
  return cat ? (cat.id_cat || cat.id || '') : ''
})

const goNextWord = () => {
  gameStore.nextWord()
  if (gameStore.isSessionComplete) {
    if (gameStore.isRetryRound) {
      gameStore.endRetryRound()
    }
    router.push({ name: 'session-summary' })
  } else {
    router.push({ name: 'game' })
  }
}

const goToMenu = () => {
  router.push({ name: 'select-level' })
}

onMounted(() => {
  // Congratulate children by reading the word aloud once more
  if (wordString) {
    setTimeout(() => {
      speakWord(wordString, categoryId.value)
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
  margin-top: 2rem;
}

.emoji-badge {
  font-size: 5rem;
  line-height: 1;
  filter: drop-shadow(0 8px 12px rgba(255,255,255,0.15));
}

.results-card {
  width: 100%;
  padding: 2.5rem 1.5rem;
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
  font-size: 2.75rem;
  font-weight: 800;
  color: var(--color-accent-cyan);
  letter-spacing: 2px;
  line-height: 1.1;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.25);
  margin-top: 0.5rem;
}

.word-text.failed-word {
  color: var(--color-accent-gold);
  text-shadow: 0 0 10px rgba(255, 184, 0, 0.25);
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
  cursor: pointer;
  transition: transform 0.1s ease;
}

.btn-action.next {
  background: linear-gradient(135deg, var(--color-accent-pink) 0%, #be185d 100%);
  font-weight: 800;
  color: white;
  border-left: none;
  border-right: none;
  border-top: none;
}

.btn-action.exit {
  background: linear-gradient(135deg, #1e1b4b 0%, #0f0c2d 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 5px solid rgba(0,0,0,0.3);
  font-weight: 700;
  color: var(--color-text-light);
}

.btn-action:active {
  transform: scale(0.98);
}
</style>
