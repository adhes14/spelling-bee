<template>
  <div class="sublevel-select-view">
    <!-- Header with Back Button and Active Category Title -->
    <header class="header">
      <button class="btn-back" @click="goBack" aria-label="Back">
        ⬅️
      </button>
      <div class="category-indicator" :style="{ '--cat-color': gameStore.currentCategory?.color }">
        <span class="cat-icon">{{ gameStore.currentCategory?.icon }}</span>
        <h2 class="cat-name">{{ gameStore.currentCategory?.name }}</h2>
      </div>
    </header>

    <!-- Levels list -->
    <div class="levels-container">
      <h1 class="page-title">Choose your Level</h1>
      
      <div class="levels-grid">
        <SubLevelCard 
          :level="1"
          title="Easy"
          description="Drag the letters to their matching boxes."
          :progress-percent="level1Progress.percent"
          color="var(--color-accent-cyan)"
          icon="🎈"
          @select="selectLevel(1)"
        />

        <SubLevelCard 
          :level="2"
          title="Medium"
          description="Find the correct letters among distractor letters."
          :progress-percent="level2Progress.percent"
          color="var(--color-accent-pink)"
          icon="🚀"
          @select="selectLevel(2)"
        />

        <SubLevelCard 
          :level="3"
          title="Advanced"
          description="Listen carefully and write using the keyboard."
          :progress-percent="level3Progress.percent"
          color="var(--color-accent-purple)"
          icon="🧠"
          @select="selectLevel(3)"
        />
      </div>
    </div>

    <!-- Info banner -->
    <footer class="footer-tip">
      💡 Try to earn 100% on each level
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import SubLevelCard from '@/components/ui/SubLevelCard.vue'

const router = useRouter()
const gameStore = useGameStore()

const level1Progress = ref({ percent: 0, rated: 0, total: 0 })
const level2Progress = ref({ percent: 0, rated: 0, total: 0 })
const level3Progress = ref({ percent: 0, rated: 0, total: 0 })

const goBack = () => {
  gameStore.reset()
  router.push({ name: 'home' })
}

const selectLevel = async (level) => {
  gameStore.setSublevel(level)
  await gameStore.prepareSession()
  gameStore.startWord()
  router.push({ name: 'game' })
}

onMounted(async () => {
  level1Progress.value = await gameStore.getSublevelProgress(1)
  level2Progress.value = await gameStore.getSublevelProgress(2)
  level3Progress.value = await gameStore.getSublevelProgress(3)
})
</script>

<style scoped>
.sublevel-select-view {
  width: 100%;
  height: 100%;
  padding: calc(1rem + var(--safe-area-top)) 1.5rem calc(1.5rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.btn-back {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 1.25rem;
  padding: 0.6rem 0.8rem;
  border-radius: 16px;
  cursor: pointer;
  color: var(--color-text-light);
  line-height: 1;
  transition: transform 0.1s ease, background 0.2s ease;
}

.btn-back:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.15);
}

.category-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--cat-color, var(--color-bg-card-border));
  box-shadow: 0 0 10px rgba(0,0,0,0.1), 0 0 4px var(--cat-color);
  padding: 0.5rem 1.25rem;
  border-radius: 20px;
}

.cat-icon {
  font-size: 1.5rem;
}

.cat-name {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.levels-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  color: var(--color-accent-star);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.levels-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.footer-tip {
  font-size: 0.95rem;
  color: var(--color-text-dim);
  font-weight: 500;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.4rem 1.2rem;
  border-radius: 12px;
  text-align: center;
}
</style>
