<template>
  <DashboardLayout role="refugio" title="Reportes post-adopción">
    <div class="mx-auto max-w-3xl">
      <p class="mb-5 text-sm text-ink-soft">
        Dudas y problemas de tus adoptantes.
        <span v-if="pendingCount" class="font-semibold text-[#040404]">{{ pendingCount }} pendiente{{ pendingCount === 1 ? '' : 's' }}.</span>
      </p>

      <div v-if="flash" class="mp-fade-up mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm font-medium text-[#040404]" role="status">✅ {{ flash }}</div>

      <div class="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          class="min-h-[44px] rounded-full px-4 py-1.5 text-sm font-semibold transition sm:min-h-0"
          :class="filter === f.value ? 'bg-[#BA8C71] text-white' : 'border border-[#A3AEB9]/30 bg-white text-[#040404] hover:bg-[#FCD8B8]/40'"
          :aria-pressed="filter === f.value"
          @click="filter = f.value"
        >{{ f.label }}</button>
      </div>

      <div v-if="store.loading && !store.reports.length" class="space-y-4">
        <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      </div>

      <div v-else-if="store.error && !store.reports.length" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ store.error }}</div>

      <div v-else-if="!filtered.length" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
        <span class="material-symbols-outlined text-[64px] text-[#A3AEB9]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">inbox</span>
        <p class="mt-3 font-medium text-[#040404]">{{ filter === 'todos' ? 'Aún no has recibido reportes.' : 'No hay reportes con este estado.' }}</p>
      </div>

      <ul v-else class="space-y-4">
        <li
          v-for="(r, idx) in filtered"
          :key="r.id"
          class="mp-fade-up rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          :class="r.status === 'pendiente' ? 'border-[#E1A16C]/60' : 'border-[#A3AEB9]/20'"
          :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="truncate font-display font-bold text-[#040404]">{{ r.pets?.name || 'Mascota' }} · {{ r.category }}</p>
            <span :class="badge(r.status).class" class="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ badge(r.status).label }}</span>
          </div>
          <p class="text-sm text-[#040404]">{{ r.profiles?.full_name || 'Adoptante' }}</p>
          <p class="text-xs text-ink-soft">Enviado el {{ formatDate(r.created_at) }}</p>
          <p class="mt-2 whitespace-pre-line text-sm text-[#040404]">{{ r.description }}</p>
          <AttachmentPreview :path="r.image_url" />
          <p v-if="r.shelter_response" class="mt-2 rounded-xl border border-[#E1A16C]/30 bg-[#FCD8B8]/20 px-3 py-2 text-sm text-[#040404]"><span class="font-semibold">Tu respuesta:</span> {{ r.shelter_response }}</p>
          <button
            v-if="r.status !== 'cerrado'"
            type="button"
            class="mt-3 min-h-[44px] rounded-xl bg-[#BA8C71] px-4 text-sm font-bold text-white transition hover:bg-[#E1A16C] sm:min-h-0 sm:py-1.5"
            @click="toRespond = r"
          >{{ r.status === 'pendiente' ? 'Responder' : 'Responder de nuevo' }}</button>
        </li>
      </ul>
    </div>

    <RespondReportModal :report="toRespond" @close="toRespond = null" @done="onDone" />
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import AttachmentPreview from '../../components/ui/AttachmentPreview.vue'
import RespondReportModal from '../../components/refugio/RespondReportModal.vue'
import { useFollowUpStore } from '../../stores/followUpStore'

const store = useFollowUpStore()
const filter = ref('todos')
const toRespond = ref(null)
const flash = ref('')

const FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'respondido', label: 'Respondidos' },
  { value: 'cerrado', label: 'Cerrados' }
]
const BADGES = {
  pendiente: { label: 'Pendiente', class: 'bg-[#FCD8B8] text-[#040404]' },
  respondido: { label: 'Respondido', class: 'bg-[#BA8C71] text-white' },
  cerrado: { label: 'Cerrado', class: 'bg-[#A3AEB9]/30 text-[#040404]' }
}
const badge = (status) => BADGES[status] || BADGES.pendiente

const filtered = computed(() => (filter.value === 'todos' ? store.reports : store.reports.filter((r) => r.status === filter.value)))
const pendingCount = computed(() => store.reports.filter((r) => r.status === 'pendiente').length)

function formatDate(raw) {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function onDone(message) {
  toRespond.value = null
  flash.value = message
}

onMounted(() => store.fetchShelterReports())
</script>
