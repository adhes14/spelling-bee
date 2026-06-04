<template>
  <div class="app-wrapper">
    <div class="game-container">
      <div class="stars-bg"></div>
      
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style>
/* Centering wrapper on desktop, full screen on mobile */
.app-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background-color: var(--color-bg-deep);
  overflow: hidden;
}

/* Page transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(15px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}
</style>
