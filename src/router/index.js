import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/registro',
    name: 'RegisterAdoptante',
    component: () => import('../views/RegisterAdoptanteView.vue')
  },
  {
    path: '/registro-refugio',
    name: 'RegisterRefugio',
    component: () => import('../views/RegisterRefugioView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
