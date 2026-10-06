<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        @click="router.back()"
      >
        ← Volver
      </button>

      <!-- Carga -->
      <div v-if="petStore.loading" class="grid sm:grid-cols-2 gap-8">
        <div class="aspect-[4/3] bg-gray-200 rounded-xl animate-pulse"></div>
        <div class="space-y-3">
          <div class="h-8 bg-gray-200 rounded animate-pulse w-2/3"></div>
          <div class="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
          <div class="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
        </div>
      </div>

      <!-- Error / no encontrada -->
      <div v-else-if="!pet" class="text-center py-20 bg-white rounded-xl shadow-sm">
        <div class="text-6xl mb-4">🐾</div>
        <h1 class="text-xl font-bold text-gray-900">Mascota no encontrada</h1>
        <p class="text-sm text-gray-500 mt-2">Es posible que ya haya sido adoptada o el enlace no sea válido.</p>
        <router-link to="/catalogo" class="inline-block mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Ver catálogo
        </router-link>
      </div>

      <!-- Detalle -->
      <div v-else class="grid lg:grid-cols-2 gap-8">
        <!-- Galería -->
        <div>
          <div class="aspect-[4/3] bg-gray-200 rounded-xl overflow-hidden">
            <img
              v-if="activeImage"
              :src="activeImage"
              :alt="`Foto de ${pet.name}`"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-6xl text-gray-300">🐾</div>
          </div>

          <!-- Miniaturas -->
          <div v-if="pet.images?.length > 1" class="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              v-for="(img, index) in pet.images"
              :key="index"
              type="button"
              class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition"
              :class="index === activeIndex ? 'border-indigo-500' : 'border-transparent'"
              :aria-label="`Ver imagen ${index + 1}`"
              @click="setActive(index)"
            >
              <img :src="img" :alt="`Imagen ${index + 1} de ${pet.name}`" class="w-full h-full object-cover" />
            </button>
          </div>
          <p v-else class="text-xs text-gray-400 mt-2">Galeria ({{ pet.images?.length || 0 }} imagen(es)).</p>
        </div>

        <!-- Información -->
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900">{{ pet.name }}</h1>
              <p class="text-gray-500 mt-1">
                {{ speciesLabel }} · {{ sizeLabel }} · {{ ageLabel }}
              </p>
            </div>
            <span
              :class="statusBadgeClass"
              class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            >
              {{ statusLabel }}
            </span>
          </div>

          <div class="mt-5 space-y-4">
            <div v-if="pet.breed">
              <h2 class="text-xs font-semibold text-gray-500 uppercase">Raza</h2>
              <p class="text-sm text-gray-800">{{ pet.breed }}</p>
            </div>

            <div>
              <h2 class="text-xs font-semibold text-gray-500 uppercase">Estado de salud</h2>
              <p class="text-sm text-gray-800">{{ pet.health_status }}</p>
            </div>

            <div v-if="pet.temperament">
              <h2 class="text-xs font-semibold text-gray-500 uppercase">Temperamento</h2>
              <p class="text-sm text-gray-800">{{ pet.temperament }}</p>
            </div>

            <div>
              <h2 class="text-xs font-semibold text-gray-500 uppercase">Descripción</h2>
              <p class="text-sm text-gray-700 leading-relaxed">{{ pet.description }}</p>
            </div>

            <!-- Refugio -->
            <div v-if="pet.shelters" class="pt-3 border-t border-gray-100">
              <h2 class="text-xs font-semibold text-gray-500 uppercase mb-1">Refugio</h2>
              <p class="text-sm font-medium text-gray-800">{{ pet.shelters.shelter_name || 'Refugio' }}</p>
              <p class="text-sm text-gray-500">{{ pet.shelters.city }}</p>
              <p v-if="pet.shelters.address" class="text-sm text-gray-500">{{ pet.shelters.address }}</p>
              <p v-if="pet.shelters.phone" class="text-sm text-gray-500">📞 {{ pet.shelters.phone }}</p>
            </div>
          </div>

          <!-- Botón solicitar adopción -->
          <div class="mt-6">
            <div v-if="infoMsg" class="mb-3 px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-lg">
              {{ infoMsg }}
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
                class="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-gray-300 cursor-not-allowed"
              >
                🔒 Solicitar Adopción
              </button>
              <span
                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[90%] px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 transition group-hover:opacity-100"
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
                class="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-gray-300 cursor-not-allowed"
              >
                🏠 Solo para adoptantes
              </button>
              <span
                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[90%] px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 transition group-hover:opacity-100"
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
                class="w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
              >
                {{ pet.status === 'adoptada' ? '🐾 Ya fue adoptada' : '⏳ En proceso de adopción' }}
              </button>
              <span
                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[90%] px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 transition group-hover:opacity-100"
              >
                Solo las mascotas disponibles aceptan solicitudes
              </span>
            </div>

            <button
              v-else
              type="button"
              class="w-full py-3 px-4 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
              @click="handleRequestAdoption"
            >
              💌 Solicitar Adopción
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { usePetStore, STATUS_LABEL } from '../stores/petStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()

const activeIndex = ref(0)
const infoMsg = ref('')

const pet = computed(() => petStore.pet)

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
    disponible: 'bg-emerald-100 text-emerald-700',
    en_proceso: 'bg-amber-100 text-amber-700',
    adoptada: 'bg-gray-200 text-gray-600'
  }
  return map[pet.value?.status] || 'bg-gray-100 text-gray-600'
})

function setActive(index) {
  activeIndex.value = index
}

async function loadPet() {
  activeIndex.value = 0
  infoMsg.value = ''
  await petStore.fetchPetById(route.params.id)
}

watch(() => route.params.id, () => loadPet())

function handleRequestAdoption() {
  infoMsg.value = 'Contáctate con el refugio para más información...'
}

onMounted(loadPet)
</script>