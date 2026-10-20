<template>
  <DashboardLayout role="refugio" title="Solicitudes recibidas">
    <div class="mx-auto max-w-4xl">
      <p class="mb-5 text-sm text-ink-soft">
        Revisa quién quiere adoptar a tus mascotas.
        <span v-if="store.pendingCount" class="font-semibold text-[#040404]">{{ store.pendingCount }} pendiente{{ store.pendingCount === 1 ? '' : 's' }}.</span>
      </p>

      <div v-if="flash" class="mp-fade-up mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm font-medium text-[#040404]" role="status">✅ {{ flash }}</div>

      <div class="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          class="min-h-[44px] rounded-full px-4 py-1.5 text-sm font-semibold transition sm:min-h-0"
          :class="store.filter === f.value ? 'bg-[#BA8C71] text-white' : 'border border-[#A3AEB9]/30 bg-white text-[#040404] hover:bg-[#FCD8B8]/40'"
          :aria-pressed="store.filter === f.value"
          @click="store.setFilter(f.value)"
        >
          {{ f.label }}
        </button>
      </div>

      <div v-if="store.loading && !store.receivedApplications.length" class="space-y-4">
        <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      </div>

      <div v-else-if="store.error && !store.receivedApplications.length" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ store.error }}</div>

      <div v-else-if="store.filteredApplications.length === 0" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
        <span class="material-symbols-outlined text-[64px] text-[#A3AEB9]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">inbox</span>
        <p class="mt-3 font-medium text-[#040404]">
          {{ store.filter === 'todas' ? 'Aún no has recibido solicitudes.' : 'No hay solicitudes con este estado.' }}
        </p>
      </div>

      <ul v-else class="space-y-4">
        <li
          v-for="(a, idx) in store.filteredApplications"
          :key="a.id"
          class="mp-fade-up flex gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          :class="a.status === 'pendiente' ? 'border-[#E1A16C]/60' : 'border-[#A3AEB9]/20'"
          :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }"
        >
          <img v-if="photo(a)" :src="photo(a)" :alt="`Foto de ${a.pets?.name || 'la mascota'}`" class="h-24 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />
          <div v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#FCD8B8]/40 text-3xl text-[#A3AEB9]">🐾</div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate font-display font-bold text-[#040404]">{{ a.pets?.name || 'Mascota' }}</p>
              <span :class="badge(a.status).class" class="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ badge(a.status).label }}</span>
            </div>
            <p class="text-sm text-[#040404]">{{ a.profiles?.full_name || 'Adoptante' }}<span v-if="adopter(a)?.city" class="text-ink-soft"> · {{ adopter(a).city }}</span></p>
            <p class="mt-0.5 text-xs text-ink-soft">Solicitada el {{ formatDate(a.created_at) }}</p>

            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="min-h-[44px] rounded-xl border border-[#A3AEB9]/40 bg-white px-4 text-sm font-semibold text-[#040404] transition hover:bg-[#FCD8B8]/40 sm:min-h-0 sm:py-1.5" @click="selectedId = a.id">Ver detalle</button>
              <template v-if="a.status === 'pendiente'">
                <button type="button" class="min-h-[44px] rounded-xl bg-[#BA8C71] px-4 text-sm font-bold text-white transition hover:bg-[#E1A16C] sm:min-h-0 sm:py-1.5" @click="toApprove = a">Aprobar</button>
                <button type="button" class="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-alert transition hover:bg-alert-container sm:min-h-0 sm:py-1.5" @click="toReject = a">Rechazar</button>
              </template>
              <router-link v-else-if="a.status === 'completada'" :to="`/refugio/expediente/${a.id}`" class="flex min-h-[44px] items-center rounded-xl bg-[#E1A16C] px-4 text-sm font-bold text-[#040404] transition hover:bg-[#BA8C71] hover:text-white sm:min-h-0 sm:py-1.5">Ver expediente</router-link>
              <button v-else-if="a.status === 'aprobada'" type="button" class="min-h-[44px] rounded-xl bg-[#E1A16C] px-4 text-sm font-bold text-[#040404] transition hover:bg-[#BA8C71] hover:text-white sm:min-h-0 sm:py-1.5" @click="toDeliver = a">Registrar Entrega</button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Detalle (HU-38 CA#4) -->
    <Transition name="mp-modal">
      <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#040404]/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="detail-title" @click.self="selectedId = null">
        <div class="mp-modal-panel max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 id="detail-title" class="font-display text-lg font-bold text-[#040404]">{{ selected.profiles?.full_name || 'Adoptante' }}</h2>
              <p class="text-sm text-ink-soft">Quiere adoptar a {{ selected.pets?.name }} · {{ formatDate(selected.created_at) }}</p>
            </div>
            <span :class="badge(selected.status).class" class="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ badge(selected.status).label }}</span>
          </div>

          <section class="mt-4">
            <h3 class="text-sm font-bold text-[#040404]">Mensaje del adoptante</h3>
            <p class="mt-1 whitespace-pre-line rounded-xl bg-[#FCD8B8]/20 px-3 py-2 text-sm text-[#040404]">{{ selected.message }}</p>
          </section>

          <section class="mt-4">
            <h3 class="text-sm font-bold text-[#040404]">Perfil del adoptante</h3>
            <dl v-if="adopter(selected)" class="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <template v-for="row in adopterRows(selected)" :key="row[0]">
                <dt class="text-ink-soft">{{ row[0] }}</dt><dd class="font-medium text-[#040404]">{{ row[1] }}</dd>
              </template>
            </dl>
            <p v-else class="mt-1 text-sm text-ink-soft">No completó su perfil.</p>
          </section>

          <section class="mt-4">
            <h3 class="text-sm font-bold text-[#040404]">Cuestionario de estilo de vida</h3>
            <dl v-if="quiz(selected)" class="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <template v-for="row in quizRows(selected)" :key="row[0]">
                <dt class="text-ink-soft">{{ row[0] }}</dt><dd class="font-medium text-[#040404]">{{ row[1] }}</dd>
              </template>
            </dl>
            <p v-else class="mt-1 text-sm text-ink-soft">No respondió el cuestionario.</p>
          </section>

          <section v-if="selected.shelter_comments" class="mt-4">
            <h3 class="text-sm font-bold text-[#040404]">Comentario del refugio</h3>
            <p class="mt-1 text-sm text-[#040404]">{{ selected.shelter_comments }}</p>
          </section>

          <section v-if="delivery(selected)" class="mt-4">
            <h3 class="text-sm font-bold text-[#040404]">Entrega registrada</h3>
            <p class="mt-1 text-sm text-[#040404]">{{ formatDate(delivery(selected).delivered_at) }}<span v-if="delivery(selected).documents?.length"> · {{ delivery(selected).documents.join(', ') }}</span></p>
            <p v-if="delivery(selected).observations" class="text-sm text-ink-soft">{{ delivery(selected).observations }}</p>
          </section>

          <div class="mt-6 flex flex-wrap gap-3">
            <button type="button" class="mp-btn-ghost flex-1" @click="selectedId = null">Cerrar</button>
            <button v-if="selected.status === 'pendiente'" type="button" class="mp-btn-primary flex-1" @click="toApprove = selected">Aprobar</button>
            <button v-if="selected.status === 'pendiente'" type="button" class="flex h-12 flex-1 items-center justify-center rounded-xl bg-alert text-[15px] font-bold text-white transition hover:opacity-90" @click="toReject = selected">Rechazar</button>
            <button v-if="selected.status === 'aprobada'" type="button" class="mp-btn-primary flex-1" @click="toDeliver = selected">Registrar Entrega</button>
          </div>
        </div>
      </div>
    </Transition>

    <ApproveApplicationModal :application="toApprove" @close="toApprove = null" @done="onDone" />
    <RejectApplicationModal :application="toReject" @close="toReject = null" @done="onDone" />
    <DeliveryFormModal :application="toDeliver" @close="toDeliver = null" @done="onDelivered" />
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import ApproveApplicationModal from '../../components/refugio/ApproveApplicationModal.vue'
import RejectApplicationModal from '../../components/refugio/RejectApplicationModal.vue'
import DeliveryFormModal from '../../components/refugio/DeliveryFormModal.vue'
import { useApplicationManagementStore } from '../../stores/applicationManagementStore'

const store = useApplicationManagementStore()
const router = useRouter()

const FILTERS = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: 'completada', label: 'Completadas' }
]

// Mismos colores que "Mis solicitudes" del adoptante.
const BADGES = {
  pendiente: { label: 'Pendiente', class: 'bg-[#FCD8B8] text-[#040404]' },
  aprobada: { label: 'Aprobada', class: 'bg-[#BA8C71] text-white' },
  rechazada: { label: 'Rechazada', class: 'bg-alert-container text-alert' },
  cancelada: { label: 'Cancelada', class: 'bg-[#A3AEB9]/30 text-[#040404]' },
  completada: { label: 'Completada', class: 'bg-[#E1A16C] text-[#040404]' }
}
const badge = (status) => BADGES[status] || { label: status, class: 'bg-[#A3AEB9]/20 text-[#040404]' }

const HOURS = { menos_de_4: 'Menos de 4 h', '4_a_8': '4 a 8 h', mas_de_8: 'Más de 8 h' }
const yesNo = (v) => (v ? 'Sí' : 'No')

const selectedId = ref(null)
const toApprove = ref(null)
const toReject = ref(null)
const toDeliver = ref(null)
const flash = ref('')

// Se busca en el store para que el detalle se refresque tras aprobar/rechazar.
const selected = computed(() => store.receivedApplications.find((a) => a.id === selectedId.value) || null)

// PostgREST devuelve objeto en relaciones 1:1 y arreglo en 1:N; acepta ambos.
const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const adopter = (a) => one(a.profiles?.adopter_profiles)
const quiz = (a) => one(a.profiles?.compatibility_profiles)
const delivery = (a) => one(a.adoption_deliveries)

function adopterRows(a) {
  const p = adopter(a)
  return [
    ['Ciudad', p.city || '—'],
    ['Vivienda', p.housing_type || '—'],
    ['Patio', yesNo(p.has_yard)],
    ['Niños', p.has_kids ? `Sí${p.kids_ages ? ` (${p.kids_ages})` : ''}` : 'No'],
    ['Otras mascotas', p.has_other_pets ? `Sí${p.other_pets_details ? ` (${p.other_pets_details})` : ''}` : 'No'],
    ['Experiencia', `${p.experience_years ?? 0} año(s)`]
  ]
}

function quizRows(a) {
  const q = quiz(a)
  return [
    ['Tiempo en casa', HOURS[q.hours_at_home] || q.hours_at_home],
    ['Nivel de actividad', q.activity_level],
    ['Espacio', q.space_type],
    ['Tamaño preferido', q.preferred_size || 'Sin preferencia']
  ]
}

function photo(a) {
  const imgs = a.pets?.pet_images || []
  return (imgs.find((i) => i.is_primary) || imgs[0])?.image_url || null
}

function formatDate(raw) {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// HU-43: tras la entrega se abre el expediente listo para imprimir.
function onDelivered(message) {
  const id = toDeliver.value.id
  onDone(message)
  router.push(`/refugio/expediente/${id}`)
}

function onDone(message) {
  toApprove.value = toReject.value = toDeliver.value = null
  flash.value = message
}

onMounted(() => store.fetchReceivedApplications())
</script>
