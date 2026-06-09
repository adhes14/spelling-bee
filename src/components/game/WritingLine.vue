<template>
  <div class="writing-line-container">
    <div class="paper-lines">
      <!-- Top helper line (faint) -->
      <div class="line dotted"></div>
      
      <!-- Middle content area -->
      <div class="text-content">
        <span v-if="value" class="typed-text-wrapper">
          <!-- Target to place cursor before the first letter -->
          <span class="cursor-touch-target start-target" @click.stop="emitCursorTap(0)"></span>
          
          <template v-for="(char, index) in value" :key="index">
            <!-- Cursor before this character -->
            <span v-if="cursorIndex === index" class="blinking-cursor">|</span>
            <span class="char-span" @click.stop="emitCursorTap(index + 1)">
              {{ char === ' ' ? '\u00A0' : char }}
            </span>
          </template>
          
          <!-- Cursor at the very end -->
          <span v-if="cursorIndex === value.length" class="blinking-cursor">|</span>
        </span>
        <span v-else class="placeholder-text" @click.stop="emitCursorTap(0)">
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
  placeholder: { type: String, default: 'Spell the word...' },
  cursorIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['cursor-tap'])

const emitCursorTap = (index) => {
  emit('cursor-tap', index)
}
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
  line-height: 1;
  text-transform: uppercase;
}

.typed-text-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-cyan);
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
  position: relative;
}

.cursor-touch-target.start-target {
  display: inline-block;
  width: 16px;
  height: 3.5rem;
  margin-right: -8px;
  cursor: pointer;
  z-index: 2;
}

.char-span {
  display: inline-block;
  cursor: pointer;
  padding: 0 1px;
  user-select: none;
  position: relative;
  z-index: 2;
  letter-spacing: 2px;
}

.placeholder-text {
  color: rgba(255, 255, 255, 0.15);
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0px;
  bottom: 8px;
  position: relative;
  cursor: pointer;
}

.blinking-cursor {
  color: var(--color-accent-star);
  font-weight: 400;
  animation: blink 0.8s step-end infinite;
  display: inline-block;
  width: 0;
  position: relative;
  left: -1px;
  overflow: visible;
  line-height: 1;
}

@keyframes blink {
  from, to { color: transparent }
  50% { color: var(--color-accent-star) }
}
</style>
