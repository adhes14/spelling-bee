<template>
  <div class="session-summary-view">
    <!-- Header -->
    <div class="summary-header">
      <div v-if="isPerfectSession" class="trophy-badge pop-in perfect-star-anim">🌟</div>
      <div v-else class="trophy-badge pop-in">🏆</div>
      
      <h1 v-if="isPerfectSession" class="summary-title perfect-title pop-in">Perfect Session!</h1>
      <h1 v-else class="summary-title pop-in">Session Completed!</h1>
      
      <p v-if="isPerfectSession" class="summary-subtitle pop-in">Spectacular! You got 3 stars on every single word!</p>
      <p v-else class="summary-subtitle pop-in">Amazing effort! Here is how you did:</p>
    </div>

    <!-- Stats Card -->
    <div class="stats-panel glass-panel pop-in">
      <div class="stat-item">
        <span class="stat-label">Words Spelled</span>
        <span class="stat-value">{{ completedCount }} / {{ totalCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Stars Earned</span>
        <span class="stat-value star-val">⭐ {{ totalStars }} / {{ maxStars }}</span>
      </div>
    </div>

    <!-- Words Checklist -->
    <div class="words-list-panel glass-panel pop-in">
      <h3 class="panel-title">Word Report</h3>
      <div class="words-scroll">
        <div 
          v-for="wordObj in gameStore.sessionWords" 
          :key="wordObj.word"
          class="word-score-row"
        >
          <span class="word-name">{{ wordObj.word }}</span>
          <div class="word-stars">
            <span 
              v-for="s in 3" 
              :key="s" 
              class="star-icon"
              :class="{ active: s <= (gameStore.sessionScores[wordObj.word] || 0) }"
            >⭐</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-panel pop-in">
      <button 
        v-if="failedWords.length > 0" 
        class="btn-action retry btn-bouncy" 
        @click="retryFailedWords"
      >
        🔁 Retry Missed Words
      </button>

      <button class="btn-action next btn-bouncy" @click="playNewSession">
        🔄 Play Another Session
      </button>
      
      <button class="btn-action home btn-bouncy" @click="goToMenu">
        🏠 Main Menu
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useAudioFeedback } from '@/composables/useAudioFeedback'

const router = useRouter()
const gameStore = useGameStore()
const { playSuccessSound } = useAudioFeedback()

const totalCount = computed(() => gameStore.sessionWords.length)
const completedCount = computed(() => {
  return Object.keys(gameStore.sessionScores).length
})

const totalStars = computed(() => {
  return Object.values(gameStore.sessionScores).reduce((acc, score) => acc + score, 0)
})

const maxStars = computed(() => totalCount.value * 3)

const failedWords = computed(() => {
  return gameStore.sessionWords.filter(wordObj => {
    const score = gameStore.sessionScores[wordObj.word] || 0
    return score < 3
  })
})

const isPerfectSession = computed(() => {
  return gameStore.sessionWords.length > 0 && failedWords.value.length === 0
})

const retryFailedWords = () => {
  if (failedWords.value.length > 0) {
    gameStore.startRetryRound(failedWords.value)
    gameStore.startWord()
    router.push({ name: 'game' })
  }
}

const playNewSession = async () => {
  await gameStore.prepareSession()
  gameStore.startWord()
  router.push({ name: 'game' })
}

const goToMenu = () => {
  gameStore.reset()
  router.push({ name: 'home' })
}

onMounted(() => {
  playSuccessSound()
})
</script>

<style scoped>
.session-summary-view {
  width: 100%;
  height: 100%;
  padding: calc(1.5rem + var(--safe-area-top)) 1.5rem calc(1.5rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
  overflow-y: auto;
}

.summary-header {
  text-align: center;
  margin-top: 1rem;
}

.trophy-badge {
  font-size: 4.5rem;
  line-height: 1;
  filter: drop-shadow(0 8px 12px rgba(255, 215, 0, 0.4));
  animation: hoverTrophy 3s ease-in-out infinite;
  display: inline-block;
}

@keyframes hoverTrophy {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.05); }
}

.summary-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--color-accent-star);
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

.summary-subtitle {
  font-size: 1.05rem;
  color: var(--color-text-dim);
  margin-top: 0.25rem;
  font-weight: 500;
}

.stats-panel {
  width: 100%;
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-around;
  gap: 1rem;
  margin: 1rem 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-accent-cyan);
}

.stat-value.star-val {
  color: var(--color-accent-gold);
}

.words-list-panel {
  width: 100%;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  max-height: 220px;
}

.panel-title {
  font-size: 1.1rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-text-light);
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.5rem;
}

.words-scroll {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 0.25rem;
}

.word-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}

.word-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-light);
  text-transform: capitalize;
}

.word-stars {
  display: flex;
  gap: 2px;
}

.star-icon {
  font-size: 0.9rem;
  opacity: 0.15;
  filter: grayscale(1);
}

.star-icon.active {
  opacity: 1;
  filter: none;
}

.actions-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.btn-action {
  width: 100%;
  padding: 1rem;
  font-size: 1.25rem;
  border-radius: 20px;
  border-bottom: 5px solid rgba(0, 0, 0, 0.25);
  font-family: var(--font-main);
  cursor: pointer;
}

.btn-action.next {
  background: linear-gradient(135deg, var(--color-accent-pink) 0%, #be185d 100%);
  font-weight: 800;
  color: white;
}

.btn-action.retry {
  background: linear-gradient(135deg, var(--color-accent-cyan) 0%, #0891b2 100%);
  font-weight: 800;
  color: white;
}

.btn-action.home {
  background: linear-gradient(135deg, #1e1b4b 0%, #0f0c2d 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 5px solid rgba(0,0,0,0.3);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-light);
}

.perfect-star-anim {
  animation: spinGlow 4s linear infinite, hoverTrophy 3s ease-in-out infinite;
}

@keyframes spinGlow {
  0% { filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)) hue-rotate(0deg); }
  50% { filter: drop-shadow(0 0 30px rgba(255, 223, 0, 0.9)) hue-rotate(180deg); }
  100% { filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)) hue-rotate(360deg); }
}

.perfect-title {
  background: linear-gradient(135deg, #ffe066 0%, #f59e0b 50%, #fef08a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shineText 3s ease infinite;
  text-shadow: none; /* remove standard shadow to allow gradient text */
}

@keyframes shineText {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
