<template>
  <div class="add-tab-content">
    <!-- Standard Add Form (If no pending queue) -->
    <div v-if="pendingWords.length === 0" class="input-form">
      <label class="input-label">Enter word(s) to add:</label>
      <textarea 
        v-model="wordsInput" 
        placeholder="Type words here, separated by commas (e.g. dolphin, shadow, coding)"
        class="words-textarea"
      ></textarea>
      <p class="input-helper">Multiple words can be added by separating them with commas.</p>
      
      <button 
        class="btn-analyze btn-bouncy"
        :disabled="!wordsInput.trim()"
        @click="analyzeWords"
      >
        Analyze & Classify 🧠
      </button>
    </div>

    <!-- Confirmation Queue / Wizard (If words are pending verification) -->
    <div v-else class="confirmation-wizard pop-in">
      <div class="wizard-header">
        <span class="wizard-progress">Verifying word {{ currentWordIndex + 1 }} of {{ pendingWords.length }}</span>
        <button class="btn-cancel-all" @click="clearPendingQueue">Cancel All</button>
      </div>

      <div class="word-card glass-panel">
        <div class="word-card-header">
          <h3 class="word-title">{{ currentWordObj.word }}</h3>
          <div class="audio-preview-row">
            <button class="btn-audio-preview" @click="previewAudio(currentWordObj.word)">
              🔊 Listen Preview
            </button>
          </div>
        </div>

        <!-- Classification Details -->
        <div class="classifier-info">
          <div class="suggested-difficulty">
            <span>Suggested Difficulty:</span>
            <span 
              class="difficulty-badge" 
              :class="currentWordObj.suggestedDifficulty"
            >
              {{ currentWordObj.suggestedDifficulty.toUpperCase() }}
            </span>
          </div>
          
          <div class="score-info">
            Algorithm Score: <strong>{{ currentWordObj.score.toFixed(1) }}</strong>
          </div>

          <div class="classifier-reasons">
            <div class="reasons-title">Classification Reasons:</div>
            <ul>
              <li v-for="(reason, index) in currentWordObj.reasons" :key="index">
                💡 {{ reason }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Category and Override Controls -->
        <div class="override-controls">
          <div class="control-group">
            <label class="control-label">Select Category:</label>
            <select v-model="currentWordObj.category" class="select-input">
              <option 
                v-for="cat in categories" 
                :key="cat.id_cat || cat.id" 
                :value="cat.id_cat || cat.id"
              >
                {{ cat.icon }} {{ cat.name }}
              </option>
              <option value="NEW_CATEGORY">+ Create New Category...</option>
            </select>
          </div>

          <!-- New Category Subform -->
          <div v-if="currentWordObj.category === 'NEW_CATEGORY'" class="new-category-box glass-panel pop-in">
            <h4>New Category Details</h4>
            <div class="subform-group">
              <input 
                type="text" 
                v-model="newCategoryName" 
                placeholder="Category Name (e.g. Animals)" 
                class="text-input"
              />
            </div>
            <div class="subform-flex">
              <div class="subform-group flex-1">
                <label>Icon (Emoji):</label>
                <input 
                  type="text" 
                  v-model="newCategoryIcon" 
                  placeholder="🐻" 
                  class="text-input text-center"
                  maxlength="2"
                />
              </div>
              <div class="subform-group flex-2">
                <label>Color Accent:</label>
                <div class="color-picker-row">
                  <button 
                    v-for="color in availableColors" 
                    :key="color.value"
                    type="button"
                    class="color-btn"
                    :style="{ backgroundColor: color.colorVal }"
                    :class="{ active: newCategoryColor === color.value }"
                    @click="newCategoryColor = color.value"
                  ></button>
                </div>
              </div>
            </div>
            <button class="btn-create-category btn-bouncy" @click="createCategory">
              Add Category
            </button>
            <button class="btn-link" @click="cancelNewCategory">Cancel</button>
          </div>

          <div class="control-group">
            <label class="control-label">Difficulty Override:</label>
            <div class="difficulty-options">
              <button 
                class="diff-opt-btn easy" 
                :class="{ active: currentWordObj.difficulty === 'easy' }"
                @click="currentWordObj.difficulty = 'easy'"
              >
                Easy
              </button>
              <button 
                class="diff-opt-btn medium" 
                :class="{ active: currentWordObj.difficulty === 'medium' }"
                @click="currentWordObj.difficulty = 'medium'"
              >
                Medium
              </button>
              <button 
                class="diff-opt-btn hard" 
                :class="{ active: currentWordObj.difficulty === 'hard' }"
                @click="currentWordObj.difficulty = 'hard'"
              >
                Hard
              </button>
            </div>
          </div>
        </div>

        <div class="wizard-actions">
          <button class="btn-skip" @click="skipCurrentWord">Skip Word</button>
          <button class="btn-confirm btn-bouncy" @click="saveCurrentWord">
            Save Word 💾
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { classifyWord } from '@/utils/classifyWord'
import { useSpeech } from '@/composables/useSpeech'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['word-saved', 'category-created'])

const { speakWord } = useSpeech()

const wordsInput = ref('')
const pendingWords = ref([])
const currentWordIndex = ref(0)

const newCategoryName = ref('')
const newCategoryIcon = ref('🐻')
const newCategoryColor = ref('cyan')
const availableColors = [
  { value: 'cyan', colorVal: 'var(--color-accent-cyan)' },
  { value: 'pink', colorVal: 'var(--color-accent-pink)' },
  { value: 'purple', colorVal: 'var(--color-accent-purple)' },
  { value: 'gold', colorVal: 'var(--color-accent-gold)' }
]

const currentWordObj = computed(() => {
  if (pendingWords.value.length === 0 || currentWordIndex.value >= pendingWords.value.length) {
    return null
  }
  return pendingWords.value[currentWordIndex.value]
})

const analyzeWords = () => {
  if (!wordsInput.value.trim()) return

  const list = wordsInput.value
    .split(',')
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0)

  if (list.length === 0) return

  const defaultCategory = props.categories[0]?.id_cat || props.categories[0]?.id || ''
  
  pendingWords.value = list.map(word => {
    const analysis = classifyWord(word)
    return {
      word,
      suggestedDifficulty: analysis.difficulty,
      difficulty: analysis.difficulty,
      score: analysis.score,
      reasons: analysis.reasons,
      category: defaultCategory
    }
  })

  currentWordIndex.value = 0
  wordsInput.value = ''
}

const previewAudio = (word) => {
  speakWord(word)
}

const saveCurrentWord = async () => {
  const current = currentWordObj.value
  if (!current) return

  emit('word-saved', {
    word: current.word,
    category: current.category,
    difficulty: current.difficulty
  })
  
  proceedInQueue()
}

const skipCurrentWord = () => {
  proceedInQueue()
}

const proceedInQueue = () => {
  if (currentWordIndex.value < pendingWords.value.length - 1) {
    currentWordIndex.value++
  } else {
    pendingWords.value = []
    currentWordIndex.value = 0
  }
}

const clearPendingQueue = () => {
  pendingWords.value = []
  currentWordIndex.value = 0
}

const createCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) {
    alert('Please enter a category name.')
    return
  }

  const selectedColorObj = availableColors.find(c => c.value === newCategoryColor.value)
  emit('category-created', {
    name,
    icon: newCategoryIcon.value || '🐻',
    color: selectedColorObj ? selectedColorObj.colorVal : 'var(--color-accent-cyan)'
  }, (newCatId) => {
    if (newCatId && currentWordObj.value) {
      currentWordObj.value.category = newCatId
    }
  })
  
  newCategoryName.value = ''
  newCategoryIcon.value = '🐻'
  newCategoryColor.value = 'cyan'
}

const cancelNewCategory = () => {
  if (currentWordObj.value) {
    currentWordObj.value.category = props.categories[0]?.id_cat || props.categories[0]?.id || ''
  }
}
</script>

<style scoped>
.add-tab-content {
  display: flex;
  flex-direction: column;
}

.input-form {
  display: flex;
  flex-direction: column;
}

.input-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-light);
  margin-bottom: 0.5rem;
}

.words-textarea {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 0.75rem;
  color: white;
  font-family: var(--font-main);
  font-size: 1.1rem;
  min-height: 120px;
  resize: vertical;
  outline: none;
  margin-bottom: 0.5rem;
  user-select: text;
}

.words-textarea:focus {
  border-color: var(--color-accent-purple);
}

.input-helper {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 1.25rem;
  line-height: 1.2;
}

.btn-analyze {
  width: 100%;
  padding: 0.9rem;
  font-size: 1.2rem;
  background: linear-gradient(135deg, var(--color-accent-purple) 0%, #7c3aed 100%);
  border-bottom: 4px solid rgba(0, 0, 0, 0.25);
  border-left: none;
  border-right: none;
  border-top: none;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 800;
  transition: transform 0.1s ease;
}

.btn-analyze:active {
  transform: scale(0.98);
}

.btn-analyze:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* Confirmation Wizard */
.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.wizard-progress {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-dim);
}

.btn-cancel-all {
  background: transparent;
  border: none;
  color: var(--color-letter-red);
  font-family: var(--font-main);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
}

.word-card {
  padding: 1.25rem;
  border-color: rgba(255, 255, 255, 0.12);
  margin-bottom: 1rem;
}

.word-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
}

.word-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-accent-cyan);
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.15);
}

.btn-audio-preview {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: white;
  padding: 0.4rem 0.8rem;
  font-family: var(--font-main);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-audio-preview:hover {
  background: rgba(255, 255, 255, 0.15);
}

.classifier-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 14px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.suggested-difficulty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.difficulty-badge {
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 800;
  color: white;
}

.difficulty-badge.easy { background: var(--color-accent-cyan); }
.difficulty-badge.medium { background: var(--color-accent-pink); }
.difficulty-badge.hard { background: var(--color-accent-purple); }

.score-info {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 0.6rem;
}

.classifier-reasons {
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  padding-top: 0.5rem;
}

.reasons-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.classifier-reasons ul {
  list-style: none;
  padding-left: 0.25rem;
}

.classifier-reasons li {
  font-size: 0.85rem;
  color: var(--color-text-light);
  line-height: 1.3;
  margin-bottom: 0.15rem;
}

.override-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-dim);
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

.difficulty-options {
  display: flex;
  gap: 0.5rem;
}

.diff-opt-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.45rem;
  color: var(--color-text-dim);
  font-family: var(--font-main);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.diff-opt-btn.easy.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--color-accent-cyan);
  color: var(--color-accent-cyan);
}

.diff-opt-btn.medium.active {
  background: rgba(236, 72, 153, 0.2);
  border-color: var(--color-accent-pink);
  color: var(--color-accent-pink);
}

.diff-opt-btn.hard.active {
  background: rgba(168, 85, 247, 0.2);
  border-color: var(--color-accent-purple);
  color: var(--color-accent-purple);
}

.wizard-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-skip {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  color: var(--color-text-dim);
  font-family: var(--font-main);
  font-weight: 700;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-skip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

.btn-confirm {
  flex: 2;
  background: linear-gradient(135deg, var(--color-accent-pink) 0%, #be185d 100%);
  color: white;
  padding: 0.75rem;
  font-size: 1.1rem;
  border-radius: 14px;
  border-bottom: 4px solid rgba(0, 0, 0, 0.2);
  border-left: none;
  border-right: none;
  border-top: none;
  font-weight: 800;
  cursor: pointer;
}

/* New Category Panel */
.new-category-box {
  padding: 0.75rem 1rem;
  border-color: var(--color-accent-purple);
  margin-top: 0.25rem;
}

.new-category-box h4 {
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  color: var(--color-accent-purple);
}

.subform-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.subform-group label {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  font-weight: 600;
}

.subform-flex {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.text-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.4rem;
  color: white;
  font-family: var(--font-main);
  font-size: 0.95rem;
  outline: none;
}

.text-center { text-align: center; }

.color-picker-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  height: 32px;
}

.color-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s ease;
}

.color-btn.active {
  border-color: white;
  transform: scale(1.15);
  box-shadow: 0 0 6px rgba(255,255,255,0.4);
}

.btn-create-category {
  width: 100%;
  padding: 0.45rem;
  background: var(--color-accent-purple);
  color: white;
  font-size: 0.95rem;
  border-radius: 10px;
  border-bottom: 3px solid rgba(0, 0, 0, 0.2);
  border-left: none;
  border-right: none;
  border-top: none;
  font-weight: 800;
  cursor: pointer;
  margin-bottom: 0.4rem;
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-family: var(--font-main);
  font-size: 0.85rem;
  cursor: pointer;
  display: block;
  margin: 0 auto;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .btn-skip, .btn-confirm {
    padding: 0.6rem;
    font-size: 0.95rem;
    border-radius: 12px;
  }

  .words-textarea {
    min-height: 90px;
    font-size: 1rem;
    border-radius: 12px;
  }

  .btn-analyze {
    padding: 0.75rem;
    font-size: 1.05rem;
    border-radius: 14px;
  }

  .word-card {
    padding: 0.75rem;
    border-radius: 16px;
  }

  .word-title {
    font-size: 1.4rem;
  }

  .classifier-info {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  .override-controls {
    gap: 0.5rem;
  }

  .wizard-actions {
    gap: 0.5rem;
  }
}
</style>
