<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar Sesión</h2>
        <p class="mt-2 text-center text-sm text-gray-600">Bienvenido de vuelta a MatchPet 🐾</p>
      </div>
      <!-- Botón volver -->
      <div class="flex justify-start">
        <router-link
          to="/"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Volver al inicio
        </router-link>
      </div>

      <!-- ===================== FORMULARIO LOGIN ===================== -->
      <form v-if="!showReset" class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm space-y-4">
          <input
            v-model="email"
            type="email"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Correo electrónico"
          />
          <input
            v-model="password"
            type="password"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Contraseña"
          />
        </div>

        <!-- Mensaje de error -->
        <p v-if="authStore.errorMsg" class="text-red-500 text-sm text-center">
          {{ authStore.errorMsg }}
        </p>

        <!-- Botón login -->
        <div>
          <button
            type="submit"
            :disabled="authStore.loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ authStore.loading ? 'Ingresando...' : 'Iniciar Sesión' }}
          </button>
        </div>

        <!-- Enlace recuperar contraseña -->
        <div class="text-center">
          <button
            type="button"
            @click="showReset = true"
            class="text-sm text-indigo-600 hover:text-indigo-500 underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </form>

      <!-- ============== FORMULARIO RECUPERAR CONTRASEÑA ============== -->
      <form v-else class="mt-8 space-y-6" @submit.prevent="handleReset">
        <p class="text-sm text-gray-600 text-center">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña (válido por 15 min).
        </p>
        <div class="rounded-md shadow-sm">
          <input
            v-model="resetEmail"
            type="email"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Correo electrónico"
          />
        </div>

        <!-- Mensajes -->
        <p v-if="resetMsg" class="text-green-600 text-sm text-center">{{ resetMsg }}</p>
        <p v-if="resetError" class="text-red-500 text-sm text-center">{{ resetError }}</p>

        <div class="flex gap-3">
          <button
            type="button"
            @click="showReset = false; resetMsg = ''; resetError = ''"
            class="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Volver
          </button>
          <button
            type="submit"
            :disabled="authStore.loading"
            class="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ authStore.loading ? 'Enviando...' : 'Enviar enlace' }}
          </button>
        </div>
      </form>

      <!-- Enlaces de registro -->
      <div class="text-center space-y-1">
        <p class="text-sm text-gray-600">
          ¿Eres adoptante?
          <router-link to="/registro" class="font-medium text-indigo-600 hover:text-indigo-500">Regístrate</router-link>
        </p>
        <p class="text-sm text-gray-600">
          ¿Eres refugio?
          <router-link to="/registro-refugio" class="font-medium text-emerald-600 hover:text-emerald-500">Registra tu organización</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabaseClient'
import { translateAuthError } from '../utils/errorMessages'

const router = useRouter()
const authStore = useAuthStore()

// --- Login ---
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  const result = await authStore.login(email.value, password.value)
  if (result.success) {
    // Redirigir según el rol que acaba de cargar el store
    if (authStore.userRole === 'refugio') {
      router.push('/refugio/dashboard')
    } else {
      router.push('/adoptante/dashboard')
    }
  }
}

// --- Recuperar contraseña ---
const showReset = ref(false)
const resetEmail = ref('')
const resetMsg = ref('')
const resetError = ref('')

const handleReset = async () => {
  resetMsg.value = ''
  resetError.value = ''
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.value, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
    resetMsg.value = '¡Correo enviado! Revisa tu bandeja de entrada (y spam).'
  } catch (err) {
    resetError.value = translateAuthError(err)
  }
}
</script>
