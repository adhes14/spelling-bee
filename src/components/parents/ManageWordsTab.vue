<template>
  <div class="manage-tab-content">
    <div class="filter-bar">
      <label class="filter-label">Filter by Category:</label>
      <select v-model="filterCategory" class="select-input select-filter">
        <option value="ALL">All Categories</option>
        <option 
          v-for="cat in categories" 
          :key="cat.id_cat || cat.id" 
          :value="cat.id_cat || cat.id"
        >
          {{ cat.icon }} {{ cat.name }}
        </option>
      </select>
    </div>

    <!-- Custom Words list -->
    <div class="words-list-container">
      <div v-if="filteredCustomWords.length === 0" class="no-words">
        No custom words found. Go to "Add Words" to expand the vocabulary!
      </div>
      <div v-else class="words-list">
        <div 
          v-for="item in filteredCustomWords" 
          :key="item.id" 
          class="word-item glass-panel"
        >
          <div class="word-info">
            <span class="word-text">{{ item.word }}</span>
            <span class="word-cat-badge">
              {{ getCategoryName(item.category) }}
            </span>
          </div>
          
          <div class="word-actions-row">
            <!-- Inline difficulty select -->
            <select 
              :value="item.difficulty" 
              @change="changeWordDifficulty(item.id, $event.target.value)"
              class="select-input select-mini"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button class="btn-delete" @click="deleteCustomWord(item.id, item.word)">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  words: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['word-deleted', 'difficulty-changed'])

const filterCategory = ref('ALL')

const filteredCustomWords = computed(() => {
  const allCustom = props.words.filter(w => w.isCustom === true || w.isCustom === 1)
  if (filterCategory.value === 'ALL') {
    return allCustom
  }
  return allCustom.filter(w => w.category === filterCategory.value)
})

const getCategoryName = (catId) => {
  const cat = props.categories.find(c => c.id_cat === catId || c.id === catId)
  return cat ? `${cat.icon} ${cat.name}` : catId
}

const changeWordDifficulty = (wordId, difficulty) => {
  emit('difficulty-changed', { id: wordId, difficulty })
}

const deleteCustomWord = (wordId, wordText) => {
  if (confirm(`Are you sure you want to delete the word "${wordText}"?`)) {
    emit('word-deleted', wordId)
  }
}
</script>

<style scoped>
.manage-tab-content {
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.filter-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-dim);
}

.select-filter {
  width: 100%;
}

.select-input {
  background: rgba(13, 13, 43, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 12px;
  padding: 0.55rem;
  font-family: var(--font-main);
  font-size: 1rem;
  outline: none;
}

.words-list-container {
  flex: 1;
}

.no-words {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-dim);
  font-size: 1rem;
}

.words-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.word-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-color: rgba(255, 255, 255, 0.08);
}

.word-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.word-item .word-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  text-transform: capitalize;
}

.word-cat-badge {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  font-weight: 600;
}

.word-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-mini {
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  border-radius: 8px;
}

.btn-delete {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.9rem;
  line-height: 1;
}

.btn-delete:active {
  background: rgba(239, 68, 68, 0.3);
}

@media (max-width: 480px) {
  .filter-bar {
    margin-bottom: 0.75rem;
    gap: 0.15rem;
  }

  .filter-label {
    font-size: 0.85rem;
  }

  .select-input {
    padding: 0.45rem;
    font-size: 0.9rem;
    border-radius: 10px;
  }

  .word-item {
    padding: 0.5rem 0.75rem;
    border-radius: 16px;
  }

  .word-item .word-text {
    font-size: 1.1rem;
  }

  .word-cat-badge {
    font-size: 0.75rem;
  }

  .select-mini {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
  }

  .btn-delete {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
  }
}
</style>
