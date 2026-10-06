<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      <!-- HU-08 CA#7: aviso de acceso denegado -->
      <div
        v-if="authStore.accessDeniedMsg"
        class="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-start justify-between gap-4"
        role="alert"
      >
        <span>🚫 {{ authStore.accessDeniedMsg }}</span>
        <button type="button" class="text-amber-700 hover:underline" @click="authStore.clearAccessDenied()">
          ✕
        </button>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-md mb-6">
        <h1 class="text-2xl font-bold text-indigo-600">Panel del Adoptante 🐾</h1>
        <p class="mt-2 text-gray-600">Bienvenido/a, {{ authStore.profile?.full_name || 'Adoptante' }}.</p>
      </div>

      <!-- Accesos rápidos -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <router-link
          to="/catalogo"
          class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-transparent hover:border-indigo-200"
        >
          <div class="text-3xl mb-2">🐶</div>
          <h2 class="font-bold text-gray-900">Explorar catálogo</h2>
          <p class="text-sm text-gray-500 mt-1">Encuentra a tu próxima mascota y guarda favoritos.</p>
        </router-link>

        <router-link
          to="/adoptante/perfil"
          class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-transparent hover:border-indigo-200"
        >
          <div class="text-3xl mb-2">🏠</div>
          <h2 class="font-bold text-gray-900">Mi perfil de adoptante</h2>
          <p class="text-sm text-gray-500 mt-1">Cuenta tus preferencias de vivienda y experiencia.</p>
        </router-link>

        <router-link
          to="/favoritos"
          class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-transparent hover:border-indigo-200"
        >
          <div class="text-3xl mb-2">❤️</div>
          <h2 class="font-bold text-gray-900">Mis favoritos</h2>
          <p class="text-sm text-gray-500 mt-1">Revisa las mascotas que guardaste para adoptar.</p>
        </router-link>
      </div>

      <div class="mt-6 text-right">
        <button @click="handleLogout" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Cerrar Sesión
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>