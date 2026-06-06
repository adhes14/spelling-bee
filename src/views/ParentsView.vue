<template>
  <div class="parents-view">
    <!-- Header -->
    <header class="header">
      <button class="btn-back" @click="goHome" aria-label="Go Home">
        🏠 Home
      </button>
      <h1 class="view-title">Parents Zone</h1>
    </header>

    <!-- Content Area -->
    <div class="content-container">
      
      <!-- Math Gate (If not authenticated) -->
      <div v-if="!isAuthenticated" class="gate-panel glass-panel pop-in">
        <div class="gate-icon">🔒</div>
        <h2 class="gate-title">Security Check</h2>
        <p class="gate-subtitle">Please solve the math puzzle to enter the Parents & Teachers configuration.</p>
        
        <form @submit.prevent="verifyGate" class="gate-form">
          <div class="puzzle-expression">{{ challengeText }}</div>
          
          <input 
            type="number" 
            v-model="challengeInput" 
            placeholder="Your answer" 
            class="gate-input"
            required
            ref="inputRef"
          />
          
          <p v-if="challengeError" class="error-text">{{ challengeError }}</p>
          
          <button type="submit" class="btn-submit btn-bouncy">
            Unlock 🔓
          </button>
        </form>
      </div>

      <!-- Parents Dashboard (If authenticated) -->
      <div v-else class="dashboard-panel glass-panel pop-in">
        <!-- Tabs Nav -->
        <nav class="tabs-nav">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'add' }"
            @click="activeTab = 'add'"
          >
            ➕ Add Words
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'manage' }"
            @click="activeTab = 'manage'"
          >
            📋 Manage Words
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'config' }"
            @click="activeTab = 'config'"
          >
            ⚙️ Config
          </button>
        </nav>

        <!-- Tab Content -->
        <div class="tab-content">
          
          <!-- TAB 1: ADD WORDS -->
          <div v-if="activeTab === 'add'" class="add-tab-content">
            
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
                        v-for="cat in dictionaryStore.categories" 
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

          <!-- TAB 2: MANAGE WORDS -->
          <div v-if="activeTab === 'manage'" class="manage-tab-content">
            <div class="filter-bar">
              <label class="filter-label">Filter by Category:</label>
              <select v-model="filterCategory" class="select-input select-filter">
                <option value="ALL">All Categories</option>
                <option 
                  v-for="cat in dictionaryStore.categories" 
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
          
          <!-- TAB 3: CONFIGURATION -->
          <div v-if="activeTab === 'config'" class="config-tab-content">
            <div class="config-group">
              <label class="config-label">Word Difficulty Filter:</label>
              <select 
                v-model="wordDifficultyFilter" 
                @change="updateConfig"
                class="select-input"
              >
                <option value="easy">🟢 Easy Words Only (Recommended for beginners)</option>
                <option value="easy,medium">🟡 Easy + Medium Words</option>
                <option value="easy,medium,hard">🔴 All Words (No restrictions)</option>
              </select>
              <p class="config-helper">
                Controls the maximum difficulty level of words shown to children in gameplay.
              </p>
            </div>

            <div class="config-group">
              <label class="config-label">Session Word Limit:</label>
              <div class="slider-container">
                <input 
                  type="range" 
                  v-model="sessionWordLimit" 
                  min="5" 
                  max="20" 
                  step="1"
                  @change="updateConfig"
                  class="config-slider"
                />
                <span class="slider-val">{{ sessionWordLimit }} words</span>
              </div>
              <p class="config-helper">
                Defines the maximum number of words per practice session (range: 5 to 20).
              </p>
            </div>

            <div class="config-group">
              <label class="config-label">Score Decay Per Day:</label>
              <div class="slider-container">
                <input 
                  type="range" 
                  v-model="scoreDecayPerDay" 
                  min="1" 
                  max="20" 
                  step="1"
                  @change="updateConfig"
                  class="config-slider"
                />
                <span class="slider-val">{{ scoreDecayPerDay }} points/day</span>
              </div>
              <p class="config-helper">
                Defines the amount of score subtracted from practiced words per day (range: 1 to 20).
              </p>
            </div>
          </div>
          
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDictionaryStore } from '@/stores/dictionaryStore'
import { classifyWord } from '@/utils/classifyWord'
import { useSpeech } from '@/composables/useSpeech'

const router = useRouter()
const dictionaryStore = useDictionaryStore()
const { speakWord } = useSpeech()

// Authenticated state
const isAuthenticated = ref(false)

// Math Gate challenge state
const challengeText = ref('')
const challengeInput = ref('')
const challengeAnswer = ref(0)
const challengeError = ref('')
const inputRef = ref(null)

const numbersInSpanish = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 
  'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'
]

// Tab navigation
const activeTab = ref('add') // 'add' or 'manage' or 'config'

// Configuration states
const wordDifficultyFilter = ref('easy')
const sessionWordLimit = ref(10)
const scoreDecayPerDay = ref(5)

const updateConfig = async () => {
  await dictionaryStore.updateSettings({
    wordDifficultyFilter: wordDifficultyFilter.value,
    sessionWordLimit: sessionWordLimit.value,
    scoreDecayPerDay: scoreDecayPerDay.value
  })
}

// Form states for adding words
const wordsInput = ref('')
const pendingWords = ref([])
const currentWordIndex = ref(0)

// New category states
const newCategoryName = ref('')
const newCategoryIcon = ref('🐻')
const newCategoryColor = ref('cyan')
const availableColors = [
  { value: 'cyan', colorVal: 'var(--color-accent-cyan)' },
  { value: 'pink', colorVal: 'var(--color-accent-pink)' },
  { value: 'purple', colorVal: 'var(--color-accent-purple)' },
  { value: 'gold', colorVal: 'var(--color-accent-gold)' }
]

// Filter states for managing words
const filterCategory = ref('ALL')

// Computed word objects inside confirmation wizard
const currentWordObj = computed(() => {
  if (pendingWords.value.length === 0 || currentWordIndex.value >= pendingWords.value.length) {
    return null
  }
  return pendingWords.value[currentWordIndex.value]
})

// Custom words list from db
const filteredCustomWords = computed(() => {
  const allCustom = dictionaryStore.words.filter(w => w.isCustom === true || w.isCustom === 1)
  if (filterCategory.value === 'ALL') {
    return allCustom
  }
  return allCustom.filter(w => w.category === filterCategory.value)
})

// Capitalization helper
const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Generate Gate challenge
const generateChallenge = () => {
  const n1 = Math.floor(Math.random() * 8) + 2 // 2 to 9
  const n2 = Math.floor(Math.random() * 8) + 2 // 2 to 9
  challengeAnswer.value = n1 * n2
  challengeText.value = `${capitalize(numbersInSpanish[n1])} por ${numbersInSpanish[n2]} es igual a...`
  challengeInput.value = ''
  challengeError.value = ''
}

// Verify Gate Answer
const verifyGate = () => {
  if (parseInt(challengeInput.value) === challengeAnswer.value) {
    sessionStorage.setItem('parents_authenticated', 'true')
    isAuthenticated.value = true
  } else {
    challengeError.value = 'Incorrect answer! Please try again.'
    generateChallenge()
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }
}

// Words input processor
const analyzeWords = () => {
  if (!wordsInput.value.trim()) return

  // Split by comma, clean words
  const list = wordsInput.value
    .split(',')
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0)

  if (list.length === 0) return

  // Create queue with suggestions
  const defaultCategory = dictionaryStore.categories[0]?.id_cat || dictionaryStore.categories[0]?.id || ''
  
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

// Word Wizard navigation & Actions
const previewAudio = (word) => {
  speakWord(word)
}

const saveCurrentWord = async () => {
  const current = currentWordObj.value
  if (!current) return

  try {
    await dictionaryStore.addWord({
      word: current.word,
      category: current.category,
      difficulty: current.difficulty
    })
    
    proceedInQueue()
  } catch (error) {
    alert(error.message || 'Failed to save word.')
  }
}

const skipCurrentWord = () => {
  proceedInQueue()
}

const proceedInQueue = () => {
  if (currentWordIndex.value < pendingWords.value.length - 1) {
    currentWordIndex.value++
  } else {
    // Finished queue
    pendingWords.value = []
    currentWordIndex.value = 0
  }
}

const clearPendingQueue = () => {
  pendingWords.value = []
  currentWordIndex.value = 0
}

// Create custom category
const createCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) {
    alert('Please enter a category name.')
    return
  }

  try {
    const selectedColorObj = availableColors.find(c => c.value === newCategoryColor.value)
    const result = await dictionaryStore.addCategory({
      name,
      icon: newCategoryIcon.value || '📁',
      color: selectedColorObj ? selectedColorObj.colorVal : 'var(--color-accent-cyan)'
    })

    if (result && currentWordObj.value) {
      currentWordObj.value.category = result.id_cat
    }
    
    // Reset Category subform fields
    newCategoryName.value = ''
    newCategoryIcon.value = '🐻'
    newCategoryColor.value = 'cyan'
  } catch (error) {
    alert(error.message || 'Failed to create category.')
  }
}

const cancelNewCategory = () => {
  if (currentWordObj.value) {
    currentWordObj.value.category = dictionaryStore.categories[0]?.id_cat || dictionaryStore.categories[0]?.id || ''
  }
}

// Dictionary management
const getCategoryName = (catId) => {
  const cat = dictionaryStore.categories.find(c => c.id_cat === catId || c.id === catId)
  return cat ? `${cat.icon} ${cat.name}` : catId
}

const changeWordDifficulty = async (wordId, difficulty) => {
  try {
    await dictionaryStore.updateWordDifficulty(wordId, difficulty)
  } catch (error) {
    console.error('Failed to change difficulty:', error)
  }
}

const deleteCustomWord = async (wordId, wordText) => {
  if (confirm(`Are you sure you want to delete the word "${wordText}"?`)) {
    try {
      await dictionaryStore.deleteWord(wordId)
    } catch (error) {
      console.error('Failed to delete word:', error)
    }
  }
}

// Route navigation
const goHome = () => {
  router.push({ name: 'home' })
}

onMounted(async () => {
  // Check session storage authentication status
  if (sessionStorage.getItem('parents_authenticated') === 'true') {
    isAuthenticated.value = true
  } else {
    generateChallenge()
  }

  // Ensure dictionary initialized
  await dictionaryStore.init()

  wordDifficultyFilter.value = dictionaryStore.globalSettings?.wordDifficultyFilter || 'easy'
  sessionWordLimit.value = dictionaryStore.globalSettings?.sessionWordLimit || 10
  scoreDecayPerDay.value = dictionaryStore.globalSettings?.scoreDecayPerDay || 5
})
</script>

<style scoped>
.parents-view {
  width: 100%;
  height: 100%;
  padding: calc(1rem + var(--safe-area-top)) 1.5rem calc(1.5rem + var(--safe-area-bottom));
  display: flex;
  flex-direction: column;
  z-index: 1;
  overflow: hidden;
}

.header {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
}

.btn-back {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 1rem;
  font-weight: 700;
  padding: 0.5rem 0.9rem;
  border-radius: 14px;
  cursor: pointer;
  color: var(--color-text-light);
  line-height: 1;
  transition: transform 0.1s ease, background 0.2s ease;
  font-family: var(--font-main);
  z-index: 10;
}

.btn-back:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.15);
}

.view-title {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-accent-star);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  text-transform: uppercase;
  letter-spacing: -0.5px;
  pointer-events: none;
}

.content-container {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Gating Panel */
.gate-panel {
  max-width: 400px;
  width: 100%;
  margin: auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.gate-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  animation: hoverBee 3s ease-in-out infinite;
}

.gate-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text-light);
  margin-bottom: 0.5rem;
}

.gate-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-dim);
  margin-bottom: 1.5rem;
  line-height: 1.3;
}

.gate-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.puzzle-expression {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-accent-cyan);
  margin-bottom: 1rem;
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.2);
}

.gate-input {
  width: 100%;
  max-width: 200px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 0.75rem;
  color: white;
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 1rem;
  font-family: var(--font-main);
  outline: none;
  transition: border-color 0.2s ease;
}

.gate-input:focus {
  border-color: var(--color-accent-cyan);
}

.error-text {
  color: var(--color-letter-red);
  font-size: 0.95rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.btn-submit {
  width: 100%;
  max-width: 200px;
  padding: 0.75rem;
  font-size: 1.15rem;
  background: linear-gradient(135deg, var(--color-accent-cyan) 0%, #0891b2 100%);
  border-bottom: 4px solid rgba(0, 0, 0, 0.2);
}

/* Dashboard Panel */
.dashboard-panel {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  overflow: hidden;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 14px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.6rem;
  border-radius: 10px;
  color: var(--color-text-dim);
  font-family: var(--font-main);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
}

/* Add Words Form */
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
  user-select: text; /* Allow paste and select */
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
  padding: 0.75rem;
  font-size: 1.1rem;
  border-bottom: 4px solid rgba(0, 0, 0, 0.2);
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
  font-size: 0.95rem;
  border-bottom: 3px solid rgba(0, 0, 0, 0.2);
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

/* Manage Tab */
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

/* Configuration Tab */
.config-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-light);
}

.config-helper {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  line-height: 1.3;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.config-slider {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  accent-color: var(--color-accent-purple);
}

.slider-val {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent-purple);
  min-width: 80px;
}
</style>
