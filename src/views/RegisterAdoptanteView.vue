<template>
  <div class="min-h-screen bg-surface flex flex-col">
    <!-- ===================== HEADER =====================
         Replica del navbar de LoginView.vue. `fixed` + `pt-20` en <main>.
         `flex-none` es necesario: sin él, main (flex-1) absorbería el espacio
         y el header bajaría en lugar de quedar arriba del todo. -->
    <header class="fixed top-0 w-full z-50 flex-none bg-surface-card/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div class="h-20 max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
        <!-- Logo oficial unificado con HomeView.vue (badge + SVG huella + subtítulo teal) -->
        <router-link to="/" class="flex items-center gap-2 group" aria-label="MatchPet - Ir al inicio">
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
            to="/"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-ink-soft hover:text-primary transition-colors duration-200"
          >
            <span class="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_back</span>
            Volver al inicio
          </router-link>
          <router-link
            to="/login"
            class="hidden sm:inline-flex px-5 py-2 rounded-xl bg-primary text-white text-[13px] font-bold shadow-btn-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            Iniciar Sesión
          </router-link>
        </nav>
      </div>
    </header>

    <main class="flex-1 w-full pt-20 py-4 px-4 md:px-8 flex justify-center items-center">
      <div class="w-full max-w-5xl bg-surface-card rounded-2xl shadow-card overflow-hidden flex flex-col lg:flex-row">
        <!-- Columna izquierda: Formulario Adoptante -->
        <div class="w-full lg:w-7/12 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <!-- Navegación superior y selector de rol -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <router-link to="/" class="inline-flex items-center gap-1 text-ink-soft hover:text-primary transition-colors group">
                <span class="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                <span class="text-[13px]">Volver al inicio</span>
              </router-link>

              <!-- Selector de Rol (Segmented Control) -->
              <div class="inline-flex p-1 bg-surface-low rounded-xl">
                <button
                  type="button"
                  class="px-4 py-1.5 rounded-lg bg-primary text-white text-[13px] shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span class="material-symbols-outlined text-[16px]">favorite</span>
                  <span>Adoptante</span>
                </button>
                <router-link
                  to="/registro-refugio"
                  class="px-4 py-1.5 rounded-lg text-ink-soft hover:text-primary text-[13px] transition-all flex items-center gap-1.5"
                >
                  <span class="material-symbols-outlined text-[16px]">home_work</span>
                  <span>Refugio / Albergue</span>
                </router-link>
              </div>
            </div>

            <!-- Encabezado del formulario -->
            <div class="mb-6">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2" style="background-color: #e6f4f1; color: #2d6a68;">
                <span class="material-symbols-outlined text-[14px]">pets</span>
                <span class="text-[11px] uppercase tracking-wider">Comienza la aventura</span>
              </div>
              <h1 class="text-[28px] leading-[32px] font-extrabold tracking-tight text-primary">Crear Cuenta</h1>
              <p class="text-sm text-ink-soft mt-1 flex items-center gap-1">
                <span>Registro como Adoptante</span>
                <span class="text-primary text-[16px]">🐾</span>
              </p>
            </div>

            <!-- Campos del formulario -->
            <form class="flex flex-col gap-4" @submit.prevent="handleRegister">
              <!-- Nombre Completo -->
              <div class="flex flex-col gap-1.5">
                <label class="mp-label" for="nombre">Nombre Completo</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                  <input v-model="fullName" id="nombre" name="nombre" type="text" required class="mp-input" placeholder="Ej: Fernando Rojas" />
                </div>
              </div>

              <!-- Celular & Correo -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="mp-label" for="celular">Celular</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">smartphone</span>
                    <input v-model="phone" id="celular" name="celular" type="tel" required class="mp-input" placeholder="Ej: 70000000" />
                  </div>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="mp-label" for="correo">Correo electrónico</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                    <input v-model="email" id="correo" name="correo" type="email" required class="mp-input" placeholder="ejemplo@correo.com" />
                  </div>
                </div>
              </div>

              <!-- Contraseña & Confirmar -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="mp-label" for="password">Contraseña</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                    <input
                      v-model="password"
                      id="password"
                      name="password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      minlength="8"
                      autocomplete="new-password"
                      class="mp-input-pass"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      aria-label="Alternar visibilidad de contraseña"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-ink focus:outline-none"
                      @click="showPassword = !showPassword"
                    >
                      <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="mp-label" for="confirm_password">Confirmar contraseña</label>
                  <div class="relative">
                    <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock_reset</span>
                    <input
                      v-model="confirmPassword"
                      id="confirm_password"
                      name="confirm_password"
                      :type="showConfirm ? 'text' : 'password'"
                      required
                      minlength="8"
                      autocomplete="new-password"
                      class="mp-input-pass"
                      placeholder="Repite tu contraseña"
                    />
                    <button
                      type="button"
                      aria-label="Alternar visibilidad de contraseña"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-ink focus:outline-none"
                      @click="showConfirm = !showConfirm"
                    >
                      <span class="material-symbols-outlined text-[20px]">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Checkbox términos (visual) -->
              <label class="flex items-start gap-3 mt-1 cursor-pointer select-none group">
                <input type="checkbox" class="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary" />
                <span class="text-sm text-ink-soft group-hover:text-ink transition-colors">
                  Acepto los <a href="javascript:void(0)" class="text-primary font-semibold hover:underline">términos y condiciones</a> de adopción responsable
                </span>
              </label>

              <!-- Mensajes -->
              <p v-if="validationError" class="text-red-600 text-sm text-center">{{ validationError }}</p>
              <p v-if="authStore.errorMsg" class="text-red-600 text-sm text-center">{{ authStore.errorMsg }}</p>

              <!-- Botón registrarme -->
              <button
                type="submit"
                :disabled="authStore.loading"
                class="mp-btn-primary mt-1"
              >
                <span>{{ authStore.loading ? 'Registrando...' : 'Registrarme' }}</span>
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>
          </div>

          <!-- Enlaces al pie del formulario -->
          <div class="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
            <p class="text-sm text-ink-soft">
              ¿Ya tienes una cuenta?
              <router-link to="/login" class="text-primary font-bold hover:underline">Inicia sesión aquí</router-link>
            </p>
            <p class="text-sm text-ink-soft">
              ¿Eres un refugio?
              <router-link to="/registro-refugio" class="text-teal font-bold hover:underline">Regístrate aquí</router-link>
            </p>
          </div>
        </div>

        <!-- Columna derecha: Bloque visual y emotivo -->
        <div class="w-full lg:w-5/12 bg-teal relative min-h-[460px] lg:min-h-full flex flex-col justify-between p-6 overflow-hidden">
          <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-xl pointer-events-none"></div>

          <!-- Encabezado visual -->
          <div class="relative z-10 text-center pt-2">
            <span class="inline-block px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-white text-[11px] uppercase tracking-widest mb-2 shadow-sm">
              Amor Incondicional
            </span>
            <h2 class="text-[28px] leading-[32px] text-white font-extrabold uppercase leading-tight drop-shadow-sm px-2">
              ESCOGEME COMO TU<br />COMPAÑERO DE VIDA
            </h2>
          </div>

          <!-- Imagen emotiva -->
          <div class="relative z-10 my-auto py-2 flex justify-center items-center">
            <div class="relative w-full max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/cuteCatDog-Photoroom.png"
                alt="Cachorro compañero de vida"
                class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>

          <!-- Tarjeta flotante -->
          <div class="relative z-10 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <div class="flex items-start gap-2">
              <div class="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <span class="material-symbols-outlined text-emerald-700 text-[20px]">volunteer_activism</span>
              </div>
              <div>
                <p class="text-[13px] text-ink font-semibold mb-0.5">Compromiso de vida</p>
                <p class="text-xs text-ink-soft leading-relaxed">
                  Recuerda que adoptar es un compromiso de amor para toda la vida. Dales un hogar lleno de cariño.
                </p>
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

const router = useRouter()
const authStore = useAuthStore()

const fullName = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)

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

  const result = await authStore.registerAdoptante(email.value, password.value, fullName.value, phone.value)
  if (result.success) {
    alert('¡Registro exitoso! Revisa tu correo para confirmar.')
    router.push('/login')
  }
}
</script>