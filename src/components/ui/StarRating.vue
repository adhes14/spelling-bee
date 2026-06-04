<template>
  <div class="star-rating" :class="[size]">
    <div class="stars-container">
      <span 
        v-for="i in 3" 
        :key="i"
        class="star-item"
        :class="{ active: i <= stars }"
        :style="{ animationDelay: `${i * 150}ms` }"
      >
        ★
      </span>
    </div>
    <div v-if="showLabel && stars > 0" class="rating-label pop-in" :style="{ animationDelay: '600ms' }">
      <span v-if="stars === 3" class="gold-text">🏆 Perfect! Gold Sticker</span>
      <span v-else-if="stars === 2" class="silver-text">🥈 Well Done! Silver Sticker</span>
      <span v-else class="bronze-text">🥉 Keep Trying! Bronze Sticker</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stars: { type: Number, required: true },
  size: { type: String, default: 'medium' }, // 'small' | 'medium' | 'large'
  showLabel: { type: Boolean, default: false }
})
</script>

<style scoped>
.star-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.stars-container {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.star-item {
  font-size: 2.5rem;
  color: rgba(255, 255, 255, 0.15);
  text-shadow: 0 0 1px rgba(0,0,0,0.5);
  display: inline-block;
  line-height: 1;
}

.star-item.active {
  color: var(--color-accent-star);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.6), 
               0 4px 8px rgba(255, 215, 0, 0.3),
               0 0 0 #d97706; /* 3D effect fallback */
  transform-origin: center;
  animation: starPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes starPop {
  0% { transform: scale(0.3); opacity: 0; }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* Sizes */
.small .star-item {
  font-size: 1.5rem;
  gap: 0.25rem;
}

.large .star-item {
  font-size: 4.5rem;
  gap: 1rem;
}

/* Rating Labels */
.rating-label {
  font-size: 1.15rem;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.5px;
}

.gold-text {
  color: var(--color-accent-star);
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

.silver-text {
  color: #cbd5e1;
  text-shadow: 0 0 8px rgba(203, 213, 225, 0.4);
}

.bronze-text {
  color: #f97316;
  text-shadow: 0 0 8px rgba(249, 115, 22, 0.4);
}
</style>
