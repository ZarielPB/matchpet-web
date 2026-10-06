<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- ===================== HEADER ===================== -->
    <header class="fixed top-0 w-full z-50 bg-surface-card/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div class="h-20 max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2 group" aria-label="MatchPet - Ir al inicio">
          <!-- Logo oficial unificado con HomeView.vue (badge + SVG huella + subtítulo teal) -->
          <div
            class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-purple to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-900/20 shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300"
          >
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 13.5c-1.6 0-3 1.2-3 2.8 0 1.9 1.6 3.7 3 3.7s3-1.8 3-3.7c0-1.6-1.4-2.8-3-2.8zm-4.7-2.7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9.4 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-7.2-4.5c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.2-1-2.2-2.2-2.2zm5 0c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.2-1-2.2-2.2-2.2z"></path>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-2xl font-black tracking-tight text-brand-purple font-display leading-tight">
              Match<span class="text-purple-600">Pet</span>
            </span>
            <span class="text-[10px] font-semibold text-teal-600 tracking-wider uppercase -mt-1">Adopción Responsable</span>
          </div>
        </router-link>
        <nav class="flex items-center gap-2 sm:gap-3">
          <router-link
            to="/login"
            class="px-4 py-2 rounded-xl text-[13px] font-semibold text-ink-soft bg-primary-faint/60 hover:text-primary transition-colors duration-200"
          >
            Iniciar Sesión
          </router-link>
          <router-link
            to="/registro"
            class="hidden sm:inline-flex px-5 py-2 rounded-xl bg-primary text-white text-[13px] font-bold shadow-btn-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            Registrarse
          </router-link>
        </nav>
      </div>
    </header>

    <!-- ===================== MAIN ===================== -->
    <main class="w-full pt-20 bg-surface min-h-[calc(100vh-80px)]">
      <div class="w-full flex flex-col items-center justify-center p-4 lg:p-8 min-h-[calc(100vh-80px)]">
        <div class="w-full max-w-5xl bg-surface-card rounded-2xl shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          <!-- Columna izquierda: Formulario -->
          <div class="lg:col-span-6 p-6 lg:p-10 flex flex-col justify-between">
            <div>
              <!-- Volver -->
              <router-link to="/" class="inline-flex items-center gap-1 text-ink-soft hover:text-primary transition-all duration-200 group text-[13px] mb-6">
                <span class="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:-translate-x-1">arrow_back</span>
                <span>Volver al inicio</span>
              </router-link>

              <!-- Encabezado -->
              <div class="mb-6">
                <div class="inline-flex items-center gap-1.5 text-primary text-[11px] uppercase tracking-wider mb-2 bg-[#f3f0fa] px-2 py-1 rounded-full font-bold">
                  <span class="material-symbols-outlined text-[15px] text-primary" style="font-variation-settings: 'FILL' 1;">pets</span>
                  <span>Acceso a la plataforma</span>
                </div>
                <div class="flex items-center justify-between">
                  <h1 class="text-[28px] leading-[32px] font-extrabold tracking-tight">
                    <span class="text-primary block">BIENVENIDO A</span>
                    <span class="text-teal block">MATCH PET</span>
                  </h1>
                  <span class="material-symbols-outlined text-[#e9d5ff] text-[48px] select-none pointer-events-none" style="font-variation-settings: 'FILL' 1;">pets</span>
                </div>
                <p class="text-sm text-ink-soft mt-1">Adopte a una mascotita para que sea su nuevo compañero en su vida</p>
              </div>

              <!-- ============ FORMULARIO LOGIN ============ -->
              <form v-if="!showReset" class="space-y-4" @submit.prevent="handleLogin">
                <div>
                  <label class="mp-label" for="email">Correo electrónico / Nombre completo</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">mail</span>
                    <input
                      v-model="email"
                      type="email"
                      required
                      id="email"
                      class="mp-input"
                      placeholder="Ej: Juan Alex Arce Machaca"
                    />
                  </div>
                </div>

                <div>
                  <label class="mp-label" for="password">Contraseña</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">lock</span>
                    <input
                      v-model="password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      id="password"
                      class="mp-input-pass"
                      placeholder="Tu contraseña secreta"
                    />
                    <button
                      type="button"
                      aria-label="Alternar visibilidad de contraseña"
                      class="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors flex items-center justify-center p-1"
                      @click="showPassword = !showPassword"
                    >
                      <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-1 text-[13px]">
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" class="w-4 h-4 rounded text-primary border-outline-soft focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary" />
                    <span class="text-ink-soft font-medium">Recordarme</span>
                  </label>
                  <button
                    type="button"
                    @click="showReset = true"
                    class="text-primary hover:text-primary-light font-semibold transition-colors duration-150"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <!-- Mensaje de error -->
                <p v-if="authStore.errorMsg" class="text-red-600 text-sm text-center">
                  {{ authStore.errorMsg }}
                </p>

                <div class="pt-2">
                  <button type="submit" :disabled="authStore.loading" class="mp-btn-primary">
                    <span>{{ authStore.loading ? 'Ingresando...' : 'Sign Up / Iniciar Sesión' }}</span>
                    <span class="material-symbols-outlined text-[19px]">login</span>
                  </button>
                </div>
              </form>

              <!-- ========== FORMULARIO RECUPERAR CONTRASEÑA ========== -->
              <form v-else class="space-y-4" @submit.prevent="handleReset">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold" style="background-color: #ede9fe; color: #3b0764;">
                  <span class="material-symbols-outlined text-[14px]">security</span>
                  <span>Enlace seguro</span>
                </div>

                <div class="bg-surface-low rounded-xl p-4 text-center">
                  <p class="text-sm text-ink-soft leading-relaxed">
                    Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña
                    <span class="text-[13px] font-semibold text-ink">(válido por 15 min)</span>.
                  </p>
                </div>

                <div>
                  <label class="mp-label" for="resetEmail">Correo electrónico</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">mail</span>
                    <input
                      v-model="resetEmail"
                      type="email"
                      required
                      id="resetEmail"
                      class="mp-input"
                      placeholder="tu_correo@ejemplo.com"
                    />
                  </div>
                </div>

                <!-- Mensajes -->
                <p v-if="resetMsg" class="text-green-600 text-sm text-center">{{ resetMsg }}</p>
                <p v-if="resetError" class="text-red-600 text-sm text-center">{{ resetError }}</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <button
                    type="button"
                    @click="showReset = false; resetMsg = ''; resetError = ''"
                    class="mp-btn-ghost"
                  >
                    Volver
                  </button>
                  <button type="submit" :disabled="authStore.loading" class="mp-btn-primary">
                    <span>{{ authStore.loading ? 'Enviando...' : 'Enviar enlace' }}</span>
                    <span class="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Enlaces inferiores -->
            <div class="mt-6 pt-2 space-y-2">
              <div class="text-center text-xs text-ink-soft">
                <span>¿No tienes cuenta?</span>
                <router-link to="/registro" class="text-primary hover:underline font-bold ml-1">Regístrate aquí</router-link>
              </div>
              <div class="relative flex items-center justify-center">
                <div class="w-full border-t border-edge"></div>
                <span class="absolute bg-surface-card px-2 text-outline text-xs">o</span>
              </div>
              <div class="flex flex-col gap-2 pt-1">
                
                <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left bg-surface-low/60 rounded-xl p-2 px-4 mt-1">
                  <div class="text-xs text-ink-soft">
                    <span>¿Eres refugio?</span>
                    <router-link to="/registro-refugio" class="text-emerald-600 hover:text-emerald-700 font-bold ml-1 transition-colors">Registra tu organización</router-link>
                  </div>
                  
                  
                </div>
              </div>
            </div>
          </div>

          <!-- Columna derecha: Bloque visual -->
          <div class="lg:col-span-6 relative bg-gradient-to-b from-teal-light to-teal-deep p-4 lg:p-6 flex flex-col justify-between overflow-hidden min-h-[460px] lg:min-h-full">
            <div class="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -left-12 bottom-12 w-48 h-48 bg-emerald-300/20 rounded-full blur-xl pointer-events-none"></div>

            <div class="relative z-10">
              <div class="inline-block bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                <p class="text-[16px] text-white font-extrabold tracking-wide uppercase">
                  ESCOGEME COMO TU COMPAÑERO DE VIDA
                </p>
              </div>
            </div>

            <div class="relative z-0 my-auto flex items-center justify-center py-2">
              <div class="relative max-w-[340px] lg:max-w-[380px] w-full aspect-square rounded-2xl overflow-hidden shadow-[0_20px_35px_-10px_rgba(0,33,20,0.25)]">
                <img
                  src="/wight.png"
                  alt="Cachorro bóxer saludando amistosamente con la patita levantada sobre fondo turquesa"
                  class="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-[11px] text-ink font-bold">En adopción hoy</span>
                </div>
              </div>
            </div>

            <div class="relative z-10 mt-auto">
              <div class="bg-surface-card/85 backdrop-blur-md rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div class="flex items-start gap-2">
                  <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-600 mt-0.5">
                    <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">volunteer_activism</span>
                  </div>
                  <div>
                    <p class="text-sm text-ink font-semibold leading-snug">
                      Cada adopción transforma dos vidas: la de ellos y la tuya.
                    </p>
                    <p class="text-xs text-ink-soft mt-0.5">
                      Encuentra hoy a tu compañero ideal en MatchPet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ===================== FOOTER ===================== -->
    <footer class="w-full bg-surface-card py-6 shadow-[0_-1px_8px_rgba(0,0,0,0.02)]">
      <div class="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-primary text-[20px]" style="font-variation-settings: 'FILL' 1;">pets</span>
          <span class="text-[16px] text-primary font-bold">MatchPet</span>
        </div>
        <p class="text-xs text-ink-soft">© 2024 MatchPet. Plataforma ética de adopción y bienestar animal. Todos los derechos reservados.</p>
      </div>
    </footer>
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
const showPassword = ref(false)

const handleLogin = async () => {
  const result = await authStore.login(email.value, password.value)
  if (result.success) {
    // Redirigir según el rol que acaba de cargar el store
    if (authStore.userRole === 'refugio') {
      router.push('/refugio/dashboard')
    } else {
      router.push('/catalogo')
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