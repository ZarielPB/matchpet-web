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
            class="px-4 py-2 rounded-xl text-[13px] font-semibold text-ink-soft hover:text-primary transition-colors duration-200"
          >
            Iniciar Sesión
          </router-link>
          <router-link
            to="/registro-refugio"
            class="px-5 py-2 rounded-xl bg-primary text-white text-[13px] font-bold shadow-btn-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            Registrarse
          </router-link>
        </nav>
      </div>
    </header>

    <!-- ===================== MAIN ===================== -->
    <main class="w-full pt-20 bg-surface min-h-[calc(100vh-80px)]">
      <div class="flex flex-col w-full">
        <div class="max-w-7xl mx-auto w-full px-4 sm:px-8 py-10">
          <!-- Volver -->
          <div class="mb-6">
            <router-link to="/" class="inline-flex items-center gap-1 text-ink-soft hover:text-primary transition-all duration-200 group">
              <span class="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span class="text-sm font-semibold">Volver al inicio</span>
            </router-link>
          </div>

          <!-- Grid principal -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <!-- Columna izquierda: Formulario -->
            <div class="lg:col-span-7 bg-surface-card rounded-2xl shadow-[0_4px_24px_-4px_rgba(80,56,237,0.06),0_1px_3px_rgba(0,0,0,0.03)] p-8 lg:p-10">
              <!-- Encabezado -->
              <div class="mb-8">
                <div class="inline-flex items-center gap-1.5 px-4 py-1 rounded-full mb-3" style="background-color: #e6f2ee; color: #3b7b75;">
                  <span class="material-symbols-outlined text-[16px]">domain_add</span>
                  <span class="text-[11px] uppercase tracking-wider font-bold">Portal Refugios &amp; Santuarios</span>
                </div>
                <h1 class="text-[36px] leading-[44px] text-ink font-extrabold tracking-tight mb-1">Registrar Refugio</h1>
                <p class="text-base text-ink-soft">
                  Conecta tu organización con miles de adoptantes comprometidos y gestiona cada rescate con transparencia.
                </p>
              </div>

              <form class="space-y-8" @submit.prevent="handleRegister">
                <!-- SECCIÓN 1 -->
                <div class="space-y-4">
                  <div class="flex items-center gap-1.5 pb-2">
                    <span class="material-symbols-outlined text-[20px] text-primary">badge</span>
                    <h2 class="text-[11px] uppercase tracking-wider font-bold text-ink-soft">1. Datos del Responsable Legal o Encargado</h2>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                      <label class="mp-label" for="resp_name">Nombre completo del responsable</label>
                      <div class="relative flex items-center">
                        <span class="material-symbols-outlined absolute left-4 text-primary text-[18px] pointer-events-none">person</span>
                        <input v-model="fullName" id="resp_name" type="text" required class="mp-input-soft" placeholder="Ej: María Elena González" />
                      </div>
                    </div>
                    <div class="space-y-1">
                      <label class="mp-label" for="resp_phone">Celular de contacto</label>
                      <div class="relative flex items-center">
                        <span class="material-symbols-outlined absolute left-4 text-primary text-[18px] pointer-events-none">call</span>
                        <input v-model="phone" id="resp_phone" type="tel" required class="mp-input-soft" placeholder="Ej: +591 70000000" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SECCIÓN 2 -->
                <div class="space-y-4">
                  <div class="flex items-center gap-1.5 pb-2">
                    <span class="material-symbols-outlined text-[20px] text-teal">pets</span>
                    <h2 class="text-[11px] uppercase tracking-wider font-bold text-ink-soft">2. Datos del Refugio o Albergue</h2>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1 md:col-span-2">
                      <label class="mp-label" for="shelter_name">Nombre del refugio / albergue</label>
                      <div class="relative flex items-center">
                        <span class="material-symbols-outlined absolute left-4 text-teal text-[18px] pointer-events-none">home_health</span>
                        <input v-model="shelterName" id="shelter_name" type="text" required class="mp-input-soft" placeholder="Ej: Huellitas de Esperanza" />
                      </div>
                    </div>

                    <div class="space-y-1">
                      <label class="mp-label" for="shelter_city">Ciudad</label>
                      <div class="relative flex items-center">
                        <span class="material-symbols-outlined absolute left-4 text-teal text-[18px] pointer-events-none">location_city</span>
                        <select v-model="city" id="shelter_city" required class="mp-input-soft appearance-none pr-10 cursor-pointer">
                          <option value="" disabled>Ciudad</option>
                          <option value="La Paz">La Paz</option>
                          <option value="El Alto">El Alto</option>
                          <option value="Santa Cruz">Santa Cruz</option>
                          <option value="Cochabamba">Cochabamba</option>
                          <option value="Otra">Otra</option>
                        </select>
                        <span class="material-symbols-outlined absolute right-4 text-teal pointer-events-none">expand_more</span>
                      </div>
                    </div>

                    <div class="space-y-1 md:col-span-2">
                      <label class="mp-label" for="shelter_address">Dirección del refugio o centro de acogida</label>
                      <div class="relative flex items-center">
                        <span class="material-symbols-outlined absolute left-4 text-teal text-[18px] pointer-events-none">map</span>
                        <input v-model="address" id="shelter_address" type="text" required class="mp-input-soft" placeholder="Calle o avenida, zona o barrio" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- SECCIÓN 3 -->
                <div class="space-y-4">
                  <div class="flex items-center gap-1.5 pb-2">
                    <span class="material-symbols-outlined text-[20px] text-primary">lock_reset</span>
                    <h2 class="text-[11px] uppercase tracking-wider font-bold text-ink-soft">3. Credenciales de Acceso</h2>
                  </div>
                  <div class="space-y-4">
                    <div class="space-y-1">
                      <label class="mp-label" for="shelter_email">Correo electrónico institucional</label>
                      <div class="relative flex items-center">
                        <span class="material-symbols-outlined absolute left-4 text-primary text-[18px] pointer-events-none">mail</span>
                        <input v-model="email" id="shelter_email" type="email" required class="mp-input-soft" placeholder="contacto@refugioejemplo.org" />
                      </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="space-y-1">
                        <label class="mp-label" for="shelter_pass">Contraseña</label>
                        <div class="relative flex items-center">
                          <span class="material-symbols-outlined absolute left-4 text-primary text-[18px] pointer-events-none">key</span>
                          <input
                            v-model="password"
                            id="shelter_pass"
                            :type="showPassword ? 'text' : 'password'"
                            required
                            minlength="8"
                            autocomplete="new-password"
                            class="mp-input-soft-pass"
                            placeholder="Mín. 8 caracteres"
                          />
                          <button
                            type="button"
                            aria-label="Alternar visibilidad de contraseña"
                            class="absolute right-3 text-primary p-1 rounded-lg hover:opacity-70"
                            @click="showPassword = !showPassword"
                          >
                            <span class="material-symbols-outlined text-[18px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                          </button>
                        </div>
                      </div>
                      <div class="space-y-1">
                        <label class="mp-label" for="shelter_pass_confirm">Confirmar contraseña</label>
                        <div class="relative flex items-center">
                          <span class="material-symbols-outlined absolute left-4 text-primary text-[18px] pointer-events-none">lock</span>
                          <input
                            v-model="confirmPassword"
                            id="shelter_pass_confirm"
                            :type="showConfirm ? 'text' : 'password'"
                            required
                            minlength="8"
                            autocomplete="new-password"
                            class="mp-input-soft-pass"
                            placeholder="Repite tu contraseña"
                          />
                          <button
                            type="button"
                            aria-label="Alternar visibilidad de contraseña"
                            class="absolute right-3 text-primary p-1 rounded-lg hover:opacity-70"
                            @click="showConfirm = !showConfirm"
                          >
                            <span class="material-symbols-outlined text-[18px]">{{ showConfirm ? 'visibility_off' : 'visibility' }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Aceptación de condiciones (visual) -->
                <div class="flex items-start gap-2 pt-1">
                  <input type="checkbox" class="mt-1 w-4 h-4 rounded text-primary cursor-pointer accent-primary" />
                  <label class="text-xs text-ink-soft cursor-pointer">
                    Declaro que los datos ingresados son fidedignos y acepto el código ético de bienestar animal de MatchPet, así como las directrices para la revisión de postulaciones responsables.
                  </label>
                </div>

                <!-- Mensajes de validación y error -->
                <p v-if="validationError" class="text-red-600 text-sm text-center">{{ validationError }}</p>
                <p v-if="authStore.errorMsg" class="text-red-600 text-sm text-center">{{ authStore.errorMsg }}</p>

                <!-- Botón submit -->
                <div class="pt-2">
                  <button type="submit" :disabled="authStore.loading" class="mp-btn-green">
                    <span class="material-symbols-outlined text-[20px]">verified</span>
                    <span>{{ authStore.loading ? 'Registrando...' : 'Registrar Refugio' }}</span>
                  </button>
                </div>

                <!-- Enlaces alternativos -->
                <div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-soft">
                  <p>
                    ¿Ya tienes tu refugio registrado?
                    <router-link to="/login" class="font-semibold text-teal hover:underline ml-1">Inicia sesión</router-link>
                  </p>
                  <p>
                    ¿Eres un adoptante individual?
                    <router-link to="/registro" class="font-semibold text-teal hover:underline ml-1">Regístrate aquí</router-link>
                  </p>
                </div>
              </form>
            </div>

            <!-- Columna derecha: Propuesta de valor -->
            <div class="lg:col-span-5 space-y-6">
              <!-- Foto hero con badge -->
              <div class="relative w-full rounded-2xl overflow-hidden shadow-[0_10x_32px_rgba(0,0,0,0.08)] group bg-surface-raised">
                <img
                  src="/dogBrown.png"
                  alt="Perro rescatado descansando sobre las manos de un voluntario en un refugio"
                  class="w-full h-50 ject-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"></div>
                <!-- Badge embebido -->
                <div class="absolute bottom-6 left-6 right-6 backdrop-blur-xl bg-surface-card/90 p-4 rounded-xl shadow-lg">
                  <div class="flex items-center gap-2 mb-1">
                    <div class="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-white">
                      <span class="material-symbols-outlined text-[18px]">verified_user</span>
                    </div>
                    <div>
                      <p class="text-[16px] font-bold text-ink">Red de Refugios Verificados</p>
                      <p class="text-xs text-ink-soft">Más de 240 organizaciones aliadas en la región</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tarjeta de beneficios -->
              <div class="bg-surface-card rounded-2xl p-6 shadow-[0_4px_24px_-4px_rgba(80,56,237,0.06)] space-y-6">
                <div class="border-b border-surface-low pb-2">
                  <h3 class="text-[16px] font-bold text-ink">Beneficios para tu organización</h3>
                  <p class="text-xs text-ink-soft">
                    Optimizamos tus procesos diarios para que te concentres en salvar vidas.
                  </p>
                </div>
                <div class="space-y-4">
                  <!-- Beneficio 1 -->
                  <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background-color: #ede7fb; color: #3b0764;">
                      <span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                    </div>
                    <div>
                      <p class="text-[15px] font-bold text-ink">Panel de Fichas de Mascotas</p>
                      <p class="text-xs text-ink-soft mt-0.5">
                        Publica historiales médicos, fotos, temperamento y estado de vacunas con un solo clic en alta visibilidad.
                      </p>
                    </div>
                  </div>
                  <!-- Beneficio 2 -->
                  <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background-color: #e5f2f0; color: #3b7b75;">
                      <span class="material-symbols-outlined text-[20px]">filter_alt</span>
                    </div>
                    <div>
                      <p class="text-[15px] font-bold text-ink">Filtrado Inteligente de Postulaciones</p>
                      <p class="text-xs text-ink-soft mt-0.5">
                        Recibe solicitudes estructuradas con cuestionarios previos para elegir el hogar ideal sin desgaste operativo.
                      </p>
                    </div>
                  </div>
                  <!-- Beneficio 3 -->
                  <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background-color: #e2e7ff;">
                      <span class="material-symbols-outlined text-[20px]">security</span>
                    </div>
                    <div>
                      <p class="text-[15px] font-bold text-ink">Verificación Segura de Adoptantes</p>
                      <p class="text-xs text-ink-soft mt-0.5">
                        Acceso a validación de identidad para evitar fraudes, reventas ilícitas o abandono reiterado.
                      </p>
                    </div>
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
          <span class="material-symbols-outlined text-teal text-[20px]" style="font-variation-settings: 'FILL' 1;">pets</span>
          <span class="text-[16px] text-ink font-bold">MatchPet</span>
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
const shelterName = ref('')
const city = ref('')
const address = ref('')
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