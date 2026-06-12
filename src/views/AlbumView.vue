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
            @click-image="openFullscreen(cat)"
          />
        </div>
        
        <div v-if="totalUnlocked === 0" class="empty-state glass-panel">
          <p class="empty-text">Your album is empty! Play spelling sessions and reach 100% progress in any sublevel to unlock puzzle pieces! 🚀🌟</p>
        </div>
      </div>
    </div>

    <!-- Fullscreen Image Modal -->
    <Transition name="fade">
      <div 
        v-if="fullscreenCategory" 
        class="fullscreen-modal-overlay" 
        @click.self="closeFullscreen"
      >
        <div class="fullscreen-modal glass-panel pop-in" :style="{ '--card-accent': fullscreenCategory.color }">
          <button class="btn-close-modal" @click="closeFullscreen" aria-label="Close fullscreen">×</button>
          
          <div class="fullscreen-grid">
            <div 
              v-for="sublevel in [1, 2, 3, 4]" 
              :key="sublevel"
              class="fullscreen-piece"
              :class="{ 'is-locked': !fullscreenCategory.pieces[sublevel - 1].unlocked }"
            >
              <div 
                class="fullscreen-piece-image"
                :style="{
                  backgroundImage: `url(${fullscreenCategory.image})`,
                  backgroundPosition: getBackgroundPosition(sublevel)
                }"
              ></div>
              
              <div v-if="!fullscreenCategory.pieces[sublevel - 1].unlocked" class="fullscreen-piece-overlay">
                <div class="fullscreen-lock-icon-wrapper">
                  <span class="fullscreen-lock-icon">🔒</span>
                </div>
              </div>
            </div>
          </div>

          <div class="fullscreen-footer">
            <div class="fullscreen-category-info">
              <span class="fullscreen-category-icon">{{ fullscreenCategory.icon }}</span>
              <span class="fullscreen-category-name">{{ fullscreenCategory.name }}</span>
            </div>
            <div 
              class="fullscreen-completion-badge" 
              :class="{ 'is-complete': fullscreenCategory.unlockedCount === 4 }"
            >
              {{ fullscreenCategory.unlockedCount }}/4 Pieces
            </div>
          </div>
          
          <div class="fullscreen-status-message">
            <p v-if="fullscreenCategory.unlockedCount === 4" class="msg-complete pop-in">
              Amazing! You unlocked the entire picture! 🎉🏆
            </p>
            <p v-else class="msg-incomplete">
              Reach 100% in sublevels of this category to unlock the locked pieces! 🚀
            </p>
          </div>
        </div>
      </div>
    </Transition>
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

const fullscreenCategory = ref(null)

function openFullscreen(category) {
  fullscreenCategory.value = category
}

function closeFullscreen() {
  fullscreenCategory.value = null
}

function getBackgroundPosition(sublevel) {
  switch (sublevel) {
    case 1: return '0% 0%'
    case 2: return '100% 0%'
    case 3: return '0% 100%'
    case 4: return '100% 100%'
    default: return '0% 0%'
  }
}

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

/* Fullscreen modal styling */
.fullscreen-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(8, 7, 33, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 20px;
}

.fullscreen-modal {
  width: 100%;
  max-width: 400px;
  padding: 24px 20px 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px var(--card-accent);
}

.btn-close-modal {
  position: absolute;
  top: 12px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s, transform 0.2s;
}

.btn-close-modal:hover {
  color: var(--color-text-light);
  transform: scale(1.1);
}

.fullscreen-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  aspect-ratio: 1/1;
  width: 100%;
  max-width: 300px;
  border-radius: 20px;
  overflow: hidden;
  background: #060515;
  border: 3px solid rgba(255, 255, 255, 0.12);
  margin: 16px 0 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.fullscreen-piece {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.fullscreen-piece-image {
  width: 100%;
  height: 100%;
  background-size: 200% 200%;
  background-repeat: no-repeat;
}

.fullscreen-piece-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(8, 7, 33, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-lock-icon-wrapper {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.fullscreen-lock-icon {
  font-size: 18px;
}

.fullscreen-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 8px;
  margin-bottom: 16px;
}

.fullscreen-category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fullscreen-category-icon {
  font-size: 24px;
}

.fullscreen-category-name {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-text-light);
}

.fullscreen-completion-badge {
  font-size: 14px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-dim);
}

.fullscreen-completion-badge.is-complete {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}

.fullscreen-status-message {
  width: 100%;
  text-align: center;
  padding: 0 8px;
}

.fullscreen-status-message p {
  font-size: 0.95rem;
  line-height: 1.4;
  font-weight: 500;
}

.msg-complete {
  color: var(--color-accent-star);
  font-weight: 700 !important;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
}

.msg-incomplete {
  color: var(--color-text-dim);
}

/* Modal fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
