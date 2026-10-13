<template>
  <DashboardLayout role="refugio" title="Panel del Refugio">
    <WelcomeModal
      :show="showWelcome"
      :user-name="userName"
      role="refugio"
      @close="showWelcome = false"
    />

    <!-- HU-08 CA#7: aviso de acceso denegado -->
    <div
      v-if="authStore.accessDeniedMsg"
      class="mb-6 flex items-start justify-between gap-4 rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/10 px-4 py-3 text-sm text-alert"
      role="alert"
    >
      <span>🚫 {{ authStore.accessDeniedMsg }}</span>
      <button type="button" class="text-alert hover:underline" @click="authStore.clearAccessDenied()">
        ✕
      </button>
    </div>

    <!-- HU-14 CA#5: el refugio ve su ficha aunque le falten datos -->
    <div
      v-if="shelterError"
      class="mb-6 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/30 px-4 py-3 text-sm text-[#040404]"
    >
      ⚠️ {{ shelterError }}
    </div>

    <!-- Hero de bienvenida -->
    <section class="hero-fade mb-6 rounded-2xl border border-[#E1A16C]/30 bg-[#FCD8B8]/40 p-6 sm:p-8">
      <div class="flex items-start gap-4">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#BA8C71] text-white">
          <span
            class="material-symbols-outlined text-[26px]"
            style="font-variation-settings: 'FILL' 1"
            aria-hidden="true"
          >
            home_work
          </span>
        </span>
        <div>
          <h2 class="font-display text-3xl font-black text-[#040404] sm:text-4xl">
            ¡Bienvenido/a, {{ userName }}!
          </h2>
          <p class="mt-2 text-sm text-[#040404]/80">
            Gracias por seguir dando segundas oportunidades hoy. Aquí tienes un resumen de tu refugio.
          </p>
        </div>
      </div>
    </section>

    <!-- Accesos rápidos -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <router-link
        to="/refugio/mascotas"
        class="group rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#BA8C71] hover:shadow-lg"
      >
        <span class="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FCD8B8] text-[#BA8C71]">
          <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
        </span>
        <h2 class="mt-4 font-bold text-[#040404]">Gestionar mascotas</h2>
        <p class="mt-1 text-sm text-[#A3AEB9]">Registra, edita y cambia el estado de tus animales.</p>
      </router-link>

      <router-link
        to="/refugio/perfil"
        class="group rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#BA8C71] hover:shadow-lg"
      >
        <span class="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FCD8B8] text-[#BA8C71]">
          <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">home_work</span>
        </span>
        <h2 class="mt-4 font-bold text-[#040404]">Mi perfil de refugio</h2>
        <p class="mt-1 text-sm text-[#A3AEB9]">
          {{ shelter?.shelter_name ? 'Edita tus datos y tu foto de portada.' : 'Completa tus datos para que se muestren en el catálogo.' }}
        </p>
      </router-link>

      <router-link
        to="/catalogo"
        class="group rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#BA8C71] hover:shadow-lg"
      >
        <span class="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FCD8B8] text-[#BA8C71]">
          <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">visibility</span>
        </span>
        <h2 class="mt-4 font-bold text-[#040404]">Ver catálogo público</h2>
        <p class="mt-1 text-sm text-[#A3AEB9]">Mira cómo ven tu refugio los adoptantes.</p>
      </router-link>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { usePetStore } from '../stores/petStore'
import DashboardLayout from '../components/layout/DashboardLayout.vue'
import WelcomeModal from '../components/ui/WelcomeModal.vue'

const authStore = useAuthStore()
const petStore = usePetStore()
const shelter = ref(null)
const shelterError = ref('')
const showWelcome = ref(false)

const userName = computed(() => authStore.profile?.full_name?.trim() || 'amigo')

onMounted(async () => {
  await authStore.getSession()
  shelter.value = await petStore.getMyShelter()
  shelterError.value = petStore.shelterError
  const showWelcomeFlag = sessionStorage.getItem('showWelcomeModal')
  if (showWelcomeFlag === 'true') {
    showWelcome.value = true
    sessionStorage.removeItem('showWelcomeModal')
  }
})
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.hero-fade {
  animation: fadeInUp 0.6s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .hero-fade {
    animation: none;
  }
}
</style>
