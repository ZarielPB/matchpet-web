<template>
  <DashboardLayout role="adoptante" title="Mis solicitudes">
    <div class="mx-auto max-w-3xl">
      <h1 class="font-display text-2xl font-black text-[#040404]">Mis solicitudes</h1>
      <p class="mb-6 mt-1 text-sm text-ink-soft">Sigue el estado de tus solicitudes de adopción.</p>

      <div v-if="flash" class="mp-fade-up mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm font-medium text-[#040404]" role="status">✅ {{ flash }}</div>
      <div v-if="actionError" class="mb-4 rounded-xl border border-alert/30 bg-alert-container px-4 py-3 text-sm text-alert" role="alert">{{ actionError }}</div>

      <div v-if="store.loading" class="space-y-4">
        <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      </div>

      <div v-else-if="loadError" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ loadError }}</div>

      <div v-else-if="store.applications.length === 0" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
        <span class="material-symbols-outlined text-[64px] text-[#A3AEB9]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">mail</span>
        <p class="mt-3 font-medium text-[#040404]">Aún no has enviado solicitudes.</p>
        <router-link to="/catalogo" class="mt-5 inline-block rounded-xl bg-[#BA8C71] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E1A16C]">
          Explorar catálogo
        </router-link>
      </div>

      <ul v-else class="space-y-4">
        <li
          v-for="(a, idx) in store.applications"
          :key="a.id"
          class="mp-fade-up flex gap-4 rounded-2xl border border-[#A3AEB9]/20 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }"
        >
          <img
            v-if="photo(a)"
            :src="photo(a)"
            :alt="`Foto de ${a.pets?.name || 'la mascota'}`"
            class="h-24 w-24 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
          <div v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#FCD8B8]/40 text-3xl text-[#A3AEB9]">🐾</div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <router-link v-if="a.pets" :to="`/mascota/${a.pets.id}`" class="truncate font-display font-bold text-[#040404] hover:underline">
                {{ a.pets.name }}
              </router-link>
              <span v-else class="font-display font-bold text-[#040404]">Mascota no disponible</span>
              <span :class="badge(a.status).class" class="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {{ badge(a.status).label }}
              </span>
            </div>
            <p class="text-sm text-ink-soft">
              {{ a.pets?.shelters?.shelter_name || 'Refugio' }}<span v-if="a.pets?.shelters?.city"> · {{ a.pets.shelters.city }}</span>
            </p>
            <p class="mt-0.5 text-xs text-ink-soft">Enviada el {{ formatDate(a.created_at) }}</p>

            <p
              v-if="a.shelter_comments && (a.status === 'aprobada' || a.status === 'rechazada')"
              class="mt-2 rounded-xl border border-[#A3AEB9]/20 bg-[#FCD8B8]/20 px-3 py-2 text-sm text-[#040404]"
            >
              <span class="font-semibold">Comentario del refugio:</span> {{ a.shelter_comments }}
            </p>

            <button
              v-if="a.status === 'pendiente'"
              type="button"
              class="mt-3 min-h-[44px] text-sm font-semibold text-alert hover:underline sm:min-h-0"
              @click="askCancel(a)"
            >
              Cancelar solicitud
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modal de confirmación (HU-37 CA#2) -->
    <Transition name="mp-modal">
      <div v-if="toCancel" class="fixed inset-0 z-50 flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true">
        <div class="mp-modal-panel w-full max-w-sm rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
          <p class="font-display font-bold text-[#040404]">¿Estás seguro de que deseas cancelar esta solicitud?</p>
          <p class="mt-1 text-sm text-ink-soft">Esta acción no se puede deshacer</p>
          <div class="mt-5 flex gap-3">
            <button type="button" class="mp-btn-ghost flex-1" :disabled="cancelling" @click="toCancel = null">Volver</button>
            <button type="button" class="flex h-12 flex-1 items-center justify-center rounded-xl bg-alert text-[15px] font-bold text-white transition hover:opacity-90 disabled:opacity-60" :disabled="cancelling" @click="confirmCancel">
              {{ cancelling ? 'Cancelando…' : 'Sí, cancelar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import { useApplicationStore } from '../../stores/applicationStore'

const router = useRouter()
const route = useRoute()
const store = useApplicationStore()

const loadError = ref('')
const actionError = ref('')
const flash = ref(route.query.enviada ? '¡Solicitud enviada! El refugio la revisará pronto.' : '')
const toCancel = ref(null)
const cancelling = ref(false)

// HU-36 CA#2: pendiente amarillo · aprobada verde · rechazada rojo · cancelada gris.
const BADGES = {
  pendiente: { label: 'Pendiente', class: 'bg-[#FCD8B8] text-[#040404]' },
  aprobada: { label: 'Aprobada', class: 'bg-[#BA8C71] text-white' },
  rechazada: { label: 'Rechazada', class: 'bg-alert-container text-alert' },
  cancelada: { label: 'Cancelada', class: 'bg-[#A3AEB9]/30 text-[#040404]' },
  completada: { label: 'Completada', class: 'bg-[#E1A16C] text-[#040404]' }
}
const badge = (status) => BADGES[status] || { label: status, class: 'bg-[#A3AEB9]/20 text-[#040404]' }

function photo(a) {
  const imgs = a.pets?.pet_images || []
  return (imgs.find((i) => i.is_primary) || imgs[0])?.image_url || null
}

function formatDate(raw) {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function askCancel(a) {
  actionError.value = ''
  toCancel.value = a
}

async function confirmCancel() {
  cancelling.value = true
  const result = await store.cancelApplication(toCancel.value.id)
  cancelling.value = false
  toCancel.value = null
  if (result.success) {
    flash.value = 'Solicitud cancelada.'
  } else {
    actionError.value = result.error
  }
}

onMounted(async () => {
  const result = await store.fetchMyApplications()
  if (!result.success) loadError.value = result.error
})
</script>
