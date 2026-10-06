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

      <!-- HU-14 CA#5: el refugio ve su ficha aunque le falten datos -->
      <div
        v-if="shelterError"
        class="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg"
      >
        ⚠️ {{ shelterError }}
      </div>

      <div class="bg-white p-6 rounded-xl shadow-md mb-6">
        <h1 class="text-2xl font-bold text-emerald-600">Panel del Refugio 🏠</h1>
        <p class="mt-2 text-gray-600">Bienvenido/a, {{ authStore.profile?.full_name || 'Refugio' }}.</p>
      </div>

      <!-- Accesos rápidos -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <router-link
          to="/refugio/mascotas"
          class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-transparent hover:border-emerald-200"
        >
          <div class="text-3xl mb-2">🐾</div>
          <h2 class="font-bold text-gray-900">Gestionar mascotas</h2>
          <p class="text-sm text-gray-500 mt-1">Registra, edita y cambia el estado de tus animales.</p>
        </router-link>

        <router-link
          to="/refugio/perfil"
          class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-transparent hover:border-emerald-200"
        >
          <div class="text-3xl mb-2">🏠</div>
          <h2 class="font-bold text-gray-900">Mi perfil de refugio</h2>
          <p class="text-sm text-gray-500 mt-1">{{ shelter?.shelter_name ? 'Edita tus datos y tu foto de portada.' : 'Completa tus datos para que se muestren en el catálogo.' }}</p>
        </router-link>

        <router-link
          to="/catalogo"
          class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition border border-transparent hover:border-emerald-200"
        >
          <div class="text-3xl mb-2">👀</div>
          <h2 class="font-bold text-gray-900">Ver catálogo público</h2>
          <p class="text-sm text-gray-500 mt-1">Mira cómo ven tu refugio los adoptantes.</p>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { usePetStore } from '../stores/petStore'

const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()
const shelter = ref(null)
const shelterError = ref('')

onMounted(async () => {
  await authStore.getSession()
  shelter.value = await petStore.getMyShelter()
  shelterError.value = petStore.shelterError
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>