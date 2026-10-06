import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes = [
  // Rutas Públicas
  { path: '/', name: 'Home', component: () => import('../views/HomeView.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  { path: '/registro', name: 'RegisterAdoptante', component: () => import('../views/RegisterAdoptanteView.vue') },
  { path: '/registro-refugio', name: 'RegisterRefugio', component: () => import('../views/RegisterRefugioView.vue') },
  { path: '/reset-password', name: 'ResetPassword', component: () => import('../views/ResetPasswordView.vue') },
  { path: '/catalogo', name: 'Catalog', component: () => import('../views/CatalogView.vue') },
  { path: '/mascota/:id', name: 'PetDetail', component: () => import('../views/PetDetailView.vue') },

  // Rutas Protegadas: Adoptante (HU-07 + HU-08)
  {
    path: '/adoptante/dashboard',
    name: 'AdoptanteDashboard',
    component: () => import('../views/AdoptanteDashboard.vue'),
    meta: { requiresAuth: true, role: 'adoptante' }
  },
  {
    path: '/adoptante/perfil',
    name: 'AdopterProfile',
    component: () => import('../views/adoptante/AdopterProfileView.vue'),
    meta: { requiresAuth: true, role: 'adoptante' }
  },
  {
    path: '/favoritos',
    name: 'Favorites',
    component: () => import('../views/FavoritesView.vue'),
    meta: { requiresAuth: true, role: 'adoptante' }
  },

  // Rutas Protegidas: Refugio (HU-07 + HU-08)
  {
    path: '/refugio/dashboard',
    name: 'RefugioDashboard',
    component: () => import('../views/RefugioDashboard.vue'),
    meta: { requiresAuth: true, role: 'refugio' }
  },
  {
    path: '/refugio/perfil',
    name: 'ShelterProfile',
    component: () => import('../views/refugio/ShelterProfileView.vue'),
    meta: { requiresAuth: true, role: 'refugio' }
  },
  {
    path: '/refugio/mascotas',
    name: 'PetManagement',
    component: () => import('../views/refugio/PetManagementView.vue'),
    meta: { requiresAuth: true, role: 'refugio' }
  },
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

function dashboardFor(role) {
  if (role === 'adoptante') return { name: 'AdoptanteDashboard' }
  if (role === 'refugio') return { name: 'RefugioDashboard' }
  return { name: 'Home' }
}

// 🛡️ GUARD GLOBAL DE NAVEGACIÓN (HU-07: autenticación · HU-08: roles)
// Espera a que Supabase restaure la sesión (HU-09 CA#2) antes de decidir, de
// modo que un F5 sobre una ruta protegida no expulsa al usuario.
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  await authStore.getSession()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    // El perfil no pudo leerse (RLS/migración pendiente): no rebotamos en
    // silencio, avisamos y llevamos a su propio dashboard.
    if (authStore.userRole === 'guest') {
      authStore.setAccessDenied(
        'No pudimos verificar tu perfil en la base de datos. Contacta al administrador.'
      )
      return next(dashboardFor('guest'))
    }

    if (to.meta.role && authStore.userRole !== to.meta.role) {
      // HU-08 CA#4 / CA#7: mensaje claro de acceso denegado.
      authStore.setAccessDenied('Acceso denegado: no tienes permiso para ver esa página.')
      return next(dashboardFor(authStore.userRole))
    }

    return next()
  }

  if (
    authStore.isAuthenticated &&
    (to.name === 'Login' || to.name === 'RegisterAdoptante' || to.name === 'RegisterRefugio')
  ) {
    return next(dashboardFor(authStore.userRole))
  }

  next()
})

export default router
