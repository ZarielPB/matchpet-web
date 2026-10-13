<template>
  <DashboardLayout role="adoptante" title="Tus recomendaciones">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-black text-[#040404]">Tus recomendaciones</h1>
        <p class="mb-6 mt-1 text-sm text-ink-soft">Mascotas ordenadas por compatibilidad con tu estilo de vida.</p>
      </div>
      <router-link to="/adoptante/cuestionario" class="whitespace-nowrap text-sm font-semibold text-[#BA8C71] hover:underline">
        Editar mi cuestionario
      </router-link>
    </div>

    <div v-if="loading" class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="n in 3" :key="n" class="h-80 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
    </div>

    <div v-else-if="errorMsg" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ errorMsg }}</div>

    <div v-else-if="items.length === 0" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
      <span class="material-symbols-outlined text-[64px] text-[#A3AEB9]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
      <p class="mt-3 font-medium text-[#040404]">Por ahora no hay mascotas compatibles con tu perfil.</p>
      <p class="mt-1 text-sm text-ink-soft">Prueba ajustando tu cuestionario o vuelve más tarde.</p>
      <router-link to="/catalogo" class="mt-5 inline-block rounded-xl bg-[#BA8C71] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E1A16C]">
        Explorar catálogo
      </router-link>
    </div>

    <div v-else class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="(p, idx) in items" :key="p.id" class="mp-fade-up flex flex-col" :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }">
        <PetCard :pet="p" :favorite-enabled="false" class="flex-1" @open="openPet" />
        <div class="mt-2 flex items-start gap-3 rounded-2xl border border-[#A3AEB9]/20 bg-white p-3 shadow-sm">
          <!-- Círculo de progreso (HU-33 CA#2) -->
          <div class="relative h-14 w-14 shrink-0" :aria-label="`Compatibilidad ${p.score}%`">
            <svg viewBox="0 0 36 36" class="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#FCD8B8" stroke-width="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" stroke-width="3" stroke-linecap="round"
                :stroke="tier(p.score).color"
                :stroke-dasharray="`${p.score} 100`"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-sm font-black text-[#040404]">{{ p.score }}%</span>
          </div>
          <div class="min-w-0">
            <span :class="tier(p.score).badge" class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {{ tier(p.score).label }}
            </span>
            <p class="mp-fade-up mt-1 text-sm text-ink-soft" :style="{ animationDelay: `${Math.min(idx, 8) * 60 + 200}ms` }">{{ p.reason }}</p>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import PetCard from '../../components/pets/PetCard.vue'
import { useCompatibilityStore } from '../../stores/compatibilityStore'

const router = useRouter()
const compatibilityStore = useCompatibilityStore()

const loading = ref(true)
const errorMsg = ref('')
const items = ref([])

// Umbrales de docs/DECISIONES_ALGORITMO_MATCHING.md §5.1 (solo presentación).
function tier(score) {
  if (score >= 80) return { label: '¡Gran match!', badge: 'bg-[#BA8C71] text-white', color: '#BA8C71' }
  if (score >= 60) return { label: 'Muy compatible', badge: 'bg-[#E1A16C] text-[#040404]', color: '#E1A16C' }
  if (score >= 30) return { label: 'Podría funcionar', badge: 'bg-[#FCD8B8] text-[#040404]', color: '#F0C199' }
  return { label: 'Compatible con reservas', badge: 'bg-[#A3AEB9]/30 text-[#040404]', color: '#A3AEB9' }
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
