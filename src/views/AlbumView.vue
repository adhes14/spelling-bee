<template>
  <div class="album-view">
    <div class="album-header">
      <button class="btn-back btn-bouncy" @click="goBack" aria-label="Go back">
        ←
      </button>
      <div class="header-title-wrapper">
        <h1 class="album-title">My Album 🧩</h1>
        <span class="album-subtitle">{{ totalUnlocked }} / 24 pieces unlocked</span>
      </div>
    </div>

    <!-- Album grid -->
    <div class="album-content">
      <div v-if="loading" class="loading-state">
        <span class="spinner">🐝</span>
        <p>Loading your puzzles...</p>
      </div>
      
      <div v-else>
        <div class="puzzle-grid">
          <PuzzleCard 
            v-for="cat in albumData" 
            :key="cat.id" 
            :category="cat" 
            :pieces-unlocked="cat.pieces.map(p => p.unlocked)"
          />
        </div>
        
        <div v-if="totalUnlocked === 0" class="empty-state glass-panel">
          <p class="empty-text">Your album is empty! Play spelling sessions and reach 100% progress in any sublevel to unlock puzzle pieces! 🚀🌟</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAlbumStore } from '@/stores/albumStore'
import PuzzleCard from '@/components/ui/PuzzleCard.vue'

const router = useRouter()
const albumStore = useAlbumStore()

const albumData = ref([])
const loading = ref(true)

const totalUnlocked = computed(() => {
  return albumData.value.reduce((sum, cat) => sum + cat.unlockedCount, 0)
})

function goBack() {
  router.push({ name: 'home' })
}

onMounted(async () => {
  try {
    albumData.value = await albumStore.getAllAlbum()
  } catch (error) {
    console.error('Error loading album progress:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.album-view {
  width: 100%;
  height: 100%;
  padding: calc(1.5rem + var(--safe-area-top)) 1.25rem calc(1.5rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.album-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.btn-back {
  background: var(--color-bg-card);
  border: 1px solid var(--color-bg-card-border);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-light);
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: var(--shadow-premium);
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-accent-purple);
  box-shadow: 0 0 8px var(--color-accent-purple);
}

.header-title-wrapper {
  display: flex;
  flex-direction: column;
}

.album-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-text-light);
  line-height: 1.2;
}

.album-subtitle {
  font-size: 0.95rem;
  color: var(--color-accent-star);
  font-weight: 700;
}

.album-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.album-content::-webkit-scrollbar {
  width: 6px;
}

.album-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.puzzle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding-top: 4px;
}

@media (max-width: 360px) {
  .puzzle-grid {
    grid-template-columns: 1fr;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--color-text-dim);
}

.spinner {
  font-size: 3rem;
  animation: bounce 1.5s infinite ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.empty-state {
  margin-top: 24px;
  padding: 24px;
  text-align: center;
  border-color: rgba(255, 215, 0, 0.2);
}

.empty-text {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-light);
  font-weight: 500;
}
</style>
