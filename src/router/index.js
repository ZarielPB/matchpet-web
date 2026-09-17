import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes = [
  // Rutas Públicas
  { path: '/', name: 'Home', component: () => import('../views/HomeView.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  { path: '/registro', name: 'RegisterAdoptante', component: () => import('../views/RegisterAdoptanteView.vue') },
  { path: '/registro-refugio', name: 'RegisterRefugio', component: () => import('../views/RegisterRefugioView.vue') },
  { path: '/reset-password', name: 'ResetPassword', component: () => import('../views/ResetPasswordView.vue') },

  // Rutas Protegidas: Adoptante
  { 
    path: '/adoptante/dashboard', 
    name: 'AdoptanteDashboard', 
    component: () => import('../views/AdoptanteDashboard.vue'),
    meta: { requiresAuth: true, role: 'adoptante' }
  },

  // Rutas Protegidas: Refugio
  { 
    path: '/refugio/dashboard', 
    name: 'RefugioDashboard', 
    component: () => import('../views/RefugioDashboard.vue'),
    meta: { requiresAuth: true, role: 'refugio' }
  },
  //  Ruta catch-all: cualquier URL no reconocida redirige al Home
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 🛡️ GUARD GLOBAL DE NAVEGACIÓN
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 0. Restaurar la sesión desde localStorage de forma síncrona-aparente
  //    ANTES de evaluar isAuthenticated. Sin esto, un F5 directo en una
  //    ruta protegida expulsa al usuario porque la sesión aún no ha
  //    sido restaurada por onAuthStateChange.
  await authStore.getSession()

  // 1. Si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // No está logueado -> Ir al login
      return next({ name: 'Login' })
    } 
    if (to.meta.role && authStore.userRole !== to.meta.role) {
      // Está logueado pero no tiene el rol correcto -> Redirigir a SU dashboard
      if (authStore.userRole === 'adoptante') return next({ name: 'AdoptanteDashboard' })
      if (authStore.userRole === 'refugio') return next({ name: 'RefugioDashboard' })
      return next({ name: 'Home' })
    }
    // Todo correcto, puede pasar
    return next()
  } 
  
  // 2. Si está logueado e intenta ir a Login o Registro -> Redirigir a su dashboard
  if (authStore.isAuthenticated && (to.name === 'Login' || to.name === 'RegisterAdoptante' || to.name === 'RegisterRefugio')) {
    if (authStore.userRole === 'adoptante') return next({ name: 'AdoptanteDashboard' })
    if (authStore.userRole === 'refugio') return next({ name: 'RefugioDashboard' })
  }
  
  next()
})

export default router
