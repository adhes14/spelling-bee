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
            :class="{ active: activeTab === 'progress' }"
            @click="activeTab = 'progress'"
          >
            📊 Progress Report
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
          <AddWordsTab 
            v-show="activeTab === 'add'" 
            :categories="dictionaryStore.categories"
            @word-saved="handleWordSaved"
            @category-created="handleCategoryCreated"
          />
          <ManageWordsTab 
            v-show="activeTab === 'manage'" 
            :categories="dictionaryStore.categories"
            :words="dictionaryStore.words"
            @word-deleted="handleWordDeleted"
            @difficulty-changed="handleDifficultyChanged"
          />
          <ProgressTab 
            v-show="activeTab === 'progress'" 
            :categories="dictionaryStore.categories"
            :words="dictionaryStore.words"
            :is-active="activeTab === 'progress'"
          />
          <ConfigTab 
            v-show="activeTab === 'config'" 
            :settings="dictionaryStore.globalSettings"
            @settings-updated="handleSettingsUpdated"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDictionaryStore } from '@/stores/dictionaryStore'

import AddWordsTab from '@/components/parents/AddWordsTab.vue'
import ManageWordsTab from '@/components/parents/ManageWordsTab.vue'
import ProgressTab from '@/components/parents/ProgressTab.vue'
import ConfigTab from '@/components/parents/ConfigTab.vue'

const router = useRouter()
const dictionaryStore = useDictionaryStore()

// Authenticated state
const isAuthenticated = ref(false)

// Math Gate challenge state
const challengeText = ref('')
const challengeInput = ref('')
const challengeAnswer = ref(0)
const challengeError = ref('')
const inputRef = ref(null)

const numbersInEnglish = [
  'zero', 'one', 'two', 'three', 'four', 
  'five', 'six', 'seven', 'eight', 'nine', 'ten'
]

// Tab navigation
const activeTab = ref('add')

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
  challengeText.value = `${capitalize(numbersInEnglish[n1])} times ${numbersInEnglish[n2]} equals...`
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

// Emitted Event Handlers
const handleWordSaved = async ({ word, category, difficulty }) => {
  try {
    await dictionaryStore.addWord({ word, category, difficulty })
  } catch (error) {
    alert(error.message || 'Failed to save word.')
  }
}

const handleCategoryCreated = async ({ name, icon, color }, callback) => {
  try {
    const result = await dictionaryStore.addCategory({ name, icon, color })
    if (result && callback) {
      callback(result.id_cat)
    }
  } catch (error) {
    alert(error.message || 'Failed to create category.')
  }
}

const handleWordDeleted = async (wordId) => {
  try {
    await dictionaryStore.deleteWord(wordId)
  } catch (error) {
    console.error('Failed to delete word:', error)
  }
}

const handleDifficultyChanged = async ({ id, difficulty }) => {
  try {
    await dictionaryStore.updateWordDifficulty(id, difficulty)
  } catch (error) {
    console.error('Failed to update difficulty:', error)
  }
}

const handleSettingsUpdated = async (settings) => {
  try {
    await dictionaryStore.updateSettings(settings)
  } catch (error) {
    console.error('Failed to update settings:', error)
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
  border-top: none;
  border-left: none;
  border-right: none;
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

@keyframes hoverBee {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
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
  border-top: none;
  border-left: none;
  border-right: none;
  border-radius: 14px;
  color: white;
  font-weight: 800;
  cursor: pointer;
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

@media (max-width: 480px) {
  .parents-view {
    padding: calc(0.75rem + var(--safe-area-top)) 0.75rem calc(1rem + var(--safe-area-bottom));
  }

  .header {
    margin-bottom: 1rem;
  }

  .btn-back {
    padding: 0.4rem 0.7rem;
    font-size: 0.85rem;
    border-radius: 10px;
  }

  .view-title {
    font-size: 1.3rem;
  }

  .dashboard-panel {
    padding: 0.75rem;
    border-radius: 18px;
  }

  .tabs-nav {
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 4px;
    border-radius: 12px;
    margin-bottom: 1rem;
  }
  
  .tab-btn {
    flex: 1 1 calc(50% - 0.15rem);
    font-size: 0.85rem;
    padding: 0.45rem 0.2rem;
    border-radius: 8px;
  }
}
</style>
