<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        @click="router.push('/adoptante/dashboard')"
      >
        ← Volver al panel
      </button>
      <div class="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tus recomendaciones</h1>
          <p class="text-sm text-gray-500 mt-1">Mascotas ordenadas por compatibilidad con tu estilo de vida.</p>
        </div>
        <router-link to="/adoptante/cuestionario" class="text-sm text-indigo-600 hover:underline whitespace-nowrap">
          Editar mi cuestionario
        </router-link>
      </div>

      <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="h-72 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>

      <div v-else-if="errorMsg" class="text-center py-12 bg-white rounded-xl shadow-sm text-red-500">{{ errorMsg }}</div>

      <div v-else-if="items.length === 0" class="text-center py-16 bg-white rounded-xl shadow-sm">
        <div class="text-5xl mb-3">🐾</div>
        <p class="text-gray-700 font-medium">Por ahora no hay mascotas compatibles con tu perfil.</p>
        <p class="text-sm text-gray-500 mt-1">Prueba ajustando tu cuestionario o vuelve más tarde.</p>
        <router-link to="/catalogo" class="inline-block mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Explorar catálogo
        </router-link>
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="p in items" :key="p.id" class="flex flex-col">
          <PetCard :pet="p" :favorite-enabled="false" class="flex-1" @open="openPet" />
          <div class="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-start gap-3">
            <!-- Círculo de progreso (HU-33 CA#2) -->
            <div class="relative w-14 h-14 shrink-0" :aria-label="`Compatibilidad ${p.score}%`">
              <svg viewBox="0 0 36 36" class="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke-width="3" stroke-linecap="round"
                  :stroke="tier(p.score).color"
                  :stroke-dasharray="`${p.score} 100`"
                />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{{ p.score }}%</span>
            </div>
            <div class="min-w-0">
              <span :class="tier(p.score).badge" class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold">
                {{ tier(p.score).label }}
              </span>
              <p class="text-sm text-gray-600 mt-1">{{ p.reason }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PetCard from '../../components/pets/PetCard.vue'
import { useCompatibilityStore } from '../../stores/compatibilityStore'

const router = useRouter()
const compatibilityStore = useCompatibilityStore()

const loading = ref(true)
const errorMsg = ref('')
const items = ref([])

// Umbrales de docs/DECISIONES_ALGORITMO_MATCHING.md §5.1 (solo presentación).
function tier(score) {
  if (score >= 80) return { label: '¡Gran match!', badge: 'bg-emerald-100 text-emerald-700', color: '#10b981' }
  if (score >= 60) return { label: 'Muy compatible', badge: 'bg-teal-100 text-teal-700', color: '#14b8a6' }
  if (score >= 30) return { label: 'Podría funcionar', badge: 'bg-amber-100 text-amber-700', color: '#f59e0b' }
  return { label: 'Compatible con reservas', badge: 'bg-gray-200 text-gray-600', color: '#9ca3af' }
}

function openPet(pet) {
  router.push(`/mascota/${pet.id}`)
}

onMounted(async () => {
  const result = await compatibilityStore.fetchRecommendations()
  if (!result.success) {
    errorMsg.value = result.error
  } else if (result.needsQuiz) {
    // HU-33 CA#5: sin cuestionario → HU-30 con mensaje invitando a completarlo.
    router.replace({ path: '/adoptante/cuestionario', query: { from: 'recomendaciones' } })
    return
  } else {
    items.value = result.data
  }
  loading.value = false
})
</script>
