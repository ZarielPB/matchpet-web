<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Registrar Refugio</h2>
        <p class="mt-2 text-center text-sm text-gray-600">Conecta tu organización con adoptantes</p>
      </div>
      <div class="flex justify-start">
        <router-link
          to="/"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Volver al inicio
        </router-link>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <div class="rounded-md shadow-sm space-y-4">
          <!-- Datos del responsable -->
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del Responsable</p>
          <input
            v-model="fullName"
            type="text"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nombre completo del responsable"
          />
          <input
            v-model="phone"
            type="tel"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Celular de contacto"
          />

          <!-- Datos del refugio -->
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Datos del Refugio</p>
          <input
            v-model="shelterName"
            type="text"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nombre del refugio / albergue"
          />
          <select
            v-model="city"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="" disabled>Ciudad</option>
            <option value="La Paz">La Paz</option>
            <option value="El Alto">El Alto</option>
            <option value="Santa Cruz">Santa Cruz</option>
            <option value="Cochabamba">Cochabamba</option>
            <option value="Otra">Otra</option>
          </select>
          <input
            v-model="address"
            type="text"
            required
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Dirección del refugio"
          />

          <!-- Credenciales -->
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Credenciales de Acceso</p>
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
            minlength="8"
            autocomplete="new-password"
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Contraseña (mín. 8 caracteres)"
          />
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Confirmar contraseña"
          />
        </div>

        <!-- Mensajes de validación y error -->
        <p v-if="validationError" class="text-red-500 text-sm text-center">
          {{ validationError }}
        </p>
        <p v-if="authStore.errorMsg" class="text-red-500 text-sm text-center">
          {{ authStore.errorMsg }}
        </p>

        <!-- Botón submit -->
        <div>
          <button
            type="submit"
            :disabled="authStore.loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {{ authStore.loading ? 'Registrando...' : 'Registrar Refugio' }}
          </button>
        </div>
      </form>

      <p class="text-center text-sm text-gray-600">
        ¿Eres adoptante?
        <router-link to="/registro" class="font-medium text-indigo-600 hover:text-indigo-500">
          Regístrate aquí
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const fullName = ref('')
const phone = ref('')
const shelterName = ref('')
const city = ref('')
const address = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')

const handleRegister = async () => {
  validationError.value = ''
  if (password.value !== confirmPassword.value) {
    validationError.value = 'Las contraseñas no coinciden.'
    return
  }
  if (password.value.length < 8) {
    validationError.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  const result = await authStore.registerRefugio(
    email.value,
    password.value,
    fullName.value,
    phone.value,
    shelterName.value,
    city.value,
    address.value
  )
  if (result.success) {
    alert('¡Refugio registrado exitosamente! Revisa tu correo para confirmar tu cuenta.')
    router.push('/login')
  }
}
</script>
