<template>
  <button 
    class="sublevel-card glass-panel" 
    :style="{ '--card-accent': color }"
    @click="$emit('select')"
  >
    <div class="card-header">
      <span class="card-icon">{{ icon }}</span>
    </div>
    
    <div class="card-body">
      <h3 class="card-title">{{ title }}</h3>
      <p class="card-description">{{ description }}</p>
      
      <div class="card-progress-wrapper">
        <div class="progress-bar-container">
          <div 
            class="progress-bar-fill" 
            :style="{ width: `${progressPercent}%`, '--bar-color': color }"
          ></div>
        </div>
        <span class="progress-percentage">{{ progressPercent }}%</span>
      </div>
    </div>
  </button>
</template>

<script setup>
defineProps({
  level: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  progressPercent: { type: Number, required: true },
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
  padding: clamp(0.6rem, 1.8vh, 1rem);
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  color: var(--color-text-light);
  font-family: var(--font-main);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.sublevel-card:hover, .sublevel-card:active {
  transform: scale(1.02);
  border-color: var(--card-accent);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 0 12px var(--card-accent);
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: clamp(0.6rem, 1.5vw, 1rem);
  min-width: clamp(40px, 10vw, 52px);
}

.card-icon {
  font-size: clamp(1.6rem, 5vw, 2.2rem);
  line-height: 1;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: clamp(1.05rem, 3.5vw, 1.25rem);
  font-weight: 800;
  margin-bottom: 0.1rem;
  color: var(--card-accent);
}

.card-description {
  font-size: clamp(0.78rem, 2.2vw, 0.9rem);
  color: var(--color-text-dim);
  font-weight: 500;
  line-height: 1.2;
}

.card-progress-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: clamp(0.35rem, 1vh, 0.6rem);
  width: 100%;
}

.progress-bar-container {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background-color: var(--bar-color, var(--color-accent-purple));
  transition: width 0.4s ease-out;
  box-shadow: 0 0 6px var(--bar-color);
}

.progress-percentage {
  font-size: clamp(0.75rem, 2vw, 0.85rem);
  font-weight: 800;
  color: var(--color-text-light);
  min-width: 32px;
  text-align: right;
}
</style>
