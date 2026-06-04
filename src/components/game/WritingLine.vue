<template>
  <div class="writing-line-container">
    <div class="paper-lines">
      <!-- Top helper line (faint) -->
      <div class="line dotted"></div>
      
      <!-- Middle content area -->
      <div class="text-content">
        <span v-if="value" class="typed-text">
          {{ value }}<span class="blinking-cursor">|</span>
        </span>
        <span v-else class="placeholder-text">
          {{ placeholder }}<span class="blinking-cursor">|</span>
        </span>
      </div>

      <!-- Bottom baseline (solid base) -->
      <div class="line solid"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  value: { type: String, default: '' },
  placeholder: { type: String, default: 'Spell the word...' }
})
</script>

<style scoped>
.writing-line-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2.5rem 1rem;
}

.paper-lines {
  position: relative;
  width: 90%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.line {
  width: 100%;
  height: 2px;
}

.line.dotted {
  border-top: 2px dashed rgba(6, 182, 212, 0.25);
  margin-bottom: 2rem;
}

.line.solid {
  background: var(--color-accent-cyan);
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.4);
}

.text-content {
  position: absolute;
  bottom: 4px; /* Align slightly above the solid baseline */
  font-family: var(--font-main);
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: 2px;
  line-height: 1;
  text-transform: uppercase;
}

.typed-text {
  color: var(--color-accent-cyan);
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
}

.placeholder-text {
  color: rgba(255, 255, 255, 0.15);
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0px;
  bottom: 8px;
  position: relative;
}

.blinking-cursor {
  color: var(--color-accent-star);
  font-weight: 400;
  animation: blink 0.8s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  from, to { color: transparent }
  50% { color: var(--color-accent-star) }
}
</style>
