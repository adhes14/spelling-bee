import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import { registerSW } from 'virtual:pwa-register'

// Request persistent storage if supported (Paso 3.3 in PRD)
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persisted) => {
    if (persisted) {
      console.log('Storage persistence granted! IndexedDB is protected.');
    } else {
      console.warn('Storage persistence not granted. OS might purge local storage under disk pressure.');
    }
  }).catch((err) => {
    console.error('Error requesting storage persistence:', err);
  });
}

// Register PWA Service Worker (Paso 3.2 in PRD)
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New update available. The app will auto-update.');
  },
  onOfflineReady() {
    console.log('Spelling Bee is ready to work offline!');
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize IndexedDB Dictionary Store (Paso 2.1 & 2.2 in PRD)
import { useDictionaryStore } from '@/stores/dictionaryStore'
import { useGameStore } from '@/stores/gameStore'

const dictionaryStore = useDictionaryStore(pinia)
const gameStore = useGameStore(pinia)

dictionaryStore.init().then(() => {
  const decayPerDay = dictionaryStore.globalSettings?.scoreDecayPerDay || 5
  gameStore.applyDecayOnStartup(decayPerDay)
})

app.mount('#app')
