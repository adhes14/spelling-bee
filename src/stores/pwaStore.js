import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePwaStore = defineStore('pwa', () => {
  const deferredPrompt = ref(null)
  const isPWA = ref(false)
  
  // Detect iOS device
  const isIOS = computed(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
    
    // Check for iOS devices
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    
    // Also check for modern iPads which pretend to be Macintosh
    const isIPadOS = navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(userAgent)
    
    return isIOSDevice || isIPadOS
  })

  // Detect standalone / installed mode
  const checkPwaMode = () => {
    if (typeof window === 'undefined') return
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isSafariStandalone = window.navigator.standalone === true
    
    isPWA.value = isStandalone || isSafariStandalone
  }

  // Is installable if we have a prompt OR if it is iOS in a browser (alternative flow)
  const isInstallable = computed(() => {
    if (isPWA.value) return false
    return deferredPrompt.value !== null || isIOS.value
  })

  // Initialize listeners
  const initInstallListeners = () => {
    if (typeof window === 'undefined') return

    checkPwaMode()

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser's automatic banner
      e.preventDefault()
      deferredPrompt.value = e
    })

    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null
      isPWA.value = true
      console.log('Spelling Bee Kids has been installed successfully!')
    })
  }

  // Trigger installation flow
  const triggerInstall = async () => {
    if (isIOS.value && !isPWA.value) {
      // iOS doesn't support the native prompt. HomeView will capture this
      // and show manual instructions modal/dialog instead.
      return { ios: true, success: false }
    }

    if (!deferredPrompt.value) {
      return { ios: false, success: false }
    }

    // Trigger standard browser install prompt
    deferredPrompt.value.prompt()

    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      deferredPrompt.value = null
      return { ios: false, success: true }
    }

    return { ios: false, success: false }
  }

  return {
    deferredPrompt,
    isPWA,
    isIOS,
    isInstallable,
    initInstallListeners,
    triggerInstall
  }
})
