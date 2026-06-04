<template>
  <button 
    class="sublevel-card glass-panel" 
    :style="{ '--card-accent': color }"
    @click="$emit('select')"
  >
    <div class="card-header">
      <span class="card-icon">{{ icon }}</span>
      <div class="stars-row">
        <span 
          v-for="s in 3" 
          :key="s" 
          class="star-icon"
          :class="{ active: s <= starsCount }"
        >⭐</span>
      </div>
    </div>
    
    <div class="card-body">
      <h3 class="card-title">{{ title }}</h3>
      <p class="card-description">{{ description }}</p>
    </div>
  </button>
</template>

<script setup>
defineProps({
  level: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  starsCount: { type: Number, required: true },
  color: { type: String, default: 'var(--color-accent-purple)' },
  icon: { type: String, default: '🎈' }
})

defineEmits(['select'])
</script>

<style scoped>
.sublevel-card {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 1.25rem;
  border-radius: 20px;
  text-align: left;
  cursor: pointer;
  color: var(--color-text-light);
  font-family: var(--font-main);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.sublevel-card:hover, .sublevel-card:active {
  transform: scale(1.03);
  border-color: var(--card-accent);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px var(--card-accent);
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: 1.25rem;
  min-width: 60px;
}

.card-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.stars-row {
  display: flex;
  gap: 1px;
  margin-top: 0.25rem;
}

.star-icon {
  font-size: 0.8rem;
  opacity: 0.2;
  filter: grayscale(1);
}

.star-icon.active {
  opacity: 1;
  filter: none;
  text-shadow: 0 0 4px var(--color-accent-star);
}

.card-body {
  flex: 1;
}

.card-title {
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 0.15rem;
  color: var(--card-accent);
}

.card-description {
  font-size: 0.95rem;
  color: var(--color-text-dim);
  font-weight: 500;
  line-height: 1.2;
}
</style>
