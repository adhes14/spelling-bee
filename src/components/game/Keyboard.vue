<template>
  <div class="keyboard-container">
    <div v-for="(row, rowIndex) in layout" :key="rowIndex" class="keyboard-row">
      <button
        v-for="key in row"
        :key="key.value"
        class="key-btn btn-bouncy"
        :class="[
          key.type,
          { 'key-active': activeKey === key.value }
        ]"
        @click="handleKeyPress(key)"
      >
        <span v-if="key.value === 'backspace'" class="key-icon">⌫</span>
        <span v-else-if="key.value === 'enter'" class="key-icon">✓</span>
        <span v-else>{{ key.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLetterAudio } from '@/composables/useLetterAudio'

const emit = defineEmits(['key-press'])

const props = defineProps({
  playLetterAudio: { type: Boolean, default: true }
})

const { playLetter } = useLetterAudio()
const activeKey = ref(null)

const layout = [
  [
    { label: 'Q', value: 'q', type: 'letter' },
    { label: 'W', value: 'w', type: 'letter' },
    { label: 'E', value: 'e', type: 'letter' },
    { label: 'R', value: 'r', type: 'letter' },
    { label: 'T', value: 't', type: 'letter' },
    { label: 'Y', value: 'y', type: 'letter' },
    { label: 'U', value: 'u', type: 'letter' },
    { label: 'I', value: 'i', type: 'letter' },
    { label: 'O', value: 'o', type: 'letter' },
    { label: 'P', value: 'p', type: 'letter' }
  ],
  [
    { label: 'A', value: 'a', type: 'letter' },
    { label: 'S', value: 's', type: 'letter' },
    { label: 'D', value: 'd', type: 'letter' },
    { label: 'F', value: 'f', type: 'letter' },
    { label: 'G', value: 'g', type: 'letter' },
    { label: 'H', value: 'h', type: 'letter' },
    { label: 'J', value: 'j', type: 'letter' },
    { label: 'K', value: 'k', type: 'letter' },
    { label: 'L', value: 'l', type: 'letter' }
  ],
  [
    { label: '⌫', value: 'backspace', type: 'action' },
    { label: 'Z', value: 'z', type: 'letter' },
    { label: 'X', value: 'x', type: 'letter' },
    { label: 'C', value: 'c', type: 'letter' },
    { label: 'V', value: 'v', type: 'letter' },
    { label: 'B', value: 'b', type: 'letter' },
    { label: 'N', value: 'n', type: 'letter' },
    { label: 'M', value: 'm', type: 'letter' },
    { label: '✓', value: 'enter', type: 'action' }
  ],
  [
    { label: 'SPACE', value: ' ', type: 'space' }
  ]
]

const handleKeyPress = (key) => {
  // Flash active key state briefly
  activeKey.value = key.value
  setTimeout(() => {
    activeKey.value = null
  }, 100)

  // Voice feedback
  if (key.type === 'letter' && props.playLetterAudio) {
    playLetter(key.value)
  }

  // Emit event
  emit('key-press', key.value)
}
</script>

<style scoped>
.keyboard-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  background: rgba(13, 13, 43, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
}

.key-btn {
  flex: 1;
  max-width: 44px;
  height: 48px;
  background: linear-gradient(180deg, #2a2a6e 0%, #1e1e4a 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 4px solid #0f0f35;
  border-radius: 8px;
  color: var(--color-text-light);
  font-family: var(--font-main);
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.05s ease;
}

.key-btn:active, .key-btn.key-active {
  transform: translateY(2px);
  border-bottom-width: 2px;
}

/* Action Keys (Backspace & Enter) styling */
.key-btn.action {
  max-width: 52px;
  background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
  border-bottom-color: #1f2937;
  font-size: 1.15rem;
}

.key-btn.action[value="enter"] {
  background: linear-gradient(180deg, var(--color-accent-purple) 0%, #7c3aed 100%);
  border-bottom-color: #5b21b6;
}

/* Space Key styling */
.key-btn.space {
  max-width: 260px;
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
  border-bottom-color: #1e3a8a;
  font-size: 1.1rem;
  letter-spacing: 1px;
}

.key-icon {
  font-size: 1.4rem;
  line-height: 1;
}

/* Make keys smaller on narrow phones */
@media (max-width: 360px) {
  .key-btn {
    height: 42px;
    font-size: 1.1rem;
    border-bottom-width: 3px;
  }
}
</style>
