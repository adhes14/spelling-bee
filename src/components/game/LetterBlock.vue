<template>
  <div 
    class="letter-block" 
    :class="[
      status, 
      { 'is-dragging': isDragging, 'is-distractor': isDistractor }
    ]"
    :data-letter="letter"
  >
    <span class="letter-char">{{ letter.toUpperCase() }}</span>
  </div>
</template>

<script setup>
defineProps({
  letter: { type: String, required: true },
  status: { type: String, default: 'idle' }, // 'idle', 'correct', 'error'
  isDragging: { type: Boolean, default: false },
  isDistractor: { type: Boolean, default: false }
})
</script>

<style scoped>
.letter-block {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  box-shadow: 0 4px 0 #1e3a8a, 0 6px 10px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: grab;
  position: relative;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  touch-action: none;
}

.letter-block:active {
  cursor: grabbing;
}

.letter-char {
  font-family: var(--font-main);
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

/* Status colors */
.letter-block.correct {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  box-shadow: 0 4px 0 #064e3b, 0 6px 10px rgba(0,0,0,0.3);
  cursor: default;
}

.letter-block.error {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  box-shadow: 0 4px 0 #7f1d1d, 0 6px 10px rgba(0,0,0,0.3);
  animation: shake 0.3s ease-in-out;
}

.letter-block.is-dragging {
  opacity: 0.8;
  transform: scale(1.1);
  box-shadow: 0 8px 15px rgba(0,0,0,0.4);
}

/* Distractors slightly styled differently, but mostly normal */
.letter-block.is-distractor {
  /* Give distractors slightly alternate hues so they blend in but look fun */
  background: linear-gradient(135deg, var(--color-accent-purple) 0%, #6d28d9 100%);
  box-shadow: 0 4px 0 #4c1d95, 0 6px 10px rgba(0,0,0,0.3);
}

/* Make it look smaller on tiny mobile screens */
@media (max-width: 360px) {
  .letter-block {
    width: 44px;
    height: 44px;
  }
  .letter-char {
    font-size: 1.6rem;
  }
}
</style>
