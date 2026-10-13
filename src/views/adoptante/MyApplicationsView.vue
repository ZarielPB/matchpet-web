<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-3xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        @click="router.push('/adoptante/dashboard')"
      >
        ← Volver al panel
      </button>
      <h1 class="text-2xl font-bold text-gray-900">Mis solicitudes</h1>
      <p class="text-sm text-gray-500 mt-1 mb-6">Sigue el estado de tus solicitudes de adopción.</p>

      <div v-if="flash" class="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{{ flash }}</div>
      <div v-if="actionError" class="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{{ actionError }}</div>

      <div v-if="store.loading" class="space-y-4">
        <div v-for="n in 3" :key="n" class="h-28 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>

      <div v-else-if="loadError" class="text-center py-12 bg-white rounded-xl shadow-sm text-red-500">{{ loadError }}</div>

      <div v-else-if="store.applications.length === 0" class="text-center py-16 bg-white rounded-xl shadow-sm">
        <div class="text-5xl mb-3">📨</div>
        <p class="text-gray-700 font-medium">Aún no has enviado solicitudes.</p>
        <router-link to="/catalogo" class="inline-block mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Explorar catálogo
        </router-link>
      </div>

      <ul v-else class="space-y-4">
        <li v-for="a in store.applications" :key="a.id" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4">
          <img
            v-if="photo(a)"
            :src="photo(a)"
            :alt="`Foto de ${a.pets?.name || 'la mascota'}`"
            class="w-24 h-24 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
          <div v-else class="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center text-3xl shrink-0">🐾</div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <router-link v-if="a.pets" :to="`/mascota/${a.pets.id}`" class="font-bold text-gray-900 hover:underline truncate">
                {{ a.pets.name }}
              </router-link>
              <span v-else class="font-bold text-gray-900">Mascota no disponible</span>
              <span :class="badge(a.status).class" class="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                {{ badge(a.status).label }}
              </span>
            </div>
            <p class="text-sm text-gray-500">
              {{ a.pets?.shelters?.shelter_name || 'Refugio' }}<span v-if="a.pets?.shelters?.city"> · {{ a.pets.shelters.city }}</span>
            </p>
            <p class="text-xs text-gray-400 mt-0.5">Enviada el {{ formatDate(a.created_at) }}</p>

            <p
              v-if="a.shelter_comments && (a.status === 'aprobada' || a.status === 'rechazada')"
              class="mt-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700"
            >
              <span class="font-medium">Comentario del refugio:</span> {{ a.shelter_comments }}
            </p>

            <button
              v-if="a.status === 'pendiente'"
              type="button"
              class="mt-3 text-sm text-red-600 hover:underline min-h-[44px] sm:min-h-0"
              @click="askCancel(a)"
            >
              Cancelar solicitud
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modal de confirmación (HU-37 CA#2) -->
    <div v-if="toCancel" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <p class="text-gray-900 font-medium">¿Estás seguro de que deseas cancelar esta solicitud?</p>
        <p class="text-sm text-gray-500 mt-1">Esta acción no se puede deshacer</p>
        <div class="flex gap-3 mt-5">
          <button type="button" class="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50" :disabled="cancelling" @click="toCancel = null">
            Volver
          </button>
          <button type="button" class="flex-1 py-2 rounded-md text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60" :disabled="cancelling" @click="confirmCancel">
            {{ cancelling ? 'Cancelando…' : 'Sí, cancelar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
  pendiente: { label: 'Pendiente', class: 'bg-amber-100 text-amber-700' },
  aprobada: { label: 'Aprobada', class: 'bg-emerald-100 text-emerald-700' },
  rechazada: { label: 'Rechazada', class: 'bg-red-100 text-red-700' },
  cancelada: { label: 'Cancelada', class: 'bg-gray-200 text-gray-600' },
  completada: { label: 'Completada', class: 'bg-indigo-100 text-indigo-700' }
}
const badge = (status) => BADGES[status] || { label: status, class: 'bg-gray-100 text-gray-600' }

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
