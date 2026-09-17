<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Nueva Contraseña</h2>
        <p class="mt-2 text-center text-sm text-gray-600">Ingresa tu nueva contraseña para acceder a MatchPet 🐾</p>
      </div>

      <div class="flex justify-start">
        <router-link
          to="/login"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Volver al inicio
        </router-link>
      </div>

      <form v-if="ready" class="mt-8 space-y-6" @submit.prevent="handleResetPassword">
        <div class="rounded-md shadow-sm space-y-4">
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
          />
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Confirmar nueva contraseña"
          />
        </div>

        <!-- Mensaje de error -->
        <p v-if="errorMsg" class="text-red-500 text-sm text-center">{{ errorMsg }}</p>
        <!-- Mensaje de éxito -->
        <p v-if="successMsg" class="text-green-600 text-sm text-center">{{ successMsg }}</p>

        <div>
          <button
            type="submit"
            :disabled="loading || successMsg"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ loading ? 'Guardando...' : 'Guardar nueva contraseña' }}
          </button>
        </div>
      </form>

      <div v-else class="mt-8 space-y-4 text-center">
        <p class="text-red-500 text-sm">
          El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.
        </p>
        <router-link
          to="/login"
          class="text-sm font-medium text-indigo-600 hover:text-indigo-500 underline"
        >
          Volver al inicio de sesión
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabaseClient'
import { translateAuthError } from '../utils/errorMessages'

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
const ready = ref(false)

// Supabase envía los tokens de recuperación en el fragmento (#access_token=...)
// o, en algunas configuraciones, como query params (?access_token=...).
function extractTokens() {
  const fragment = new URLSearchParams(window.location.hash.substring(1))
  const query = new URLSearchParams(window.location.search)
  return {
    access_token: fragment.get('access_token') || query.get('access_token'),
    refresh_token: fragment.get('refresh_token') || query.get('refresh_token')
  }
}

onMounted(async () => {
  const { access_token, refresh_token } = extractTokens()

  // 1) Restaurar la sesión de recuperación explícitamente con los tokens.
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (!error) {
      ready.value = true
      // Limpiar la URL para que los tokens no queden visibles en la barra.
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }
  }

  // 2) Fallback: supabase-js pudo restablecer la sesión automáticamente.
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    ready.value = true
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})

const handleResetPassword = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }
  if (password.value.length < 8) {
    errorMsg.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  loading.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value })
    if (error) {
      errorMsg.value = translateAuthError(error)
      return
    }

    successMsg.value = '¡Contraseña actualizada! Serás redirigido al inicio de sesión.'
    // Forzar cierre de sesión para que el flujo termine en /login y no se
    // quede con una sesión de "recuperación" activa.
    try { await supabase.auth.signOut() } catch (_) { /* sin sesión activa */ }
    setTimeout(() => router.push('/login'), 2500)
  } finally {
    loading.value = false
  }
}
</script>