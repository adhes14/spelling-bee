<template>
  <div class="error-counter" :class="{ 'has-errors': count > 0 }">
    <span class="face-emoji">{{ emoji }}</span>
    <span class="count-text">Oops: {{ count }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: { type: Number, required: true }
})

const emoji = computed(() => {
  if (props.count === 0) return '🐝' // Calm bee
  if (props.count <= 2) return '😮' // Oops face
  return '😅' // Smiling sweat face
})
</script>

<style scoped>
.error-counter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.error-counter.has-errors {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  animation: popIn 0.3s ease;
}

@keyframes popIn {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.face-emoji {
  font-size: 1.25rem;
  line-height: 1;
}

.count-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-light);
  letter-spacing: 0.5px;
}

.has-errors .count-text {
  color: var(--color-letter-red);
}
</style>
