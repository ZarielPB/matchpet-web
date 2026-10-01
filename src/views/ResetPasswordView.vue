<template>
  <div class="min-h-screen bg-surface font-sans text-ink antialiased flex flex-col justify-center items-center">
    <main class="w-full flex items-center justify-center p-4">
      <div class="flex flex-col w-full items-center justify-center py-6 px-4">
        <!-- Ambient background glow -->
        <div class="relative w-full max-w-xl">
          <div class="absolute -top-16 -left-12 w-64 h-64 bg-primary-faint rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          <div class="absolute -bottom-16 -right-12 w-64 h-64 bg-emerald-300/50 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

          <!-- Tarjeta principal -->
          <div class="relative bg-surface-card rounded-2xl shadow-xl p-8 sm:p-10 transition-all duration-300">
            <!-- Navegación superior -->
            <div class="flex items-center justify-between mb-6">
              <router-link to="/login" class="inline-flex items-center gap-1.5 text-ink-soft hover:text-primary text-[13px] transition-colors duration-150 group">
                <span class="material-symbols-outlined text-[14px] transition-transform group-hover:-translate-x-0.5">arrow_back</span>
                <span>Volver al inicio</span>
              </router-link>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]" style="background-color: #ede9fe; color: #3b0764;">
                <span class="material-symbols-outlined text-[12px]">security</span>
                <span>Enlace seguro</span>
              </span>
            </div>

            <!-- Encabezado -->
            <div class="text-center mb-8">
              <div class="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-full shadow-sm" style="background-color: #f3e8ff; color: #3b0764;">
                <span class="material-symbols-outlined text-[36px]" style="font-variation-settings: 'FILL' 1;">pets</span>
              </div>
              <h1 class="text-[28px] leading-[32px] mb-2 tracking-tight font-extrabold" style="color: #2e0854;">
                Crear Nueva Contraseña
              </h1>
              <p class="text-sm text-ink-soft flex items-center justify-center gap-1.5">
                <span>Ingresa tu nueva contraseña para acceder a MatchPet</span>
                <span class="text-primary inline-block">🐾</span>
              </p>
            </div>

            <!-- Banner informativo -->
            <div class="bg-surface-low rounded-xl p-4 mb-8 text-center">
              <p class="text-sm text-ink-soft leading-relaxed">
                La contraseña debe tener al menos <span class="text-[13px] font-semibold text-ink">8 caracteres</span> y no coincidir con una anterior.
              </p>
            </div>

            <!-- Formulario -->
            <form v-if="ready" class="space-y-6" @submit.prevent="handleResetPassword">
              <div>
                <label class="mp-label" for="password">Nueva contraseña</label>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 flex items-center pointer-events-none text-outline">
                    <span class="material-symbols-outlined text-[18px]">lock</span>
                  </span>
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    id="password"
                    class="mp-input-pass"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    aria-label="Alternar visibilidad de contraseña"
                    class="absolute right-3.5 flex items-center justify-center p-1 text-outline hover:text-primary transition-colors"
                    @click="showPassword = !showPassword"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="mp-label" for="confirmPassword">Confirmar nueva contraseña</label>
                <div class="relative flex items-center">
                  <span class="absolute left-3.5 flex items-center pointer-events-none text-outline">
                    <span class="material-symbols-outlined text-[18px]">lock_reset</span>
                  </span>
                  <input
                    v-model="confirmPassword"
                    :type="showConfirm ? 'text' : 'password'"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    id="confirmPassword"
                    class="mp-input-pass"
                    placeholder="Repite tu contraseña"
                  />
                  <button
                    type="button"
                    aria-label="Alternar visibilidad de contraseña"
                    class="absolute right-3.5 flex items-center justify-center p-1 text-outline hover:text-primary transition-colors"
                    @click="showConfirm = !showConfirm"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <!-- Mensajes -->
              <p v-if="errorMsg" class="text-red-600 text-sm text-center">{{ errorMsg }}</p>
              <p v-if="successMsg" class="text-green-600 text-sm text-center">{{ successMsg }}</p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  @click="router.push('/login')"
                  class="mp-btn-ghost"
                >
                  Volver
                </button>
                <button type="submit" :disabled="loading || successMsg" class="mp-btn-primary">
                  <span>{{ loading ? 'Guardando...' : 'Guardar nueva contraseña' }}</span>
                  <span class="material-symbols-outlined text-[18px]">check</span>
                </button>
              </div>
            </form>

            <!-- Enlace inválido/vencido -->
            <div v-else class="space-y-4 text-center">
              <div class="inline-flex items-center justify-center w-14 h-14 rounded-full" style="background-color: #ffdad6; color: #93000a;">
                <span class="material-symbols-outlined text-[28px]">error</span>
              </div>
              <p class="text-red-600 text-sm">
                El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.
              </p>
              <router-link
                to="/login"
                class="inline-flex items-center justify-center w-full h-12 rounded-xl bg-primary text-white text-[15px] font-semibold shadow-btn-primary hover:bg-primary-hover transition-all duration-200"
              >
                Volver al inicio de sesión
              </router-link>
            </div>

            <!-- Pie -->
            <div class="mt-8 pt-6 border-t border-surface-low/60 text-center">
              <p class="text-xs text-ink-soft flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-[12px] text-outline">help_outline</span>
                <span>¿No recibes el correo?</span>
                <a href="javascript:void(0)" class="text-[11px] text-primary hover:underline ml-1 font-semibold">Contactar a soporte</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
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
const showPassword = ref(false)
const showConfirm = ref(false)

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