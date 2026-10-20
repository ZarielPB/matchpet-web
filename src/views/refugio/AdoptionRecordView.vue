<template>
  <DashboardLayout role="refugio" title="Expediente de adopción">
    <div class="mx-auto max-w-3xl">
      <div class="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <router-link to="/refugio/solicitudes" class="text-sm font-semibold text-[#BA8C71] hover:underline">← Volver a solicitudes</router-link>
        <button v-if="record && delivery" type="button" class="mp-btn-primary !w-auto px-6" @click="printRecord">🖨️ Imprimir / Guardar como PDF</button>
      </div>

      <div v-if="loading" class="h-64 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      <div v-else-if="error" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ error }}</div>
      <div v-else-if="!delivery" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-12 text-center text-sm text-[#040404] shadow-sm">
        El expediente estará disponible cuando se registre la entrega de la mascota.
      </div>

      <article v-else class="print-area rounded-2xl border border-[#A3AEB9]/30 bg-white p-8 text-[#040404] shadow-sm">
        <header class="flex items-center justify-between gap-4 border-b-2 border-[#040404] pb-4">
          <div class="flex items-center gap-3">
            <img v-if="shelter?.cover_image_url" :src="shelter.cover_image_url" alt="Logo del refugio" class="h-14 w-14 rounded-lg border border-[#A3AEB9]/40 object-cover" />
            <div>
              <p class="font-display text-lg font-black">{{ shelter?.shelter_name || 'Refugio' }}</p>
              <p class="text-xs">{{ [shelter?.address, shelter?.city].filter(Boolean).join(', ') }}<span v-if="shelter?.phone"> · Tel. {{ shelter.phone }}</span></p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-display text-lg font-black">Match<span class="text-[#BA8C71]">Pet</span></p>
            <p class="text-xs">Expediente de adopción</p>
          </div>
        </header>

        <section class="mt-5">
          <h2 class="border-b border-[#A3AEB9]/50 pb-1 font-display text-sm font-bold uppercase tracking-wide">Mascota</h2>
          <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <template v-for="row in petRows" :key="row[0]"><dt class="text-[#555]">{{ row[0] }}</dt><dd class="font-medium">{{ row[1] }}</dd></template>
          </dl>
        </section>

        <section class="mt-5">
          <h2 class="border-b border-[#A3AEB9]/50 pb-1 font-display text-sm font-bold uppercase tracking-wide">Adoptante</h2>
          <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <template v-for="row in adopterRows" :key="row[0]"><dt class="text-[#555]">{{ row[0] }}</dt><dd class="font-medium">{{ row[1] }}</dd></template>
          </dl>
        </section>

        <section v-if="quiz" class="mt-5">
          <h2 class="border-b border-[#A3AEB9]/50 pb-1 font-display text-sm font-bold uppercase tracking-wide">Perfil de compatibilidad</h2>
          <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <template v-for="row in quizRows" :key="row[0]"><dt class="text-[#555]">{{ row[0] }}</dt><dd class="font-medium">{{ row[1] }}</dd></template>
          </dl>
        </section>

        <section class="mt-5">
          <h2 class="border-b border-[#A3AEB9]/50 pb-1 font-display text-sm font-bold uppercase tracking-wide">Historial de la solicitud</h2>
          <ul class="mt-2 space-y-1 text-sm">
            <li>Solicitud enviada: <strong>{{ formatDate(record.created_at) }}</strong></li>
            <li>Mensaje del adoptante: <em>«{{ record.message }}»</em></li>
            <li v-if="record.shelter_comments">Comentarios del refugio: {{ record.shelter_comments }}</li>
            <li>Cierre del proceso: <strong>{{ formatDate(record.resolved_at) }}</strong></li>
          </ul>
        </section>

        <section class="mt-5">
          <h2 class="border-b border-[#A3AEB9]/50 pb-1 font-display text-sm font-bold uppercase tracking-wide">Entrega formal</h2>
          <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt class="text-[#555]">Fecha de entrega</dt><dd class="font-medium">{{ formatDate(delivery.delivered_at) }}</dd>
            <dt class="text-[#555]">Documentos entregados</dt><dd class="font-medium">{{ delivery.documents?.length ? delivery.documents.join(', ') : 'Ninguno registrado' }}</dd>
            <dt class="text-[#555]">Observaciones</dt><dd class="font-medium">{{ delivery.observations || '—' }}</dd>
          </dl>
        </section>

        <footer class="mt-12 grid grid-cols-2 gap-10 text-center text-xs">
          <div class="border-t border-[#040404] pt-1">Responsable del refugio</div>
          <div class="border-t border-[#040404] pt-1">Adoptante</div>
        </footer>
        <p class="mt-6 text-center text-[10px] text-[#555]">Generado por MatchPet el {{ formatDate(new Date().toISOString()) }}</p>
      </article>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import { useApplicationManagementStore } from '../../stores/applicationManagementStore'

const route = useRoute()
const store = useApplicationManagementStore()

const record = ref(null)
const loading = ref(true)
const error = ref('')

// PostgREST devuelve objeto en relaciones 1:1 y arreglo en 1:N; acepta ambos.
const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const pet = computed(() => record.value?.pets || null)
const shelter = computed(() => one(pet.value?.shelters))
const adopter = computed(() => one(record.value?.profiles?.adopter_profiles))
const quiz = computed(() => one(record.value?.profiles?.compatibility_profiles))
const delivery = computed(() => one(record.value?.adoption_deliveries))

const HOURS = { menos_de_4: 'Menos de 4 h', '4_a_8': '4 a 8 h', mas_de_8: 'Más de 8 h' }
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v)

const petRows = computed(() => {
  const p = pet.value
  const age = [p.age_years != null && `${p.age_years} año(s)`, p.age_months != null && `${p.age_months} mes(es)`].filter(Boolean).join(' ')
  return [
    ['Nombre', p.name], ['Especie', p.species], ['Raza', dash(p.breed)], ['Edad', dash(age)],
    ['Tamaño', p.size], ['Estado de salud', dash(p.health_status)], ['Temperamento', dash(p.temperament)]
  ]
})

const adopterRows = computed(() => {
  const a = adopter.value
  const rows = [['Nombre', record.value.profiles?.full_name], ['Correo', record.value.profiles?.email]]
  if (a) {
    rows.push(
      ['Ciudad', dash(a.city)], ['Vivienda', dash(a.housing_type)], ['Patio', a.has_yard ? 'Sí' : 'No'],
      ['Niños en casa', a.has_kids ? `Sí${a.kids_ages ? ` (${a.kids_ages})` : ''}` : 'No'],
      ['Otras mascotas', a.has_other_pets ? `Sí${a.other_pets_details ? ` (${a.other_pets_details})` : ''}` : 'No'],
      ['Experiencia', `${a.experience_years ?? 0} año(s)`]
    )
  }
  return rows.map(([k, v]) => [k, dash(v)])
})

const quizRows = computed(() => [
  ['Tiempo en casa', HOURS[quiz.value.hours_at_home] || quiz.value.hours_at_home],
  ['Nivel de actividad', quiz.value.activity_level],
  ['Espacio', quiz.value.space_type],
  ['Tamaño preferido', quiz.value.preferred_size || 'Sin preferencia']
])

function formatDate(raw) {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
}

// El título del documento nombra el PDF que sugiere el navegador.
function printRecord() {
  const previous = document.title
  document.title = `Expediente-${pet.value.name}`
  window.print()
  document.title = previous
}

onMounted(async () => {
  const result = await store.fetchAdoptionRecord(route.params.id)
  if (result.success) record.value = result.data
  else error.value = result.error
  loading.value = false
})
</script>
