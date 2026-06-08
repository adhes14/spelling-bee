import { storeToRefs } from 'pinia'
import { usePwaStore } from '@/stores/pwaStore'

export function usePwaInstall() {
  const pwaStore = usePwaStore()
  const { isInstallable, isPWA, isIOS } = storeToRefs(pwaStore)

  const installApp = async () => {
    return await pwaStore.triggerInstall()
  }

  return {
    isInstallable,
    isPWA,
    isIOS,
    installApp
  }
}
