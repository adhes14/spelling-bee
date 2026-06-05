import { createRouter, createWebHistory } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import HomeView from '@/views/HomeView.vue'
import SubLevelSelectView from '@/views/SubLevelSelectView.vue'
import GameView from '@/views/GameView.vue'
import ResultView from '@/views/ResultView.vue'
import ParentsView from '@/views/ParentsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/select-level',
      name: 'select-level',
      component: SubLevelSelectView,
      beforeEnter: (to, from, next) => {
        const store = useGameStore()
        if (!store.currentCategory) {
          next({ name: 'home' })
        } else {
          next()
        }
      }
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      beforeEnter: (to, from, next) => {
        const store = useGameStore()
        if (!store.currentCategory || !store.currentWordObj) {
          next({ name: 'home' })
        } else {
          next()
        }
      }
    },
    {
      path: '/result',
      name: 'result',
      component: ResultView,
      beforeEnter: (to, from, next) => {
        const store = useGameStore()
        if (!store.currentCategory) {
          next({ name: 'home' })
        } else {
          next()
        }
      }
    },
    {
      path: '/parents',
      name: 'parents',
      component: ParentsView
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router
