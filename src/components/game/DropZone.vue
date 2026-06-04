<template>
  <div class="drop-zone-container">
    <div 
      v-for="(char, index) in word" 
      :key="index"
      :id="`slot-${index}`"
      class="slot-wrapper"
      :class="{ 
        'is-solved': solvedSlots[index],
        'is-active': activeSlotIndex === index && !solvedSlots[index],
        'is-space': char === ' '
      }"
    >
      <!-- If space, render as empty visual separator -->
      <div v-if="char === ' '" class="space-separator"></div>

      <!-- If solved, show the green letter block -->
      <LetterBlock 
        v-else-if="solvedSlots[index]" 
        :letter="char" 
        status="correct"
      />
      <!-- If unsolved, show a placeholder with dotted border -->
      <div v-else class="empty-slot">
        <span class="placeholder-dot">•</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import Sortable from 'sortablejs'
import LetterBlock from './LetterBlock.vue'

const props = defineProps({
  word: { type: String, required: true },
  solvedSlots: { type: Object, required: true }, // Map of index -> boolean
  activeSlotIndex: { type: Number, default: 0 }  // Highlight the next slot to fill
})

const emit = defineEmits(['letter-dropped'])

let sortableInstances = []

const initSlots = () => {
  // Clear any existing instances
  destroySlots()

  // Create a Sortable instance for each unsolved slot
  for (let i = 0; i < props.word.length; i++) {
    if (props.word[i] === ' ') continue // Skip space separators
    if (props.solvedSlots[i]) continue

    const slotEl = document.getElementById(`slot-${i}`)
    if (!slotEl) continue

    const sortable = new Sortable(slotEl, {
      group: {
        name: 'letters',
        put: true, // Allow letters from the pool to be put here
        pull: false // Once placed, they can't be dragged out
      },
      animation: 150,
      ghostClass: 'slot-ghost',
      onAdd: (evt) => {
        const letter = evt.item.getAttribute('data-letter')
        
        // Remove the element from the slot DOM immediately to let Vue handle rendering
        if (evt.item.parentNode) {
          evt.item.parentNode.removeChild(evt.item)
        }

        // Emit drop event to parent
        emit('letter-dropped', {
          index: i,
          letter: letter
        })
      }
    })

    sortableInstances.push(sortable)
  }
}

const destroySlots = () => {
  sortableInstances.forEach(s => s.destroy())
  sortableInstances = []
}

// Re-initialize when the word changes or when solved state changes
watch(() => props.word, () => {
  setTimeout(initSlots, 50)
}, { immediate: true })

watch(() => props.solvedSlots, () => {
  setTimeout(initSlots, 50)
}, { deep: true })

onMounted(() => {
  setTimeout(initSlots, 100)
})

onUnmounted(() => {
  destroySlots()
})
</script>

<style scoped>
.drop-zone-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem;
  flex-wrap: wrap;
}

.slot-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 14px;
}

.empty-slot {
  width: 52px;
  height: 52px;
  border: 2px dashed rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.is-active .empty-slot {
  border-color: var(--color-accent-star);
  background: rgba(255, 215, 0, 0.05);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
  transform: scale(1.05);
}

.placeholder-dot {
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.5rem;
}

.is-active .placeholder-dot {
  color: var(--color-accent-star);
  animation: pulseDot 1s infinite alternate;
}

@keyframes pulseDot {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1.2); opacity: 1; }
}

.slot-ghost {
  opacity: 0;
}

.space-separator {
  width: 20px;
  height: 56px;
}

.slot-wrapper.is-space {
  width: 20px;
}

/* Responsive adjustment */
@media (max-width: 360px) {
  .slot-wrapper {
    width: 48px;
    height: 48px;
  }
  .empty-slot {
    width: 44px;
    height: 44px;
  }
  .space-separator, .slot-wrapper.is-space {
    width: 12px;
    height: 48px;
  }
}
</style>
