<template>
  <div class="letter-pool-container">
    <div id="letter-pool" class="pool-grid">
      <div 
        v-for="item in letters" 
        :key="item.id"
        :data-letter="item.letter"
        :data-id="item.id"
        class="pool-item draggable-item"
      >
        <LetterBlock 
          :letter="item.letter" 
          :is-distractor="item.isDistractor"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import Sortable from 'sortablejs'
import LetterBlock from './LetterBlock.vue'

const props = defineProps({
  letters: { type: Array, required: true }
})

let poolSortable = null

const initPool = () => {
  if (poolSortable) {
    poolSortable.destroy()
  }

  const poolEl = document.getElementById('letter-pool')
  if (!poolEl) return

  poolSortable = new Sortable(poolEl, {
    group: {
      name: 'letters',
      pull: 'clone', // Keep it in the pool so it doesn't disappear visually during drag
      put: false // Do not allow dropping elements back into the pool
    },
    draggable: '.draggable-item',
    animation: 150,
    sort: false, // Disallow reordering letters inside the pool
    ghostClass: 'pool-ghost',
    dragClass: 'pool-drag',
    onEnd: (evt) => {
      // If dropped outside any valid slot, or if the slot put returned false,
      // it will not trigger an onAdd in the slot. 
      // We don't need manual resetting since Vue maintains the reactive `letters` array
      // and SortableJS clone behavior automatically keeps the DOM elements in place.
    }
  })
}

// Re-init pool when the set of letters changes
watch(() => props.letters, () => {
  setTimeout(initPool, 50)
}, { deep: true })

onMounted(() => {
  setTimeout(initPool, 100)
})

onUnmounted(() => {
  if (poolSortable) {
    poolSortable.destroy()
  }
})
</script>

<style scoped>
.letter-pool-container {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-top: 2px solid rgba(255, 255, 255, 0.05);
  padding: 1.25rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.pool-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  max-width: 100%;
}

.pool-item {
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s ease;
}

.pool-ghost {
  opacity: 0.4;
  transform: scale(0.9);
}

.pool-drag {
  opacity: 0.9;
}
</style>
