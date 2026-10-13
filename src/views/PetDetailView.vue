<template>
  <div class="min-h-screen bg-[#FCD8B8]/10">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-[#A3AEB9] hover:text-[#040404] flex items-center gap-1 mb-4 transition-colors"
        @click="router.back()"
      >
        ← Volver
      </button>

      <!-- Carga -->
      <div v-if="petStore.loading" class="grid sm:grid-cols-2 gap-8">
        <div class="aspect-[4/5] max-w-md bg-[#A3AEB9]/20 rounded-2xl animate-pulse"></div>
        <div class="space-y-3">
          <div class="h-8 bg-[#A3AEB9]/20 rounded animate-pulse w-2/3"></div>
          <div class="h-4 bg-[#A3AEB9]/20 rounded animate-pulse w-full"></div>
          <div class="h-4 bg-[#A3AEB9]/20 rounded animate-pulse w-5/6"></div>
        </div>
      </div>

      <!-- Error / no encontrada -->
      <div v-else-if="!pet" class="text-center py-20 bg-white rounded-2xl shadow-sm border border-[#A3AEB9]/20">
        <div class="text-6xl mb-4">🐾</div>
        <h1 class="text-xl font-bold text-[#040404] font-display">Mascota no encontrada</h1>
        <p class="text-sm text-ink-soft mt-2">Es posible que ya haya sido adoptada o el enlace no sea válido.</p>
        <router-link
          to="/catalogo"
          class="inline-block mt-6 px-6 py-2.5 bg-brand-primary text-brand-dark rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors"
        >
          Ver catálogo
        </router-link>
      </div>

      <!-- Detalle -->
      <div v-else class="grid lg:grid-cols-2 gap-8">
        <!-- Galería -->
        <div v-reveal>
          <PhotoCard
            v-if="activeImage"
            size="large"
            :src="activeImage"
            :alt="`Foto de ${pet.name}`"
            :caption="pet.name"
            :tilt="mainTilt"
            class="max-w-md mx-auto lg:mx-0"
          />
          <div
            v-else
            class="photocard max-w-md mx-auto lg:mx-0 flex items-center justify-center aspect-[4/5]"
            :style="{ '--tilt': `${mainTilt}deg` }"
          >
            <span class="text-6xl text-[#A3AEB9]">🐾</span>
          </div>

          <!-- Miniaturas -->
          <div v-if="images.length > 1" class="mt-6">
            <div
              class="flex lg:grid lg:grid-cols-5 gap-3 overflow-x-auto lg:overflow-visible snap-x snap-mandatory pb-2 lg:pb-0"
            >
              <PhotoCard
                v-for="(img, index) in images"
                :key="index"
                size="small"
                interactive
                :src="img"
                :alt="`Imagen ${index + 1} de ${pet.name}`"
                :tilt="thumbTilt(index)"
                :is-active="index === activeIndex"
                class="w-24 shrink-0 snap-center lg:w-auto"
                @select="setActive(index)"
              />
            </div>
            <p class="lg:hidden text-center text-xs font-medium text-ink-soft mt-2">
              {{ activeIndex + 1 }} / {{ images.length }}
            </p>
          </div>
          <p v-else class="text-xs text-ink-soft mt-3 text-center lg:text-left">
            Galería ({{ images.length }} imagen(es)).
          </p>
        </div>

        <!-- Información -->
        <div v-reveal="80" class="bg-white p-6 rounded-2xl shadow-sm border border-[#A3AEB9]/20">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#040404] font-display">{{ pet.name }}</h1>
              <p class="text-ink-soft mt-1">
                {{ speciesLabel }} · {{ sizeLabel }} · {{ ageLabel }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="authStore.userRole !== 'refugio'"
                type="button"
                :aria-label="isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'"
                :title="isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'"
                :disabled="favBusy"
                class="flex h-10 w-10 items-center justify-center rounded-full border border-[#A3AEB9]/30 bg-white shadow-sm transition hover:scale-110 disabled:opacity-60"
                @click="handleToggleFavorite"
              >
                <svg
                  :class="isFav ? 'fill-[#E1A16C] text-[#E1A16C]' : 'fill-transparent text-[#A3AEB9]'"
                  class="h-5 w-5 transition-colors"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <span
                :class="statusBadgeClass"
                class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
              >
                {{ statusLabel }}
              </span>
            </div>
          </div>

          <div class="mt-5 space-y-4">
            <div v-if="pet.breed">
              <h2 class="text-xs font-semibold text-ink-soft uppercase">Raza</h2>
              <p class="text-sm text-[#040404]">{{ pet.breed }}</p>
            </div>

            <div>
              <h2 class="text-xs font-semibold text-ink-soft uppercase">Estado de salud</h2>
              <p class="text-sm text-[#040404]">{{ pet.health_status }}</p>
            </div>

            <div v-if="pet.temperament">
              <h2 class="text-xs font-semibold text-ink-soft uppercase">Temperamento</h2>
              <p class="text-sm text-[#040404]">{{ pet.temperament }}</p>
            </div>

            <div>
              <h2 class="text-xs font-semibold text-ink-soft uppercase">Descripción</h2>
              <p class="text-sm text-[#040404] leading-relaxed">{{ pet.description }}</p>
            </div>

            <!-- Refugio -->
            <div v-if="pet.shelters" class="pt-3 border-t border-[#A3AEB9]/20">
              <h2 class="text-xs font-semibold text-ink-soft uppercase mb-1">Refugio</h2>
              <p class="text-sm font-medium text-[#040404]">{{ pet.shelters.shelter_name || 'Refugio' }}</p>
              <p class="text-sm text-ink-soft">{{ pet.shelters.city }}</p>
              <p v-if="pet.shelters.address" class="text-sm text-ink-soft">{{ pet.shelters.address }}</p>
              <p v-if="pet.shelters.phone" class="text-sm text-ink-soft">📞 {{ pet.shelters.phone }}</p>
            </div>
          </div>

          <!-- Botón solicitar adopción -->
          <div class="mt-6">
            <div v-if="infoMsg" class="mb-3 px-4 py-3 bg-[#FCD8B8]/40 border border-[#E1A16C]/40 text-[#040404] text-sm rounded-lg">
              {{ infoMsg }}
            </div>
            <div v-if="favError" class="mb-3 px-4 py-3 bg-alert-container border border-alert/30 text-alert text-sm rounded-lg" role="alert">
              {{ favError }}
            </div>

            <!--
              Prioridad del bloqueo (HU-26/pet_status):
              1. Sin sesión  -> iniciar sesión.
              2. Rol refugio -> no puede Adoption (HU-08).
              3. Estado       -> solo 'disponible' admite solicitud.
            -->
            <div v-if="!authStore.isAuthenticated" class="group relative inline-block w-full">
              <button
                type="button"
                disabled
                class="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#A3AEB9] cursor-not-allowed"
              >
                🔒 Solicitar Adopción
              </button>
              <span
                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[90%] px-3 py-1.5 bg-[#040404] text-[#FCD8B8] text-xs rounded-md opacity-0 transition group-hover:opacity-100"
              >
                Inicia sesión para solicitar
              </span>
            </div>

            <div
              v-else-if="authStore.userRole === 'refugio'"
              class="group relative inline-block w-full"
            >
              <button
                type="button"
                disabled
                class="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#A3AEB9] cursor-not-allowed"
              >
                🏠 Solo para adoptantes
              </button>
              <span
                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[90%] px-3 py-1.5 bg-[#040404] text-[#FCD8B8] text-xs rounded-md opacity-0 transition group-hover:opacity-100"
              >
                Las solicitudes de adopción son exclusivas de cuentas de adoptante
              </span>
            </div>

            <div
              v-else-if="pet.status !== 'disponible'"
              class="group relative inline-block w-full"
            >
              <button
                type="button"
                disabled
                class="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#A3AEB9] cursor-not-allowed"
              >
                {{ pet.status === 'adoptada' ? '🐾 Ya fue adoptada' : '⏳ En proceso de adopción' }}
              </button>
              <span
                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[90%] px-3 py-1.5 bg-[#040404] text-[#FCD8B8] text-xs rounded-md opacity-0 transition group-hover:opacity-100"
              >
                Solo las mascotas disponibles aceptan solicitudes
              </span>
            </div>

            <!-- HU-35 CA#1: solo adoptantes con perfil completado -->
            <router-link
              v-else-if="!authStore.hasAdopterProfile"
              to="/adoptante/perfil"
              class="block w-full text-center py-3 px-4 rounded-lg text-sm font-bold text-white bg-[#A3AEB9] hover:bg-ink-soft transition-colors"
            >
              📝 Completa tu perfil para solicitar
            </router-link>

            <router-link
              v-else-if="openApplication"
              to="/adoptante/solicitudes"
              class="block w-full text-center py-3 px-4 rounded-lg text-sm font-bold text-[#040404] bg-[#FCD8B8] hover:bg-[#F0C199] transition-colors"
            >
              ✅ Ya tienes una solicitud abierta · Ver mis solicitudes
            </router-link>

            <button
              v-else
              type="button"
              class="w-full py-3 px-4 rounded-lg text-sm font-bold text-brand-dark bg-brand-primary hover:bg-primary-hover transition-colors"
              @click="openRequestModal"
            >
              💌 Solicitar Adopción
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de solicitud (HU-35) -->
    <Transition name="mp-modal">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true">
        <form class="mp-modal-panel bg-white rounded-2xl border border-[#A3AEB9]/20 shadow-xl max-w-md w-full p-6" @submit.prevent="submitRequest">
          <h2 class="font-display text-lg font-black text-[#040404]">Solicitar adopción de {{ pet?.name }}</h2>
          <label for="adoption-message" class="mp-label mt-4">Mensaje para el refugio *</label>
          <textarea
            id="adoption-message"
            v-model="requestMessage"
            rows="5"
            :maxlength="MESSAGE_MAX"
            class="w-full rounded-xl border border-edge bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-outline shadow-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            placeholder="Cuéntale al refugio por qué quieres adoptar a esta mascota"
          ></textarea>
          <p class="text-xs text-ink-soft mt-1 text-right">{{ requestMessage.trim().length }}/{{ MESSAGE_MAX }} (mínimo {{ MESSAGE_MIN }})</p>
          <p v-if="requestError" class="mt-2 rounded-lg border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ requestError }}</p>
          <div class="flex gap-3 mt-4">
            <button type="button" class="flex-1 h-11 rounded-xl border border-outline-soft bg-white text-sm font-semibold text-ink hover:bg-surface-low transition" :disabled="sending" @click="showModal = false">
              Cancelar
            </button>
            <button type="submit" class="flex-1 h-11 rounded-xl bg-brand-primary text-sm font-bold text-brand-dark shadow-btn-primary hover:bg-primary-hover transition disabled:opacity-60" :disabled="sending">
              {{ sending ? 'Enviando…' : 'Enviar solicitud' }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { usePetStore, STATUS_LABEL } from '../stores/petStore'
import { useApplicationStore, MESSAGE_MIN, MESSAGE_MAX } from '../stores/applicationStore'
import PhotoCard from '../components/pets/PhotoCard.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()
const applicationStore = useApplicationStore()

const activeIndex = ref(0)
const infoMsg = ref('')
const mainTilt = ref(-1)

const pet = computed(() => petStore.pet)

const images = computed(() => pet.value?.images ?? [])

const activeImage = computed(() => pet.value?.images?.[activeIndex.value] || pet.value?.images?.[0] || null)

const speciesLabel = computed(() => {
  const map = { perro: '🐶 Perro', gato: '🐱 Gato', otro: '🐾 Otro' }
  return map[pet.value?.species] || 'Mascota'
})

const sizeLabel = computed(() => {
  const map = { 'pequeño': 'Pequeño', mediano: 'Mediano', grande: 'Grande' }
  return map[pet.value?.size] || pet.value?.size
})

const ageLabel = computed(() => {
  const years = Number(pet.value?.age_years)
  if (Number.isFinite(years) && years >= 0 && pet.value?.age_years != null) {
    return years < 1 ? 'Menor de 1 año' : `${years} año(s)`
  }
  const months = Number(pet.value?.age_months)
  if (Number.isFinite(months) && months >= 0) {
    if (months < 12) return `${months} mes(es)`
    return `${Math.floor(months / 12)} año(s)`
  }
  return 'Edad no especificada'
})

const statusLabel = computed(() => STATUS_LABEL[pet.value?.status] || pet.value?.status)

const statusBadgeClass = computed(() => {
  const map = {
    disponible: 'bg-[#E1A16C] text-[#040404]',
    en_proceso: 'bg-[#FCD8B8] text-[#040404]',
    adoptada: 'bg-[#A3AEB9] text-[#040404]'
  }
  return map[pet.value?.status] || 'bg-[#A3AEB9]/30 text-[#040404]'
})

function thumbTilt(index) {
  return index % 2 === 0 ? -3 : 3
}

function setActive(index) {
  activeIndex.value = index
}

// HU-35: estado de la solicitud del adoptante para esta mascota.
const openApplication = ref(false)
const showModal = ref(false)
const requestMessage = ref('')
const requestError = ref('')
const sending = ref(false)

async function loadApplicationState() {
  openApplication.value = false
  if (!authStore.isAuthenticated || authStore.userRole !== 'adoptante') return
  const [, open] = await Promise.all([
    authStore.hasAdopterProfile ? null : authStore.loadAdopterProfile(),
    applicationStore.getOpenApplication(route.params.id)
  ])
  openApplication.value = !!open.data
}

// HU-28 CA#1: favorito también en el detalle.
const favError = ref('')
const favBusy = ref(false)
const isFav = computed(() => petStore.isFavorite(route.params.id))

async function handleToggleFavorite() {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  favBusy.value = true
  favError.value = ''
  const result = await petStore.toggleFavorite(route.params.id)
  favBusy.value = false
  if (!result.success) favError.value = result.error
}

async function loadPet() {
  activeIndex.value = 0
  infoMsg.value = ''
  mainTilt.value = Math.random() < 0.5 ? -1 : 1
  await petStore.fetchPetById(route.params.id)
  if (authStore.isAuthenticated && authStore.userRole === 'adoptante') petStore.loadFavorites()
  await loadApplicationState()
}

watch(() => route.params.id, () => loadPet())

function openRequestModal() {
  requestMessage.value = ''
  requestError.value = ''
  showModal.value = true
}

async function submitRequest() {
  sending.value = true
  requestError.value = ''
  const result = await applicationStore.createApplication(pet.value.id, requestMessage.value)
  sending.value = false
  if (!result.success) {
    requestError.value = result.error
    return
  }
  showModal.value = false
  router.push({ path: '/adoptante/solicitudes', query: { enviada: '1' } })
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let revealObserver = null

const getRevealObserver = () => {
  if (revealObserver) return revealObserver
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        revealObserver.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  )
  return revealObserver
}

const vReveal = {
  mounted(el, binding) {
    el.classList.add('mp-reveal')
    const delay = binding.value
    if (typeof delay === 'number' && delay > 0) {
      el.style.setProperty('--mp-reveal-delay', delay + 'ms')
    }
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-revealed')
      return
    }
    getRevealObserver().observe(el)
  },
  unmounted(el) {
    if (revealObserver) revealObserver.unobserve(el)
  }
}

onMounted(loadPet)
</script>
