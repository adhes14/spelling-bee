<template>
  <div class="puzzle-card glass-panel" :style="{ '--card-accent': category.color }">
    <div class="puzzle-grid">
      <div 
        v-for="sublevel in [1, 2, 3, 4]" 
        :key="sublevel"
        class="puzzle-piece"
        :class="{ 
          'is-locked': !piecesUnlocked[sublevel - 1],
          'is-new': newlyUnlockedSublevel === sublevel
        }"
      >
        <!-- The image quadrant -->
        <div 
          class="piece-image"
          :style="{
            backgroundImage: `url(${category.image})`,
            backgroundPosition: getBackgroundPosition(sublevel)
          }"
        ></div>
        
        <!-- Locked Overlay -->
        <div v-if="!piecesUnlocked[sublevel - 1] || newlyUnlockedSublevel === sublevel" class="piece-overlay">
          <div v-if="newlyUnlockedSublevel !== sublevel" class="lock-icon-wrapper">
            <span class="lock-icon">🔒</span>
          </div>
          <div v-else class="lock-icon-wrapper is-unlocking">
            <span class="lock-icon">🔓</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="category-info">
        <span class="category-icon">{{ category.icon }}</span>
        <span class="category-name">{{ category.name }}</span>
      </div>
      <div class="completion-badge" :class="{ 'is-complete': unlockedCount === 4 }">
        {{ unlockedCount }}/4
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  piecesUnlocked: {
    type: Array,
    required: true,
    validator: (val) => val.length === 4
  },
  newlyUnlockedSublevel: {
    type: Number,
    default: null
  }
})

const unlockedCount = computed(() => {
  return props.piecesUnlocked.filter(Boolean).length
})

function getBackgroundPosition(sublevel) {
  // Sublevels:
  // 1: Top-Left  -> 0% 0%
  // 2: Top-Right -> 100% 0%
  // 3: Bottom-Left -> 0% 100%
  // 4: Bottom-Right -> 100% 100%
  switch (sublevel) {
    case 1: return '0% 0%'
    case 2: return '100% 0%'
    case 3: return '0% 100%'
    case 4: return '100% 100%'
    default: return '0% 0%'
  }
}
</script>

<style scoped>
.puzzle-card {
  padding: 12px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--color-bg-card-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background: var(--color-bg-card);
}

.puzzle-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 15px var(--card-accent);
  border-color: var(--card-accent);
}

.puzzle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  aspect-ratio: 1/1;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #060515;
  border: 2px solid rgba(255, 255, 255, 0.08);
}

.puzzle-piece {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.piece-image {
  width: 100%;
  height: 100%;
  background-size: 200% 200%;
  background-repeat: no-repeat;
  transition: transform 0.3s ease;
}

.puzzle-piece:hover .piece-image {
  transform: scale(1.05);
}

.piece-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(8, 7, 33, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.lock-icon-wrapper {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.lock-icon {
  font-size: 16px;
}

/* Newly unlocked piece styling */
.puzzle-piece.is-new .piece-overlay {
  animation: revealPiece 1.8s forwards cubic-bezier(0.4, 0, 0.2, 1);
}

.puzzle-piece.is-new .lock-icon-wrapper.is-unlocking {
  animation: unlockPop 1.2s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.puzzle-piece.is-new {
  box-shadow: inset 0 0 15px var(--color-accent-gold);
  animation: pieceGlow 1.8s ease-in-out infinite alternate;
  z-index: 10;
}

@keyframes unlockPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
    background: rgba(255, 215, 0, 0.3);
    border-color: var(--color-accent-gold);
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

@keyframes revealPiece {
  0% {
    opacity: 1;
  }
  30% {
    opacity: 1;
    background: rgba(255, 215, 0, 0.4);
  }
  100% {
    opacity: 0;
    background: rgba(255, 215, 0, 0);
  }
}

@keyframes pieceGlow {
  0% {
    outline: 2px solid rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.2);
  }
  100% {
    outline: 2px solid rgba(255, 215, 0, 0.9);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-icon {
  font-size: 20px;
}

.category-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text-light);
}

.completion-badge {
  font-size: 13px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-dim);
}

.completion-badge.is-complete {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}
</style>
