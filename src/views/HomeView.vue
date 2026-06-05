<template>
  <div class="home-view">
    <!-- Header/Logo area -->
    <div class="logo-container">
      <div class="bee-badge">🐝</div>
      <h1 class="game-title">
        <span>Spelling</span>
        <span class="highlight">Bee</span>
        <span class="kids">Kids</span>
      </h1>
      <p class="subtitle">Learn and Play!</p>
    </div>

    <!-- Category selector list -->
    <div class="categories-panel glass-panel">
      <h2 class="panel-title">Choose a Category</h2>
      <div class="categories-grid">
        <button 
          v-for="cat in dictionaryStore.categories" 
          :key="cat.id_cat || cat.id"
          class="category-card"
          :style="{ '--card-color': cat.color }"
          @click="selectCategory(cat.id_cat || cat.id)"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <div class="cat-info-wrapper">
            <span class="cat-name">{{ cat.name }}</span>
            <div class="cat-progress-bar-container" v-if="categoryProgress[cat.id_cat || cat.id]">
              <template v-if="categoryProgress[cat.id_cat || cat.id].hasPlayed">
                <div class="progress-track">
                  <div 
                    class="progress-fill" 
                    :style="{ 
                      width: `${categoryProgress[cat.id_cat || cat.id].percent}%`, 
                      backgroundColor: cat.color 
                    }"
                  ></div>
                </div>
                <span class="progress-val">{{ categoryProgress[cat.id_cat || cat.id].percent }}%</span>
              </template>
              <template v-else>
                <span class="not-played">Not played yet</span>
              </template>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Parent zone shortcut -->
    <div class="footer-actions">
      <button class="btn-parents" @click="openParentsZone">
        <span class="icon">⚙️</span> Parents Zone
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useDictionaryStore } from '@/stores/dictionaryStore'

const router = useRouter()
const gameStore = useGameStore()
const dictionaryStore = useDictionaryStore()

const categoryProgress = ref({})

const loadCategoryProgress = async () => {
  for (const cat of dictionaryStore.categories) {
    const catId = cat.id_cat || cat.id
    categoryProgress.value[catId] = await gameStore.getCategoryProgress(cat)
  }
}

const selectCategory = (catId) => {
  gameStore.setCategory(catId)
  router.push({ name: 'select-level' })
}

const openParentsZone = () => {
  router.push({ name: 'parents' })
}

onMounted(async () => {
  await dictionaryStore.init()
  await loadCategoryProgress()
})
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  padding: calc(2rem + var(--safe-area-top)) 1.5rem calc(1.5rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  overflow-y: auto;
}

.logo-container {
  text-align: center;
  margin-top: 1rem;
  flex-shrink: 0;
}

.bee-badge {
  font-size: 4rem;
  line-height: 1;
  animation: hoverBee 3s ease-in-out infinite;
  display: inline-block;
  filter: drop-shadow(0 8px 12px rgba(255, 215, 0, 0.4));
}

@keyframes hoverBee {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.game-title {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.1;
  margin-top: 0.5rem;
  text-transform: uppercase;
  color: var(--color-text-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  letter-spacing: -1px;
}

.game-title .highlight {
  color: var(--color-accent-star);
  font-size: 3.5rem;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  line-height: 0.9;
}

.game-title .kids {
  font-size: 1.5rem;
  background: linear-gradient(90deg, var(--color-accent-pink), var(--color-accent-cyan));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-top: 0.25rem;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--color-text-dim);
  margin-top: 0.5rem;
  font-weight: 500;
}

/* Category panel */
.categories-panel {
  width: 100%;
  padding: 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.panel-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text-light);
  margin-bottom: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.categories-grid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.category-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: var(--color-text-light);
  font-family: var(--font-main);
  text-align: left;
}

.category-card:hover, .category-card:active {
  transform: scale(1.03);
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--card-color);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), 0 0 12px var(--card-color);
}

.cat-icon {
  font-size: 2.25rem;
  margin-right: 1.25rem;
}

.cat-name {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Footer parents button */
.footer-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding-top: 1rem;
  flex-shrink: 0;
}

.btn-parents {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: var(--color-text-dim);
  font-family: var(--font-main);
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-parents:hover, .btn-parents:active {
  color: var(--color-text-light);
  border-color: var(--color-text-light);
  background: rgba(255, 255, 255, 0.05);
}

.cat-info-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cat-progress-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
  width: 100%;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease-out;
}

.progress-val {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-dim);
  min-width: 30px;
  text-align: right;
}

.not-played {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-dim);
  opacity: 0.6;
}
</style>
